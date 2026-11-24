import { type Page, expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";
import { ACTIVE_WCAG_RULE_IDS } from "./axe-story-gate";

const story = "/iframe.html?id=qa-runtimepreferences--mounted-dialog-select&viewMode=story";

type Box = { top: number; bottom: number; left: number; right: number; height: number };

async function configure(
  page: Page,
  {
    composition = "tall",
    copy = "short",
    scale = "200%",
    direction = "ltr",
  }: {
    composition?: "tall" | "tall-unbounded" | "compact";
    copy?: "short" | "long";
    scale?: "100%" | "200%";
    direction?: "ltr" | "rtl";
  } = {},
) {
  await page.goto(story);
  await expect(page.locator("#qa-runtime-identity")).toBeVisible();
  await page.evaluate(
    ({ composition, copy, scale, direction }) => {
      window.dispatchEvent(
        new CustomEvent("lyceum:qa-variant-change", {
          detail: { composition, copy, options: "long", direction },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("lyceum:qa-preference-change", {
          detail: {
            textScale: scale,
            contrast: "high",
            transparency: "off",
            motion: "reduced",
          },
        }),
      );
    },
    { composition, copy, scale, direction },
  );
  await expect(page.locator("html")).toHaveCSS("font-size", scale === "200%" ? "32px" : "16px");
}

async function keyboardOpenDialog(page: Page) {
  const trigger = page.getByRole("button", { name: "Open runtime study settings" });
  for (let attempt = 0; attempt < 12; attempt++) {
    if (await trigger.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  return trigger;
}

async function keyboardTabTo(page: Page, selector: string, direction: "Tab" | "Shift+Tab" = "Tab") {
  const target = page.locator(selector);
  for (let attempt = 0; attempt < 12; attempt++) {
    if (await target.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press(direction);
  }
  await expect(target, `natural ${direction} navigation to ${selector}`).toBeFocused();
  return target;
}

async function expectReadingEndpointHitTestable(page: Page, endpoint: "first" | "last") {
  await expect
    .poll(() =>
      page.locator("[data-qa-tall-reading]").evaluate((region, which) => {
        const paragraph = region.querySelector(
          which === "first" ? "p:first-of-type" : "p:last-of-type",
        );
        if (!paragraph) return false;
        const frame = region.getBoundingClientRect();
        const text = paragraph.getBoundingClientRect();
        const top = Math.max(frame.top + 2, text.top);
        const bottom = Math.min(frame.bottom - 2, text.bottom);
        const left = Math.max(frame.left + 2, text.left);
        const right = Math.min(frame.right - 2, text.right);
        if (bottom <= top || right <= left) return false;
        const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
        return hit === paragraph || paragraph.contains(hit);
      }, endpoint),
    )
    .toBe(true);
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const rect = (element: Element | null | undefined): Box | null => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        top: bounds.top,
        bottom: bounds.bottom,
        left: bounds.left,
        right: bounds.right,
        height: bounds.height,
      };
    };
    const popup = document.querySelector<HTMLElement>(".lyceum-select__content");
    const scroll = document.querySelector<HTMLElement>(".lyceum-dialog");
    const viewport = popup?.querySelector<HTMLElement>(".lyceum-select__viewport");
    const active = document.activeElement;
    return {
      visible: { width: innerWidth, height: innerHeight },
      dialog: rect(scroll),
      dialogScroll: scroll && {
        top: scroll.scrollTop,
        max: scroll.scrollHeight - scroll.clientHeight,
      },
      reading: rect(document.querySelector("[data-qa-tall-reading]")),
      readingScroll: (() => {
        const el = document.querySelector<HTMLElement>("[data-qa-tall-reading]");
        return el && { top: el.scrollTop, max: el.scrollHeight - el.clientHeight };
      })(),
      trigger: rect(document.querySelector("#qa-runtime-topic")),
      activeTrigger: rect(document.querySelector('.lyceum-select__trigger[data-state="open"]')),
      secondaryTrigger: rect(document.querySelector("#qa-runtime-pace")),
      popup: rect(popup),
      wrapper: rect(popup?.closest("[data-radix-popper-content-wrapper]")),
      focused: rect(active),
      side: popup?.getAttribute("data-side"),
      listScroll: viewport && {
        top: viewport.scrollTop,
        max: viewport.scrollHeight - viewport.clientHeight,
      },
    };
  });
}

async function expectActuallyVisible(page: Page, selector: string, stage: string) {
  const target = page.locator(selector);
  await expect(target, `${stage}: intersects viewport`).toBeInViewport({ ratio: 1 });
  const hit = await target.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const center = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
    const top = document.elementFromPoint(center.x, center.y);
    return top === element || !!(top && element.contains(top));
  });
  expect(hit, `${stage}: not masked by a sticky Dialog sibling or another portal`).toBe(true);
}

