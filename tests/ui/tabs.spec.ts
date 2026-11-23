import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";

const story = (name: string) => `/iframe.html?id=primitives-tabs--${name}&viewMode=story`;

test("tablist/trigger/panel roles, associations and native non-submit controls", async ({
  page,
}) => {
  await page.goto(story("default"));
  const list = page.getByRole("tablist", { name: "Study sections" });
  await expect(list).toBeVisible();
  const review = page.getByRole("tab", { name: "Review" });
  const plan = page.getByRole("tab", { name: "Plan" });
  await expect(review).toHaveAttribute("aria-selected", "true");
  await expect(plan).toHaveAttribute("aria-selected", "false");
  await expect(review).toHaveAttribute("type", "button");
  await page.keyboard.press("Tab");
  await expect(review).toBeFocused();
  await expect(review).toHaveAttribute("tabindex", "0");
  await expect(plan).toHaveAttribute("tabindex", "-1");
  const panel = page.getByRole("tabpanel", { name: "Review" });
  await expect(panel).toHaveAttribute("id", (await review.getAttribute("aria-controls")) ?? "");
  await expect(review).toHaveAttribute("id", (await panel.getAttribute("aria-labelledby")) ?? "");
  await expect(panel).toContainText("Review your due learning cards");
  await expect(page.getByRole("tabpanel", { name: "Plan" })).toHaveCount(0);
});

test("horizontal automatic activation, Home/End, disabled skipping and roving Tab order", async ({
  page,
}) => {
  await page.goto(story("disabled"));
  const review = page.getByRole("tab", { name: "Review" });
  const plan = page.getByRole("tab", { name: "Plan" });
  const progress = page.getByRole("tab", { name: "Progress" });
  await expect(plan).toBeDisabled();
  await page.keyboard.press("Tab");
  await expect(review).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(progress).toBeFocused();
  await expect(progress).toHaveAttribute("aria-selected", "true");
  await expect(review).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("Home");
  await expect(review).toBeFocused();
  await expect(review).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(progress).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(review).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tabpanel", { name: "Review" })).toBeFocused();
});

test("RTL reverses left/right, vertical uses down/up", async ({ page }) => {
  await page.goto(story("rtl"));
  const review = page.getByRole("tab", { name: "Review" });
  const plan = page.getByRole("tab", { name: "Plan" });
  await review.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(plan).toBeFocused();
  await expect(plan).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(review).toBeFocused();

  await page.goto(story("vertical"));
  await expect(page.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
  const verticalReview = page.getByRole("tab", { name: "Review" });
  const verticalPlan = page.getByRole("tab", { name: "Plan" });
  await verticalReview.focus();
  await page.keyboard.press("ArrowDown");
  await expect(verticalPlan).toBeFocused();
  await expect(verticalPlan).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowUp");
  await expect(verticalReview).toBeFocused();
});

test("manual activation moves focus without selecting until Space or Enter", async ({ page }) => {
  await page.goto(story("manual"));
  const review = page.getByRole("tab", { name: "Review" });
  const plan = page.getByRole("tab", { name: "Plan" });
  await review.focus();
  await page.keyboard.press("ArrowRight");
  await expect(plan).toBeFocused();
  await expect(review).toHaveAttribute("aria-selected", "true");
  await expect(plan).toHaveAttribute("aria-selected", "false");
  await page.keyboard.press("Space");
  await expect(plan).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Progress" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tab", { name: "Progress" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("controlled selection responds to keyboard and external parent updates", async ({ page }) => {
  await page.goto(story("controlled"));
  const review = page.getByRole("tab", { name: "Review" });
  const plan = page.getByRole("tab", { name: "Plan" });
  await expect(page.getByText("Selected: review")).toBeVisible();
  await plan.click();
  await expect(page.getByText("Selected: plan")).toBeVisible();
  await expect(plan).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Reset to Review" }).click();
  await expect(review).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Selected: review")).toBeVisible();
});

test("200% text at 320x256 wraps long labels and scrolls tablist without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(story("long-double-text"));
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize))
    .toBe("32px");
  const list = page.getByRole("tablist");
  const triggers = page.getByRole("tab");
  await expect(triggers).toHaveCount(3);
  const geometry = await list.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
    x: element.getBoundingClientRect().x,
    right: element.getBoundingClientRect().right,
  }));
  expect(geometry.x).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(320);
  expect(geometry.scroll).toBeGreaterThan(geometry.client);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await triggers.first().focus();
  await page.keyboard.press("End");
  await expect(triggers.last()).toBeFocused();
  await expect(triggers.last()).toHaveAttribute("aria-selected", "true");
  await expect(triggers.last()).toBeInViewport();
  const panel = page.getByRole("tabpanel");
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect((await scanStoryA11y(page)).violations).toEqual([]);
});

test("full glass, opaque and high contrast settings honor their separate rendering paths", async ({
  page,
}) => {
  for (const [name, expected] of [
    ["full-transparency", "blur"],
    ["reduced-transparency", "none"],
    ["opaque", "none"],
    ["high-contrast", "none"],
  ]) {
    await page.goto(story(name));
    const list = page.getByRole("tablist");
    const filter = await list.evaluate((el) => getComputedStyle(el).backdropFilter);
    if (expected === "none") expect(filter, name).toBe("none");
    else expect(filter, name).toContain("blur(");
  }
});

test("reduced and off motion remove tab background transitions", async ({ page }) => {
  for (const [name, setting] of [
    ["reduced-motion", "reduced"],
    ["off-motion", "off"],
  ]) {
    await page.goto(story(name));
    await expect(page.locator("html")).toHaveAttribute("data-motion", setting);
    const trigger = page.getByRole("tab", { name: "Review" });
    await expect(trigger).toHaveCSS("transition-duration", "0s");
    await trigger.focus();
    await expect(trigger).toHaveCSS("outline-style", "solid");
  }
});

test("all Tabs Storybook states remain axe-clean", async ({ page }) => {
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
    "empty",
    "loading",
    "error-action",
    "rtl",
    "vertical",
    "manual",
    "controlled",
    "long-labels",
    "double-text",
    "long-double-text",
  ]) {
    await page.goto(story(name));
    await expect(page.getByRole("tablist")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      name === "light" ? "light" : "dark",
    );
    const result = await scanStoryA11y(page);
    expect(result.violations, `axe violations in ${name}`).toEqual([]);
  }
});
