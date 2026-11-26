import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const stage = process.env.LYCEUM_B4_CAPTURE;
test.skip(stage !== "before" && stage !== "after", "B4 screenshot evidence is opt-in");

test("capture matched genuine production Today before/after states and real diagnostic behavior", async ({
  page,
}) => {
  test.slow();
  const directory = resolve("docs/qa/m0-017-stage-b4");
  mkdirSync(directory, { recursive: true });
  const capture = (name: string, fullPage = false) =>
    page.screenshot({
      path: resolve(directory, `${stage}-${name}.png`),
      animations: "disabled",
      fullPage,
    });
  const configure = async (theme: string, transparency: string, locale = "en") => {
    await page.goto("/");
    await page.evaluate(
      ({ theme, transparency, locale }) => {
        localStorage.setItem(
          "lyceum.web.preferences.v1",
          JSON.stringify({ theme, transparency, locale }),
        );
      },
      { theme, transparency, locale },
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("data-transparency", transparency);
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await configure("dark", "full");
  await expect(page.locator(".hero")).toBeVisible();
  await capture("desktop-dark-initial");
  await page.locator(".worker-card").scrollIntoViewIfNeeded();
  await capture("desktop-dark-hierarchy");
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByTestId("worker-status")).toHaveText("Worker transport connected");
  await capture("desktop-worker-connected");
  await page.getByRole("button", { name: "Test cancellation" }).click();
  await expect(page.getByTestId("worker-status")).toHaveText("Cancellation acknowledged");
  await capture("desktop-worker-cancelled");
  await configure("light", "full");
  await capture("desktop-light-initial");

  await page.setViewportSize({ width: 390, height: 844 });
  await configure("dark", "full");
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
  await capture("mobile-reserved-initial");
  await page.locator(".application-frame").evaluate((frame) => {
    frame.scrollTop = 260;
  });
  await expect
    .poll(async () => page.locator(".application-frame").evaluate((frame) => frame.scrollTop))
    .toBeGreaterThan(0);
  await capture("mobile-reserved-mid-scroll");
  await page.setViewportSize({ width: 320, height: 640 });
  await configure("dark", "full");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await capture("mobile-narrow-200-text");
  await page.setViewportSize({ width: 320, height: 256 });
  await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
  await page.locator(".worker-card").scrollIntoViewIfNeeded();
  await capture("mobile-short-in-flow-worker");
  if (stage === "after") {
    // An extremely short 200%-text viewport cannot show the entire Worker
    // card simultaneously. Show that its *actual actionable controls* remain
    // reachable in flow after scrolling, rather than treating a partial card
    // screenshot as proof of full keyboard operability.
    const check = page.getByRole("button", { name: "Check connection" });
    await check.scrollIntoViewIfNeeded();
    await expect(check).toBeInViewport();
    await capture("mobile-short-in-flow-worker-controls");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await configure("dark", "full", "es");
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
  });
  await capture("mobile-spanish-rtl");
  await configure("dark", "off");
  await capture("mobile-opaque");
  await configure("high-contrast", "off");
  await capture("mobile-high-contrast");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await configure("dark", "full");
  await capture("mobile-reduced-motion");
  const action = page.getByRole("link", { name: "Personalize your space" });
  for (let i = 0; i < 35; i++) {
    if (await action.evaluate((element) => document.activeElement === element)) break;
    await page.keyboard.press("Tab");
  }
  await expect(action).toBeFocused();
  await capture("mobile-natural-cta-focus");
});
