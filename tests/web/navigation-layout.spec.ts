import { type Page, expect, test } from "@playwright/test";

const dock = (page: Page) => page.getByRole("navigation", { name: "Quick navigation" });
const screenshot = async (page: Page, name: string) => {
  if (process.env.LYCEUM_B2_CAPTURE === "1") {
    await page.screenshot({ path: `docs/qa/m0-017-stage-b2/${name}.png` });
  }
};

async function measuredReadingSpace(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(".icon-dock");
    const banner = document.querySelector<HTMLElement>(".update-banner");
    const header = document.querySelector<HTMLElement>(".topbar");
    const frame = document.querySelector<HTMLElement>(".application-frame");
    const main = document.querySelector<HTMLElement>("main");
    const auxiliary = document.querySelector<HTMLElement>(".shell-auxiliary");
    if (!nav || !header || !auxiliary || !frame || !main)
      throw new Error("Measured navigation shell absent");
    const style = getComputedStyle(auxiliary);
    const navHeight = nav.getBoundingClientRect().height;
    const bannerHeight = banner?.getBoundingClientRect().height ?? 0;
    const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    const gap = Number.parseFloat(style.rowGap) || 0;
    const viewportHeight = Math.min(innerHeight, visualViewport?.height ?? innerHeight);
    const rootFont = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const navRowHeight = innerWidth <= 900 ? navHeight : 0;
    const initialReadingInset =
      Number.parseFloat(getComputedStyle(frame).paddingTop) +
      Number.parseFloat(getComputedStyle(main).paddingTop);
    return {
      viewportHeight,
      rootFont,
      navHeight,
      navRowHeight,
      initialReadingInset,
      bannerHeight,
      headerHeight: header.getBoundingClientRect().height,
      minReading: Math.max(224, 14 * rootFont),
      usableReading:
        viewportHeight -
        navRowHeight -
        bannerHeight -
        padding -
        (bannerHeight ? gap : 0) -
        header.getBoundingClientRect().height -
        initialReadingInset,
    };
  });
}

test("normal mobile keeps the Dock in a separate persistent row during real reading scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const app = page.locator(".application");
  await expect(app).toHaveAttribute("data-navigation-mode", "reserved");
  const initial = await page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>(".application-frame");
    const nav = document.querySelector<HTMLElement>(".icon-dock");
    if (!frame || !nav) throw new Error("Real shell geometry absent");
    return {
      frameBottom: frame.getBoundingClientRect().bottom,
      frameHeight: frame.clientHeight,
      frameOverflow: getComputedStyle(frame).overflowY,
      dockTop: nav.getBoundingClientRect().top,
      dockBottom: nav.getBoundingClientRect().bottom,
      dockPosition: getComputedStyle(nav).position,
      scrollTop: frame.scrollTop,
      documentScroll: window.scrollY,
      controls: Array.from(nav.querySelectorAll("a[href]")).map((link) => ({
        width: link.getBoundingClientRect().width,
        height: link.getBoundingClientRect().height,
      })),
    };
  });
  expect(initial.frameOverflow).toBe("auto");
  expect(initial.dockPosition).toBe("static");
  expect(initial.frameBottom).toBeLessThanOrEqual(initial.dockTop);
  expect(initial.controls.length).toBe(2);
  expect(initial.controls.every((rect) => rect.width >= 44 && rect.height >= 44)).toBe(true);
  const readingSpace = await measuredReadingSpace(page);
  expect(readingSpace.usableReading).toBeGreaterThanOrEqual(readingSpace.minReading);
  console.log(`B2_READING_SPACE mobile-390 ${JSON.stringify(readingSpace)}`);

  await page.mouse.move(190, Math.round(initial.frameHeight / 2));
  await page.mouse.wheel(0, 420);
  await expect
    .poll(() => page.locator(".application-frame").evaluate((node) => node.scrollTop))
    .toBeGreaterThan(100);
  const after = await page.evaluate(() => ({
    dockTop: document.querySelector(".icon-dock")?.getBoundingClientRect().top,
    documentScroll: window.scrollY,
    scrollTop: document.querySelector(".application-frame")?.scrollTop,
  }));
  expect(after.dockTop).toBeCloseTo(initial.dockTop, 1);
  expect(after.documentScroll).toBe(0);
  expect(after.scrollTop).toBeGreaterThan(initial.scrollTop);
  await screenshot(page, "mobile-persistent-row");
});

