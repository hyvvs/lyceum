import { fileURLToPath } from "node:url";
/**
 * Recreate PR #7's four visual acceptance screenshots from a built Storybook preview.
 * Start the preview at http://127.0.0.1:6006 before running this script.
 * These captures use original Lyceum components, not external photo assets.
 */
import { chromium, expect } from "@playwright/test";

const outputDirectory = fileURLToPath(new URL(".", import.meta.url));
const baseURL = process.env.STORYBOOK_URL || "http://127.0.0.1:6006";
const cases = [
  {
    story: "default",
    slug: "dark",
    width: 800,
    height: 520,
    theme: "dark",
    contrast: "standard",
    fontSize: "16px",
  },
  {
    story: "light",
    slug: "light",
    width: 800,
    height: 520,
    theme: "light",
    contrast: "standard",
    fontSize: "16px",
  },
  {
    story: "high-contrast",
    slug: "high-contrast",
    width: 800,
    height: 520,
    theme: "dark",
    contrast: "high",
    fontSize: "16px",
  },
  {
    story: "double-text",
    slug: "200-percent-text",
    width: 320,
    height: 640,
    theme: "dark",
    contrast: "standard",
    fontSize: "32px",
  },
];

const browser = await chromium.launch();
try {
  for (const entry of cases) {
    const page = await browser.newPage({ viewport: { width: entry.width, height: entry.height } });
    try {
      await page.goto(
        `${baseURL}/iframe.html?id=primitives-tooltip--${entry.story}&viewMode=story`,
      );
      await page.getByRole("button", { name: "Review hint details" }).hover();
      await expect(page.getByRole("tooltip")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", entry.theme);
      await expect(page.locator("html")).toHaveAttribute("data-contrast", entry.contrast);
      await expect(page.locator("html")).toHaveCSS("font-size", entry.fontSize);
      await page.screenshot({
        path: `${outputDirectory}tooltip-${entry.slug}.png`,
        fullPage: true,
        animations: "disabled",
      });
      console.log(`Captured ${entry.slug}: ${entry.width}x${entry.height}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
