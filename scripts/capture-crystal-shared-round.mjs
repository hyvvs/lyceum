import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

/** QA for actual shared exports; intentionally not a new product route. */
const target = resolve("docs/qa/m0-ui-fidelity/screens");
await mkdir(target, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});
const evidence = [];
try {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const scene of ["overview", "controls", "feedback"]) {
    const url = `http://127.0.0.1:6006/iframe.html?id=visual-prototypes-m0-ui-fidelity-shared--${scene}&viewMode=story`;
    const response = await page.goto(url, { waitUntil: "networkidle" });
    await page.locator(".shared-gallery").waitFor({ state: "visible" });
    await page.screenshot({
      path: resolve(target, `crystal-shared-${scene}-1440x900.png`),
      animations: "disabled",
    });
    evidence.push({
      scene,
      kind: "dev-only-Storybook-build",
      status: response?.status(),
      errors: [...errors],
    });
  }
  const prod = await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.getByTestId("lyceum-live-today").waitFor({ state: "visible" });
  await page.screenshot({
    path: resolve(target, "crystal-shared-today-production-regression-1440x900.png"),
    animations: "disabled",
  });
  evidence.push({
    scene: "approved Today",
    kind: "real-production-web-build",
    status: prod?.status(),
    heading: await page.locator("h1").first().innerText(),
    errors: [...errors],
  });
  await writeFile(
    resolve(target, "crystal-shared-round-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await context.close();
  await browser.close();
}
