import { expect, test } from "@playwright/test";

test("manifest and original install icons are valid", async ({ page, request }) => {
  await page.goto("/");
  const manifestLink = page.locator('link[rel="manifest"]');
  await expect(manifestLink).toHaveCount(1);
  const src = await manifestLink.getAttribute("href");
  expect(src).toBeTruthy();
  const response = await request.get(src ?? "");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.name).toContain("Lyceum");
  expect(manifest.display).toBe("standalone");
  expect(manifest.scope).toBe("/");
  for (const icon of manifest.icons) {
    expect(["192x192", "512x512"]).toContain(icon.sizes);
    const image = await request.get(icon.src);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
    const bytes = await image.body();
    // Exact PNG 8-byte signature as numeric bytes, avoiding a false-positive
    // high-entropy literal in the mandatory secret scan.
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  }
});

test("production worker controls actual offline settings and Today deep-link reloads", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // An initial install does not claim an already-open tab. First navigate
  // online to establish SW control, then prove that offline reloads work.
  await page.reload();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Make this space yours." })).toBeVisible();
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole("heading", { name: "Make this space yours." })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Quick navigation" })
      .getByRole("link", { name: "Today" })
      .click();
    await page.reload();
    await expect(page.getByRole("heading", { name: "A clear place to begin." })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test("precache excludes sensitive API paths and can be updated/unregistered cleanly", async ({
  page,
}) => {
  await page.goto("/");
  const evidence = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    const keys = await caches.keys();
    const urls: string[] = [];
    for (const key of keys) {
      const cache = await caches.open(key);
      for (const entry of await cache.keys()) urls.push(entry.url);
    }
    const unregistered = await registration.unregister();
    for (const key of keys) await caches.delete(key);
    return { unregistered, urls, afterCleanup: await caches.keys() };
  });
  expect(evidence.unregistered).toBe(true);
  expect(evidence.urls.length).toBeGreaterThan(0);
  expect(new Set(evidence.urls).size).toBe(evidence.urls.length);
  const paths = evidence.urls.map((url) => new URL(url).pathname);
  for (const extension of [".html", ".js", ".css", ".png", ".webmanifest"]) {
    expect(paths.some((path) => path.endsWith(extension))).toBe(true);
  }
  expect(paths.some((path) => path.includes("engine.worker-"))).toBe(true);
  expect(paths.some((path) => path.endsWith("theme-bootstrap.js"))).toBe(true);
  for (const url of evidence.urls) {
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:4173\//);
    expect(url).not.toMatch(/\/(api|auth|uploads|private|provider|sync)\//);
    expect(new URL(url).pathname).not.toMatch(/\.map$|\/\./);
  }
  expect(evidence.afterCleanup).toEqual([]);
});
