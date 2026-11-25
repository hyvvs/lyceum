import { type Page, expect, test } from "@playwright/test";

const scenarios = [
  { width: 390, height: 844, root: 32, mode: "reserved" },
  { width: 320, height: 844, root: 32, mode: "reserved" },
  // Exercise the app-owned enlarged placement threshold and intermediate text
  // scales rather than proving only the 16px/32px endpoints.
  { width: 390, height: 844, root: 24, mode: "reserved" },
  { width: 320, height: 844, root: 24, mode: "reserved" },
  { width: 320, height: 844, root: 20, mode: "reserved" },
  { width: 320, height: 640, root: 16, mode: "reserved" },
  { width: 320, height: 256, root: 32, mode: "flow" },
] as const;

type Locale = "en" | "es";
type Direction = "ltr" | "rtl";

const translations = {
  en: { landmark: "Quick navigation", links: ["Today", "Settings"] },
  es: { landmark: "Navegación rápida", links: ["Hoy", "Ajustes"] },
} as const;

async function prepare(page: Page, locale: Locale, dir: Direction, root: number) {
  // Use the actual application Settings action rather than replacing its i18n messages.
  await page.goto("/settings");
  await page.locator("#language").selectOption(locale);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await page.goto("/");
  await page.evaluate(
    ({ direction, fontSize }) => {
      document.documentElement.dir = direction;
      document.documentElement.style.fontSize = `${fontSize}px`;
    },
    { direction: dir, fontSize: root },
  );
  await expect(page.locator("html")).toHaveCSS("font-size", `${root}px`);
  await expect(page.locator("html")).toHaveAttribute("dir", dir);
}

