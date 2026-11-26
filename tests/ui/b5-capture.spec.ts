import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/** Chromium evidence only. No production data; screenshots opt in with LYCEUM_CAPTURE_B5=1. */
const capture = process.env.LYCEUM_CAPTURE_B5 === "1";
const out = join("docs", "qa", "m0-017-stage-b5", "screenshots");
const composition = (state: string) =>
  `/iframe.html?id=visual-compositions-m0-017-b5-complete--${state}&viewMode=story`;
const primitive = (family: string, state: string) =>
  `/iframe.html?id=primitives-${family}--${state}&viewMode=story`;

async function screenshot(page: import("@playwright/test").Page, name: string, fullPage = false) {
  if (!capture) return;
  mkdirSync(out, { recursive: true });
  await page.screenshot({
    path: join(out, name),
    fullPage,
    animations: "disabled",
  });
}

test("B5 representative full-glass, light, solid and forced-colors actual integrated imagery", async ({
  page,
}) => {
  for (const scene of [
    { state: "dark-full", width: 1440, height: 900, file: "composition-dark-full-desktop.png" },
    { state: "light-full", width: 1440, height: 900, file: "composition-light-full-desktop.png" },
    { state: "opaque", width: 1440, height: 900, file: "composition-solid-desktop.png" },
    {
      state: "high-contrast",
      width: 1440,
      height: 900,
      file: "composition-high-contrast-desktop.png",
    },
    { state: "dark-full", width: 390, height: 844, file: "composition-dark-mobile.png" },
    { state: "double-text", width: 320, height: 256, file: "composition-200-text-short.png" },
  ]) {
    await page.setViewportSize({ width: scene.width, height: scene.height });
    await page.goto(composition(scene.state));
    await expect(page.getByTestId("b5-composition")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      scene.width + 1,
    );
    await page.mouse.move(0, 0);
    await screenshot(page, scene.file, true);
  }
  // Actual 320×256 viewports complement the very tall 200%-text full-page image.
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(composition("double-text"));
  const chart = page.getByRole("figure", { name: "Fictional weekly counts" });
  await chart.scrollIntoViewIfNeeded();
  await expect(chart).toBeVisible();
  await screenshot(page, "composition-200-text-chart-viewport.png");
  const radio = page.getByRole("radio", { name: "Comfortable" });
  await radio.focus();
  await expect(radio).toBeFocused();
  await screenshot(page, "composition-200-text-radio-focus-viewport.png");
  await page.emulateMedia({ forcedColors: "active" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(composition("high-contrast"));
  await expect(page.getByText("Synthetic fixture · not a tutoring product")).toBeVisible();
  await screenshot(page, "composition-forced-colors-emulation-mobile.png", true);
});

test("B5 interactive controls actual native focus and selected state evidence", async ({
  page,
}) => {
  await page.setViewportSize({ width: 720, height: 500 });
  await page.goto(primitive("roundiconbutton", "badge"));
  const iconButton = page.getByRole("button", { name: "Open messages" });
  await expect(iconButton).toHaveAccessibleDescription("3 unread messages");
  await screenshot(page, "round-icon-badge.png");
  await page.goto(primitive("roundiconbutton", "interactive"));
  const interactive = page.getByRole("button", { name: "Open messages" });
  await interactive.focus();
  await expect(interactive).toBeFocused();
  await screenshot(page, "round-icon-keyboard-focus.png");
  await page.goto(primitive("segmentedcontrol", "interactive"));
  const medium = page.getByRole("radio", { name: "Standard" });
  await medium.check();
  await medium.focus();
  await expect(medium).toBeChecked();
  await screenshot(page, "segmented-selected-focus.png");
  await page.goto(primitive("segmentedcontrol", "double-text"));
  await expect(page.getByRole("radio", { name: "Brief" })).toBeVisible();
  await screenshot(page, "segmented-200-text.png");
});

test("B5 real data/reading families include highlights, empty, uncertainty and solid fallback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 520 });
  for (const item of [
    {
      family: "statcard",
      state: "with-trend",
      selector: ".lyceum-stat-card",
      file: "stat-card-trend.png",
    },
    {
      family: "statcard",
      state: "no-data",
      selector: ".lyceum-stat-card",
      file: "stat-card-unavailable.png",
    },
    {
      family: "barchart",
      state: "highlighted",
      selector: ".lyceum-bar-chart",
      file: "bar-chart-highlight.png",
    },
    {
      family: "masteryring",
      state: "default",
      selector: ".lyceum-mastery-ring",
      file: "mastery-ring-uncertainty.png",
    },
    {
      family: "masteryring",
      state: "unknown",
      selector: ".lyceum-mastery-ring",
      file: "mastery-ring-unassessed.png",
    },
    {
      family: "chatbubble",
      state: "multiline",
      selector: ".lyceum-chat-bubble",
      file: "chat-tutor-multiline.png",
    },
    {
      family: "chatbubble",
      state: "learner",
      selector: ".lyceum-chat-bubble",
      file: "chat-learner.png",
    },
    {
      family: "chatbubble",
      state: "high-contrast",
      selector: ".lyceum-chat-bubble",
      file: "chat-solid-high-contrast.png",
    },
    {
      family: "chatbubble",
      state: "long-text",
      selector: ".lyceum-chat-bubble",
      file: "chat-long-content.png",
    },
  ]) {
    await page.goto(primitive(item.family, item.state));
    const surface = page.locator(item.selector);
    await expect(surface).toBeVisible();
    await screenshot(page, item.file);
  }
});