async function expectBoundedExternalFocusRingVisible(page: Page, selector: string, stage: string) {
  const geometry = await page.locator(selector).evaluate((element) => {
    const scrollport = element.closest(".lyceum-dialog");
    if (!scrollport) throw new Error("Focused control is not within a Dialog scrollport");
    const control = element.getBoundingClientRect();
    const dialog = scrollport.getBoundingClientRect();
    const style = getComputedStyle(element);
    // Use the actual scrollport client edges, not the outer bordered box.
    const clipTop = dialog.top + scrollport.clientTop;
    const clipLeft = dialog.left + scrollport.clientLeft;
    return {
      keyboardFocusVisible: element.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      ringOutset: Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset),
      topClearance: control.top - Math.max(clipTop, 0),
      bottomClearance: Math.min(clipTop + scrollport.clientHeight, innerHeight) - control.bottom,
      leftClearance: control.left - Math.max(clipLeft, 0),
      rightClearance: Math.min(clipLeft + scrollport.clientWidth, innerWidth) - control.right,
    };
  });
  expect(geometry.keyboardFocusVisible, `${stage}: genuine keyboard focus indicator`).toBe(true);
  expect(geometry.outlineStyle, `${stage}: painted external outline`).toBe("solid");
  expect(geometry.ringOutset, `${stage}: external control focus outline`).toBeGreaterThanOrEqual(5);
  expect(
    Math.min(
      geometry.topClearance,
      geometry.bottomClearance,
      geometry.leftClearance,
      geometry.rightClearance,
    ),
    `${stage}: real external focus outline fits within Dialog clip ${JSON.stringify(geometry)}`,
  ).toBeGreaterThanOrEqual(geometry.ringOutset);
}

/** The Linux 99%-row regression must be judged by actual glyph/ring pixels,
 * not by lowering an IntersectionObserver ratio alone. */
