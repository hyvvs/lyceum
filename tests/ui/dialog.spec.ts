import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";

const story = (name: string) => `/iframe.html?id=primitives-dialog--${name}&viewMode=story`;

test("dialog opens from keyboard with an accessible name and contained focus", async ({ page }) => {
  await page.goto(story("default"));
  const trigger = page.getByRole("button", { name: "Open study preferences" });
  for (let step = 0; step < 8; step++) {
    if (await trigger.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(trigger).toBeFocused();
  expect(await trigger.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Study preferences" });
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Choose how Lyceum presents practice sessions.")).toBeVisible();
  for (let step = 0; step < 8; step++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  for (let step = 0; step < 8; step++) {
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
});

test("Escape closes dialog and restores focus to the trigger", async ({ page }) => {
  await page.goto(story("default"));
  const trigger = page.getByRole("button", { name: "Open study preferences" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Study preferences" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("close control and outside pointer interaction both dismiss the modal", async ({ page }) => {
  await page.goto(story("default"));
  const trigger = page.getByRole("button", { name: "Open study preferences" });
  await trigger.click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator(".lyceum-dialog__overlay").click({ position: { x: 3, y: 3 } });
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("at 200% text a narrow viewport retains visible controls without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(story("double-text"));
  await page.getByRole("button", { name: "Open study preferences" }).click();
  const dialog = page.getByRole("dialog", { name: "Study preferences" });
  const bounds = await dialog.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
  const closeBounds = await page.getByRole("button", { name: "Close dialog" }).boundingBox();
  expect(closeBounds?.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole("button", { name: "Close dialog" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("long content scrolls inside a small dialog and keeps Close accessible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 260 });
  await page.goto(story("long-content"));
  await page.getByRole("button", { name: "Open study preferences" }).click();
  const dialog = page.getByRole("dialog", { name: "Study preferences" });
  expect(await dialog.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true,
  );
  const close = page.getByRole("button", { name: "Close dialog" });
  await close.scrollIntoViewIfNeeded();
  await expect(close).toBeInViewport();
  await close.click();
  await expect(dialog).not.toBeVisible();
});

test("hover and keyboard focus styling survive theme changes", async ({ page }) => {
  await page.goto(story("hover"));
  const hoverTrigger = page.getByRole("button", { name: "Open study preferences" });
  await hoverTrigger.hover();
  await expect(hoverTrigger).toHaveCSS("filter", "brightness(1.08)");

  for (const name of ["default", "light", "high-contrast"]) {
    await page.goto(story(name));
    const trigger = page.getByRole("button", { name: "Open study preferences" });
    for (let step = 0; step < 8; step++) {
      if (await trigger.evaluate((node) => node === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Study preferences" });
    await expect(dialog).toBeVisible();
    const close = page.getByRole("button", { name: "Close dialog" });
    for (let step = 0; step < 8; step++) {
      if (await close.evaluate((node) => node === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(close).toBeFocused();
    await expect(close).toHaveCSS("outline-style", "solid");
    const alpha = await page.locator(".lyceum-dialog__overlay").evaluate((node) => {
      const color = getComputedStyle(node).backgroundColor;
      return color.startsWith("rgba(") ? Number(color.split(",").at(-1)?.replace(")", "")) : 1;
    });
    expect(alpha, `${name} overlay opacity`).toBe(1);
  }
});

test("dialog description text meets 4.5:1 on opaque dark and light surfaces", async ({ page }) => {
  for (const name of ["default", "light", "high-contrast"]) {
    await page.goto(story(name));
    await page.getByRole("button", { name: "Open study preferences" }).click();
    const contrast = await page.getByRole("dialog").evaluate((dialog) => {
      const description =
        dialog.querySelector("[id][data-radix-dialog-description]") ??
        dialog.querySelector(".lyceum-dialog__description");
      if (!description) throw new Error("Dialog description missing");
      const channels = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number);
      const [br = 0, bg = 0, bb = 0] = channels(getComputedStyle(dialog).backgroundColor);
      const [fr = 0, fg = 0, fb = 0, alpha = 1] = channels(getComputedStyle(description).color);
      const lum = (r: number, g: number, b: number) => {
        const linear = [r, g, b].map((v) => {
          const c = v / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
      };
      const text = lum(
        fr * alpha + br * (1 - alpha),
        fg * alpha + bg * (1 - alpha),
        fb * alpha + bb * (1 - alpha),
      );
      const background = lum(br, bg, bb);
      return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
    });
    expect(contrast, name).toBeGreaterThanOrEqual(4.5);
  }
});

test("dialog stories are axe clean in dark, light, high contrast and other states", async ({
  page,
}) => {
  for (const name of [
    "default",
    "hover",
    "focus",
    "light",
    "high-contrast",
    "double-text",
    "reduced-motion",
    "reduced-transparency",
    "long-content",
    "empty",
    "error-action",
    "rtl",
    "loading",
    "disabled",
  ]) {
    await page.goto(story(name));
    const trigger = page.getByRole("button", { name: "Open study preferences" });
    if (name === "disabled") {
      await expect(trigger).toBeDisabled();
    } else {
      await trigger.click();
      await expect(page.getByRole("dialog", { name: "Study preferences" })).toBeVisible();
    }
    const results = await scanStoryA11y(page);
    expect(results.violations, `axe violations for ${name}`).toEqual([]);
  }
});
