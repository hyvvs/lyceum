import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";

const story = (name: string) => `/iframe.html?id=primitives-select--${name}&viewMode=story`;
const trigger = (page: import("@playwright/test").Page) =>
  page.locator('.lyceum-select__trigger[role="combobox"][aria-label="Study topic"]');

test("semantic named combobox opens portalled listbox with selected option", async ({ page }) => {
  await page.goto(story("default"));
  const button = trigger(page);
  await expect(button).toHaveAttribute("type", "button");
  await expect(button).toHaveAttribute("role", "combobox");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const list = page.getByRole("listbox");
  await expect(list).toBeVisible();
  await expect(list).toHaveAttribute("id", (await button.getAttribute("aria-controls")) ?? "");
  expect(
    await list.evaluate((node) => document.querySelector(".storybook-stage")?.contains(node)),
  ).toBe(false);
  await expect(page.getByRole("option", { name: "Mathematics" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("option", { name: "Physics" }).click();
  await expect(button).toContainText("Physics");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("select trigger inside form never submits from pointer or keyboard", async ({ page }) => {
  await page.goto(story("form-safe"));
  const button = trigger(page);
  await button.click();
  await page.getByRole("option", { name: "Physics" }).click();
  await expect(page.getByText("Submissions: 0")).toBeVisible();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Submissions: 0")).toBeVisible();
});

test("portalled listbox inert-locks hidden background only until focus returns", async ({
  page,
}) => {
  await page.goto(story("default"));
  const button = trigger(page);
  await button.click();
  const root = page.locator("#storybook-root");
  await expect(root).toHaveAttribute("aria-hidden", "true");
  await expect(root).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(root).not.toHaveAttribute("inert", "");
  await expect(root).not.toHaveAttribute("aria-hidden", "true");
  await expect(button).toBeFocused();
});

test("inert background follows aria-hidden marker changes while Select remains open", async ({
  page,
}) => {
  await page.goto(story("default"));
  const button = trigger(page);
  await button.click();
  const root = page.locator("#storybook-root");
  await expect(root).toHaveAttribute("data-aria-hidden", "true");
  await expect(root).toHaveAttribute("inert", "");
  // Mimic the uppermost overlay closing and clearing a hideOthers marker while
  // this Select still owns its portal. Lock ownership must reconcile live.
  await root.evaluate((element) => {
    element.removeAttribute("data-aria-hidden");
    element.removeAttribute("aria-hidden");
  });
  await expect(root).not.toHaveAttribute("inert", "");
  await root.evaluate((element) => {
    element.setAttribute("data-aria-hidden", "true");
    element.setAttribute("aria-hidden", "true");
  });
  await expect(root).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(root).not.toHaveAttribute("inert", "");
  await expect(button).toBeFocused();
});

test("keyboard arrow navigation, typeahead, disabled skipping and Escape return focus", async ({
  page,
}) => {
  await page.goto(story("disabled-option"));
  const button = trigger(page);
  await button.focus();
  await page.keyboard.press("Enter");
  const physics = page.getByRole("option", { name: "Physics" });
  const chemistry = page.getByRole("option", { name: "Chemistry" });
  await expect(chemistry).toHaveAttribute("data-disabled");
  await page.keyboard.press("ArrowDown");
  await expect(physics).toBeFocused();
  await page.keyboard.press("c");
  await expect(chemistry).not.toBeFocused();
  await page.keyboard.press("Escape");
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute("aria-expanded", "false");

  await page.keyboard.press(" ");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("p");
  await expect(physics).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(button).toContainText("Physics");
  await expect(button).toBeFocused();
});

test("uncontrolled and controlled changes stay in sync with external state", async ({ page }) => {
  await page.goto(story("default"));
  await trigger(page).click();
  await page.getByRole("option", { name: "Physics" }).click();
  await expect(trigger(page)).toContainText("Physics");

  await page.goto(story("controlled"));
  await expect(page.getByText("Selected: math")).toBeVisible();
  await trigger(page).click();
  await page.getByRole("option", { name: "Physics" }).click();
  await expect(page.getByText("Selected: physics")).toBeVisible();
  await page.getByRole("button", { name: "Reset to Mathematics" }).click();
  await expect(page.getByText("Selected: math")).toBeVisible();
  await expect(trigger(page)).toContainText("Mathematics");
});

test("RTL reflects local text direction and retains keyboard navigation", async ({ page }) => {
  await page.goto(story("rtl"));
  await expect(trigger(page)).toHaveAttribute("dir", "rtl");
  await trigger(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "History" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger(page)).toContainText("History");
});

test("320x256 viewport at 200% text keeps trigger and portalled menu within viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(story("long-double-text"));
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  const button = trigger(page);
  await expect(button).toBeInViewport();
  await button.click();
  const list = page.getByRole("listbox");
  await expect(list).toBeVisible();
  const bounds = await list.boundingBox();
  if (!bounds) throw new Error("Listbox has no rendered bounds");
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(256);
  const chosen = page.getByRole("option", { name: "Mathematics" });
  const chosenBounds = await chosen.boundingBox();
  if (!chosenBounds) throw new Error("Selected option is not rendered");
  expect(chosenBounds.y).toBeGreaterThanOrEqual(bounds.y);
  expect(chosenBounds.y + chosenBounds.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: /History/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(button).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect((await scanStoryA11y(page)).violations).toEqual([]);
});

test("empty, loading and error lists never create selectable phantom options", async ({ page }) => {
  for (const [name, message] of [
    ["empty", "No topics available"],
    ["loading", "Loading topics"],
    ["error-action", "Topics could not load"],
  ]) {
    await page.goto(story(name));
    await trigger(page).click();
    await expect(page.getByRole("listbox")).toBeVisible();
    const unavailable = page.getByRole("option", { name: new RegExp(message) });
    await expect(unavailable).toBeVisible();
    await expect(unavailable).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("option")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(trigger(page)).toBeFocused();
  }
});

test("full transparency uses one blurred menu, opaque and high contrast none", async ({ page }) => {
  for (const [name, expected] of [
    ["full-transparency", "blur"],
    ["reduced-transparency", "none"],
    ["opaque", "none"],
    ["light", "none"],
    ["high-contrast", "none"],
  ]) {
    await page.goto(story(name));
    await trigger(page).click();
    const list = page.getByRole("listbox");
    const result = await list.evaluate((node) => {
      let ancestor = node.parentElement;
      let blurredAncestors = 0;
      while (ancestor) {
        if (getComputedStyle(ancestor).backdropFilter !== "none") blurredAncestors++;
        ancestor = ancestor.parentElement;
      }
      return { filter: getComputedStyle(node).backdropFilter, blurredAncestors };
    });
    // One frosted layer only: even the Radix positioner must not blur underneath.
    expect(result.blurredAncestors, `nested blur in ${name}`).toBe(0);
    if (expected === "none") expect(result.filter).toBe("none");
    else expect(result.filter).toContain("blur(");
    await page.keyboard.press("Escape");
  }
});

test("all select stories remain axe clean with menu open and closed", async ({ page }) => {
  // This fixture scans 22 separate stories twice (closed and portalled open).
  // Allow the real Linux browser/axe matrix to finish under parallel CI load.
  test.slow();
  for (const name of [
    "default",
    "hover",
    "focus",
    "dark",
    "light",
    "high-contrast",
    "full-transparency",
    "reduced-transparency",
    "opaque",
    "reduced-motion",
    "off-motion",
    "disabled",
    "disabled-option",
    "empty",
    "loading",
    "error-action",
    "rtl",
    "controlled",
    "form-safe",
    "long-labels",
    "double-text",
    "long-double-text",
  ]) {
    await page.goto(story(name));
    await expect(trigger(page)).toBeVisible();
    expect((await scanStoryA11y(page)).violations, `closed state ${name}`).toEqual([]);
    if (name !== "disabled") {
      await trigger(page).click();
      await expect(page.getByRole("listbox")).toBeVisible();
      expect((await scanStoryA11y(page)).violations, `open state ${name}`).toEqual([]);
    }
  }
});