async function assertVisibleTooltipClearance(page: Page, label: string, mode: string) {
  const tooltip = page.locator(".lyceum-tooltip[role='tooltip']");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText(label);
  await expect(tooltip).toHaveCSS("opacity", "1");
  const report = await page.evaluate(
    ({ layoutMode, label }) => {
      const surface = document.querySelector<HTMLElement>(".lyceum-tooltip[role='tooltip']");
      const frame = document.querySelector<HTMLElement>(".application-frame");
      const nav = document.querySelector<HTMLElement>(".icon-dock");
      if (!surface || !frame || !nav) throw new Error("Actual tooltip, reader or nav missing");
      const visibleStyle = getComputedStyle(surface);
      if (visibleStyle.visibility !== "visible" || visibleStyle.display === "none")
        throw new Error("Tooltip surface is not actually visible");
      const tip = surface.getBoundingClientRect();
      const intersects = (a: DOMRect, b: DOMRect) =>
        Math.min(a.right, b.right) > Math.max(a.left, b.left) + 0.5 &&
        Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 0.5;
      const dockLinks = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a[href]"));
      if (dockLinks.length !== 2) throw new Error("Expected the two native Dock destinations");
      const trigger = dockLinks.find((link) => link.getAttribute("aria-label") === label);
      const neighbor = dockLinks.find((link) => link !== trigger);
      if (!trigger || !neighbor) throw new Error("Actual Dock Tooltip trigger/neighbor missing");
      const triggerRect = trigger.getBoundingClientRect();
      const neighborRect = neighbor.getBoundingClientRect();
      const requestedOutward =
        (dockLinks.indexOf(trigger) === 0) ===
        (getComputedStyle(document.documentElement).direction === "rtl")
          ? "right"
          : "left";
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportRight = viewportLeft + (visualViewport?.width ?? innerWidth);
      // Existing app offset = 16px; existing Tooltip collision padding = 12px.
      const lateralAvailable =
        requestedOutward === "left"
          ? triggerRect.left - viewportLeft - 16 - 12
          : viewportRight - triggerRect.right - 16 - 12;
      const maskedLinks = dockLinks.filter((link) => intersects(tip, link.getBoundingClientRect()));
      const maskedReading: string[] = [];
      let meaningfulSamples = 0;
      const consider = (rect: DOMRect, description: string) => {
        // Reserved reading uses a clipped, dedicated scrollport: Range rects for
        // offscreen text may still be laid out behind its clip, but are NOT visible.
        const clip = layoutMode === "reserved" ? frame.getBoundingClientRect() : null;
        const visible = {
          left: Math.max(0, rect.left, clip?.left ?? 0),
          right: Math.min(innerWidth, rect.right, clip?.right ?? innerWidth),
          top: Math.max(0, rect.top, clip?.top ?? 0),
          bottom: Math.min(innerHeight, rect.bottom, clip?.bottom ?? innerHeight),
        };
        if (visible.right <= visible.left || visible.bottom <= visible.top) return;
        meaningfulSamples += 1;
        if (
          Math.min(tip.right, visible.right) > Math.max(tip.left, visible.left) + 0.5 &&
          Math.min(tip.bottom, visible.bottom) > Math.max(tip.top, visible.top) + 0.5
        )
          maskedReading.push(description);
      };
      // For flow mode the frame includes document content above the Dock. Check
      // actual rendered text/control bounds, not the full frame rectangle.
      const walker = document.createTreeWalker(frame, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const parent = node.parentElement;
        if (
          !parent ||
          parent.closest("[aria-hidden='true'],[hidden]") ||
          getComputedStyle(parent).visibility === "hidden" ||
          getComputedStyle(parent).display === "none"
        )
          continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of Array.from(range.getClientRects())) {
          consider(rect, `reading text: ${node.textContent.trim().slice(0, 36)}`);
        }
      }
      for (const node of frame.querySelectorAll<HTMLElement>(
        "a[href],button:not(:disabled),input,select,textarea",
      )) {
        if (node.closest("[aria-hidden='true'],[hidden]")) continue;
        consider(node.getBoundingClientRect(), `reading control: ${node.tagName}`);
      }
      const viewport = {
        left: Math.max(0, visualViewport?.offsetLeft ?? 0),
        top: Math.max(0, visualViewport?.offsetTop ?? 0),
        right: Math.min(
          innerWidth,
          (visualViewport?.offsetLeft ?? 0) + (visualViewport?.width ?? innerWidth),
        ),
        bottom: Math.min(
          innerHeight,
          (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? innerHeight),
        ),
      };
      const rootFontPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const header = frame.querySelector<HTMLElement>(".topbar");
      const main = frame.querySelector<HTMLElement>("main");
      const usableReadingHeight =
        frame.getBoundingClientRect().height -
        (header?.getBoundingClientRect().height ?? 0) -
        (Number.parseFloat(getComputedStyle(frame).paddingTop) || 0) -
        (main ? Number.parseFloat(getComputedStyle(main).paddingTop) || 0 : 0);
      return {
        rect: tip.toJSON(),
        viewport,
        text: surface.textContent?.trim(),
        scrollWidth: surface.scrollWidth,
        clientWidth: surface.clientWidth,
        scrollHeight: surface.scrollHeight,
        clientHeight: surface.clientHeight,
        navMasked: intersects(tip, nav.getBoundingClientRect()),
        readerMasked: intersects(tip, frame.getBoundingClientRect()),
        maskedLinks: maskedLinks.map((link) => link.getAttribute("aria-label")),
        maskedReading,
        meaningfulSamples,
        scrollY: window.scrollY,
        trigger: triggerRect.toJSON(),
        neighbor: neighborRect.toJSON(),
        requestedOutward,
        resolvedSide: surface.getAttribute("data-side"),
        lateralAvailable,
        lateralNeeded: tip.width,
        rootFont: getComputedStyle(document.documentElement).fontSize,
        tooltipFont: visibleStyle.font,
        modeChoice: document
          .querySelector(".shell-auxiliary")
          ?.getAttribute("data-tooltip-placement"),
        readingHeight: frame.getBoundingClientRect().height,
        usableReadingHeight,
        minimumReadingHeight: Math.max(224, 14 * rootFontPx),
        auxiliary: document.querySelector(".shell-auxiliary")?.getBoundingClientRect().toJSON(),
        banner: document.querySelector(".update-banner")?.getBoundingClientRect().toJSON() ?? null,
      };
    },
    { layoutMode: mode, label },
  );
  const at = `${mode} ${label}: ${JSON.stringify(report)}`;
  if (process.env.LYCEUM_B3_GEOMETRY === "1") console.log(`B3_TOOLTIP_GEOMETRY ${at}`);
  expect(report.rect.width, at).toBeGreaterThan(0);
  expect(report.rect.height, at).toBeGreaterThan(0);
  expect(report.rect.left, at).toBeGreaterThanOrEqual(report.viewport.left - 1);
  expect(report.rect.top, at).toBeGreaterThanOrEqual(report.viewport.top - 1);
  expect(report.rect.right, at).toBeLessThanOrEqual(report.viewport.right + 1);
  expect(report.rect.bottom, at).toBeLessThanOrEqual(report.viewport.bottom + 1);
  expect(report.clientWidth, at).toBeGreaterThan(0);
  expect(report.scrollWidth, at).toBeLessThanOrEqual(report.clientWidth + 1);
  expect(report.scrollHeight, at).toBeLessThanOrEqual(report.clientHeight + 1);
  expect(report.maskedLinks, at).toEqual([]);
  expect(report.meaningfulSamples, at).toBeGreaterThan(0);
  expect(report.maskedReading, at).toEqual([]);
  if (mode === "reserved") {
    expect(report.readerMasked, at).toBe(false);
    expect(report.navMasked, at).toBe(false);
    expect(report.usableReadingHeight, at).toBeGreaterThanOrEqual(report.minimumReadingHeight - 1);
  }
  return report;
}

