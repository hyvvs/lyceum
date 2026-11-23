import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";

const story = "/iframe.html?id=primitives-select--dialog-integration&viewMode=story";

test("keyboard Dialog + portalled Select retains accessible focus and cleans up both modal layers", async ({
  page,
}) => {
  await page.goto(story);
  const originalTrigger = page.getByRole("button", { name: "Open study settings" });
  const background = page.locator("#storybook-root");
  const dialog = page.getByRole("dialog", { name: "Study settings" });
  const dialogSurface = page.locator(".lyceum-dialog");
  // Radix Select temporarily aria-hides the parent Dialog while its own portal
  // is modal; keep a DOM locator for assertions across that intentional state.
  const selectTrigger = page.locator("#dialog-topic-select.lyceum-select__trigger");
  const listbox = page.getByRole("listbox");

  await expect(background).not.toHaveAttribute("aria-hidden", "true");
  await expect(background).not.toHaveAttribute("inert", "");
  for (let i = 0; i < 8; i++) {
    if (await originalTrigger.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(originalTrigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(background).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("combobox", { name: "Study topic" })).toBeVisible();
  await expect(selectTrigger).toBeVisible();
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  expect((await scanStoryA11y(page)).violations).toEqual([]);

  for (let i = 0; i < 8; i++) {
    if (await selectTrigger.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(selectTrigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(selectTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(listbox).toBeVisible();
  expect(
    await listbox.evaluate((node) => document.querySelector('[role="dialog"]')?.contains(node)),
  ).toBe(false);
  await expect(listbox).toHaveAttribute(
    "id",
    (await selectTrigger.getAttribute("aria-controls")) ?? "",
  );
  await expect(background).toHaveAttribute("aria-hidden", "true");
  await expect(background).toHaveAttribute("inert", "");
  // A real modal Dialog remains mounted under Select's separate modal portal.
  // The inactive Dialog surface is hidden and inert; the active listbox is not.
  await expect(dialogSurface).toHaveAttribute("data-aria-hidden", "true");
  await expect(dialogSurface).toHaveAttribute("aria-hidden", "true");
  await expect(dialogSurface).toHaveAttribute("inert", "");
  expect(
    await listbox.evaluate((node) => {
      let parent: Element | null = node;
      while (parent) {
        if (parent.hasAttribute("inert") || parent.getAttribute("aria-hidden") === "true") {
          return false;
        }
        parent = parent.parentElement;
      }
      return true;
    }),
    "the active Select portal must never be hidden or inert",
  ).toBe(true);
  await expect(page.getByRole("option", { name: "Mathematics" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect((await scanStoryA11y(page)).violations).toEqual([]);

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Physics" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(listbox).not.toBeVisible();
  await expect(selectTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(selectTrigger).toContainText("Physics");
  await expect(selectTrigger).toBeFocused();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Selected topic: physics")).toBeVisible();
  await expect(background).toHaveAttribute("aria-hidden", "true");
  await expect(background).not.toHaveAttribute("inert", "");
  await expect(dialogSurface).not.toHaveAttribute("aria-hidden", "true");
  await expect(dialogSurface).not.toHaveAttribute("inert", "");
  expect((await scanStoryA11y(page)).violations).toEqual([]);

  await page.keyboard.press("Enter");
  await expect(listbox).toBeVisible();
  await expect(background).toHaveAttribute("inert", "");
  await expect(dialogSurface).toHaveAttribute("inert", "");
  await page.keyboard.press("h");
  await expect(page.getByRole("option", { name: "History" })).toBeFocused();
  expect((await scanStoryA11y(page)).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(listbox).not.toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(selectTrigger).toBeFocused();
  await expect(background).not.toHaveAttribute("inert", "");
  await expect(dialogSurface).not.toHaveAttribute("inert", "");
  expect((await scanStoryA11y(page)).violations).toEqual([]);

  // The parent Dialog must still own modal Tab containment and respond to actions.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  }
  const reset = page.getByRole("button", { name: "Reset study topic" });
  await reset.focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByText("Selected topic: math")).toBeVisible();
  const close = page.getByRole("button", { name: "Close dialog" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(originalTrigger).toBeFocused();
  await expect(background).not.toHaveAttribute("aria-hidden", "true");
  await expect(background).not.toHaveAttribute("inert", "");
  expect(
    await page.locator('[data-aria-hidden="true"], [inert]').count(),
    "no abandoned modal aria-hidden marker or inert lock may remain",
  ).toBe(0);
  expect((await scanStoryA11y(page)).violations).toEqual([]);
});
