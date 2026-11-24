import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

/** Expose affected nodes/rule IDs without dismissing inconclusive checks as passes. */
async function inspectInconclusive(page: import("@playwright/test").Page, caseName: string) {
  const result = await scanStoryA11y(page);
  expect(result.violations, `confirmed violations in ${caseName}`).toEqual([]);
  console.info(
    `AXE_INCOMPLETE_TRIAGE ${caseName} ${JSON.stringify(
      result.incomplete.map((rule) => ({
        rule: rule.id,
        impact: rule.impact,
        nodes: rule.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
      })),
    )}`,
  );
  return result.incomplete.map((rule) => rule.id);
}

test("icon-only visible glyphs retain accessible names despite axe's manual label-in-name uncertainty", async ({
  page,
}) => {
  for (const entry of [
    { id: "primitives-button--empty", name: "More options", glyph: "•••" },
    { id: "primitives-visuallyhidden--default", name: "Open hint details", glyph: "?" },
    { id: "primitives-tooltip--icon-only", name: "Hint information", glyph: "?" },
  ]) {
    await page.goto(story(entry.id));
    const control = page.getByRole("button", { name: entry.name, exact: true });
    await expect(control).toBeVisible();
    await expect(control).toHaveAccessibleName(entry.name);
    await expect(control).toContainText(entry.glyph);
    if (entry.id === "primitives-visuallyhidden--default") {
      const hidden = page.locator("#hint-action-label");
      await expect(hidden).toHaveText(entry.name);
      expect(await hidden.evaluate((element) => getComputedStyle(element).position)).toBe(
        "absolute",
      );
    }
    if (entry.id === "primitives-tooltip--icon-only") {
      await control.focus();
      await expect(page.getByRole("tooltip")).toBeVisible();
    }
    await inspectInconclusive(page, entry.id);
  }
});

test("Dialog with active Select portal keeps the topmost popup focusable, named and unhidden", async ({
  page,
}) => {
  await page.goto(story("primitives-select--dialog-integration"));
  const dialogTrigger = page.getByRole("button", { name: "Open study settings" });
  await dialogTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Study settings" })).toBeVisible();
  await inspectInconclusive(page, "dialog-before-select");
  const select = page.getByRole("combobox", { name: "Study topic" });
  await select.focus();
  await page.keyboard.press("Enter");
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  expect(
    await listbox.evaluate((element) => {
      for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor.hasAttribute("inert") || ancestor.getAttribute("aria-hidden") === "true")
          return false;
      }
      return true;
    }),
  ).toBe(true);
  expect(await listbox.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await inspectInconclusive(page, "select-portal-over-dialog");
  await page.keyboard.press("Escape");
  await expect(select).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialogTrigger).toBeFocused();
  await expect(page.locator('[data-aria-hidden="true"], [inert]')).toHaveCount(0);
});

test("translucent Toast and Tooltip contrast is measured as rendered CSS, not marked automatically certified", async ({
  page,
}) => {
  await page.goto(story("primitives-toast--full-transparency"));
  const toast = page.locator(".lyceum-toast").first();
  await expect(toast).toBeVisible();
  const toastStyles = await toast.evaluate((element) => ({
    fill: getComputedStyle(element).backgroundColor,
    foreground: getComputedStyle(element).color,
    filter: getComputedStyle(element).backdropFilter,
  }));
  console.info(`TRANSLUCENT_CONTRAST_CONTEXT toast ${JSON.stringify(toastStyles)}`);
  await inspectInconclusive(page, "toast-full-transparency");

  await page.goto(story("primitives-tooltip--full-motion"));
  const trigger = page.getByRole("button", { name: "Review hint details" });
  await trigger.focus();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  const tooltipStyles = await tooltip.evaluate((element) => ({
    fill: getComputedStyle(element).backgroundColor,
    foreground: getComputedStyle(element).color,
    filter: getComputedStyle(element).backdropFilter,
  }));
  console.info(`TRANSLUCENT_CONTRAST_CONTEXT tooltip ${JSON.stringify(tooltipStyles)}`);
  await inspectInconclusive(page, "tooltip-full-motion");
});