// Width and font boundaries: the width-dependent placement cannot assume
// that a 16px root always has room beside two real operable Dock links.
const boundaryScenarios = [
  { width: 304, height: 720, root: 16, mode: "reserved" },
  { width: 312, height: 720, root: 16, mode: "reserved" },
  { width: 328, height: 720, root: 16, mode: "reserved" },
  { width: 344, height: 720, root: 16, mode: "reserved" },
  { width: 360, height: 720, root: 16, mode: "reserved" },
  { width: 320, height: 720, root: 18, mode: "reserved" },
  { width: 344, height: 720, root: 18, mode: "reserved" },
  { width: 360, height: 720, root: 19, mode: "reserved" },
  { width: 352, height: 760, root: 20, mode: "reserved" },
  { width: 320, height: 256, root: 16, mode: "flow" },
] as const;

for (const scenario of boundaryScenarios) {
  for (const locale of ["en", "es"] as const) {
    for (const dir of ["ltr", "rtl"] as const) {
      test(`audit B3 lateral width boundary ${scenario.width}x${scenario.height}/${scenario.root}px ${locale} ${dir}`, async ({
        page,
      }) => {
        test.slow();
        await page.setViewportSize({ width: scenario.width, height: scenario.height });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await prepare(page, locale, dir, scenario.root);
        await expect(page.locator(".application")).toHaveAttribute(
          "data-navigation-mode",
          scenario.mode,
        );
        const labels = translations[locale];
        const nav = page.getByRole("navigation", { name: labels.landmark });
        for (const label of labels.links) {
          await nav.getByRole("link", { name: label }).hover();
          const report = await assertVisibleTooltipClearance(page, label, scenario.mode);
          if (scenario.width === 304 && scenario.root === 16) {
            expect(report.modeChoice).toBe("top");
          }
          if (scenario.width === 360 && scenario.root === 16) {
            expect(report.modeChoice).toBe("outward");
            expect(report.resolvedSide).toBe(report.requestedOutward);
          }
          if (
            process.env.LYCEUM_B3_WIDTH_CAPTURE === "1" &&
            ((scenario.width === 304 && scenario.root === 16) ||
              (scenario.width === 360 && scenario.root === 19) ||
              scenario.mode === "flow")
          ) {
            await page.screenshot({
              path: `docs/qa/m0-017-stage-b3/audit-width-${scenario.width}x${scenario.height}-${scenario.root}px-${locale}-${dir}-${label.toLowerCase()}.png`,
              animations: "disabled",
            });
          }
          await page.keyboard.press("Escape");
          await expect(page.locator(".lyceum-tooltip[role='tooltip']")).not.toBeVisible();
        }
      });
    }
  }
}

