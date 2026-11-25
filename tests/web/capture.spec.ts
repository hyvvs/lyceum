import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("capture actual desktop/mobile full-glass and opaque/high-contrast app views", async ({
  page,
}) => {
  test.skip(
    process.env.LYCEUM_CAPTURE_WEB !== "1",
    "Screenshots generated on intentional evidence run only",
  );
  const directory = resolve("docs/qa/m0-004-web-shell");
  mkdirSync(directory, { recursive: true });
  const cases = [
    { name: "desktop-full-glass", width: 1440, height: 900, theme: "dark", transparency: "full" },
    { name: "mobile-full-glass", width: 390, height: 844, theme: "dark", transparency: "full" },
    {
      name: "desktop-high-contrast-solid",
      width: 1440,
      height: 900,
      theme: "high-contrast",
      transparency: "off",
    },
    { name: "mobile-opaque", width: 390, height: 844, theme: "dark", transparency: "off" },
  ] as const;
  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: item.height });
    await page.goto("/");
    await page.evaluate(({ theme, transparency }) => {
      localStorage.setItem(
        "lyceum.web.preferences.v1",
        JSON.stringify({ theme, transparency, locale: "en" }),
      );
    }, item);
    await page.reload(); // Every capture has one verified preference state, not stacked init scripts.
    await expect(page.locator("html")).toHaveAttribute("data-transparency", item.transparency);
    if (item.theme === "high-contrast") {
      await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    } else {
      await expect(page.locator("html")).not.toHaveAttribute("data-contrast", "high");
    }
    await expect(page.getByRole("heading", { name: "A clear place to begin." })).toBeVisible();
    await page.screenshot({
      path: resolve(directory, `${item.name}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
});
