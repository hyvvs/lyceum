import { expect, test } from "@playwright/test";

/** Every currently enabled production Today control has a meaningful action. */
test("Today supports a complete navigation, task, appearance and panel interaction loop", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByTestId("lyceum-live-today")).toBeVisible();

  const visibleEnabled = await page.locator("button").evaluateAll((buttons) =>
    buttons
      .filter((item) => {
        const bounds = item.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && !item.hasAttribute("disabled");
      })
      .map((item) => item.getAttribute("aria-label") ?? item.textContent?.trim() ?? ""),
  );
  expect(visibleEnabled).toHaveLength(9);

  const main = page.locator("#main-content");
  await page
    .getByRole("navigation", { name: "Main sections" })
    .getByRole("button", { name: "Today" })
    .click();
  await expect(main).toBeFocused();
  const settings = page.getByRole("button", { name: "Settings" });
  await settings.click();
  await page.getByLabel("Theme", { exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Transparency").selectOption("reduced");
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "reduced");
  await page.getByLabel("Transparency").selectOption("full");
  await page.getByLabel("Language").selectOption("es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.getByLabel("Language").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.keyboard.press("Escape");
  await expect(settings).toHaveAttribute("aria-expanded", "false");

  const periods = ["Month", "Term", "Week"];
  for (const period of periods) {
    await page.getByRole("button", { name: period, exact: true }).click();
    await expect(page.getByRole("button", { name: period, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  for (const label of [
    "Substitution practice",
    "Repair sign errors",
    "Recall notes",
    "Review integration rules",
  ]) {
    const task = page.getByRole("button", { name: new RegExp(label) });
    await task.click();
    await expect(task).toHaveAttribute("aria-pressed", "true");
  }
  await expect(page.getByRole("button", { name: "Start session" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toHaveCount(1);
  expect(errors).toEqual([]);
});