async function expectFocusedOptionRendered(page: Page, stage: string) {
  const option = page.locator('[role="option"]:focus');
  await expect(option).toHaveAttribute("data-highlighted", "");
  const png = await page.screenshot({ animations: "disabled" });
  const measured = await page.evaluate(async (encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Cannot inspect rendered Chromium focus screenshot");
    ctx.drawImage(bitmap, 0, 0);
    const item = document.querySelector<HTMLElement>('[role="option"]:focus');
    const span = item?.querySelector<HTMLElement>("span:first-child");
    const viewport = item?.closest(".lyceum-select__viewport");
    const popup = item?.closest(".lyceum-select__content");
    if (!item || !span || !viewport || !popup)
      throw new Error("Missing focused Radix text and viewport");
    const frame = item.getBoundingClientRect();
    const glyph = span.getBoundingClientRect();
    const list = viewport.getBoundingClientRect();
    const content = popup.getBoundingClientRect();
    const style = getComputedStyle(item);
    const parseRgb = (value: string) => (value.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    const background = parseRgb(style.backgroundColor);
    const ringColor = parseRgb(style.outlineColor);
    let glyphStrokes = 0;
    let glyphPixels = 0;
    let backgroundPixels = 0;
    for (let y = Math.ceil(glyph.top); y < Math.floor(glyph.bottom); y++) {
      for (let x = Math.ceil(glyph.left); x < Math.floor(glyph.right); x++) {
        if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) continue;
        const color = ctx.getImageData(x, y, 1, 1).data;
        const matches = background.every((value, i) => Math.abs(value - (color[i] ?? 0)) <= 16);
        if (!matches) glyphStrokes++;
        else backgroundPixels++;
        glyphPixels++;
      }
    }
    // Selected item's focus outline is inset inside the target. Probe its
    // left stroke across the visible height, even if 0.x px of row is clipped.
    let ringPixels = 0;
    let ringSamples = 0;
    const x = Math.ceil(frame.left + 1);
    for (
      let y = Math.ceil(Math.max(frame.top + 4, list.top, content.top, 0));
      y < Math.floor(Math.min(frame.bottom - 4, list.bottom, content.bottom, innerHeight));
      y++
    ) {
      if (x < 0 || x >= bitmap.width || y < 0 || y >= bitmap.height) continue;
      const color = ctx.getImageData(x, y, 1, 1).data;
      if (ringColor.every((value, i) => Math.abs(value - (color[i] ?? 0)) <= 32)) ringPixels++;
      ringSamples++;
    }
    const topLimit = Math.max(0, list.top, content.top);
    const bottomLimit = Math.min(innerHeight, list.bottom, content.bottom);
    const leftLimit = Math.max(0, list.left, content.left);
    const rightLimit = Math.min(innerWidth, list.right, content.right);
    const point = document.elementFromPoint(
      glyph.left + glyph.width / 2,
      glyph.top + glyph.height / 2,
    );
    return {
      row: { top: frame.top, bottom: frame.bottom, height: frame.height },
      glyph: { top: glyph.top, bottom: glyph.bottom },
      focus: {
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
        color: style.outlineColor,
        isHighlighted: item.hasAttribute("data-highlighted"),
      },
      clippedRowPixels: Math.max(0, topLimit - frame.top) + Math.max(0, frame.bottom - bottomLimit),
      glyphFullyVisible:
        glyph.top >= topLimit &&
        glyph.bottom <= bottomLimit &&
        glyph.left >= leftLimit &&
        glyph.right <= rightLimit,
      textHit: point === span || !!(point && span.contains(point)),
      glyphPixels,
      glyphStrokes,
      backgroundPixels,
      ringSamples,
      ringPixels,
    };
  }, png.toString("base64"));
  console.info(`TALL_OPTION_RENDERED_PIXELS ${stage} ${JSON.stringify(measured)}`);
  expect(measured.glyphFullyVisible, `${stage}: no actual glyph content clipped`).toBe(true);
  expect(measured.textHit, `${stage}: glyph not masked`).toBe(true);
  expect(
    measured.clippedRowPixels,
    `${stage}: at most a subpixel row-edge intersection`,
  ).toBeLessThan(1);
  expect(Number.parseFloat(measured.focus.outlineWidth)).toBeGreaterThanOrEqual(2);
  expect(Number.parseFloat(measured.focus.outlineOffset)).toBeLessThan(0);
  expect(measured.glyphPixels).toBeGreaterThan(0);
  expect(
    measured.glyphStrokes / measured.glyphPixels,
    `${stage}: actual glyph pixels`,
  ).toBeGreaterThan(0.05);
  expect(
    measured.backgroundPixels / measured.glyphPixels,
    `${stage}: avoid an opaque text-sized rectangle hiding selected glyphs`,
  ).toBeGreaterThan(0.1);
  expect(measured.ringPixels, `${stage}: painted inset focus ring pixels`).toBeGreaterThan(3);
}

async function exactAxe(page: Page) {
  const scan = await scanStoryA11y(page);
  const ids = new Set(
    [...scan.passes, ...scan.violations, ...scan.incomplete, ...scan.inapplicable].map(
      (result) => result.id,
    ),
  );
  expect([...ids].sort()).toEqual(ACTIVE_WCAG_RULE_IDS);
  expect(scan.violations).toEqual([]);
}

async function preferenceChange(page: Page, patch: Record<string, string>) {
  await page.evaluate((detail) => {
    window.dispatchEvent(new CustomEvent("lyceum:qa-preference-change", { detail }));
  }, patch);
  for (const [key, value] of Object.entries(patch)) {
    if (key === "textScale") {
      await expect(page.locator("html")).toHaveCSS("font-size", value === "200%" ? "32px" : "16px");
    } else {
      await expect(page.locator("html")).toHaveAttribute(`data-${key}`, value);
    }
  }
}

