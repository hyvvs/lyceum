import { type ElementHandle, type Page, expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";
import { ACTIVE_WCAG_RULE_IDS } from "./axe-story-gate";

const story = "/iframe.html?id=qa-runtimepreferences--mounted-dialog-select&viewMode=story";

type PreferencePatch = Partial<{
  theme: "dark" | "light";
  contrast: "standard" | "high";
  transparency: "full" | "reduced" | "off";
  motion: "full" | "reduced" | "off";
  textScale: "100%" | "200%";
}>;

async function switchPreference(page: Page, patch: PreferencePatch) {
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

async function keyboardOpen(page: Page) {
  const dialogTrigger = page.getByRole("button", { name: "Open runtime study settings" });
  const selectTrigger = page.locator("#qa-runtime-topic.lyceum-select__trigger");
  for (let index = 0; index < 8; index++) {
    if (await dialogTrigger.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(dialogTrigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  for (let index = 0; index < 8; index++) {
    if (await selectTrigger.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(selectTrigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  return { dialogTrigger, selectTrigger };
}

async function axeState(page: Page, stage: string) {
  const results = await scanStoryA11y(page);
  const actual = new Set(
    [...results.passes, ...results.violations, ...results.incomplete, ...results.inapplicable].map(
      (rule) => rule.id,
    ),
  );
  expect([...actual].sort(), `exact enabled axe rule IDs at ${stage}`).toEqual(
    ACTIVE_WCAG_RULE_IDS,
  );
  expect(results.violations, `WCAG violations at ${stage}`).toEqual([]);
  console.info(
    `RUNTIME_AXE_CHECK ${stage} rules=${actual.size} incomplete=${results.incomplete.map((rule) => rule.id).join(",") || "none"}`,
  );
}

async function computedPopup(page: Page) {
  return page.locator(".lyceum-select__content").evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    color: getComputedStyle(node).color,
    blur: getComputedStyle(node).backdropFilter,
    border: getComputedStyle(node).borderColor,
    slow: getComputedStyle(document.documentElement).getPropertyValue("--motion-slow").trim(),
    base: getComputedStyle(document.documentElement).getPropertyValue("--motion-base").trim(),
    systemReduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
}

async function sameNode(
  page: Page,
  selector: string,
  old: ElementHandle<SVGElement | HTMLElement>,
) {
  const current = page.locator(selector);
  expect(await current.evaluate((element, original) => element === original, old)).toBe(true);
  expect(await old.evaluate((element) => element.isConnected)).toBe(true);
}

test("same mounted real Dialog and separately portalled Select survive runtime preference changes", async ({
  page,
}) => {
  test.slow();
  await page.goto(story);
  await expect(page.locator("#qa-runtime-identity")).toHaveCount(1);
  const { dialogTrigger, selectTrigger } = await keyboardOpen(page);
  const listbox = page.getByRole("listbox");
  const dialog = page.locator(".lyceum-dialog");

  // Choose an actual value, close via keyboard, reopen and retain it during all switches.
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Physics" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(selectTrigger).toContainText("Physics");
  await expect(selectTrigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(listbox).toBeVisible();
  await expect(page.getByRole("option", { name: "Physics" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const identity = await page.locator("#qa-runtime-identity").getAttribute("data-qa-instance");
  const dialogHandle = await dialog.elementHandle();
  const triggerHandle = await selectTrigger.elementHandle();
  const popupHandle = await page.locator(".lyceum-select__content").elementHandle();
  if (!dialogHandle || !triggerHandle || !popupHandle || !identity) {
    throw new Error("Missing real mounted Dialog/Select handles or instance ID");
  }

  async function assertStillMounted() {
    await sameNode(page, ".lyceum-dialog", dialogHandle);
    await sameNode(page, "#qa-runtime-topic", triggerHandle);
    await sameNode(page, ".lyceum-select__content", popupHandle);
    await expect(page.locator("#qa-runtime-identity")).toHaveAttribute(
      "data-qa-instance",
      identity,
    );
    await expect(selectTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(listbox).toBeVisible();
    await expect(page.getByRole("option", { name: "Physics" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      await listbox.evaluate((node) => document.querySelector(".lyceum-dialog")?.contains(node)),
    ).toBe(false);
    expect(
      await listbox.evaluate((node) => {
        for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) {
          if (ancestor.hasAttribute("inert") || ancestor.getAttribute("aria-hidden") === "true")
            return false;
        }
        return true;
      }),
    ).toBe(true);
    await expect(page.locator(".lyceum-dialog")).toHaveAttribute("inert", "");
    await expect(page.locator("#storybook-root")).toHaveAttribute("inert", "");
    expect(await listbox.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  }

  await assertStillMounted();
  await axeState(page, "initial-dark-full");
  const dark = await computedPopup(page);
  expect(dark.blur).toContain("blur(");

  const steps: { name: string; patch: PreferencePatch }[] = [
    { name: "light-full", patch: { theme: "light" } },
    { name: "dark-restored", patch: { theme: "dark" } },
    { name: "high-contrast", patch: { contrast: "high" } },
    { name: "standard-full", patch: { contrast: "standard" } },
    { name: "reduced-transparency", patch: { transparency: "reduced" } },
    { name: "off-transparency", patch: { transparency: "off" } },
    { name: "full-restored", patch: { transparency: "full" } },
    { name: "full-motion", patch: { motion: "full" } },
    { name: "reduced-motion", patch: { motion: "reduced" } },
    { name: "off-motion", patch: { motion: "off" } },
  ];
  for (const step of steps) {
    await switchPreference(page, step.patch);
    await assertStillMounted();
    const styles = await computedPopup(page);
    if (step.name === "light-full") {
      expect(styles.background).not.toBe(dark.background);
      expect(styles.color).not.toBe(dark.color);
    }
    if (step.name === "dark-restored") expect(styles.background).toBe(dark.background);
    if (step.name === "high-contrast") expect(styles.background).not.toBe(dark.background);
    if (
      step.name === "high-contrast" ||
      step.name === "reduced-transparency" ||
      step.name === "off-transparency"
    ) {
      expect(styles.blur).toBe("none");
    }
    if (step.name === "standard-full" || step.name === "full-restored")
      expect(styles.blur).toContain("blur(");
    if (step.name === "full-motion") expect(styles.slow).toBe(".45s");
    if (step.name === "reduced-motion") expect(styles.slow).toBe(".15s");
    if (step.name === "off-motion") {
      expect(styles.slow).toBe("0s");
      expect(styles.base).toBe("0s");
    }
    await axeState(page, step.name);
  }

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Chemistry" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("option", { name: "Physics" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(listbox).not.toBeVisible();
  await expect(selectTrigger).toBeFocused();
  await expect(dialog).not.toHaveAttribute("inert", "");
  await expect(dialog).not.toHaveAttribute("data-aria-hidden", "true");
  await expect(page.locator("#storybook-root")).not.toHaveAttribute("inert", "");
  await axeState(page, "select-closed");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(dialogTrigger).toBeFocused();
  // Storybook's own a11y addon legitimately has aria-hidden vision filters and
  // a hidden documentation table. Only modal-owned locks must be fully gone.
  await expect(page.locator("#storybook-root")).not.toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#storybook-root")).not.toHaveAttribute("data-aria-hidden", "true");
  await expect(page.locator('[data-aria-hidden="true"], [inert]')).toHaveCount(0);
  await axeState(page, "dialog-closed");
});

test("320x256 with true 200% text and native forced colors preserve the mounted popup", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(story);
  await keyboardOpen(page);
  const listbox = page.getByRole("listbox");
  const popup = page.locator(".lyceum-select__content");
  const popupHandle = await popup.elementHandle();
  if (!popupHandle) throw new Error("Missing active popup handle");
  await switchPreference(page, { textScale: "200%", transparency: "off", motion: "reduced" });
  await sameNode(page, ".lyceum-select__content", popupHandle);
  await expect(popup).toHaveCSS("backdrop-filter", "none");
  await expect
    .poll(async () => (await listbox.boundingBox())?.y ?? -1, { timeout: 5000 })
    .toBeGreaterThanOrEqual(0);
  const bounds = await listbox.boundingBox();
  if (!bounds) throw new Error("No rendered listbox at true 200% text");
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  console.info(
    "NARROW_ACTIVE_POPUP_LAYOUT",
    JSON.stringify(
      await page.locator(".lyceum-select__content").evaluate((content) => ({
        contentRect: {
          y: content.getBoundingClientRect().y,
          height: content.getBoundingClientRect().height,
        },
        contentMaxHeight: getComputedStyle(content).maxHeight,
        listboxRect: {
          y: (content.querySelector('[role="listbox"]') ?? content).getBoundingClientRect().y,
          height: (content.querySelector('[role="listbox"]') ?? content).getBoundingClientRect()
            .height,
        },
        viewportMaxHeight: getComputedStyle(
          content.querySelector(".lyceum-select__viewport") ?? content,
        ).maxHeight,
        viewportHeight: innerHeight,
      })),
    ),
  );
  // Regression: Linux previously placed the same mounted popup's bottom at
  // 265px in a 256px viewport, obscuring the last option. Require full fit.
  await expect
    .poll(async () => {
      const box = await listbox.boundingBox();
      return box ? box.y + box.height : Number.POSITIVE_INFINITY;
    })
    .toBeLessThanOrEqual(256);
  console.info(`NARROW_ACTIVE_POPUP_BOUNDS ${JSON.stringify(bounds)}`);
  await page.keyboard.press("End");
  const lastOption = page.getByRole("option", { name: "History" });
  await expect(lastOption).toBeFocused();
  await expect(lastOption).toBeInViewport({ ratio: 1 });
  await page.keyboard.press("Home");
  await expect(page.getByRole("option", { name: "Mathematics" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await axeState(page, "narrow-200-percent");

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  const forced = await computedPopup(page);
  expect(forced.systemReduce).toBe(true);
  expect(forced.blur).toBe("none");
  expect(forced.base).toBe("0s");
  await expect(popup).toBeVisible();
  await sameNode(page, ".lyceum-select__content", popupHandle);
  const chosen = page.getByRole("option", { name: "Mathematics" });
  await expect(chosen).toBeVisible();
  console.info(
    "FORCED_SELECTED_STYLES",
    JSON.stringify(
      await chosen.evaluate((element) => ({
        parentColor: getComputedStyle(element).color,
        parentBackground: getComputedStyle(element).backgroundColor,
        children: [...element.querySelectorAll("span")].map((span) => ({
          text: span.textContent,
          color: getComputedStyle(span).color,
          background: getComputedStyle(span).backgroundColor,
          webkitFill: getComputedStyle(span).webkitTextFillColor,
        })),
      })),
    ),
  );
  await axeState(page, "narrow-native-forced-colors-os-reduced-motion");
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "History" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#qa-runtime-topic")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open runtime study settings" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.locator('[data-aria-hidden="true"], [inert]')).toHaveCount(0);
  await axeState(page, "narrow-closed-clean");
});

test("QA runtime controller ignores inherited event keys and restores Storybook globals on unmount", async ({
  page,
}) => {
  await page.goto(story);
  const instance = page.locator("#qa-runtime-identity");
  await expect(instance).toBeVisible();
  const initialId = await instance.getAttribute("data-qa-instance");
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("lyceum:qa-preference-change", {
        detail: { constructor: "invalid", ["__proto__"]: "invalid", toString: "invalid" },
      }),
    );
  });
  await expect(instance).toHaveAttribute("data-qa-instance", initialId ?? "");
  await switchPreference(page, {
    theme: "light",
    contrast: "high",
    transparency: "off",
    motion: "off",
    textScale: "200%",
  });
  await expect(instance).toHaveAttribute("data-qa-instance", initialId ?? "");
  await page.evaluate(() => window.dispatchEvent(new Event("lyceum:qa-unmount-fixture")));
  await expect(page.getByText("QA fixture unmounted")).toBeVisible();
  await expect(instance).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "standard");
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "full");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await expect(page.locator("html")).toHaveCSS("font-size", "16px");
  await axeState(page, "test-only-fixture-unmounted");
});
