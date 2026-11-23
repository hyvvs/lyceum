import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";

const story = (name: string) => `/iframe.html?id=primitives-tooltip--${name}&viewMode=story`;

test("hover reveals a named tooltip and leaving the trigger dismisses it", async ({ page }) => {
  await page.goto(story("default"));
  const trigger = page.getByRole("button", { name: "Review hint details" });
  await trigger.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("Hints explain the next useful step.");
  const bounds = await tooltip.boundingBox();
  if (!bounds) throw new Error("Tooltip bounds unavailable");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 8 });
  await page.waitForTimeout(650);
  await expect(tooltip).toBeVisible();
  await page.mouse.move(0, 0, { steps: 12 });
  await expect(tooltip).not.toBeVisible();
});

test("Escape dismisses tooltip even while the pointer remains over it", async ({ page }) => {
  await page.goto(story("default"));
  await page.getByRole("button", { name: "Review hint details" }).hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  const bounds = await tooltip.boundingBox();
  if (!bounds) throw new Error("Tooltip bounds unavailable");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 8 });
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).not.toBeVisible();
});

test("Tab focus reveals tooltip; Escape dismisses without losing trigger focus", async ({
  page,
}) => {
  await page.goto(story("default"));
  const trigger = page.getByRole("button", { name: "Review hint details" });
  for (let step = 0; step < 8; step++) {
    if (await trigger.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveCSS("outline-style", "solid");
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("disabled triggers do not open, loading remains focusable and informative", async ({
  page,
}) => {
  await page.goto(story("disabled"));
  const disabled = page.getByRole("button", { name: "Review hint details" });
  await expect(disabled).toBeDisabled();
  await disabled.hover();
  await expect(page.getByRole("tooltip")).not.toBeVisible();

  await page.goto(story("loading"));
  const loading = page.getByRole("button", { name: "Review hint details" });
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await loading.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(page.getByRole("tooltip")).toContainText("Checking hint availability.");
});

test("200% text and a 320px viewport keep tooltip within the screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(story("double-text"));
  await page.getByRole("button", { name: "Review hint details" }).hover();
  const bounds = await page.getByRole("tooltip").boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("long guidance has a readable tooltip cue and keyboard-accessible dialog at 200% in 320x256", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(story("long-double-text"));
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  await page.getByRole("button", { name: "Review hint details" }).hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("Open full hint");
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  const bounds = await tooltip.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect(bounds?.y).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(256);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const detailsTrigger = page.getByRole("button", { name: "Read full hint" });
  await detailsTrigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Full hint" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "Read the question again, locate the important quantities, and decide which relationship",
  );
  await expect(dialog).toContainText("before calculating.");
  const dialogBounds = await dialog.boundingBox();
  expect(dialogBounds?.y).toBeGreaterThanOrEqual(0);
  expect((dialogBounds?.y ?? 0) + (dialogBounds?.height ?? 0)).toBeLessThanOrEqual(256);
  const maxScroll = await dialog.evaluate((element) => element.scrollHeight - element.clientHeight);
  expect(maxScroll).toBeGreaterThan(0);
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
  });
  await dialog.focus();
  await expect(dialog).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(dialog).toBeVisible();
  const expandedAxe = await scanStoryA11y(page);
  expect(expandedAxe.violations, "axe violations for expanded long hint").toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(detailsTrigger).toBeFocused();
});

test("OS reduced-motion preference disables tooltip animation without an explicit override", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(story("full-motion"));
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Review hint details" }).hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  // Storybook always sets an explicit motion override; remove it after mounting to test the
  // CSS fallback that real app users get when they have not chosen an explicit override.
  await page.evaluate(() => {
    document.documentElement.removeAttribute("data-motion");
  });
  await expect(tooltip).toHaveCSS("animation-name", "none");
});

test("opaque tooltip text meets contrast; reduced and off motion remove entrance animation", async ({
  page,
}) => {
  for (const name of [
    "default",
    "light",
    "high-contrast",
    "reduced-motion",
    "off-motion",
    "full-motion",
  ]) {
    await page.goto(story(name));
    await page.getByRole("button", { name: "Review hint details" }).hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    const metrics = await tooltip.evaluate((element) => {
      const style = getComputedStyle(element);
      const channels = (color: string) => (color.match(/[\d.]+/g) ?? []).map(Number);
      const [br = 0, bg = 0, bb = 0] = channels(style.backgroundColor);
      const [fr = 0, fg = 0, fb = 0, alpha = 1] = channels(style.color);
      const luminance = (r: number, g: number, b: number) => {
        const linear = [r, g, b].map((value) => {
          const c = value / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
      };
      const text = luminance(
        fr * alpha + br * (1 - alpha),
        fg * alpha + bg * (1 - alpha),
        fb * alpha + bb * (1 - alpha),
      );
      const background = luminance(br, bg, bb);
      return {
        contrast: (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05),
        animationName: style.animationName,
        animationDuration: style.animationDuration,
      };
    });
    expect(metrics.contrast, name).toBeGreaterThanOrEqual(4.5);
    if (name === "reduced-motion" || name === "off-motion") {
      expect(metrics.animationName).toBe("none");
    }
    if (name === "full-motion") {
      expect(metrics.animationName).toBe("lyceum-tooltip-in");
      expect(metrics.animationDuration).toBe("0.12s");
    }
  }
});

test("RTL tooltip content follows the local trigger direction across the portal", async ({
  page,
}) => {
  await page.goto(story("rtl"));
  await page.getByRole("button", { name: "Review hint details" }).focus();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS("direction", "rtl");
  await expect(tooltip).toContainText("توضح التلميحات الخطوة المفيدة التالية.");
});

test("tooltip stories have no tagged WCAG violations", async ({ page }) => {
  for (const name of [
    "default",
    "hover",
    "focus",
    "light",
    "high-contrast",
    "double-text",
    "reduced-motion",
    "off-motion",
    "full-motion",
    "reduced-transparency",
    "long-text",
    "long-double-text",
    "empty",
    "error-action",
    "rtl",
    "loading",
    "icon-only",
    "disabled",
  ]) {
    await page.goto(story(name));
    if (name !== "disabled") {
      await page.getByRole("button", { name: /Review hint details|Hint information/ }).focus();
      await expect(page.getByRole("tooltip")).toBeVisible();
    }
    const results = await scanStoryA11y(page);
    expect(results.violations, `axe violations for ${name}`).toEqual([]);
  }
});