async function expectRealPopperInViewport(page: Page, stage: string) {
  await expect
    .poll(
      async () => {
        const m = await measure(page);
        if (!m.wrapper || !m.popup || !m.activeTrigger) return false;
        return (
          m.popup.top >= 0 &&
          m.popup.bottom <= m.visible.height &&
          Math.abs(m.popup.top - m.wrapper.top) < 1 &&
          Math.abs(m.popup.bottom - m.wrapper.bottom) < 1 &&
          m.dialog !== null &&
          m.activeTrigger.top >= Math.max(0, m.dialog.top) &&
          m.activeTrigger.bottom <= Math.min(m.visible.height, m.dialog.bottom)
        );
      },
      { message: `${stage}: actual anchor and aligned Radix popup visible` },
    )
    .toBe(true);
}

test("tall-body initial Radix autofocus is visibly perceivable without any artificial focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await configure(page);
  await keyboardOpenDialog(page);
  const initial = await measure(page);
  console.info(`TALL_BODY_INITIAL_FOCUS_RED ${JSON.stringify(initial)}`);
  expect(initial.readingScroll?.max ?? 0).toBeGreaterThan(0);
  const readingStart = page.locator("#qa-tall-reading-start");
  await expect(readingStart).toBeFocused();
  await expectActuallyVisible(
    page,
    "#qa-tall-reading-start",
    "initial consumer-approved reading-start focus",
  );
  expect(await readingStart.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe(
    "none",
  );
});

test("tall real Dialog body: natural Tab keeps two Selects, options and sibling controls perceivable", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 320, height: 256 });
  await configure(page);
  const originalTrigger = await keyboardOpenDialog(page);
  await expect(page.locator("[data-qa-tall-reading] p")).toHaveCount(4);
  const initial = await measure(page);
  console.info(`TALL_BODY_OPEN ${JSON.stringify(initial)}`);
  expect(
    initial.readingScroll?.max ?? 0,
    "all reading content remains natively scrollable",
  ).toBeGreaterThan(0);
  await expect(page.locator("#qa-tall-reading-start")).toBeFocused();
  const selectTrigger = await keyboardTabTo(page, "#qa-runtime-topic");
  console.info(`TALL_BODY_NATURAL_TAB ${JSON.stringify(await measure(page))}`);
  await expectActuallyVisible(page, "#qa-runtime-topic", "first Select trigger keyboard focus");
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Acknowledge study notes" })).toBeFocused();
  await expectActuallyVisible(
    page,
    'button:has-text("Acknowledge study notes")',
    "Shift+Tab back to preceding control",
  );
  await expectBoundedExternalFocusRingVisible(
    page,
    'button:has-text("Acknowledge study notes")',
    "Shift+Tab Acknowledge external ring",
  );
  await page.keyboard.press("Tab");
  await expect(selectTrigger).toBeFocused();
  await expectActuallyVisible(page, "#qa-runtime-topic", "Tab returns to first Select");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("End");
  const literature = page.getByRole("option", { name: "Literature" });
  await expect(literature).toBeFocused();
  expect(
    await literature.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
  console.info(`TALL_BODY_END ${JSON.stringify(await measure(page))}`);
  await expectActuallyVisible(page, '[role="option"]:focus', "End focus on final list option");
  const end = await measure(page);
  expect(end.popup?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(end.visible.height);
  expect(end.popup?.top ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(0);
  expect(
    Math.abs((end.popup?.top ?? 0) - (end.wrapper?.top ?? Number.POSITIVE_INFINITY)),
  ).toBeLessThan(1);
  expect(end.listScroll?.max ?? 0).toBeGreaterThan(0);

  await page.keyboard.press("Home");
  await expect(page.getByRole("option", { name: "Mathematics" })).toBeFocused();
  await expectActuallyVisible(page, '[role="option"]:focus', "Home focus");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Physics" })).toBeFocused();
  await expectFocusedOptionRendered(page, "ArrowDown Physics at 320x256/200%");
  await page.keyboard.press("Escape");
  await expect(selectTrigger).toBeFocused();
  await expectActuallyVisible(page, "#qa-runtime-topic", "returned focus after Escape");

  await keyboardTabTo(page, "button:has-text('Save study settings')");
  await expectActuallyVisible(page, "button:has-text('Save study settings')", "sibling action");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Study settings saved" })).toBeVisible();
  const second = await keyboardTabTo(page, "#qa-runtime-pace");
  await expectActuallyVisible(page, "#qa-runtime-pace", "second Select trigger");
  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "Intensive" })).toBeFocused();
  await expectActuallyVisible(page, '[role="option"]:focus', "second Select End");
  await page.keyboard.press("Enter");
  await expect(second).toContainText("Intensive");
  await expect(second).toBeFocused();
  await expectActuallyVisible(page, "#qa-runtime-pace", "second Select return");
  await keyboardTabTo(page, 'button[aria-label="Close dialog"]');
  await expectActuallyVisible(page, 'button[aria-label="Close dialog"]', "Dialog Close");
  await exactAxe(page);
  await page.keyboard.press("Enter");
  await expect(originalTrigger).toBeFocused();
  await expect(page.locator("[inert], [data-aria-hidden='true']")).toHaveCount(0);
});

