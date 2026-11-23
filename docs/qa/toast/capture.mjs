import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const origin = new URL(process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006");
if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("Toast screenshot capture accepts only a loopback HTTP Storybook preview.");
}
const cases = [
  { name: "dark", story: "dark", theme: "dark", transparency: "off" },
  { name: "dark-full", story: "full-transparency", theme: "dark", transparency: "full" },
  { name: "dark-opaque", story: "opaque", theme: "dark", transparency: "off" },
  { name: "light", story: "light", theme: "light", transparency: "off" },
  { name: "high-contrast", story: "high-contrast", theme: "dark", transparency: "off" },
  { name: "stacked", story: "stacked", theme: "dark", transparency: "off" },
  { name: "double-text", story: "double-text", theme: "dark", transparency: "off", narrow: true },
];

const browser = await chromium.launch();
try {
  for (const entry of cases) {
    const viewport = entry.narrow ? { width: 320, height: 256 } : { width: 800, height: 520 };
    const page = await browser.newPage({ viewport, colorScheme: "dark" });
    try {
      await page.goto(
        `${origin.origin}/iframe.html?id=primitives-toast--${entry.story}&viewMode=story`,
      );
      await expect(page.locator("html")).toHaveAttribute("data-theme", entry.theme);
      await expect(page.locator("html")).toHaveAttribute("data-transparency", entry.transparency);
      await expect(page.locator("html")).toHaveCSS("font-size", entry.narrow ? "32px" : "16px");
      const toasts = page.locator(".lyceum-toast[data-state='open']");
      await expect(toasts).toHaveCount(entry.name === "stacked" ? 3 : 1);
      await expect(toasts.first()).toBeVisible();
      const metrics = await toasts.first().evaluate((node) => {
        let parent = node.parentElement;
        let blurredAncestor = false;
        while (parent) {
          if (getComputedStyle(parent).backdropFilter !== "none") blurredAncestor = true;
          parent = parent.parentElement;
        }
        return {
          filter: getComputedStyle(node).backdropFilter,
          blurAncestor: blurredAncestor,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      if (metrics.blurAncestor || metrics.horizontalOverflow) {
        throw new Error(`${entry.name} has nested blur or horizontal page overflow`);
      }
      if (entry.transparency === "full" && !metrics.filter.includes("blur(")) {
        throw new Error(`${entry.name} did not render genuine frosted glass`);
      }
      if (entry.transparency === "off" && metrics.filter !== "none") {
        throw new Error(`${entry.name} still blurs its solid fallback`);
      }
      if (entry.narrow) {
        await page.screenshot({
          path: fileURLToPath(new URL("./toast-double-text-start.png", import.meta.url)),
          fullPage: false,
          animations: "disabled",
        });
        const close = page.getByRole("button", { name: "Dismiss notification" });
        await close.focus();
        await expect(close).toBeFocused();
      }
      await page.screenshot({
        path: fileURLToPath(new URL(`./toast-${entry.name}.png`, import.meta.url)),
        fullPage: false,
        animations: "disabled",
      });
      console.log(`${entry.name} ${viewport.width}x${viewport.height}: ${JSON.stringify(metrics)}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
