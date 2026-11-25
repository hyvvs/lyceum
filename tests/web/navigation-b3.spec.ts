import { type Page, expect, test } from "@playwright/test";

const pill = (page: Page) => page.getByRole("navigation", { name: "Primary navigation" });
const dock = (page: Page) => page.getByRole("navigation", { name: "Quick navigation" });

test("B3 uses real exported nav primitives and maintains native current routes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(pill(page)).toHaveClass(/lyceum-pill-nav/);
  await expect(dock(page)).toHaveClass(/lyceum-dock/);
  await expect(pill(page).getByRole("link", { name: "Today" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(dock(page).getByRole("link", { name: "Today" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(dock(page).getByRole("link", { name: "Settings" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
  await dock(page).getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Make this space yours." })).toBeFocused();
  await expect(pill(page).getByRole("link", { name: "Settings" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(dock(page).getByRole("link", { name: "Settings" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("desktop Dock clears actual rendered meaningful content in LTR/RTL during reading scroll", async ({
  page,
}) => {
  for (const width of [1024, 1440]) {
    for (const dir of ["ltr", "rtl"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.evaluate((direction) => {
        document.documentElement.dir = direction;
      }, dir);
      const read = async () =>
        page.evaluate(() => {
          const nav = document.querySelector<HTMLElement>(".icon-dock");
          const main = document.querySelector<HTMLElement>("#main-content");
          const frame = document.querySelector<HTMLElement>(".application-frame");
          if (!nav || !main || !frame) throw new Error("Actual desktop reading geometry absent");
          const navRect = nav.getBoundingClientRect();
          const frameRect = frame.getBoundingClientRect();
          const visible = {
            left: Math.max(0, frameRect.left),
            right: Math.min(innerWidth, frameRect.right),
            top: Math.max(0, frameRect.top),
            bottom: Math.min(innerHeight, frameRect.bottom),
          };
          const overlapping: string[] = [];
          let sampled = 0;
          const inspect = (r: DOMRect, label: string) => {
            const left = Math.max(r.left, visible.left);
            const right = Math.min(r.right, visible.right);
            const top = Math.max(r.top, visible.top);
            const bottom = Math.min(r.bottom, visible.bottom);
            if (right <= left || bottom <= top) return;
            sampled++;
            if (
              Math.min(right, navRect.right) > Math.max(left, navRect.left) &&
              Math.min(bottom, navRect.bottom) > Math.max(top, navRect.top)
            ) {
              overlapping.push(label);
            }
          };
          const tree = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
          for (let node = tree.nextNode(); node; node = tree.nextNode()) {
            if (!node.textContent?.trim()) continue;
            const parent = node.parentElement;
            if (!parent || getComputedStyle(parent).visibility === "hidden") continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of Array.from(range.getClientRects())) {
              inspect(rect, node.textContent.trim().slice(0, 36));
            }
          }
          for (const control of main.querySelectorAll<HTMLElement>(
            "a[href],button:not(:disabled),input,select,textarea",
          )) {
            inspect(control.getBoundingClientRect(), control.tagName);
          }
          return { sampled, overlapping };
        });
      const initial = await read();
      expect(initial.sampled, `Initial desktop content ${width} ${dir}`).toBeGreaterThan(0);
      expect(initial.overlapping, `Initial desktop Dock collision ${width} ${dir}`).toEqual([]);
      // Use real laid-out DOM text to force an intermediate scroll position.
      // This is a test-only reading fixture, never a fabricated learner route.
      const availableScroll = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>("#main-content");
        const frame = document.querySelector<HTMLElement>(".application-frame");
        if (!main || !frame) throw new Error("Actual desktop scroll owner unavailable");
        const article = document.createElement("article");
        article.dataset.b3ReadingFixture = "test-only";
        article.setAttribute("aria-label", "Synthetic long-reading clearance fixture");
        for (let index = 0; index < 48; index++) {
          const line = document.createElement("p");
          line.textContent = `Reading-clearance fixture line ${index}: visible characters must never intersect the floating Dock while the actual reader is scrolled.`;
          article.append(line);
        }
        main.append(article);
        return frame.scrollHeight - frame.clientHeight;
      });
      expect(
        availableScroll,
        `Desktop should allow intermediate reader scroll ${width} ${dir}`,
      ).toBeGreaterThan(300);
      await page.mouse.move(width * 0.6, 500);
      await page.mouse.wheel(0, 450);
      await expect
        .poll(() => page.locator(".application-frame").evaluate((node) => node.scrollTop))
        .toBeGreaterThan(100);
      const intermediate = await read();
      expect(intermediate.sampled, `Intermediate desktop content ${width} ${dir}`).toBeGreaterThan(
        0,
      );
      expect(
        intermediate.overlapping,
        `Intermediate desktop Dock collision ${width} ${dir}`,
      ).toEqual([]);
    }
  }
});

test("desktop preserves honest named duplicate destinations in natural keyboard order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(pill(page)).toBeVisible();
  await expect(dock(page)).toBeVisible();
  const observed: string[] = [];
  for (let index = 0; index < 26 && observed.length < 4; index++) {
    await page.keyboard.press("Tab");
    const next = await page.evaluate(() => {
      const current = document.activeElement;
      const landmark = current?.closest("nav[aria-label]");
      if (!landmark || current?.tagName !== "A") return null;
      const label = landmark.getAttribute("aria-label");
      if (label !== "Primary navigation" && label !== "Quick navigation") return null;
      return `${label}:${current.getAttribute("aria-label") ?? current.textContent?.trim()}`;
    });
    if (next) observed.push(next);
  }
  expect(observed).toEqual([
    "Primary navigation:Today",
    "Primary navigation:Settings",
    "Quick navigation:Today",
    "Quick navigation:Settings",
  ]);
  for (const nav of [pill(page), dock(page)]) {
    expect(await nav.locator("a[href]").count()).toBe(2);
    expect(await nav.locator("a[aria-hidden], a[tabindex='-1'], button").count()).toBe(0);
    await expect(nav.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
  }
});

test("real Dock Tooltip opens by keyboard/pointer, dismisses on Escape and routes without stealing focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const today = dock(page).getByRole("link", { name: "Today" });
  await today.focus();
  await expect(today).toBeFocused();
  const hint = page.getByRole("tooltip");
  await expect(hint).toContainText("Today");
  const hintRect = await hint.boundingBox();
  expect(hintRect).not.toBeNull();
  expect(hintRect?.x).toBeGreaterThanOrEqual(0);
  expect(hintRect?.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press("Escape");
  await expect(hint).not.toBeVisible();
  await expect(today).toBeFocused();
  // Pointer dismissal is a separate fresh interaction. Keyboard focus must
  // correctly keep a tooltip open after mouseleave.
  await page.goto("/");
  const hoverTrigger = dock(page).getByRole("link", { name: "Today" });
  await hoverTrigger.hover();
  const pointerHint = page.getByRole("tooltip");
  await expect(pointerHint).toBeVisible();
  const pointerBounds = await pointerHint.boundingBox();
  if (!pointerBounds) throw new Error("Actual tooltip pointer bounds missing");
  await page.mouse.move(
    pointerBounds.x + pointerBounds.width / 2,
    pointerBounds.y + pointerBounds.height / 2,
    { steps: 8 },
  );
  await expect(pointerHint).toBeVisible();
  await page.mouse.move(1400, 800, { steps: 12 });
  await expect(pointerHint).not.toBeVisible();
  await dock(page).getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Make this space yours." })).toBeFocused();
  await expect(dock(page).getByRole("link", { name: "Settings" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("mobile reserved Dock Tooltip does not mask the real reading scrollport or operable nav in LTR/RTL", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const direction of ["ltr", "rtl"] as const) {
    await page.goto("/");
    await page.evaluate((dir) => {
      document.documentElement.dir = dir;
    }, direction);
    await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
    for (const name of ["Today", "Settings"]) {
      const trigger = dock(page).getByRole("link", { name });
      await trigger.focus();
      await expect(page.getByRole("tooltip")).toContainText(name);
      const geometry = await page.evaluate(() => {
        const surface = document.querySelector<HTMLElement>(".lyceum-tooltip[role='tooltip']");
        if (!surface || getComputedStyle(surface).visibility === "hidden") {
          throw new Error("Visible B3 Tooltip surface missing");
        }
        const tip = surface.getBoundingClientRect();
        const nav = document.querySelector<HTMLElement>(".icon-dock")?.getBoundingClientRect();
        const reading = document
          .querySelector<HTMLElement>(".application-frame")
          ?.getBoundingClientRect();
        if (!tip || !nav || !reading) throw new Error("B3 real Tooltip/reader geometry missing");
        if (tip.width <= 0 || tip.height <= 0) {
          throw new Error("Visible B3 Tooltip has empty measured bounds");
        }
        const overlaps = (a: DOMRect, b: DOMRect) =>
          Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
          Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
        return {
          tooltip: { x: tip.x, y: tip.y, width: tip.width, height: tip.height },
          readingMasked: overlaps(tip, reading),
          navMasked: overlaps(tip, nav),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(
        geometry.readingMasked,
        `B3 tooltip masks reading ${direction} ${name}: ${JSON.stringify(geometry)}`,
      ).toBe(false);
      expect(
        geometry.navMasked,
        `B3 tooltip masks navigation ${direction} ${name}: ${JSON.stringify(geometry)}`,
      ).toBe(false);
      expect(geometry.overflow).toBe(false);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("tooltip")).not.toBeVisible();
    }
  }
});

test("B3 preserves B2 mobile scroll ownership and short-height measured flow fallback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  await expect(pill(page)).toBeHidden();
  await expect(dock(page)).toHaveClass(/lyceum-dock/);
  const reserved = await page.evaluate(() => {
    const reading = document.querySelector<HTMLElement>(".application-frame");
    const nav = document.querySelector<HTMLElement>(".icon-dock");
    if (!reading || !nav) throw new Error("B3 dedicated scrollport missing");
    return {
      frameBottom: reading.getBoundingClientRect().bottom,
      navTop: nav.getBoundingClientRect().top,
      position: getComputedStyle(nav).position,
      overflow: getComputedStyle(reading).overflowY,
    };
  });
  expect(reserved.position).toBe("static");
  expect(reserved.overflow).toBe("auto");
  expect(reserved.frameBottom).toBeLessThanOrEqual(reserved.navTop);
  await page.setViewportSize({ width: 320, height: 256 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  await expect(dock(page).getByRole("link", { name: "Settings" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await dock(page).getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Make this space yours." })).toBeFocused();
});