test("tall composition: scrollable text remains reachable and pointer Select remains usable", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 320, height: 256 });
  await configure(page);
  await keyboardOpenDialog(page);
  const dialog = page.locator(".lyceum-dialog");
  const reading = page.getByRole("region", { name: "Study preparation notes" });
  const readingParagraphs = page.locator("[data-qa-tall-reading] p");
  await expect(page.locator("#qa-tall-reading-start")).toBeFocused();
  // The static reading-start heading intentionally PRECEDES the scrollport.
  // Forward Tab enters the reading region without an artificial focus call.
  await page.keyboard.press("Tab");
  await expect(reading).toBeFocused();
  expect(
    await reading.evaluate((node) => Number.parseFloat(getComputedStyle(node).outlineWidth)),
  ).toBeGreaterThanOrEqual(4);
  await page.keyboard.press("PageDown");
  await expect.poll(() => reading.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  // Return to the start through the same native keyboard path before the
  // pointer-wheel check; do not race an in-flight PageDown with direct scrollTop mutation.
  await page.keyboard.press("Home");
  await expect.poll(() => reading.evaluate((node) => node.scrollTop)).toBe(0);
  const readingBounds = await reading.boundingBox();
  if (!readingBounds) throw new Error("Reading scrollport not laid out");
  await page.mouse.move(
    readingBounds.x + readingBounds.width / 2,
    readingBounds.y + readingBounds.height / 2,
  );
  await page.mouse.wheel(0, 2400);
  await expect
    .poll(() =>
      reading.evaluate((node) => node.scrollTop >= node.scrollHeight - node.clientHeight - 1),
    )
    .toBe(true);
  await expect
    .poll(async () => {
      const [last, frame] = await Promise.all([
        readingParagraphs.last().boundingBox(),
        reading.boundingBox(),
      ]);
      return Boolean(
        last && frame && last.y < frame.y + frame.height && last.y + last.height > frame.y,
      );
    })
    .toBe(true);
  await page.keyboard.press("Home");
  await expect.poll(() => reading.evaluate((node) => node.scrollTop)).toBe(0);
  await expect
    .poll(async () => {
      const [first, frame] = await Promise.all([
        readingParagraphs.first().boundingBox(),
        reading.boundingBox(),
      ]);
      return Boolean(
        first && frame && first.y < frame.y + frame.height && first.y + first.height > frame.y,
      );
    })
    .toBe(true);
  const trigger = await keyboardTabTo(page, "#qa-runtime-topic");
  await expectActuallyVisible(page, "#qa-runtime-topic", "pointer path trigger");
  await trigger.click();
  const option = page.getByRole("option", { name: "History" });
  await option.click();
  await expect(trigger).toContainText("History");
  await expect(trigger).toBeFocused();
  await expectActuallyVisible(page, "#qa-runtime-topic", "pointer selection return");
  await expect(reading).toBeVisible();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open runtime study settings" })).toBeFocused();
  await expect(page.locator("[inert], [data-aria-hidden='true']")).toHaveCount(0);
});

