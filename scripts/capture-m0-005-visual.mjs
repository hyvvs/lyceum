/**
 * Opt-in, locally reproducible evidence capture for the ISOLATED visual Draft.
 * Only serves and visits 127.0.0.1; never accesses providers, learner data,
 * production Tauri IPC or third-party material. Playwright records real-time,
 * unaccelerated frames (never a CSS animation-disabled still as video).
 */
import { spawn } from "node:child_process";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const directory = resolve(root, "docs", "qa", "m0-005-visual-prototype", "captures");
const base = "http://127.0.0.1:6041";
const storyUrl = (name) =>
  `${base}/iframe.html?id=visual-prototypes-m0-005-reference-workspace--${name}&viewMode=story`;
const browserExecutable = resolve(root, "node_modules", "vite", "bin", "vite.js");
const portArgs = [
  "preview",
  "--outDir",
  "storybook-static",
  "--host",
  "127.0.0.1",
  "--port",
  "6041",
  "--strictPort",
];
const server = spawn(process.execPath, [browserExecutable, ...portArgs], {
  cwd: root,
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
const serverMessages = [];
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (chunk) => serverMessages.push(String(chunk)));
}

async function boot() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null)
      throw new Error(`Preview exited: ${serverMessages.join("").slice(-1000)}`);
    try {
      const response = await fetch(`${base}/iframe.html`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // Preview server is still starting.
    }
    await delay(150);
  }
  throw new Error(`Local-only preview unavailable: ${serverMessages.join("").slice(-1000)}`);
}

async function screenshot(page, filename, fullPage = false) {
  await page.screenshot({ path: resolve(directory, filename), fullPage, animations: "disabled" });
}

async function main() {
  await mkdir(directory, { recursive: true });
  // Source revisions must be compiled into the actual story being recorded.
  // Do not replay a stale Storybook artifact as visual evidence.
  const built = (await stat(resolve(root, "storybook-static", "index.json"))).mtimeMs;
  for (const file of [
    "tests/fixtures/m0-005-reference-prototype.stories.tsx",
    "tests/fixtures/m0-005-reference-prototype.css",
    "tests/fixtures/assets/sunlit-room-licensed-pexels-27051764.jpg",
    "packages/ui/src/morphing-rail.tsx",
    "packages/ui/src/morphing-rail.css",
  ]) {
    if ((await stat(resolve(root, file))).mtimeMs > built) {
      throw new Error(`Storybook output is stale for ${file}; run pnpm storybook:build`);
    }
  }
  await boot();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: directory, size: { width: 1440, height: 900 } },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(storyUrl("empty-today"));
  await page.getByRole("heading", { name: "Today", exact: true }).waitFor();
  await delay(700);
  await screenshot(page, "01-empty-today.png");

  await page.getByRole("button", { name: "Expand navigation" }).click();
  await delay(400);
  await screenshot(page, "02-expanded-rail.png");
  await page.getByRole("button", { name: "Sources", exact: true }).click();
  await delay(550);
  await screenshot(page, "03-empty-sources.png");
  await page.getByRole("button", { name: "Synthetic", exact: true }).click();
  await delay(480);
  await screenshot(page, "04-synthetic-sources.png");
  await page.getByRole("button", { name: "Reading", exact: true }).click();
  await delay(520);
  await screenshot(page, "05-synthetic-reading.png");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await delay(65);
  await page.getByRole("button", { name: "Reading", exact: true }).click();
  await delay(65);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await delay(650);
  await screenshot(page, "06-synthetic-today.png");
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await delay(620);
  await screenshot(page, "07-collapsed-rail.png");
  await page.getByRole("button", { name: "Empty", exact: true }).click();
  await delay(240);
  const movie = page.video();
  await page.close();
  await context.close();
  if (!movie) throw new Error("Browser recording not available");
  const temp = await movie.path();
  await rename(temp, resolve(directory, "prototype-full-speed-browser.webm"));

  const stills = [
    { id: "light-glass", file: "08-light.png", size: [1440, 900] },
    { id: "solid-fallback", file: "09-solid.png", size: [1440, 900] },
    { id: "high-contrast", file: "10-high-contrast.png", size: [1440, 900] },
    { id: "motion-off", file: "11-motion-off.png", size: [1440, 900] },
    { id: "right-to-left", file: "12-rtl.png", size: [1440, 900] },
    { id: "empty-today", file: "13-mobile.png", size: [390, 844] },
    { id: "double-text", file: "14-short-200-text.png", size: [320, 256] },
  ];
  for (const still of stills) {
    const view = await browser.newContext({
      viewport: { width: still.size[0], height: still.size[1] },
      deviceScaleFactor: 1,
    });
    const sample = await view.newPage();
    sample.on("pageerror", (error) => errors.push(error.message));
    await sample.goto(storyUrl(still.id));
    await sample.getByTestId("reference-prototype").waitFor();
    // Snapshots of spring-driven Storybook variants must be AFTER settling:
    // an early frame can make an RTL utility icon look detached from its
    // connected SVG spine even though its settled state is correctly aligned.
    // The real-time video above keeps every intermediate frame intact.
    await delay(820);
    await screenshot(sample, still.file, still.size[1] === 256);
    await view.close();
  }
  if (errors.length > 0) throw new Error(`Prototype page exceptions: ${errors.join("; ")}`);
  console.log(
    `Captured unaccelerated interactive WebM and 14 genuine Chromium PNGs in ${directory}`,
  );
}

try {
  await main();
} finally {
  await browser?.close();
  if (server.exitCode === null) server.kill();
  // Playwright's video file is moved to a stable evidence filename after close.
  await rm(resolve(directory, ".DS_Store"), { force: true });
}
