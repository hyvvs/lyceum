import { expect, test } from "@playwright/test";
import { scanIndexedStory, storySlug } from "./axe-story-gate";
import { assertStoryScanCoverage, storiesForFamily } from "./story-inventory";

for (const family of ["GlassPanel", "GlassCard", "TintCard"] as const) {
  test(`axe scans every generated ${family} story and theme state`, async ({ page }) => {
    test.slow();
    const stories = storiesForFamily(family);
    const scanned: string[] = [];
    for (const entry of stories) {
      await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
      const selector =
        family === "GlassPanel"
          ? ".lyceum-glass-panel"
          : family === "GlassCard"
            ? ".lyceum-glass-card"
            : ".lyceum-tint-card";
      await expect(page.locator(selector)).toBeVisible();
      scanned.push(await scanIndexedStory(page, entry, storySlug(entry)));
    }
    assertStoryScanCoverage(stories, scanned);
  });
}

test("new surfaces preserve native markup, focus rings, all five controlled hues and true full-glass modes", async ({
  page,
}) => {
  for (const [family, name, selector] of [
    ["glasspanel", "dark-full", ".lyceum-glass-panel"],
    ["glasscard", "dark-full", ".lyceum-glass-card"],
    ["tintcard", "dark-full", ".lyceum-tint-card"],
  ]) {
    await page.goto(`/iframe.html?id=primitives-${family}--${name}&viewMode=story`);
    await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-transparency", "full");
    const filter = await page
      .locator(selector)
      .evaluate((node) => getComputedStyle(node).backdropFilter);
    expect(filter, `${family} full-glass blur`).toContain("blur(");
  }
  for (const hue of ["blue", "amber", "purple", "green", "red"]) {
    await page.goto(`/iframe.html?id=primitives-tintcard--${hue}&viewMode=story`);
    await expect(page.locator(".lyceum-tint-card")).toHaveAttribute("data-hue", hue);
    expect(
      await page
        .locator(".lyceum-tint-card")
        .evaluate((node) => getComputedStyle(node).getPropertyValue("--tint").trim()),
    ).toMatch(/^\d+ \d+ \d+$/);
  }
  await page.goto("/iframe.html?id=primitives-glasspanel--focus&viewMode=story");
  const focus = page.getByRole("button", { name: "Focused control" });
  await focus.focus();
  await expect(focus).toBeFocused();
  expect(await focus.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
  for (const [name, label] of [
    ["glasspanel", "Focused control"],
    ["glasscard", "Focused action"],
    ["tintcard", "Focused tile action"],
  ]) {
    await page.goto(`/iframe.html?id=primitives-${name}--focus&viewMode=story`);
    const button = page.getByRole("button", { name: label });
    await expect(button).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    const bounds = await button.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Shift+Tab");
    await expect(button).not.toBeFocused();
  }
});
