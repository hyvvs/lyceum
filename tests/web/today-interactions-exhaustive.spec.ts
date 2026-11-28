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
  expect(visibleEnabled).toHaveLength(14);

  const main = page.locator("#main-content");
  await page
    .getByRole("navigation", { name: "Main sections" })
    .getByRole("button", { name: "Today" })
    .click();
  await expect(main).toBeFocused();
  await page
    .getByRole("navigation", { name: "Section shortcuts" })
    .getByRole("button", { name: "Today" })
    .click();
  await expect(main).toBeFocused();

  const search = page.getByRole("button", { name: "Search workspace" });
  await search.click();
  await expect(search).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("Today is the only available section.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(search).toHaveAttribute("aria-expanded", "false");

  const notifications = page.getByRole("button", { name: "Notifications" });
  await notifications.click();
  await expect(page.getByText("Demo reminder: 12 reviews scheduled.")).toBeVisible();
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(notifications.locator(".rp-notification-dot")).toHaveCount(0);

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

  const profile = page.getByRole("button", { name: "Demo profile" });
  await profile.click();
  await expect(profile).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/no learner account/i)).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).click();

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
  await page.getByRole("button", { name: "Start session" }).click();
  await expect(
    page.getByText("Study sessions are not available yet.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toHaveCount(1);
  expect(errors).toEqual([]);
});
