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
    await page.emulateMedia({ reducedMotion: "reduce" });
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

    // B3 focused owner audit: the actual waiting update prompt is an operable
    // auxiliary control, not just a banner rectangle. At enlarged root text,
    // the Tooltip must not float over its action or the other Dock link.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await expect(page.locator("html")).toHaveCSS("font-size", "32px");
    for (const name of ["Today", "Settings"]) {
      const link = page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link", {
        name,
      });
      // Real update prompt may force in-flow navigation at 32px. Scroll
      // the link into view before verifying an already settled Tooltip, so
      // ancestor-scroll dismissal cannot masquerade as a blank screenshot.
      await link.scrollIntoViewIfNeeded();
      await link.hover();
      const visibleTooltip = page.locator(".lyceum-tooltip[role='tooltip']");
      await expect(visibleTooltip).toHaveText(name);
      await expect(visibleTooltip).toBeVisible();
      // Radix may mount the portal during its 120ms fade from opacity zero.
      // Never count or capture an invisible frame as a visible clearance proof.
      await expect(visibleTooltip).toHaveCSS("opacity", "1");
      const collision = await page.evaluate(() => {
        const hint = document.querySelector<HTMLElement>(".lyceum-tooltip[role='tooltip']");
        const prompt = document.querySelector<HTMLElement>(".update-banner");
        const button = prompt?.querySelector<HTMLButtonElement>("button");
        const links = Array.from(document.querySelectorAll<HTMLElement>(".icon-dock a[href]"));
        if (!hint || !prompt || !button || links.length !== 2)
          throw new Error("Real waiting update/Tooltip/Dock missing");
        const tip = hint.getBoundingClientRect();
        const intersect = (a: DOMRect, b: DOMRect) =>
          Math.min(a.right, b.right) > Math.max(a.left, b.left) + 0.5 &&
          Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 0.5;
        return {
          hint: tip.toJSON(),
          prompt: prompt.getBoundingClientRect().toJSON(),
          mode: document.querySelector(".application")?.getAttribute("data-navigation-mode"),
          promptMasked: intersect(tip, prompt.getBoundingClientRect()),
          buttonMasked: intersect(tip, button.getBoundingClientRect()),
          linksMasked: links.filter((item) => intersect(tip, item.getBoundingClientRect())).length,
          withinViewport:
            tip.left >= -1 &&
            tip.right <= innerWidth + 1 &&
            tip.top >= -1 &&
            tip.bottom <= innerHeight + 1,
        };
      });
      if (process.env.LYCEUM_B3_AUDIT_CAPTURE === "1") {
        await page.screenshot({
          path: `docs/qa/m0-017-stage-b3/audit-pwa-waiting-32px-tooltip-${name.toLowerCase()}.png`,
          animations: "disabled",
        });
      }
      expect(collision.withinViewport, JSON.stringify(collision)).toBe(true);
      expect(collision.promptMasked, JSON.stringify(collision)).toBe(false);
      expect(collision.buttonMasked, JSON.stringify(collision)).toBe(false);
      expect(collision.linksMasked, JSON.stringify(collision)).toBe(0);
      await page.keyboard.press("Escape");
      await expect(page.locator(".lyceum-tooltip[role='tooltip']")).not.toBeVisible();
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "16px";
    });
    await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");

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
