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
  const report = await page.evaluate((layoutMode) => {
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
    };
  }, mode);
  const at = `${mode} ${label}: ${JSON.stringify(report)}`;
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
  }
  return report;
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