for (const scenario of scenarios) {
  for (const locale of ["en", "es"] as const) {
    for (const dir of ["ltr", "rtl"] as const) {
      test(`audit B3 Tooltip ${scenario.width}x${scenario.height}/${scenario.root}px ${locale} ${dir}`, async ({
        page,
      }) => {
        test.slow();
        await page.setViewportSize({ width: scenario.width, height: scenario.height });
        // The short in-flow mode legitimately scrolls the focused trigger.
        // Exercise a real supported reduced-motion setting so the Tooltip
        // becomes fully readable without racing its 120ms entrance animation.
        if (scenario.mode === "flow") {
          await page.emulateMedia({ reducedMotion: "reduce" });
        }
        await prepare(page, locale, dir, scenario.root);
        await expect(page.locator(".application")).toHaveAttribute(
          "data-navigation-mode",
          scenario.mode,
        );
        const labels = translations[locale];
        const nav = page.getByRole("navigation", { name: labels.landmark });
        for (const label of labels.links) {
          const link = nav.getByRole("link", { name: label });
          // Pointer-only navigation, including hoverable Tooltip dismissal.
          await link.hover();
          await assertVisibleTooltipClearance(page, label, scenario.mode);
          if (
            process.env.LYCEUM_B3_WIDTH_CAPTURE === "1" &&
            ((scenario.width === 320 && scenario.height === 640 && scenario.root === 16) ||
              (scenario.width === 390 &&
                scenario.height === 844 &&
                scenario.root === 32 &&
                locale === "es" &&
                dir === "rtl"))
          ) {
            await page.screenshot({
              path: `docs/qa/m0-017-stage-b3/audit-width-${scenario.width}x${scenario.height}-${scenario.root}px-${locale}-${dir}-${label.toLowerCase()}.png`,
              animations: "disabled",
            });
          }
          if (
            process.env.LYCEUM_B3_AUDIT_CAPTURE === "1" &&
            label === labels.links[1] &&
            ((scenario.width === 390 && scenario.root === 32 && locale === "es" && dir === "rtl") ||
              (scenario.width === 320 && scenario.root === 32 && locale === "en" && dir === "ltr"))
          ) {
            await page.screenshot({
              path: `docs/qa/m0-017-stage-b3/audit-corrected-tooltip-${scenario.width}x${scenario.height}-${locale}-${dir}.png`,
              animations: "disabled",
            });
          }
          if (
            process.env.LYCEUM_B3_AUDIT_CAPTURE === "1" &&
            scenario.width === 320 &&
            scenario.height === 844 &&
            scenario.root === 20 &&
            locale === "en" &&
            dir === "ltr" &&
            label === "Settings"
          ) {
            await page.screenshot({
              path: "docs/qa/m0-017-stage-b3/audit-corrected-tooltip-320x844-20px-en-ltr.png",
              animations: "disabled",
            });
          }
          await page.mouse.move(scenario.width - 2, 2, { steps: 5 });
          await expect(page.locator(".lyceum-tooltip[role='tooltip']")).not.toBeVisible();
        }
        // Reset hover before natural keyboard Tab traversal. No force-focus.
        await page.goto("/");
        await page.evaluate(
          ({ direction, root }) => {
            document.documentElement.dir = direction;
            document.documentElement.style.fontSize = `${root}px`;
          },
          { direction: dir, root: scenario.root },
        );
        await expect(page.locator(".application")).toHaveAttribute(
          "data-navigation-mode",
          scenario.mode,
        );
        const focused = new Set<string>();
        for (let step = 0; step < 35 && focused.size < 2; step++) {
          await page.keyboard.press("Tab");
          const current = await page.evaluate(() => {
            const active = document.activeElement;
            return active?.closest(".icon-dock") && active?.tagName === "A"
              ? active.getAttribute("aria-label")
              : null;
          });
          if (!current || focused.has(current)) continue;
          expect(labels.links).toContain(current);
          focused.add(current);
          if (scenario.mode === "flow") {
            // Natural Tab reveals offscreen in-flow links with document scroll.
            // Radix legitimately dismisses its transient hint on that
            // ancestor scroll; the separate pointer pass above validates
            // the real visible Tooltip after scrolling has settled.
            // Do not require a popup to survive a scroll that dismisses it.
            await expect(nav.getByRole("link", { name: current })).toBeFocused();
            await page.keyboard.press("Escape");
            continue;
          }
          await assertVisibleTooltipClearance(page, current, scenario.mode);
          await page.keyboard.press("Escape");
          await expect(page.locator(".lyceum-tooltip[role='tooltip']")).not.toBeVisible();
          await expect(nav.getByRole("link", { name: current })).toBeFocused();
        }
        expect(Array.from(focused), `Keyboard traversal ${locale} ${dir}`).toEqual([
          ...labels.links,
        ]);
      });
    }
  }
}

