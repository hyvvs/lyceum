import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
/** Capture the actual running Vite application, never a Storybook fixture. */
import { chromium } from "@playwright/test";

const origin = process.argv[2] ?? "http://127.0.0.1:5173";
if (!/^http:\/\/127\.0\.0\.1:(?:5173|4173)$/.test(origin)) {
  throw new Error("Only the local Lyceum dev/preview ports are permitted");
}
const destination = resolve("docs/qa/m0-ui-fidelity/screens");
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "no-preference",
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${origin}/`, { waitUntil: "networkidle" });
  await page.locator('[data-testid="lyceum-live-today"]').waitFor({ state: "visible" });
  await page.getByText("Good evening, Alex").waitFor({ state: "visible" });
  await page.waitForTimeout(700);
  const result = await page.evaluate(async () => ({
    viewport: { width: innerWidth, height: innerHeight },
    title: document.title,
    heading: document.querySelector("h1")?.textContent,
    liveEntry: document
      .querySelector('[data-testid="lyceum-live-today"]')
      ?.getAttribute("data-screen"),
    oldShellNodes: document.querySelectorAll(".application, .hero, .orbital").length,
    statCards: document.querySelectorAll(".rp-fidelity-stat").length,
    chartBars: document.querySelectorAll(".rp-fidelity-bar").length,
    backdrop: getComputedStyle(document.querySelector(".rp-environment")).backgroundImage,
    serviceWorker:
      "serviceWorker" in navigator
        ? {
            controlled: Boolean(navigator.serviceWorker.controller),
            registrations: (await navigator.serviceWorker.getRegistrations()).map(
              (item) => item.scope,
            ),
          }
        : null,
    cacheKeys: "caches" in window ? await caches.keys() : [],
    bodyScrollWidth: document.documentElement.scrollWidth,
    greeting: document.querySelector(".rp-fidelity-intro h2")?.textContent?.trim(),
  }));
  if (
    response?.status() !== 200 ||
    errors.length ||
    result.oldShellNodes ||
    result.statCards !== 4 ||
    result.chartBars !== 6
  ) {
    throw new Error(JSON.stringify({ status: response?.status(), errors, result }, null, 2));
  }
  const slug = origin.endsWith("4173")
    ? "live-today-production-1440x900"
    : "live-today-dev-1440x900";
  await page.screenshot({ path: resolve(destination, `${slug}.png`), animations: "disabled" });
  await writeFile(
    resolve(destination, `${slug}.json`),
    `${JSON.stringify({ status: response.status(), errors, ...result }, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        screenshot: resolve(destination, `${slug}.png`),
        status: response.status(),
        errors,
        ...result,
      },
      null,
      2,
    ),
  );
  await context.close();
} finally {
  await browser.close();
}