test("short viewport and 200% root text use reachable in-flow navigation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  await expect(dock(page)).toHaveCSS("position", "static");
  await expect(page.locator(".application-frame")).toHaveCSS("overflow-y", "visible");
  const readingSpace = await measuredReadingSpace(page);
  expect(readingSpace.usableReading).toBeLessThan(readingSpace.minReading);
  console.log(`B2_READING_SPACE short-320-text-200 ${JSON.stringify(readingSpace)}`);

  await page.mouse.move(160, 140);
  for (let i = 0; i < 80; i++) {
    if (await dock(page).isVisible()) {
      const bounds = await dock(page).boundingBox();
      if (bounds && bounds.top >= 0 && bounds.bottom <= 256) break;
    }
    await page.mouse.wheel(0, 240);
  }
  await expect(dock(page)).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(dock(page).getByRole("link", { name: "Today" })).toBeVisible();
  await expect(dock(page).getByRole("link", { name: "Settings" })).toBeVisible();
  await screenshot(page, "short-in-flow");
});

test("natural keyboard traversal preserves skip navigation, visible Dock focus and lazy heading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const todayNav = dock(page).getByRole("link", { name: "Today" });
  let reached = false;
  for (let step = 0; step < 20; step++) {
    await page.keyboard.press("Tab");
    if (await todayNav.evaluate((node) => document.activeElement === node)) {
      reached = true;
      break;
    }
  }
  expect(reached, "Dock is reachable by natural keyboard Tab order").toBe(true);
  const focus = await todayNav.evaluate((element) => ({
    rect: element.getBoundingClientRect().toJSON(),
    outlineStyle: getComputedStyle(element).outlineStyle,
    outlineWidth: getComputedStyle(element).outlineWidth,
  }));
  expect(focus.rect.top).toBeGreaterThanOrEqual(0);
  expect(focus.rect.bottom).toBeLessThanOrEqual(844);
  expect(focus.outlineStyle).not.toBe("none");
  expect(Number.parseFloat(focus.outlineWidth)).toBeGreaterThan(0);
  await screenshot(page, "keyboard-focus");

  await page.keyboard.press("Tab");
  const settingsNav = dock(page).getByRole("link", { name: "Settings" });
  await expect(settingsNav).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(todayNav).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Make this space yours." })).toBeFocused();
  await expect
    .poll(async () =>
      page.getByRole("heading", { name: "Make this space yours." }).evaluate((node) => {
        const frame = document.querySelector(".application-frame")?.getBoundingClientRect();
        const heading = node.getBoundingClientRect();
        return !!frame && heading.top >= frame.top - 3 && heading.top < frame.bottom;
      }),
    )
    .toBe(true);
});

test("resizing between scroll owners preserves a useful reading offset without replacing focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.mouse.move(180, 300);
  await page.mouse.wheel(0, 400);
  await expect
    .poll(() => page.locator(".application-frame").evaluate((node) => node.scrollTop))
    .toBeGreaterThan(100);
  const originalOffset = await page
    .locator(".application-frame")
    .evaluate((node) => node.scrollTop);
  await page.setViewportSize({ width: 320, height: 256 });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  const flowOffset = await page.evaluate(() => window.scrollY);
  expect(flowOffset).toBeGreaterThan(0);
  expect(Math.abs(flowOffset - originalOffset)).toBeLessThan(130);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  const restored = await page.locator(".application-frame").evaluate((node) => node.scrollTop);
  expect(Math.abs(restored - flowOffset)).toBeLessThan(130);

  const link = dock(page).getByRole("link", { name: "Today" });
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    if (await link.evaluate((node) => document.activeElement === node)) break;
  }
  await expect(link).toBeFocused();
  await page.setViewportSize({ width: 320, height: 256 });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  await expect(link).toBeFocused();
  await expect(link).toBeInViewport();
});

test("mode threshold is history-independent and focused Settings controls survive resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 440 });
  await page.goto("/settings");
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  const atFourForty = await measuredReadingSpace(page);
  expect(atFourForty.usableReading).toBeGreaterThanOrEqual(atFourForty.minReading);
  await page.setViewportSize({ width: 390, height: 256 });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  await page.setViewportSize({ width: 390, height: 440 });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  await page.reload();
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");

  const language = page.getByLabel("Language");
  let found = false;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    if (await language.evaluate((node) => node === document.activeElement)) {
      found = true;
      break;
    }
  }
  expect(found, "Native keyboard order must reach Settings language control").toBe(true);
  await page.setViewportSize({ width: 320, height: 256 });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  await expect(language).toBeFocused();
  await expect(language).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  await expect(language).toBeFocused();
  await expect(language).toBeInViewport();
});

