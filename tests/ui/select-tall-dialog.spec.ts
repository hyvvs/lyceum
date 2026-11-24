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
    composition?: "tall" | "compact";
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
      trigger: rect(document.querySelector("#qa-runtime-topic")),
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

test("tall-body initial Radix autofocus is visibly perceivable without any artificial focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await configure(page);
  await keyboardOpenDialog(page);
  const initial = await measure(page);
  console.info(`TALL_BODY_INITIAL_FOCUS_RED ${JSON.stringify(initial)}`);
  expect(initial.reading?.height ?? 0).toBeGreaterThan(900);
  await expect(page.getByRole("button", { name: "Acknowledge study notes" })).toBeFocused();
  await expectActuallyVisible(
    page,
    'button:has-text("Acknowledge study notes")',
    "initial Radix autofocus in tall-body Dialog",
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
  expect(initial.reading?.height ?? 0, "actual preceding notes at 200% are tall").toBeGreaterThan(
    900,
  );
  expect(initial.dialogScroll?.max ?? 0).toBeGreaterThan(900);
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
  await expectActuallyVisible(page, '[role="option"]:focus', "ArrowDown focus");
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
  const dialog = page.getByRole("dialog");
  const readingParagraphs = page.locator("[data-qa-tall-reading] p");
  await page.mouse.move(145, 125);
  await page.mouse.wheel(0, -2000);
  await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBe(0);
  await expect(readingParagraphs.first()).toBeInViewport();
  await page.mouse.wheel(0, 850);
  await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(readingParagraphs.last()).toBeInViewport();
  const trigger = await keyboardTabTo(page, "#qa-runtime-topic");
  await expectActuallyVisible(page, "#qa-runtime-topic", "pointer path trigger");
  await trigger.click();
  const option = page.getByRole("option", { name: "History" });
  await option.click();
  await expect(trigger).toContainText("History");
  await expect(trigger).toBeFocused();
  await expectActuallyVisible(page, "#qa-runtime-topic", "pointer selection return");
  await page.mouse.wheel(0, -2000);
  await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBe(0);
  await expect(readingParagraphs.first()).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open runtime study settings" })).toBeFocused();
  await expect(page.locator("[inert], [data-aria-hidden='true']")).toHaveCount(0);
});

test("compact and long-description compositions retain native focused Select behavior", async ({
  page,
}) => {
  test.slow();
  for (const { width, height, copy, composition, dir } of [
    { width: 320, height: 190, copy: "short", composition: "tall", dir: "ltr" },
    { width: 320, height: 256, copy: "long", composition: "compact", dir: "ltr" },
    { width: 800, height: 256, copy: "short", composition: "tall", dir: "rtl" },
  ] as const) {
    await page.setViewportSize({ width, height });
    await configure(page, { copy, composition, direction: dir });
    await keyboardOpenDialog(page);
    await keyboardTabTo(page, "#qa-runtime-topic");
    await expect(page.locator("#qa-runtime-topic")).toHaveAttribute("dir", dir);
    console.info(
      `TALL_COMPOSITION_VARIANT ${JSON.stringify({ width, height, copy, composition, dir, ...(await measure(page)) })}`,
    );
    await expectActuallyVisible(page, "#qa-runtime-topic", "variant keyboard trigger");
    await page.keyboard.press("Enter");
    await expect(page.locator(".lyceum-select__content")).toHaveAttribute("dir", dir);
    await page.keyboard.press("End");
    await expect(page.getByRole("option", { name: "Literature" })).toBeFocused();
    await expectActuallyVisible(page, '[role="option"]:focus', "variant final option");
    await page.keyboard.press("Escape");
    await expectActuallyVisible(page, "#qa-runtime-topic", "variant Select return");
    await page.keyboard.press("Escape");
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
  await page.keyboard.press("Enter");
  const popup = page.locator(".lyceum-select__content");
  await expect(popup).toBeVisible();
  const original = await popup.elementHandle();
  if (!original) throw new Error("No real Select portal");
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("lyceum:qa-preference-change", {
        detail: { textScale: "200%", transparency: "off", motion: "reduced" },
      }),
    ),
  );
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  expect(await popup.evaluate((node, old) => node === old && node.isConnected, original)).toBe(
    true,
  );
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "Literature" })).toBeFocused();
  const changed = await measure(page);
  console.info(`TALL_BODY_LIVE_SCALE ${JSON.stringify(changed)}`);
  await expectActuallyVisible(page, '[role="option"]:focus', "live-scaled last option");
  expect(changed.popup?.top ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(0);
  expect(changed.popup?.bottom ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
    changed.visible.height,
  );
  await page.keyboard.press("Escape");
  await expectActuallyVisible(page, "#qa-runtime-topic", "live scale return focus");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open runtime study settings" })).toBeFocused();
  await expect(page.locator("[inert], [data-aria-hidden='true']")).toHaveCount(0);
});