test("audit B3 live width, locale and height transitions keep safe Tooltip lanes and native focus", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 360, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepare(page, "en", "ltr", 16);
  const auxiliary = page.locator(".shell-auxiliary");
  const readingFrame = page.locator(".application-frame");
  await expect(auxiliary).toHaveAttribute("data-tooltip-placement", "outward");
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  const initialPadding = await auxiliary.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).paddingTop),
  );
  const initialReading = await readingFrame.evaluate(
    (element) => element.getBoundingClientRect().height,
  );

  // Reach the trigger by ordinary Tab navigation (never force focus).
  const settings = page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link", {
    name: "Settings",
  });
  for (let step = 0; step < 35; step++) {
    if (await settings.evaluate((element) => document.activeElement === element)) break;
    await page.keyboard.press("Tab");
  }
  await expect(settings).toBeFocused();
  await page.setViewportSize({ width: 304, height: 720 });
  await expect(auxiliary).toHaveAttribute("data-tooltip-placement", "top");
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  await expect(settings).toBeFocused();
  const focusedBounds = await settings.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      ring: Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset),
      outline: style.outlineStyle,
    };
  });
  expect(focusedBounds.outline).not.toBe("none");
  expect(focusedBounds.left - focusedBounds.ring).toBeGreaterThanOrEqual(-0.5);
  expect(focusedBounds.right + focusedBounds.ring).toBeLessThanOrEqual(304.5);
  expect(focusedBounds.top - focusedBounds.ring).toBeGreaterThanOrEqual(-0.5);
  expect(focusedBounds.bottom + focusedBounds.ring).toBeLessThanOrEqual(720.5);
  const narrowPadding = await auxiliary.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).paddingTop),
  );
  expect(narrowPadding).toBeGreaterThan(initialPadding);
  await settings.hover();
  await assertVisibleTooltipClearance(page, "Settings", "reserved");
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 360, height: 720 });
  await expect(auxiliary).toHaveAttribute("data-tooltip-placement", "outward");
  const restoredPadding = await auxiliary.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).paddingTop),
  );
  expect(restoredPadding).toBe(initialPadding);
  const restoredReading = await readingFrame.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  expect(Math.abs(restoredReading - initialReading)).toBeLessThanOrEqual(1);
  await settings.hover();
  await assertVisibleTooltipClearance(page, "Settings", "reserved");
  await page.keyboard.press("Escape");

  // Client-side navigation and the real preference selector can replace the
  // label after mount. Both the observer and measured lane must respond.
  await settings.click();
  await page.locator("#language").selectOption("es");
  await page
    .getByRole("navigation", { name: "Navegación rápida" })
    .getByRole("link", { name: "Hoy" })
    .click();
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.style.fontSize = "20px";
  });
  await page.setViewportSize({ width: 304, height: 720 });
  await expect(auxiliary).toHaveAttribute("data-tooltip-placement", "top");
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  const nav = page.getByRole("navigation", { name: "Navegación rápida" });
  for (const name of ["Hoy", "Ajustes"]) {
    await nav.getByRole("link", { name }).hover();
    await assertVisibleTooltipClearance(page, name, "reserved");
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 304, height: 256 });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  await nav.getByRole("link", { name: "Ajustes" }).scrollIntoViewIfNeeded();
  await nav.getByRole("link", { name: "Ajustes" }).hover();
  await assertVisibleTooltipClearance(page, "Ajustes", "flow");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 304, height: 720 });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  await nav.getByRole("link", { name: "Hoy" }).hover();
  await assertVisibleTooltipClearance(page, "Hoy", "reserved");
});

