import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

// Capture only from a locally running Storybook build of this Tabs branch.
const origin = new URL(process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006");
if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("Tabs screenshots require a loopback-only Storybook preview.");
}

const cases = [
  { name: "dark-full", story: "full-transparency", theme: "dark", transparency: "full" },
  { name: "dark-opaque", story: "opaque", theme: "dark", transparency: "off" },
  { name: "light", story: "light", theme: "light", transparency: "off" },
  { name: "high-contrast", story: "high-contrast", theme: "dark", transparency: "off" },
  { name: "rtl", story: "rtl", theme: "dark", transparency: "off" },
  { name: "double-text", story: "double-text", theme: "dark", transparency: "off", narrow: true },
  {
    name: "long-double-text",
    story: "long-double-text",
    theme: "dark",
    transparency: "off",
    narrow: true,
  },
];

const browser = await chromium.launch();
try {
  for (const entry of cases) {
    const viewport = entry.narrow ? { width: 320, height: 256 } : { width: 800, height: 520 };
    const page = await browser.newPage({ viewport, colorScheme: "dark" });
    try {
      await page.goto(
        `${origin.origin}/iframe.html?id=primitives-tabs--${entry.story}&viewMode=story`,
      );
      const list = page.getByRole("tablist", { name: "Study sections" });
      await expect(list).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", entry.theme);
      await expect(page.locator("html")).toHaveAttribute("data-transparency", entry.transparency);
      await expect(page.locator("html")).toHaveCSS("font-size", entry.narrow ? "32px" : "16px");
      const metrics = await list.evaluate((node) => ({
        backdropFilter: getComputedStyle(node).backdropFilter,
        background: getComputedStyle(node).backgroundColor,
        documentWidth: document.documentElement.scrollWidth,
      }));
      if (metrics.documentWidth > viewport.width) {
        throw new Error(`Horizontal page overflow in ${entry.name}: ${metrics.documentWidth}`);
      }
      if (entry.transparency === "full" && !metrics.backdropFilter.includes("blur(")) {
        throw new Error("Full-transparency story did not use backdrop blur.");
      }
      if (entry.transparency === "off" && metrics.backdropFilter !== "none") {
        throw new Error("Opaque fallback still used backdrop blur.");
      }
      await page.screenshot({
        path: fileURLToPath(new URL(`./tabs-${entry.name}.png`, import.meta.url)),
        fullPage: false,
        animations: "disabled",
      });
      console.log(`${entry.name} ${viewport.width}x${viewport.height} ${JSON.stringify(metrics)}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
