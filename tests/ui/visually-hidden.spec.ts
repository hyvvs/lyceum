import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";
import { scanIndexedStory, storySlug } from "./axe-story-gate";
import { assertStoryScanCoverage, storiesForFamily } from "./story-inventory";

const story = (name: string) => `/iframe.html?id=primitives-visuallyhidden--${name}&viewMode=story`;

test("hidden text names the icon-only Button and remains a real, unfocusable DOM span", async ({
  page,
}) => {
  await page.goto(story("default"));
  const hidden = page.locator("#hint-action-label");
  const button = page.getByRole("button", { name: "Open hint details" });
  await expect(button).toBeVisible();
  await expect(hidden).toHaveText("Open hint details");
  await expect(hidden).toHaveJSProperty("tagName", "SPAN");
  await expect(hidden).toHaveCSS("position", "absolute");
  await expect(hidden).toHaveCSS("width", "1px");
  await expect(hidden).toHaveCSS("height", "1px");
  await expect(hidden).not.toHaveAttribute("aria-hidden", /.+/);
  await expect(hidden).not.toHaveAttribute("tabindex", /.+/);
  await expect(page.getByTestId("hidden-ref-target")).toContainText("SPAN");

  // Chromium's accessibility tree independently confirms that this is not display:none,
  // aria-hidden or merely a DOM string invisible to assistive technology.
  const cdp = await page.context().newCDPSession(page);
  const tree = await cdp.send("Accessibility.getFullAXTree");
  expect(
    tree.nodes.some(
      (node) =>
        !node.ignored &&
        node.role?.value === "StaticText" &&
        node.name?.value === "Open hint details",
    ),
  ).toBe(true);
  await cdp.detach();
});

test("Tab and Shift+Tab visit only visible buttons; hidden span never takes focus", async ({
  page,
}) => {
  await page.goto(story("default"));
  const reference = page.getByRole("button", { name: "Reference help action" });
  const labeled = page.getByRole("button", { name: "Open hint details" });
  for (let step = 0; step < 8; step++) {
    if (await reference.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(reference).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(labeled).toBeFocused();
  await expect(labeled).toHaveCSS("outline-style", "solid");
  await expect(page.locator("#hint-action-label")).not.toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(reference).toBeFocused();
});

test("hidden text does not alter icon button dimensions at regular or genuine 200% text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  for (const name of ["default", "double-text", "high-contrast", "opaque"]) {
    await page.goto(story(name));
    const buttons = page.locator(".lyceum-button");
    await expect(buttons).toHaveCount(2);
    const reference = buttons.nth(0);
    const labeled = buttons.nth(1);
    const first = await reference.boundingBox();
    const second = await labeled.boundingBox();
    if (!first || !second) throw new Error("Expected both button bounds");
    expect(Math.abs(first.width - second.width), name).toBeLessThanOrEqual(1);
    expect(Math.abs(first.height - second.height), name).toBeLessThanOrEqual(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      name,
    ).toBeLessThanOrEqual(320);
    await expect(labeled).toBeInViewport();
    await expect(page.locator("#hint-action-label")).toHaveCSS("position", "absolute");
    if (name === "double-text") {
      await expect(page.locator("html")).toHaveCSS("font-size", "32px");
    }
  }
});

test("RTL, language and finite numeric zero remain accessible names", async ({ page }) => {
  await page.goto(story("rtl"));
  const hidden = page.locator("#hint-action-label");
  await expect(hidden).toHaveAttribute("dir", "rtl");
  await expect(hidden).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("button", { name: "افتح تفاصيل التلميح" })).toBeVisible();
  await page.goto(story("numeric-zero"));
  await expect(page.getByRole("button", { name: "0", exact: true })).toBeVisible();
  await expect(page.locator("#hint-action-label")).toHaveText("0");
});

test("native forced colors retains focus, label and screen-reader positioning", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto(story("high-contrast"));
  const button = page.getByRole("button", { name: "Open hint details" });
  await expect(button).toBeVisible();
  await button.focus();
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS("outline-style", "solid");
  await expect(page.locator("#hint-action-label")).toHaveCSS("position", "absolute");
  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
  const result = await scanStoryA11y(page);
  expect(result.violations).toEqual([]);
});

test("axe scans every generated semantic, localization, scaled and theme story", async ({
  page,
}) => {
  test.slow();
  const stories = storiesForFamily("VisuallyHidden");
  const scanned: string[] = [];
  for (const entry of stories) {
    const name = storySlug(entry);
    await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
    await expect(page.locator("#hint-action-label")).toHaveCount(1);
    scanned.push(await scanIndexedStory(page, entry, name));
  }
  assertStoryScanCoverage(stories, scanned);
});