test("extremely short wide viewport uses the same measured in-flow safety fallback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 260 });
  await page.goto("/");
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  await expect(dock(page)).toHaveCSS("position", "static");
  const readingSpace = await measuredReadingSpace(page);
  expect(readingSpace.usableReading).toBeLessThan(readingSpace.minReading);
  console.log(`B2_READING_SPACE desktop-short ${JSON.stringify(readingSpace)}`);
  await dock(page).scrollIntoViewIfNeeded();
  await expect(dock(page)).toBeInViewport();
});

test("enlarged 320px layout has no horizontal document overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  const details = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    mode: document.querySelector(".application")?.getAttribute("data-navigation-mode"),
    offending: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((node) => ({
        name: typeof node.className === "string" ? node.className : node.tagName,
        left: Number(node.getBoundingClientRect().left.toFixed(1)),
        right: Number(node.getBoundingClientRect().right.toFixed(1)),
      }))
      .filter((item) => item.right > innerWidth + 1 || item.left < -1)
      .slice(0, 12),
  }));
  console.log(`B2_TEXT_OVERFLOW ${JSON.stringify(details)}`);
  expect(details.pageWidth).toBeLessThanOrEqual(details.viewportWidth);
});

test("RTL mobile, opaque high contrast and reduced motion keep usable native navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.dataset.transparency = "off";
    document.documentElement.dataset.contrast = "high";
  });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  await expect(page.locator(".atmosphere")).toHaveCSS("display", "none");
  const actionColors = await page
    .getByRole("link", { name: "Personalize your space" })
    .evaluate((action) => {
      const label = action.querySelector("span");
      if (!label) throw new Error("Real primary action label missing");
      const parent = getComputedStyle(action);
      const text = getComputedStyle(label);
      return {
        parentColor: parent.color,
        parentBackground: parent.backgroundColor,
        labelColor: text.color,
        labelBackground: text.backgroundColor,
        labelForcedColors: text.forcedColorAdjust,
      };
    });
  console.log(`B2_FORCED_COLORS_ACTION ${JSON.stringify(actionColors)}`);
  expect(actionColors.labelForcedColors).toBe("none");
  expect(actionColors.labelBackground).toBe("rgba(0, 0, 0, 0)");
  expect(actionColors.labelColor).not.toBe(actionColors.parentBackground);
  await expect(dock(page).getByRole("link", { name: "Settings" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await screenshot(page, "rtl-opaque-forced-colors");
});

test("desktop preserves centered pill and fixed logical-start vertical Dock under RTL", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  const geometry = async () =>
    page.evaluate(() => {
      const pill = document.querySelector(".pill-navigation")?.getBoundingClientRect();
      const navElement = document.querySelector<HTMLElement>(".icon-dock");
      const nav = navElement?.getBoundingClientRect();
      const main = document.getElementById("main-content")?.getBoundingClientRect();
      if (!pill || !nav || !main || !navElement) throw new Error("Desktop shell geometry missing");
      return {
        pillCenter: (pill.left + pill.right) / 2,
        navLeft: nav.left,
        navRight: nav.right,
        navHeight: nav.height,
        navWidth: nav.width,
        mainLeft: main.left,
        mainRight: main.right,
        navPosition: getComputedStyle(navElement).position,
      };
    });
  const ltr = await geometry();
  expect(ltr.pillCenter).toBeGreaterThan(1440 * 0.35);
  expect(ltr.pillCenter).toBeLessThan(1440 * 0.65);
  expect(ltr.navPosition).toBe("fixed");
  expect(ltr.navHeight).toBeGreaterThan(ltr.navWidth);
  expect(ltr.navRight).toBeLessThan(ltr.mainRight / 2);
  await screenshot(page, "desktop-preserved");
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
  });
  const rtl = await geometry();
  expect(rtl.navLeft).toBeGreaterThan(1440 / 2);
  expect(rtl.navPosition).toBe("fixed");
  await screenshot(page, "desktop-rtl");
});