test("historical unbounded tall-body composition reproduces both original offscreen defects", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 320, height: 256 });
  await configure(page, { composition: "tall-unbounded" });
  await keyboardOpenDialog(page);
  await expect(page.getByRole("button", { name: "Acknowledge study notes" })).toBeFocused();
  const legacyInitial = await measure(page);
  expect(legacyInitial.reading?.height ?? 0).toBeGreaterThan(900);
  expect(legacyInitial.focused?.top ?? 0).toBeGreaterThan(256);
  console.info(`TALL_UNBOUNDED_INITIAL_HISTORICAL ${JSON.stringify(legacyInitial)}`);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open runtime study settings" })).toBeFocused();
  await configure(page, { composition: "tall-unbounded", scale: "100%" });
  await keyboardOpenDialog(page);
  await keyboardTabTo(page, "#qa-runtime-topic");
  await page.keyboard.press("Enter");
  const popup = page.locator(".lyceum-select__content");
  await expect(popup).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("lyceum:qa-preference-change", {
        detail: { textScale: "200%" },
      }),
    ),
  );
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "Literature" })).toBeFocused();
  const legacyScaled = await measure(page);
  console.info(`TALL_UNBOUNDED_LIVE_HISTORICAL ${JSON.stringify(legacyScaled)}`);
  expect(legacyScaled.popup?.top ?? 0).toBeGreaterThan(256);
  expect(legacyScaled.focused?.top ?? 0).toBeGreaterThan(256);
});

