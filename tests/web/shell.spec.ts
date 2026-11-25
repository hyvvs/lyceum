import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("real application routes, keyboard skip link and truthful empty states", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain("unsafe-eval");
  expect(await page.locator("script:not([src])").count()).toBe(0);
  await expect(page.getByRole("heading", { name: "A clear place to begin." })).toBeVisible();
  await expect(
    page.getByText("No learning goal or sessions are configured", { exact: false }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Settings" })
    .click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Make this space yours." }),
  ).toBeFocused();
  await expect(page.locator("main")).toHaveCount(1);
  await page.goto("/a-page-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "This page isn't here." })).toBeVisible();
  expect(requests.every((url) => url.startsWith("http://127.0.0.1:4173/"))).toBe(true);
});

test("localized ICU strings, saved theme and finished opaque/high contrast variants", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("Theme", { exact: true }).selectOption("high-contrast");
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "off");
  await page.getByLabel("Language").selectOption("es");
  await expect(page.getByRole("heading", { name: "Haz tuyo este espacio." })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { name: "Haz tuyo este espacio." })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await page.getByLabel("Idioma").selectOption("en");
  await page.getByLabel("Theme", { exact: true }).selectOption("system");
  await expect(page.locator("html")).not.toHaveAttribute("data-contrast", "high");
});

test("actual dedicated worker round-trip, cancellation acknowledgement, and recovery", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByTestId("worker-status")).toHaveText("Worker transport connected");
  await page.getByRole("button", { name: "Test cancellation" }).click();
  await expect(page.getByTestId("worker-status")).toHaveText("Cancellation acknowledged");
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByTestId("worker-status")).toHaveText("Worker transport connected");
});

test("WCAG axe gates on real shell, settings, and solid fallback", async ({ page }) => {
  for (const path of ["/", "/settings"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations,
      JSON.stringify(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ),
    ).toEqual([]);
  }
  await page.goto("/settings");
  await page.getByLabel("Theme", { exact: true }).selectOption("high-contrast");
  await page.goto("/");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations, JSON.stringify(result.violations.map((v) => v.id))).toEqual([]);
});

test("actual 200% text scale fits small viewport without losing navigation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await expect(page.getByRole("heading", { name: "A clear place to begin." })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Quick navigation" })
      .getByRole("link", { name: "Settings" }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("short mobile viewport keeps focused controls out of floating dock and reveals routed heading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  // A translated/zoomed route title can exceed the available height.
  // Ensure the interactive-control dock clearance does not scroll away its
  // first line when the lazy Settings route receives heading focus.
  await page.addStyleTag({ content: ".settings-screen h1 { min-height: 360px; }" });

  async function focusClearOfDock(locator: ReturnType<typeof page.getByRole>) {
    await locator.focus();
    await expect(locator).toBeFocused();
    await expect
      .poll(async () => {
        return locator.evaluate((node) => {
          const focus = node.getBoundingClientRect();
          const dock = document.querySelector(".icon-dock")?.getBoundingClientRect();
          if (!dock) return false;
          return focus.top >= 0 && focus.bottom <= dock.top - 6;
        });
      })
      .toBe(true);
  }

  await focusClearOfDock(page.getByRole("link", { name: "Personalize your space" }));
  await focusClearOfDock(page.getByRole("button", { name: "Check connection" }));
  await focusClearOfDock(page.getByRole("button", { name: "Test cancellation" }));
  // Use the actual keyboard to navigate to the responsive capsule.
  await page
    .getByRole("navigation", { name: "Quick navigation" })
    .getByRole("link", { name: "Settings" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/settings$/);
  const title = page.getByRole("heading", { name: "Make this space yours." });
  await expect(title).toBeFocused();
  await expect
    .poll(async () =>
      title.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return rect.top >= -3 && rect.top < window.innerHeight;
      }),
    )
    .toBe(true);
  await focusClearOfDock(page.getByLabel("Language"));
  await page
    .getByRole("navigation", { name: "Quick navigation" })
    .getByRole("link", { name: "Today" })
    .click();
  await expect(page.getByRole("heading", { name: "A clear place to begin." })).toBeFocused();
});

test("reduced-motion and emulated forced colors maintain visible controls without claiming native signoff", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.goto("/");
  const action = page.getByRole("link", { name: "Personalize your space" });
  await expect(action).toBeVisible();
  await expect(page.locator(".atmosphere")).toHaveCSS("display", "none");
  const system = await action.evaluate((node) => ({
    color: getComputedStyle(node).color,
    background: getComputedStyle(node).backgroundColor,
  }));
  expect(system.color).not.toBe(system.background);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
});
