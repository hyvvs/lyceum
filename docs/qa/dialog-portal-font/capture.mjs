import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

// Repro: build + preview Storybook, then run this script first on main (before)
// and again on the Dialog polish branch (after). Never re-label an after capture
// as a baseline from the old code.
const phase = process.argv[2];
if (!["before", "after"].includes(phase)) {
  throw new Error("Pass exactly 'before' or 'after' to identify the checked-out source.");
}
const origin = new URL(process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006");
if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("Screenshots require a local Storybook preview.");
}
const cases = [
  {
    slug: "dark",
    story: "primitives-dialog--default",
    width: 800,
    height: 520,
    button: "Open study preferences",
    title: "Study preferences",
    fontSize: "16px",
  },
  {
    slug: "light",
    story: "primitives-dialog--light",
    width: 800,
    height: 520,
    button: "Open study preferences",
    title: "Study preferences",
    fontSize: "16px",
  },
  {
    slug: "high-contrast",
    story: "primitives-dialog--high-contrast",
    width: 800,
    height: 520,
    button: "Open study preferences",
    title: "Study preferences",
    fontSize: "16px",
  },
  {
    slug: "zoom",
    story: "primitives-dialog--double-text",
    width: 320,
    height: 256,
    button: "Open study preferences",
    title: "Study preferences",
    fontSize: "32px",
  },
  {
    slug: "long-hint-zoom",
    story: "primitives-tooltip--long-double-text",
    width: 320,
    height: 256,
    button: "Read full hint",
    title: "Full hint",
    fontSize: "32px",
  },
];

const browser = await chromium.launch();
try {
  for (const entry of cases) {
    const page = await browser.newPage({ viewport: { width: entry.width, height: entry.height } });
    try {
      await page.goto(`${origin.origin}/iframe.html?id=${entry.story}&viewMode=story`);
      await expect(page.locator("html")).toHaveCSS("font-size", entry.fontSize);
      await page.getByRole("button", { name: entry.button }).click();
      const dialog = page.getByRole("dialog", { name: entry.title });
      await expect(dialog).toBeVisible();
      const metrics = await dialog.evaluate((node) => ({
        titleFont: getComputedStyle(node.querySelector(".lyceum-dialog__title")).fontFamily,
        descriptionFont: getComputedStyle(node.querySelector(".lyceum-dialog__description"))
          .fontFamily,
        bodyFont: getComputedStyle(node.querySelector(".lyceum-dialog__body")).fontFamily,
        stageFont: getComputedStyle(document.querySelector(".storybook-stage")).fontFamily,
      }));
      await page.screenshot({
        path: fileURLToPath(new URL(`./dialog-${phase}-${entry.slug}.png`, import.meta.url)),
        fullPage: false,
        animations: "disabled",
      });
      console.log(
        `${phase} ${entry.slug} ${entry.width}x${entry.height} ${JSON.stringify(metrics)}`,
      );
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