test("all supported short viewport scales, RTL and compact long-description keep focus and Radix positioning", async ({
  page,
}) => {
  test.slow();
  test.setTimeout(180_000);
  for (const { width, height, copy, composition, dir, scale } of [
    { width: 320, height: 190, copy: "short", composition: "tall", dir: "ltr", scale: "100%" },
    { width: 320, height: 190, copy: "short", composition: "tall", dir: "ltr", scale: "200%" },
    { width: 320, height: 256, copy: "short", composition: "tall", dir: "ltr", scale: "100%" },
    { width: 320, height: 256, copy: "short", composition: "tall", dir: "ltr", scale: "200%" },
    { width: 800, height: 256, copy: "short", composition: "tall", dir: "rtl", scale: "100%" },
    { width: 800, height: 256, copy: "short", composition: "tall", dir: "rtl", scale: "200%" },
    { width: 320, height: 256, copy: "long", composition: "tall", dir: "ltr", scale: "200%" },
    { width: 320, height: 256, copy: "long", composition: "compact", dir: "ltr", scale: "200%" },
  ] as const) {
    await page.setViewportSize({ width, height });
    await configure(page, { copy, composition, direction: dir, scale });
    await keyboardOpenDialog(page);
    if (composition === "tall") {
      await expect(page.locator("#qa-tall-reading-start")).toBeFocused();
      await expectActuallyVisible(
        page,
        "#qa-tall-reading-start",
        `${width}x${height}/${scale} reading start`,
      );
      expect((await measure(page)).readingScroll?.max ?? 0).toBeGreaterThan(0);
      if (height === 190) {
        // A one-line reading port is acceptable at 200% only if native
        // keyboard scrolling can traverse the entire untruncated text.
        const region = page.getByRole("region", { name: "Study preparation notes" });
        await page.keyboard.press("Tab");
        await expect(region).toBeFocused();
        await page.keyboard.press("PageDown");
        await expect.poll(() => region.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
        await page.keyboard.press("End");
        await expect
          .poll(() =>
            region.evaluate((node) => node.scrollTop >= node.scrollHeight - node.clientHeight - 1),
          )
          .toBe(true);
        await expectReadingEndpointHitTestable(page, "last");
        await page.keyboard.press("Home");
        await expect.poll(() => region.evaluate((node) => node.scrollTop)).toBe(0);
        await expectReadingEndpointHitTestable(page, "first");
      }
    }
    await keyboardTabTo(page, "#qa-runtime-topic");
    await expect(page.locator("#qa-runtime-topic")).toHaveAttribute("dir", dir);
    console.info(
      `TALL_COMPOSITION_VARIANT ${JSON.stringify({ width, height, copy, composition, dir, scale, ...(await measure(page)) })}`,
    );
    await expectActuallyVisible(page, "#qa-runtime-topic", "variant keyboard trigger");
    await page.keyboard.press("Enter");
    await expect(page.locator(".lyceum-select__content")).toHaveAttribute("dir", dir);
    await page.keyboard.press("End");
    await expect(page.getByRole("option", { name: "Literature" })).toBeFocused();
    await expectActuallyVisible(page, '[role="option"]:focus', "variant final option");
    await expectRealPopperInViewport(page, `${width}x${height}/${scale} end`);
    await page.keyboard.press("Home");
    await expect(page.getByRole("option", { name: "Mathematics" })).toBeFocused();
    // Linux can clip a fraction of the outer option row during Radix scroll
    // positioning. Require actual unobscured text glyphs and inset focus-ring
    // pixels rather than treating a 0.x-pixel row edge as unreadable focus.
    await expectFocusedOptionRendered(page, `${width}x${height}/${scale} Home Mathematics`);
    await page.keyboard.press("Escape");
    await expectActuallyVisible(page, "#qa-runtime-topic", "variant Select return");
    if (height === 190 || dir === "rtl") {
      await keyboardTabTo(page, 'button[aria-label="Close dialog"]');
      await expectActuallyVisible(page, 'button[aria-label="Close dialog"]', "matrix Close button");
      await page.keyboard.press("Enter");
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(page.getByRole("button", { name: "Open runtime study settings" })).toBeFocused();
    await expect(page.locator("[inert], [data-aria-hidden='true']")).toHaveCount(0);
  }
});

test("tall body live 100%-to-200% change leaves the same portalled focused option visible", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 320, height: 256 });
  await configure(page, { scale: "100%" });
  await keyboardOpenDialog(page);
  await keyboardTabTo(page, "#qa-runtime-topic");
  await expectActuallyVisible(page, "#qa-runtime-topic", "100% tall body trigger");
  await expectBoundedExternalFocusRingVisible(
    page,
    "#qa-runtime-topic",
    "100% Select external ring",
  );
  await page.keyboard.press("Enter");
  // Radix makes the parent Dialog inert while the separately portalled Select
  // is open; its DOM identity remains stable though its role is hidden.
  const dialog = page.locator(".lyceum-dialog");
  const trigger = page.locator("#qa-runtime-topic");
  const popup = page.locator(".lyceum-select__content");
  await expect(popup).toBeVisible();
  const original = await popup.elementHandle();
  const originalDialog = await dialog.elementHandle();
  const originalTrigger = await trigger.elementHandle();
  const math = page.getByRole("option", { name: "Mathematics" });
  await expect(math).toBeFocused();
  await expect(math).toHaveAttribute("aria-selected", "true");
  const originalActive = await math.elementHandle();
  if (!original || !originalDialog || !originalTrigger || !originalActive) {
    throw new Error("Missing same-mounted Dialog, trigger, active option or portal");
  }
  const pageScrollBefore = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  await preferenceChange(page, { textScale: "200%", transparency: "off", motion: "reduced" });
  for (const [selector, handle] of [
    [".lyceum-select__content", original],
    [".lyceum-dialog", originalDialog],
    ["#qa-runtime-topic", originalTrigger],
    ['[role="option"][aria-selected="true"]', originalActive],
  ] as const) {
    expect(
      await page
        .locator(selector)
        .evaluate((node, previous) => node === previous && node.isConnected, handle),
    ).toBe(true);
  }
  await expect(math).toBeFocused();
  await expect(math).toHaveAttribute("aria-selected", "true");
  await expectActuallyVisible(
    page,
    '[role="option"]:focus',
    "same active option immediately after live 200%",
  );
  await expectRealPopperInViewport(page, "live text scale 200% before navigation");
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(pageScrollBefore);
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "Literature" })).toBeFocused();
  await expectActuallyVisible(page, '[role="option"]:focus', "live-scaled last option");
  await expectRealPopperInViewport(page, "live 200% after End");
  const changed = await measure(page);
  console.info(`TALL_BODY_LIVE_SCALE ${JSON.stringify(changed)}`);
  expect(changed.popup?.top ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(0);
  expect(changed.popup?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
    changed.visible.height,
  );
  await page.keyboard.press("Home");
  await expect(math).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Physics" })).toBeFocused();
  await expectFocusedOptionRendered(page, "live scale 200% after ArrowDown Physics");
  await page.keyboard.press("ArrowUp");
  await expect(math).toBeFocused();
  await page.keyboard.press("Escape");
  await expectActuallyVisible(page, "#qa-runtime-topic", "live scale return focus");
  await expect(trigger).toContainText("Mathematics");
  await keyboardTabTo(page, "#qa-runtime-pace");
  await page.keyboard.press("Enter");
  const pacePopup = page.locator(".lyceum-select__content");
  const paceHandle = await pacePopup.elementHandle();
  if (!paceHandle) throw new Error("No second Select portal");
  await preferenceChange(page, { textScale: "100%" });
  expect(
    await pacePopup.evaluate((node, previous) => node === previous && node.isConnected, paceHandle),
  ).toBe(true);
  await expectRealPopperInViewport(page, "second Select live 200% to 100%");
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "Intensive" })).toBeFocused();
  await expectActuallyVisible(page, '[role="option"]:focus', "second Select after reverse scale");
  await page.keyboard.press("Escape");
  await expect(page.locator("#qa-runtime-pace")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open runtime study settings" })).toBeFocused();
  await expect(page.locator("[inert], [data-aria-hidden='true']")).toHaveCount(0);
});

