import { type Page, expect, test } from "@playwright/test";
import { scanIndexedStory, storySlug } from "./axe-story-gate";
import { assertStoryScanCoverage, storiesForFamily } from "./story-inventory";

const storyUrl = (id: string) => `/iframe.html?id=${id}&viewMode=story`;
const viewport = { width: 390, height: 844 };

const families = [
  ["Avatar", ".ui-avatar"],
  ["Chip", ".ui-chip, .ui-badge"],
  ["EmptyStateCard", ".ui-empty-state"],
  ["Input", ".ui-input"],
  ["ListRow", ".ui-list-row"],
  ["SkeletonLoader", ".ui-skeleton"],
] as const;

for (const [family, selector] of families) {
  test(`Fidelity fail-closed axe checks every generated ${family} story`, async ({ page }) => {
    test.setTimeout(240_000);
    const stories = storiesForFamily(family);
    const checked: string[] = [];
    for (const entry of stories) {
      const slug = storySlug(entry);
      await page.setViewportSize(
        slug === "high-contrast" || slug === "double-text"
          ? viewport
          : { width: 1440, height: 900 },
      );
      await page.goto(storyUrl(entry.id));
      const component = page.locator(selector).first();
      await expect(component).toBeVisible();
      if (slug === "high-contrast") {
        await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
      }
      if (slug === "double-text") {
        await expect(page.locator("html")).toHaveAttribute("data-text-scale", "200%");
      }
      const control = family === "EmptyStateCard" ? component.getByRole("button") : component;
      if (slug === "hover") await control.hover();
      if (slug === "focus") {
        await control.focus();
        await expect(control).toBeFocused();
      }
      if (family === "Input" && slug === "default") {
        await component.fill("Understand a sample concept");
        await expect(component).toHaveValue("Understand a sample concept");
      }
      if (family === "ListRow" && slug === "default") {
        await component.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByText("Opened 1 times")).toBeVisible();
      }
      checked.push(await scanIndexedStory(page, entry, slug));
    }
    assertStoryScanCoverage(stories, checked);
  });
}

async function assertPopoverInsideViewport(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect
    .poll(async () => {
      const bounds = await dialog.boundingBox();
      const size = page.viewportSize();
      return (
        !!bounds &&
        !!size &&
        bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= size.width + 1 &&
        bounds.y + bounds.height <= size.height + 1
      );
    })
    .toBe(true);
}

test("Fidelity fail-closed axe checks every generated Popover story and its open and closed states", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const stories = storiesForFamily("Popover");
  const checked: string[] = [];
  for (const entry of stories) {
    const slug = storySlug(entry);
    await page.setViewportSize(
      slug === "high-contrast" || slug === "double-text" ? viewport : { width: 1440, height: 900 },
    );
    await page.goto(storyUrl(entry.id));
    const trigger = page.getByRole("button", { name: "Open details" });
    const dialog = page.getByRole("dialog");
    await expect(trigger).toBeVisible();
    if (slug === "disabled" || slug === "loading") {
      await expect(trigger).toBeDisabled();
      await expect(dialog).toHaveCount(0);
      checked.push(await scanIndexedStory(page, entry, "closed"));
      continue;
    }
    if (slug === "hover") await trigger.hover();
    if ((await trigger.getAttribute("aria-expanded")) !== "true") {
      await trigger.focus();
      await page.keyboard.press("Enter");
    }
    await assertPopoverInsideViewport(page);
    await scanIndexedStory(page, entry, "popover-open");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    checked.push(await scanIndexedStory(page, entry, "closed"));
  }
  assertStoryScanCoverage(stories, checked);
});

test("Fidelity Popover stays inside desktop and short phone viewports and restores focus", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 320, height: 256 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(storyUrl("primitives-popover--default"));
    const trigger = page.getByRole("button", { name: "Open details" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await assertPopoverInsideViewport(page);
    const close = page.getByRole("button", { name: "Close", exact: true });
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Space");
    await assertPopoverInsideViewport(page);
    await close.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test("Fidelity Popover remains collision-bounded in a scrolled RTL desktop and 200% short viewport", async ({
  page,
}) => {
  for (const [story, size] of [
    ["rtl", { width: 1440, height: 900 }],
    ["double-text", { width: 320, height: 256 }],
  ] as const) {
    await page.setViewportSize(size);
    await page.goto(storyUrl(`primitives-popover--${story}`));
    await page.evaluate(() => {
      const root = document.getElementById("storybook-root");
      if (!root) throw new Error("Missing Storybook root");
      root.style.paddingTop = "1100px";
      document.body.style.minHeight = "2600px";
      window.scrollTo({ top: 940 });
    });
    const trigger = page.getByRole("button", { name: "Open details" });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await assertPopoverInsideViewport(page);
    await expect(page.getByRole("dialog")).toHaveCSS("position", "fixed");
    await page.evaluate(() => window.scrollBy(0, 70));
    await assertPopoverInsideViewport(page);
    const close = page.getByRole("button", { name: "Close", exact: true });
    await expect(close).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test("Fidelity Input error links, loading read-only state and ListRow keyboard behavior", async ({
  page,
}) => {
  await page.setViewportSize(viewport);
  await page.goto(storyUrl("primitives-input--error-state"));
  const input = page.getByRole("textbox", { name: "Learning goal" });
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription("Enter a learning goal");
  await page.goto(storyUrl("primitives-input--loading"));
  await expect(input).toHaveAttribute("aria-busy", "true");
  await expect(input).not.toBeEditable();
  await page.goto(storyUrl("primitives-listrow--default"));
  const row = page.getByRole("button", { name: /Review integration rules/ });
  await row.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await expect(page.getByText("Opened 2 times")).toBeVisible();
  await page.goto(storyUrl("primitives-listrow--loading"));
  await row.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await expect(row).toHaveAttribute("aria-busy", "true");
  await expect(page.getByText("Opened 0 times")).toBeVisible();
});
