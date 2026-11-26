import { expect, test } from "@playwright/test";
import { scanIndexedStory, storySlug } from "./axe-story-gate";
import { assertStoryScanCoverage, storiesForFamily } from "./story-inventory";

const story = (family: string, state: string) =>
  `/iframe.html?id=primitives-${family}--${state}&viewMode=story`;

test("B5a named round button is native, 44px, keyboard-activated once and visibly focused", async ({
  page,
}) => {
  await page.goto(story("roundiconbutton", "interactive"));
  const button = page.getByRole("button", { name: "Open messages" });
  await expect(button).toHaveAttribute("type", "button");
  await expect(button).toHaveAccessibleName("Open messages");
  const rect = await button.boundingBox();
  expect(rect?.width).toBeGreaterThanOrEqual(44);
  expect(rect?.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  expect(await button.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Activations: 1")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByText("Activations: 2")).toBeVisible();
});

test("B5a button badge is not an extra tab stop and loading prevents native activation", async ({
  page,
}) => {
  await page.goto(story("roundiconbutton", "badge"));
  const badgeButton = page.getByRole("button", { name: "Open messages" });
  await expect(badgeButton).toHaveAccessibleDescription("3 unread messages");
  await expect(page.locator(".lyceum-round-icon-button__badge")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator(".lyceum-round-icon-button")).toHaveCount(1);
  await page.goto(story("roundiconbutton", "loading-interactive"));
  const loading = page.getByRole("button", { name: "Open messages" });
  await loading.focus();
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Space");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Activations: 0")).toBeVisible();
  await expect(loading).toBeFocused();
  await page.goto(story("roundiconbutton", "disabled"));
  await expect(page.getByRole("button", { name: "Open messages" })).toBeDisabled();
});

test("B5a radio group owns native selection, arrows, browser form semantics and no tablist", async ({
  page,
}) => {
  await page.goto(story("segmentedcontrol", "interactive"));
  const group = page.getByRole("group", { name: "Sample session length" });
  const brief = group.getByRole("radio", { name: "Brief" });
  const standard = group.getByRole("radio", { name: "Standard" });
  const extended = group.getByRole("radio", { name: "Extended" });
  await expect(brief).toBeChecked();
  await expect(standard).not.toBeChecked();
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(brief).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(standard).toBeChecked();
  await expect(standard).toBeFocused();
  await expect(page.getByText("Selected: standard")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(extended).toBeChecked();
  await expect(page.getByText("Selected: extended")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await group
      .getByRole("radio")
      .evaluateAll((nodes) => nodes.some((node) => node === document.activeElement)),
  ).toBe(false);
});

test("B5a disabled options, RTL, 200% text and narrow viewport retain selected and focus cues", async ({
  page,
}) => {
  await page.goto(story("segmentedcontrol", "disabled-option"));
  const disabled = page.getByRole("radio", { name: "Extended" });
  await expect(disabled).toBeDisabled();
  await page.goto(story("segmentedcontrol", "rtl"));
  await expect(page.locator(".lyceum-segmented-control")).toHaveAttribute("dir", "rtl");
  await page.getByRole("radio", { name: "Brief" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("radio", { name: "Standard" })).toBeChecked();
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 256 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(story("segmentedcontrol", "double-text"));
    await expect(page.locator("html")).toHaveAttribute("data-text-scale", "200%");
    const report = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      all: Array.from(document.querySelectorAll(".lyceum-segmented-control__label")).map(
        (node) => ({
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        }),
      ),
    }));
    expect(report.pageWidth).toBeLessThanOrEqual(report.viewport + 1);
    for (const item of report.all) {
      expect(item.width).toBeGreaterThanOrEqual(44);
      expect(item.height).toBeGreaterThanOrEqual(44);
    }
  }
});

for (const [family, selector] of [
  ["RoundIconButton", ".lyceum-round-icon-button"],
  ["SegmentedControl", ".lyceum-segmented-control"],
] as const) {
  test(`B5a fail-closed axe checks every generated ${family} story and its real interactive state`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const stories = storiesForFamily(family);
    const checked: string[] = [];
    for (const entry of stories) {
      await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
      await expect(page.locator(selector)).toBeVisible();
      const slug = storySlug(entry);
      if (slug === "hover") {
        await page
          .locator(
            family === "RoundIconButton"
              ? ".lyceum-round-icon-button"
              : ".lyceum-segmented-control__option",
          )
          .first()
          .hover();
      }
      if (slug === "focus") {
        await page.keyboard.press("Tab");
        await expect(
          page
            .locator(
              family === "RoundIconButton"
                ? ".lyceum-round-icon-button"
                : ".lyceum-segmented-control__input",
            )
            .first(),
        ).toBeFocused();
      }
      if (slug === "interactive") {
        if (family === "RoundIconButton") {
          await page.getByRole("button", { name: "Open messages" }).click();
          await expect(page.getByText("Activations: 1")).toBeVisible();
        } else {
          await page.getByRole("radio", { name: "Standard" }).check();
          await expect(page.getByText("Selected: standard")).toBeVisible();
        }
      }
      checked.push(await scanIndexedStory(page, entry, slug));
    }
    assertStoryScanCoverage(stories, checked);
  });
}
