import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const origin = new URL(process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006");
if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("Select QA capture requires a loopback-only Storybook preview.");
}

const cases = [
  { name: "dark", story: "default", theme: "dark", transparency: "off" },
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
        `${origin.origin}/iframe.html?id=primitives-select--${entry.story}&viewMode=story`,
      );
      const trigger = page.locator('.lyceum-select__trigger[aria-label="Study topic"]');
      await expect(trigger).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", entry.theme);
      await expect(page.locator("html")).toHaveAttribute("data-transparency", entry.transparency);
      await expect(page.locator("html")).toHaveCSS("font-size", entry.narrow ? "32px" : "16px");
      await trigger.click();
      const listbox = page.getByRole("listbox");
      await expect(listbox).toBeVisible();
      if (entry.name === "long-double-text") {
        await page.keyboard.press("End");
        await expect(page.getByRole("option", { name: /History/ })).toBeFocused();
      }
      const geometry = await listbox.boundingBox();
      if (!geometry) throw new Error("Missing rendered listbox bounds.");
      if (
        geometry.x < 0 ||
        geometry.y < 0 ||
        geometry.x + geometry.width > viewport.width ||
        geometry.y + geometry.height > viewport.height
      ) {
        throw new Error(`${entry.name} popup extends beyond ${viewport.width}x${viewport.height}`);
      }
      const metrics = await listbox.evaluate((node) => {
        let ancestor = node.parentElement;
        let blurredAncestor = null;
        while (ancestor) {
          if (getComputedStyle(ancestor).backdropFilter !== "none") {
            blurredAncestor = ancestor.className;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        return {
          filter: getComputedStyle(node).backdropFilter,
          background: getComputedStyle(node).backgroundColor,
          blurredAncestor,
          documentWidth: document.documentElement.scrollWidth,
        };
      });
      if (metrics.blurredAncestor !== null) throw new Error(`Nested blur in ${entry.name}`);
      if (metrics.documentWidth > viewport.width)
        throw new Error(`Page horizontal overflow in ${entry.name}`);
      if (entry.transparency === "full" && !metrics.filter.includes("blur(")) {
        throw new Error("Full-transparency popup was not truly frosted.");
      }
      if (entry.transparency === "off" && metrics.filter !== "none") {
        throw new Error("Opaque fallback still blurred the background.");
      }
      await page.screenshot({
        path: fileURLToPath(new URL(`./select-${entry.name}.png`, import.meta.url)),
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
