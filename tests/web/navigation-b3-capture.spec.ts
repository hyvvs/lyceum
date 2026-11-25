import { expect, test } from "@playwright/test";

test.skip(process.env.LYCEUM_B3_CAPTURE !== "1", "B3 screenshot capture is opt-in");

const capture = (page: import("@playwright/test").Page, name: string) =>
  page.screenshot({ path: `docs/qa/m0-017-stage-b3/${name}.png`, animations: "disabled" });

test("capture actual B3 production desktop RTL/mobile/fallback/Tooltip visual evidence", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".lyceum-pill-nav")).toBeVisible();
  await capture(page, "production-desktop-ltr");
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
  });
  await capture(page, "production-desktop-rtl");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  await capture(page, "production-mobile-reserved");
  await page
    .getByRole("navigation", { name: "Quick navigation" })
    .getByRole("link", { name: "Today" })
    .focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await capture(page, "production-mobile-focused-tooltip");
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 320, height: 256 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  const flowDockLink = page
    .getByRole("navigation", { name: "Quick navigation" })
    .getByRole("link", { name: "Today" });
  await flowDockLink.scrollIntoViewIfNeeded();
  await expect(flowDockLink).toBeInViewport();
  await capture(page, "production-short-200-text-flow");
  await page.setViewportSize({ width: 320, height: 640 });
  await capture(page, "production-200-text-narrow");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await page.getByLabel("Theme", { exact: true }).selectOption("high-contrast");
  await page.goto("/");
  await capture(page, "production-opaque-high-contrast");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await capture(page, "production-forced-colors-emulated");
});
