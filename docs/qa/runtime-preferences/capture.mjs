import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const origin = new URL(process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006");
if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("Runtime preference QA capture only permits loopback Storybook preview.");
}

const story = `${origin.origin}/iframe.html?id=qa-runtimepreferences--mounted-dialog-select&viewMode=story`;
const browser = await chromium.launch();

async function openWithKeyboard(page) {
  await page.goto(story);
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
} finally {
  await browser.close();
}
