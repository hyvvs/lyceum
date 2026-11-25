import { spawn } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("real service-worker A-to-B update waits for consent and preserves the old tab until activation", async ({
  page,
  request,
}) => {
  test.slow();
  // Serve an isolated COPY of the approved, production-built assets. Alter
  // only that copy's SW bytes so the browser sees a real A -> B update.
  const baseFolder = resolve("test-results");
  mkdirSync(baseFolder, { recursive: true });
  const temp = mkdtempSync(join(baseFolder, "pwa-update-"));
  const origin = "http://127.0.0.1:4180";
  cpSync(resolve("apps/web/dist"), temp, { recursive: true });
  const viteBin = resolve("node_modules/vite/bin/vite.js");
  const server = spawn(
    process.execPath,
    [viteBin, "preview", "--outDir", temp, "--host", "127.0.0.1", "--port", "4180", "--strictPort"],
    { cwd: process.cwd(), windowsHide: true, stdio: "ignore" },
  );
  try {
    await expect
      .poll(
        async () => {
          try {
            return (await request.get(origin)).status();
          } catch {
            return 0;
          }
        },
        { timeout: 12_000 },
      )
      .toBe(200);
    await page.goto(origin);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    await page.evaluate(() => {
      Object.assign(window, { lyceumUnsavedDraftMarker: "unsubmitted local-only draft" });
    });

    appendFileSync(
      join(temp, "sw.js"),
      "\n// Test-only SW version B; real browser install/update lifecycle.\n",
    );
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("Expected registered production SW");
      await registration.update();
    });
    const consent = page.getByRole("button", { name: "Update when ready" });
    await expect(consent).toBeVisible({ timeout: 10_000 });
    expect(
      await page.evaluate(
        () => (window as Window & { lyceumUnsavedDraftMarker?: string }).lyceumUnsavedDraftMarker,
      ),
    ).toBe("unsubmitted local-only draft");
    // No surprise reload while the unsubmitted marker exists.
    await Promise.all([page.waitForEvent("load"), consent.click()]);
    await expect(page.getByRole("heading", { name: "A clear place to begin." })).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as Window & { lyceumUnsavedDraftMarker?: string }).lyceumUnsavedDraftMarker,
      ),
    ).toBeUndefined();
    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.unregister();
      for (const key of await caches.keys()) await caches.delete(key);
    });
  } finally {
    server.kill();
    // Recursive cleanup is confined to the newly created test-results subtree.
    if (temp.startsWith(join(baseFolder, "pwa-update-"))) {
      rmSync(temp, { force: true, recursive: true });
    }
  }
});
