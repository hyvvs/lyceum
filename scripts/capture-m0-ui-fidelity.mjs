/** Isolated localhost-only screenshot evidence for the opt-in UI fidelity study. */
import { spawn } from "node:child_process";
import { mkdir, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const phase = process.argv[2];
if (phase !== "before" && phase !== "after") {
  throw new Error("Provide before or after");
}

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "docs/qa/m0-ui-fidelity");
const base = "http://127.0.0.1:6087";
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
  await mkdir(output, { recursive: true });
  let ready = false;
  for (let n = 0; n < 90; n += 1) {
    if (server.exitCode !== null) throw new Error("Storybook preview exited");
    try {
      ready = (await fetch(`${base}/iframe.html`)).ok;
      if (ready) break;
    } catch {}
    await delay(160);
  }
  if (!ready) throw new Error("Storybook localhost preview did not start");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    ...(phase === "after"
      ? { recordVideo: { dir: output, size: { width: 1440, height: 900 } } }
      : {}),
  });
  const page = await context.newPage();
  await page.goto(
    `${base}/iframe.html?id=visual-prototypes-m0-005-reference-workspace--synthetic-today&viewMode=story`,
  );
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await delay(900);
  const filename = resolve(output, `${phase}-1440x900.png`);
  await page.screenshot({ path: filename, animations: "disabled" });
  console.log(`UI_FIDELITY_SCREENSHOT ${filename}`);
  if (phase === "after") {
    await page.getByRole("button", { name: "Start session" }).hover();
    await page.screenshot({
      path: resolve(output, "after-hover-1440x900.png"),
      animations: "disabled",
    });
    await page
      .getByRole("navigation", { name: "Prototype scenes" })
      .getByRole("button", { name: "Sources" })
      .hover();
    await page.screenshot({
      path: resolve(output, "after-dock-hover-1440x900.png"),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Month" }).click();
    await delay(320);
    await page
      .getByRole("navigation", { name: "Main sections" })
      .getByRole("button", { name: "Sources" })
      .click();
    await delay(400);
    await page
      .getByRole("navigation", { name: "Main sections" })
      .getByRole("button", { name: "Practice" })
      .click();
    await delay(450);
    await page
      .getByRole("navigation", { name: "Main sections" })
      .getByRole("button", { name: "Today" })
      .click();
    await delay(500);
    const video = page.video();
    await page.close();
    await context.close();
    if (!video) throw new Error("Video unavailable");
    await rename(await video.path(), resolve(output, "after-navigation-loop.webm"));

    for (const variant of [
      { story: "synthetic-today", width: 390, height: 844, file: "after-mobile-390x844.png" },
      { story: "light-solid", width: 1440, height: 900, file: "after-light-solid-1440x900.png" },
      { story: "right-to-left", width: 1440, height: 900, file: "after-rtl-1440x900.png" },
    ]) {
      const secondary = await browser.newContext({
        viewport: { width: variant.width, height: variant.height },
        deviceScaleFactor: 1,
      });
      try {
        const stillPage = await secondary.newPage();
        await stillPage.goto(
          `${base}/iframe.html?id=visual-prototypes-m0-005-reference-workspace--${variant.story}&viewMode=story`,
        );
        await stillPage.getByTestId("reference-prototype").waitFor();
        await delay(680);
        await stillPage.screenshot({
          path: resolve(output, variant.file),
          animations: "disabled",
        });
      } finally {
        await secondary.close();
      }
    }
  } else {
    await page.close();
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
