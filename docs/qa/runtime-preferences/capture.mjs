import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const origin = new URL(process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006");
if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("Runtime preference QA capture only permits loopback Storybook preview.");
}

const story = `${origin.origin}/iframe.html?id=qa-runtimepreferences--mounted-dialog-select&viewMode=story`;
const browser = await chromium.launch();

async function openWithKeyboard(page, variant) {
  await page.goto(story);
  if (variant) {
    await expect(page.locator("#qa-runtime-identity")).toBeVisible();
    await page.evaluate(
      (detail) => window.dispatchEvent(new CustomEvent("lyceum:qa-variant-change", { detail })),
      variant,
    );
  }
  const original = page.getByRole("button", { name: "Open runtime study settings" });
  for (let i = 0; i < 8; i++) {
    if (await original.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(original).toBeFocused();
  await page.keyboard.press("Enter");
  const select = page.locator("#qa-runtime-topic");
  for (let i = 0; i < 8; i++) {
    if (await select.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(select).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  return page.locator(".lyceum-select__content").elementHandle();
}

const previousShortViewportRule = `@media (max-height: 320px) {
  .lyceum-dialog:has(.lyceum-select__trigger:is([data-state="open"], :focus))
    .lyceum-dialog__body {
    position: static !important;
    z-index: auto !important;
    background: transparent !important;
  }
  .lyceum-select__content[data-side="top"] {
    translate: 0 calc(-1 * var(--space-3)) !important;
  }
}`;

const previousForcedColorsRule = `@media (forced-colors: active) {
  .lyceum-select__item[data-highlighted] {
    color: HighlightText !important;
    background: Highlight !important;
    outline-color: Highlight !important;
  }
}`;

async function captureComparison(page, name, { before = false, longCopy = false } = {}) {
  // Replay only the prior production CSS declarations for "before" captures.
  // The fixture/component code stays identical in both shots.
  const popup = await openWithKeyboard(
    page,
    longCopy ? { copy: "long", options: "long" } : undefined,
  );
  if (!popup) throw new Error("Missing active Select during responsive comparison");
  if (before) await page.addStyleTag({ content: previousShortViewportRule });
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("lyceum:qa-preference-change", {
        detail: { textScale: "200%", transparency: "off", motion: "reduced" },
      }),
    );
  });
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  await page.keyboard.press("End");
  const last = page.getByRole("option", { name: longCopy ? "Literature" : "History" });
  await expect(last).toBeFocused();
  const measured = await page.locator(".lyceum-select__content").evaluate((node) => {
    const frame = node.getBoundingClientRect();
    const focus = document.activeElement?.getBoundingClientRect();
    const wrapper = node.closest("[data-radix-popper-content-wrapper]")?.getBoundingClientRect();
    return {
      side: node.getAttribute("data-side"),
      viewportHeight: innerHeight,
      popupTop: frame.top,
      popupBottom: frame.bottom,
      wrapperBottom: wrapper?.bottom,
      focusedTop: focus?.top,
      focusedBottom: focus?.bottom,
    };
  });
  if (!before) {
    expect(measured.focusedTop).toBeGreaterThanOrEqual(0);
    expect(measured.focusedBottom).toBeLessThanOrEqual(measured.viewportHeight);
    expect(measured.popupBottom).toBeLessThanOrEqual(measured.viewportHeight);
    expect(Math.abs(measured.popupBottom - measured.wrapperBottom)).toBeLessThan(1);
  }
  await page.screenshot({
    path: fileURLToPath(new URL(`./${name}.png`, import.meta.url)),
    animations: "disabled",
    fullPage: false,
  });
  console.info(`QA_RESPONSIVE_COMPARISON ${name} ${JSON.stringify(measured)}`);
}

async function capture(page, popupHandle, name, patch, expectedBlur) {
  if (patch) {
    await page.evaluate((detail) => {
      window.dispatchEvent(new CustomEvent("lyceum:qa-preference-change", { detail }));
    }, patch);
    for (const [key, value] of Object.entries(patch)) {
      if (key === "textScale") {
        await expect(page.locator("html")).toHaveCSS(
          "font-size",
          value === "200%" ? "32px" : "16px",
        );
      } else {
        await expect(page.locator("html")).toHaveAttribute(`data-${key}`, value);
      }
    }
  }
  const popup = page.locator(".lyceum-select__content");
  await expect(popup).toBeVisible();
  expect(await popup.evaluate((node, original) => node === original, popupHandle)).toBe(true);
  const styles = await popup.evaluate((node) => ({
    backdropFilter: getComputedStyle(node).backdropFilter,
    background: getComputedStyle(node).backgroundColor,
    color: getComputedStyle(node).color,
    frameWidth: innerWidth,
    pageScrollWidth: document.documentElement.scrollWidth,
  }));
  if (expectedBlur) expect(styles.backdropFilter).toContain("blur(");
  else expect(styles.backdropFilter).toBe("none");
  expect(styles.pageScrollWidth).toBeLessThanOrEqual(styles.frameWidth);
  if (name === "native-forced-colors") {
    const selected = await page
      .getByRole("option", { name: "Mathematics" })
      .evaluate((element) => ({
        optionColor: getComputedStyle(element).color,
        optionBackground: getComputedStyle(element).backgroundColor,
        textColor: getComputedStyle(element.querySelector("span") ?? element).color,
        textBackground: getComputedStyle(element.querySelector("span") ?? element).backgroundColor,
        textFill: getComputedStyle(element.querySelector("span") ?? element).webkitTextFillColor,
        textVisibility: getComputedStyle(element.querySelector("span") ?? element).visibility,
        textOpacity: getComputedStyle(element.querySelector("span") ?? element).opacity,
        textContent: element.textContent,
        selectedText: getSelection()?.toString(),
        activeTag: document.activeElement?.tagName,
      }));
    console.info(`QA_FORCED_SELECTED ${JSON.stringify(selected)}`);
  }
  const path = fileURLToPath(new URL(`./${name}.png`, import.meta.url));
  await page.screenshot({ path, fullPage: false, animations: "disabled" });
  console.info(`QA_CAPTURE ${name} ${JSON.stringify(styles)}`);
}

try {
  const page = await browser.newPage({
    viewport: { width: 800, height: 520 },
    colorScheme: "dark",
  });
  try {
    const popup = await openWithKeyboard(page);
    if (!popup) throw new Error("No mounted QA popup");
    await capture(page, popup, "dark-full-glass", null, true);
    await capture(page, popup, "light-full-glass", { theme: "light" }, true);
    await capture(
      page,
      popup,
      "dark-reduced-transparency",
      { theme: "dark", transparency: "reduced" },
      false,
    );
    await capture(page, popup, "dark-opaque", { transparency: "off" }, false);
    await capture(page, popup, "dark-high-contrast", { contrast: "high" }, false);
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    // The old Highlight-fill rule is replayed in a separate image; the same
    // actual Chromium-emulated popup is captured again with the corrected
    // Canvas/CanvasText + Highlight-outline fallback.
    const oldHighlight = await page.addStyleTag({ content: previousForcedColorsRule });
    await capture(page, popup, "before-forced-colors", { motion: "reduced" }, false);
    await oldHighlight.evaluate((element) => element.remove());
    await capture(page, popup, "native-forced-colors", { motion: "reduced" }, false);
  } finally {
    await page.close();
  }

  const narrow = await browser.newPage({
    viewport: { width: 320, height: 256 },
    colorScheme: "dark",
  });
  try {
    const popup = await openWithKeyboard(narrow);
    if (!popup) throw new Error("No mounted QA popup at narrow viewport");
    await capture(
      narrow,
      popup,
      "narrow-200-percent",
      { textScale: "200%", transparency: "off", contrast: "high", motion: "reduced" },
      false,
    );
  } finally {
    await narrow.close();
  }

  for (const viewport of [
    { width: 320, height: 190, label: "short-190", longCopy: false },
    { width: 320, height: 256, label: "short-256", longCopy: false },
    { width: 320, height: 256, label: "long-256", longCopy: true },
  ]) {
    for (const before of [true, false]) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: "dark",
      });
      try {
        await captureComparison(page, `${before ? "before" : "after"}-${viewport.label}`, {
          before,
          longCopy: viewport.longCopy,
        });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