test("audit B3 320x256 at 32px root naturally reveals both complete focused Dock links and rings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  const nav = page.getByRole("navigation", { name: "Quick navigation" });
  const focusRecords: Array<{
    name: string;
    scrollY: number;
    outlineStyle: string;
    outlineWidth: number;
    outlineOffset: number;
    rect: DOMRect;
    clipped: string[];
  }> = [];
  for (let step = 0; step < 35 && focusRecords.length < 2; step++) {
    await page.keyboard.press("Tab");
    const current = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.closest(".icon-dock") && active.tagName === "A"
        ? active.getAttribute("aria-label")
        : null;
    });
    if (!current || focusRecords.some((record) => record.name === current)) continue;
    const link = nav.getByRole("link", { name: current });
    await expect(link).toBeFocused();
    const result = await link.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const outlineWidth = Number.parseFloat(style.outlineWidth);
      const outlineOffset = Number.parseFloat(style.outlineOffset);
      const ring = Math.max(0, outlineWidth + outlineOffset);
      const clipped: string[] = [];
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const overflow = getComputedStyle(parent);
        if (!/(hidden|clip|scroll|auto)/.test(`${overflow.overflowX} ${overflow.overflowY}`))
          continue;
        const bounds = parent.getBoundingClientRect();
        if (
          rect.left - ring < bounds.left - 1 ||
          rect.right + ring > bounds.right + 1 ||
          rect.top - ring < bounds.top - 1 ||
          rect.bottom + ring > bounds.bottom + 1
        )
          clipped.push(parent.className || parent.tagName);
      }
      return {
        scrollY: window.scrollY,
        outlineStyle: style.outlineStyle,
        outlineWidth,
        outlineOffset,
        ring,
        rect: rect.toJSON(),
        clipped,
      };
    });
    const observed = { name: current, ...result };
    focusRecords.push(observed);
    const evidence = `${current}: ${JSON.stringify(observed)}`;
    expect(result.scrollY, evidence).toBeGreaterThan(0);
    expect(result.outlineStyle, evidence).not.toBe("none");
    expect(result.outlineWidth, evidence).toBeGreaterThanOrEqual(3);
    expect(result.rect.left - result.ring, evidence).toBeGreaterThanOrEqual(-0.5);
    expect(result.rect.right + result.ring, evidence).toBeLessThanOrEqual(320.5);
    expect(result.rect.top - result.ring, evidence).toBeGreaterThanOrEqual(-0.5);
    expect(result.rect.bottom + result.ring, evidence).toBeLessThanOrEqual(256.5);
    expect(result.clipped, evidence).toEqual([]);
    if (process.env.LYCEUM_B3_AUDIT_CAPTURE === "1") {
      await page.screenshot({
        path: `docs/qa/m0-017-stage-b3/audit-short-natural-focus-${current.toLowerCase()}.png`,
        animations: "disabled",
      });
    }
  }
  expect(
    focusRecords.map(({ name }) => name),
    "Both Dock links must be reachable in natural Tab order",
  ).toEqual(["Today", "Settings"]);
  await page.keyboard.press("Shift+Tab");
  await expect(nav.getByRole("link", { name: "Today" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link", { name: "Settings" })).toBeFocused();
});
