import { type Page, expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";
import { ACTIVE_WCAG_RULE_IDS } from "./axe-story-gate";

const story = "/iframe.html?id=qa-runtimepreferences--mounted-dialog-select&viewMode=story";

async function setVariant(
  page: Page,
  detail: { copy?: "short" | "long"; options?: "short" | "long" },
) {
  await expect(page.locator("#qa-runtime-identity")).toBeVisible();
  await page.evaluate(
    (patch) => window.dispatchEvent(new CustomEvent("lyceum:qa-variant-change", { detail: patch })),
    detail,
  );
}

async function openSelect(page: Page) {
  const dialogTrigger = page.getByRole("button", { name: "Open runtime study settings" });
  await dialogTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  const selectTrigger = page.locator("#qa-runtime-topic");
  await selectTrigger.focus();
  await page.keyboard.press("Enter");
  const popup = page.locator(".lyceum-select__content");
  await expect(popup).toBeVisible();
  return { dialogTrigger, selectTrigger, popup };
}

async function scaleText(page: Page, percent: "100%" | "200%") {
  await page.evaluate((textScale) => {
    window.dispatchEvent(
      new CustomEvent("lyceum:qa-preference-change", {
        detail: { textScale, transparency: "off", motion: "reduced" },
      }),
    );
  }, percent);
  await expect(page.locator("html")).toHaveCSS("font-size", percent === "200%" ? "32px" : "16px");
}

async function geometry(page: Page) {
  return page.locator(".lyceum-select__content").evaluate((popup) => {
    const rectangle = (el: Element) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
    };
    const chosen = [...popup.querySelectorAll('[role="option"]')].find(
      (el) => el === document.activeElement,
    );
    const viewport = popup.querySelector(".lyceum-select__viewport");
    const wrapper = popup.closest("[data-radix-popper-content-wrapper]");
    return {
      popup: rectangle(popup),
      focused: chosen ? rectangle(chosen) : null,
      wrapper: wrapper ? rectangle(wrapper) : null,
      side: popup.getAttribute("data-side"),
      window: { width: innerWidth, height: innerHeight },
      scroll: viewport
        ? { top: viewport.scrollTop, max: viewport.scrollHeight - viewport.clientHeight }
        : null,
    };
  });
}

async function expectFocusedOptionPerceivable(page: Page, description: string) {
  await expect
    .poll(
      async () => {
        const measured = await geometry(page);
        const focus = measured.focused;
        if (!focus) return false;
        return (
          focus.top >= 0 &&
          focus.bottom <= measured.window.height &&
          focus.left >= 0 &&
          focus.right <= measured.window.width
        );
      },
      { message: description, timeout: 5000 },
    )
    .toBe(true);
}

async function requireAxeRules(page: Page, stage: string) {
  const results = await scanStoryA11y(page);
  const ids = new Set(
    [...results.passes, ...results.violations, ...results.incomplete, ...results.inapplicable].map(
      (entry) => entry.id,
    ),
  );
  expect([...ids].sort(), `exact axe rule IDs in ${stage}`).toEqual(ACTIVE_WCAG_RULE_IDS);
  expect(results.violations, `axe violations in ${stage}`).toEqual([]);
}

test("forced-colors selected ItemText paints actual readable glyphs, not a solid block", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 520 });
  await page.goto(story);
  await openSelect(page);
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  const row = page.getByRole("option", { name: "Mathematics" });
  await expect(row).toHaveAttribute("data-highlighted", "");
  const screenshot = await page.screenshot({ animations: "disabled" });
  const result = await page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Cannot read actual Chromium screenshot pixels");
    ctx.drawImage(bitmap, 0, 0);
    const option = document.querySelector<HTMLElement>(".lyceum-select__item[data-highlighted]");
    const text = option?.querySelector<HTMLElement>("span:first-child");
    if (!option || !text) throw new Error("Missing highlighted Radix ItemText");
    const match = getComputedStyle(option).backgroundColor.match(/\d+/g);
    if (!match) throw new Error("Missing selected system-color background");
    const expected = match.slice(0, 3).map(Number);
    const bounds = text.getBoundingClientRect();
    let highlightPixels = 0;
    let contrastingPixels = 0;
    let samples = 0;
    for (let y = Math.ceil(bounds.top); y < Math.floor(bounds.bottom); y++) {
      for (let x = Math.ceil(bounds.left); x < Math.floor(bounds.right); x++) {
        const rgba = ctx.getImageData(x, y, 1, 1).data;
        const same = expected.every((value, i) => Math.abs(value - (rgba[i] ?? -100)) <= 10);
        if (same) highlightPixels++;
        else contrastingPixels++;
        samples++;
      }
    }
    return {
      highlightPixels,
      contrastingPixels,
      samples,
      styles: {
        optionColor: getComputedStyle(option).color,
        background: getComputedStyle(option).backgroundColor,
        textColor: getComputedStyle(text).color,
        textFill: getComputedStyle(text).webkitTextFillColor,
        forcedColorAdjust: getComputedStyle(text).forcedColorAdjust,
      },
    };
  }, screenshot.toString("base64"));
  console.info(`SELECT_FORCED_GLYPH_PIXELS ${JSON.stringify(result)}`);
  expect(result.samples).toBeGreaterThan(0);
  expect(
    result.highlightPixels / result.samples,
    "visible background between rendered glyphs",
  ).toBeGreaterThan(0.15);
  expect(
    result.contrastingPixels / result.samples,
    "actually painted selected glyph strokes",
  ).toBeGreaterThan(0.05);
  await requireAxeRules(page, "emulated forced-colors screenshot");
});

