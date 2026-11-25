import { spawn } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("genuinely waiting service-worker update reserves space and activates only on consent", async ({
  page,
  request,
}) => {
  test.slow();
  const folder = resolve("test-results");
  mkdirSync(folder, { recursive: true });
  const isolated = mkdtempSync(join(folder, "b2-update-"));
  const origin = "http://127.0.0.1:4181";
  cpSync(resolve("apps/web/dist"), isolated, { recursive: true });
  const server = spawn(
    process.execPath,
    [
      resolve("node_modules/vite/bin/vite.js"),
      "preview",
      "--outDir",
      isolated,
      "--host",
      "127.0.0.1",
      "--port",
      "4181",
      "--strictPort",
    ],
    { cwd: process.cwd(), windowsHide: true, stdio: "ignore" },
  );
  try {
    await expect
      .poll(async () => {
        try {
          return (await request.get(origin)).status();
        } catch {
          return 0;
        }
      })
      .toBe(200);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin);
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.evaluate(() => {
      Object.assign(window, { b2UnsavedMarker: "still waiting for my consent" });
    });
    appendFileSync(join(isolated, "sw.js"), "\n// B2 test-only actual waiting version B.\n");
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("Real service-worker registration required");
      await registration.update();
    });
    const consent = page.getByRole("button", { name: "Update when ready" });
    await expect(consent).toBeVisible({ timeout: 10_000 });
    expect(
      await page.evaluate(() => (window as Window & { b2UnsavedMarker?: string }).b2UnsavedMarker),
    ).toBe("still waiting for my consent");

    const rectangles = await page.evaluate(() => {
      const frame = document.querySelector(".application-frame")?.getBoundingClientRect();
      const nav = document.querySelector(".icon-dock")?.getBoundingClientRect();
      const prompt = document.querySelector(".update-banner")?.getBoundingClientRect();
      if (!frame || !nav || !prompt) throw new Error("Actual update shell geometry missing");
      return {
        frameBottom: frame.bottom,
        promptTop: prompt.top,
        promptBottom: prompt.bottom,
        navTop: nav.top,
        navBottom: nav.bottom,
      };
    });
    expect(rectangles.frameBottom).toBeLessThanOrEqual(rectangles.promptTop);
    expect(rectangles.promptBottom).toBeLessThanOrEqual(rectangles.navTop);
    expect(rectangles.navBottom).toBeLessThanOrEqual(844);
    if (process.env.LYCEUM_B2_CAPTURE === "1") {
      await page.screenshot({ path: "docs/qa/m0-017-stage-b2/pwa-waiting-reserved.png" });
    }

    await page.setViewportSize({ width: 320, height: 256 });
    await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
    await expect(page.locator(".update-banner")).toHaveCSS("position", "relative");
    await consent.scrollIntoViewIfNeeded();
    await expect(consent).toBeInViewport();
    if (process.env.LYCEUM_B2_CAPTURE === "1") {
      await page.screenshot({ path: "docs/qa/m0-017-stage-b2/pwa-waiting-in-flow.png" });
    }
    await Promise.all([page.waitForEvent("load"), consent.click()]);
    await expect(page.getByRole("heading", { name: "A clear place to begin." })).toBeVisible();
    expect(
      await page.evaluate(() => (window as Window & { b2UnsavedMarker?: string }).b2UnsavedMarker),
    ).toBeUndefined();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.unregister();
      for (const key of await caches.keys()) await caches.delete(key);
    });
  } finally {
    server.kill();
    if (isolated.startsWith(join(folder, "b2-update-"))) {
      rmSync(isolated, { recursive: true, force: true });
    }
  }
});
