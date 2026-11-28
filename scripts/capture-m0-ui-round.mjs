/**
 * Genuine localhost Chromium evidence for an individual fidelity screen.
 * Usage: node scripts/capture-m0-ui-round.mjs <storybook-story-id> <slug>
 *
 * Builds are deliberately outside this tool: callers must first run a fresh
 * Storybook build, then capture exactly the built source. Do not pass a
 * remote URL, import learner data or use this to measure native FPS.
 */
import { spawn } from "node:child_process";
import { mkdir, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const [storyId, slug] = process.argv.slice(2);
// Storybook IDs contain a required double-dash separator before story name.
if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(storyId ?? "") || !storyId.includes("--")) {
  throw new Error("Specify a concrete lowercase Storybook story ID");
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? "")) {
  throw new Error("Specify a safe lowercase screenshot slug");
}

const root = resolve(import.meta.dirname, "..");
const directory = resolve(root, "docs/qa/m0-ui-fidelity/screens");
const url = `http://127.0.0.1:6087/iframe.html?id=${storyId}&viewMode=story`;
const server = spawn(
  process.execPath,
  [
    resolve(root, "node_modules/vite/bin/vite.js"),
    "preview",
    "--outDir",
    "storybook-static",
    "--host",
    "127.0.0.1",
    "--port",
    "6087",
    "--strictPort",
  ],
  { cwd: root, windowsHide: true, stdio: "ignore" },
);
let browser;
try {
  await mkdir(directory, { recursive: true });
  let started = false;
  for (let i = 0; i < 90; i += 1) {
    if (server.exitCode !== null) throw new Error("Storybook process ended before ready");
    try {
      started = (await fetch("http://127.0.0.1:6087/iframe.html")).ok;
      if (started) break;
    } catch {}
    await delay(160);
  }
  if (!started) throw new Error("Local Storybook preview did not start");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    recordVideo: { dir: directory, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page
    .locator('[data-testid="reference-prototype"], .shared-gallery')
    .first()
    .waitFor({ state: "visible" });
  await delay(1200);
  if (errors.length > 0) throw new Error(`Renderer exceptions: ${errors.join("; ")}`);
  const screenshot = resolve(directory, `${slug}-1440x900.png`);
  await page.screenshot({ path: screenshot, animations: "disabled" });
  const video = page.video();
  await page.close();
  await context.close();
  if (video) await rename(await video.path(), resolve(directory, `${slug}-entrance.webm`));
  console.log(`FIDELITY_ROUND_SCREENSHOT ${screenshot}`);
  console.log(`FIDELITY_ROUND_STORY ${url}`);
} finally {
  await browser?.close();
  server.kill();
}