test("short viewport and side-placement matrix preserves visible keyboard focus and pointer operation", async ({
  page,
}) => {
  test.slow();
  test.setTimeout(180_000);
  const scenarios = [
    [320, 190, "200%"],
    [320, 200, "200%"],
    [320, 205, "200%"],
    [320, 210, "200%"],
    [320, 256, "200%"],
    [320, 320, "200%"],
    [800, 256, "200%"],
    [320, 256, "100%"],
    [800, 256, "100%"],
    [800, 520, "100%"],
  ] as const;
  const seenSides = new Set<string>();
  for (const [width, height, scale] of scenarios) {
    await page.setViewportSize({ width, height });
    await page.goto(story);
    const { dialogTrigger, selectTrigger, popup } = await openSelect(page);
    await scaleText(page, scale);
    await expect(popup).toBeVisible();
    await page.keyboard.press("End");
    const last = page.getByRole("option", { name: "History" });
    await expect(last).toBeFocused();
    const measured = await geometry(page);
    console.info(`SELECT_POSITION_MATRIX ${JSON.stringify({ width, height, scale, ...measured })}`);
    if (measured.side) seenSides.add(measured.side);
    if (height <= 320 && measured.wrapper) {
      expect(Math.abs(measured.popup.top - measured.wrapper.top)).toBeLessThan(1);
      expect(Math.abs(measured.popup.bottom - measured.wrapper.bottom)).toBeLessThan(1);
    }
    const targetHeight = await last.evaluate((element) => element.getBoundingClientRect().height);
    expect(targetHeight, "focused option must retain a 44px touch target").toBeGreaterThanOrEqual(
      44,
    );
    if (measured.scroll && measured.scroll.max > 0) {
      expect(measured.scroll.top, "End must scroll to the final option").toBeGreaterThan(0);
    }
    await expectFocusedOptionPerceivable(
      page,
      `History focused visible at ${width}x${height}/${scale}`,
    );
    await page.keyboard.press("Home");
    await expect(page.getByRole("option", { name: "Mathematics" })).toBeFocused();
    if (measured.scroll && measured.scroll.max > 0) {
      const home = await geometry(page);
      expect(
        home.scroll?.top ?? Number.POSITIVE_INFINITY,
        "Home must scroll towards the first option",
      ).toBeLessThan(measured.scroll.top);
    }
    await expectFocusedOptionPerceivable(
      page,
      `Mathematics focused visible at ${width}x${height}/${scale}`,
    );
    await last.click();
    await expect(selectTrigger).toContainText("History");
    await expect(selectTrigger).toBeFocused();
    await expect(selectTrigger).toBeInViewport({ ratio: 1 });
    await page.keyboard.press("Escape");
    await expect(dialogTrigger).toBeFocused();
    await expect(page.locator('[data-aria-hidden="true"], [inert]')).toHaveCount(0);
  }
  expect([...seenSides].sort()).toEqual(["bottom", "top"]);
});

test("200%-text long Dialog copy and scrollable option list keep active option visible", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(story);
  await setVariant(page, { copy: "long", options: "long" });
  const { dialogTrigger, selectTrigger, popup } = await openSelect(page);
  const old = await popup.elementHandle();
  if (!old) throw new Error("Missing popup for same-mounted long-copy regression");
  await scaleText(page, "200%");
  expect(await popup.evaluate((node, before) => node === before && node.isConnected, old)).toBe(
    true,
  );
  await page.keyboard.press("End");
  const last = page.getByRole("option", { name: "Literature" });
  await expect(last).toBeFocused();
  const measured = await geometry(page);
  console.info(`SELECT_LONG_COPY_GEOMETRY ${JSON.stringify(measured)}`);
  await expectFocusedOptionPerceivable(
    page,
    "long Dialog copy must not hide the keyboard-focused option",
  );
  expect(measured.scroll?.max ?? 0).toBeGreaterThan(0);
  await requireAxeRules(page, "long-copy 200%-text scrolled listbox");
  await page.keyboard.press("Home");
  await expect(page.getByRole("option", { name: "Mathematics" })).toBeFocused();
  await expectFocusedOptionPerceivable(page, "Home must restore a visible first option");
  await page.keyboard.press("End");
  await last.click();
  await expect(selectTrigger).toContainText("Literature");
  await expect(selectTrigger).toBeFocused();
  await expect(
    selectTrigger,
    "Select focus return must be perceivable after a long-copy popup closes",
  ).toBeInViewport({
    ratio: 1,
  });
  const description = page.locator(".lyceum-dialog__description");
  await expect(description).toContainText("upcoming checkpoints");
  await page.keyboard.press("Shift+Tab");
  await description.scrollIntoViewIfNeeded();
  await expect(description).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(dialogTrigger).toBeFocused();
  await expect(page.locator('[data-aria-hidden="true"], [inert]')).toHaveCount(0);
});
