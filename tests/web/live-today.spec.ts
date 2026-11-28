import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("production entry is only the approved Today dashboard, never a gallery or old shell", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await expect(page.getByTestId("lyceum-live-today")).toHaveAttribute("data-screen", "today");
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Good evening, Alex" })).toBeVisible();
  await expect(page.getByText("Demo data", { exact: true })).toBeVisible();
  await expect(page.locator(".rp-fidelity-stat")).toHaveCount(4);
  await expect(page.locator(".rp-fidelity-bar")).toHaveCount(6);
  await expect(page.locator(".rp-fidelity-glass")).toHaveCount(6);
  await expect(page.locator(".application, .hero, .orbital, .reference-prototype")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Main sections" }).getByRole("button", { name: "Today" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: /^(Plan|Practice|Sources|Models)$/ })).toHaveCount(
    0,
  );
  await expect(page.locator(".rp-environment")).toHaveCSS(
    "background-image",
    /cole-course-of-empire-preblur/,
  );
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain("unsafe-eval");
  expect(requests.every((url) => url.startsWith("http://127.0.0.1:4173/"))).toBe(true);
});

test("unknown routes cannot load another shell or gallery", async ({ page }) => {
  await page.goto("/gallery");
  await expect(page.getByTestId("lyceum-live-today")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "This page isn't here." })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByTestId("lyceum-live-today")).toHaveCount(0);
});

test("settings are part of the one shell, keyboard reachable, persisted locally", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("region", { name: "Appearance settings" })).toBeVisible();
  await page.getByLabel("Theme", { exact: true }).selectOption("high-contrast");
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await page.getByLabel("Transparency").selectOption("off");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Appearance settings" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "off");
});

test("unimplemented session has no actionable control", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Month" }).click();
  await expect(page.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Start session" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toHaveCount(1);
});

test("legacy Workbox cache and worker are retired rather than reused", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const legacy = await caches.open("workbox-precache-v2-obsolete");
    await legacy.put("/old-application.js", new Response("old application"));
  });
  await page.reload();
  await expect.poll(() => page.evaluate(async () => caches.keys())).toEqual([]);
  await page.evaluate(() => navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
    )
    .toBe(0);
  await expect.poll(() => page.evaluate(async () => caches.keys())).toEqual([]);
});

test("responsive and contrast fallbacks keep real Today accessible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Good evening, Alex" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Section shortcuts" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => {
    document.documentElement.dataset.transparency = "off";
    document.documentElement.dataset.contrast = "high";
  });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    audit.violations,
    JSON.stringify(
      audit.violations.map((item) => ({
        id: item.id,
        targets: item.nodes.map((node) => node.target),
      })),
    ),
  ).toEqual([]);
});