test("bounded same-mounted theme, contrast, transparency, motion and forced-colors states keep real active option", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 320, height: 256 });
  await configure(page, { scale: "200%" });
  await keyboardOpenDialog(page);
  await keyboardTabTo(page, "#qa-runtime-topic");
  await page.keyboard.press("Enter");
  const popup = page.locator(".lyceum-select__content");
  const popupNode = await popup.elementHandle();
  if (!popupNode) throw new Error("No portalled Select node for preference matrix");
  for (const patch of [
    { theme: "light" },
    { contrast: "standard" },
    { transparency: "reduced" },
    { motion: "full" },
    { theme: "dark", transparency: "off", motion: "reduced" },
    { contrast: "high", motion: "off" },
  ]) {
    await preferenceChange(page, patch);
    expect(
      await popup.evaluate((node, previous) => node === previous && node.isConnected, popupNode),
    ).toBe(true);
    await expect(page.getByRole("option", { name: "Mathematics" })).toBeFocused();
    await expectActuallyVisible(
      page,
      '[role="option"]:focus',
      `same-mounted ${JSON.stringify(patch)}`,
    );
    await expectRealPopperInViewport(page, `preference ${JSON.stringify(patch)}`);
  }
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  const systemColors = await page.locator(".qa-bounded-reading").evaluate((node) => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "Canvas";
    probe.style.color = "CanvasText";
    document.body.appendChild(probe);
    const expected = getComputedStyle(probe);
    const actual = getComputedStyle(node);
    const matches =
      actual.backgroundColor === expected.backgroundColor &&
      actual.color === expected.color &&
      actual.forcedColorAdjust !== "none";
    probe.remove();
    return matches;
  });
  expect(systemColors, "honor actual system Canvas/CanvasText rather than hard-coded colors").toBe(
    true,
  );
  await expect(page.locator("#qa-tall-reading-start")).toHaveCount(1);
  await expectRealPopperInViewport(page, "forced-colors bounded consumer");
  await expectActuallyVisible(page, '[role="option"]:focus', "forced-colors active Select option");
  await exactAxe(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#qa-runtime-topic")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open runtime study settings" })).toBeFocused();
  await expect(page.locator("[inert], [data-aria-hidden='true']")).toHaveCount(0);
});
