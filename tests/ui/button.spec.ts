import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";

const story = (name: string) => `/iframe.html?id=primitives-button--${name}&viewMode=story`;

test("native button has a name, safe type, and 44px touch target", async ({ page }) => {
  await page.goto(story("default"));
  const button = page.getByRole("button", { name: "Continue learning" });
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute("type", "button");
  const bounds = await button.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(44);
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
});

test("Tab, Space, and Enter activate exactly once with visible focus", async ({ page }) => {
  await page.goto(story("interactive"));
  const button = page.getByRole("button", { name: "Continue learning" });
  // Storybook may add its own focusable preview chrome before the component.
  for (let step = 0; step < 8; step++) {
    if (await button.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(button).toBeFocused();
  const outline = await button.evaluate((node) => getComputedStyle(node).outlineStyle);
  expect(outline).toBe("solid");
  await page.keyboard.press("Space");
  await expect(page.getByText("Activations: 1")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Activations: 2")).toBeVisible();
});

test("disabled buttons are not focusable, loading blocks activation without losing focus", async ({
  page,
}) => {
  await page.goto(story("disabled"));
  const disabled = page.getByRole("button", { name: "Continue learning" });
  await expect(disabled).toBeDisabled();
  await page.keyboard.press("Tab");
  await expect(disabled).not.toBeFocused();

  await page.goto(story("loading-interactive"));
  const loading = page.getByRole("button", { name: "Save answer" });
  await loading.focus();
  await expect(loading).toBeFocused();
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await expect(loading).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await expect(page.getByText("Activations: 0")).toBeVisible();
  await expect(loading).toBeFocused();
});

test("large text, RTL, and high contrast retain legible-sized controls", async ({ page }) => {
  for (const name of ["double-text", "rtl", "high-contrast", "light"]) {
    await page.goto(story(name));
    const button = page.getByRole("button", { name: "Continue learning" });
    await expect(button).toBeVisible();
    const bounds = await button.boundingBox();
    expect(bounds?.height, name).toBeGreaterThanOrEqual(44);
    await expect(button).toBeInViewport();
  }
  await page.goto(story("double-text"));
  const size = await page.getByRole("button").evaluate((node) => getComputedStyle(node).fontSize);
  expect(Number.parseFloat(size)).toBeGreaterThanOrEqual(24);
});

test("secondary and ghost button boundaries meet non-text contrast in both themes", async ({
  page,
}) => {
  for (const name of ["secondary", "ghost", "light-secondary", "light-ghost"]) {
    await page.goto(story(name));
    const button = page.getByRole("button", { name: "Continue learning" });
    await expect(button).toBeVisible();
    const contrast = await button.evaluate((element) => {
      const styles = getComputedStyle(element);
      const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const luminance = (value: string) => {
        const [r = 0, g = 0, b = 0] = rgb(value).map((channel) => {
          const x = channel / 255;
          return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const a = luminance(styles.borderTopColor);
      const b = luminance(styles.backgroundColor);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(contrast, name).toBeGreaterThanOrEqual(3);
  }
});

test("enabled slotted links keep native keyboard navigation semantics", async ({ page }) => {
  await page.goto(story("as-child-link"));
  const link = page.getByRole("link", { name: "Open practice" });
  await expect(link).toBeVisible();
  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#practice")).toContainText("Practice destination");
  await expect(page).toHaveURL(/#practice$/);
});

test("slotted native buttons compose child and parent click handlers once", async ({ page }) => {
  await page.goto(story("as-child-interactive"));
  const button = page.getByRole("button", { name: "Open practice action" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Child: 1, Parent: 1")).toBeVisible();
  await expect(button).toBeFocused();
});

test("axe scans standard, semantic, and fallback stories", async ({ page }) => {
  for (const name of [
    "default",
    "disabled",
    "loading",
    "error-action",
    "empty",
    "light",
    "high-contrast",
    "double-text",
    "as-child-link",
    "as-child-interactive",
  ]) {
    await page.goto(story(name));
    await expect(page.locator(".lyceum-button")).toBeVisible();
    const results = await scanStoryA11y(page);
    expect(results.violations, `axe violations for ${name}`).toEqual([]);
  }
});
