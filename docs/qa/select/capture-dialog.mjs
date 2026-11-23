import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const origin = new URL(process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006");
if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("Select/Dialog QA capture requires a loopback-only Storybook preview.");
}

const viewport = { width: 800, height: 520 };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport, colorScheme: "dark" });
  try {
    await page.goto(
      `${origin.origin}/iframe.html?id=primitives-select--dialog-integration&viewMode=story`,
    );
    const openDialog = page.getByRole("button", { name: "Open study settings" });
    for (let i = 0; i < 8; i++) {
      if (await openDialog.evaluate((element) => element === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(openDialog).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Study settings" })).toBeVisible();
    const select = page.getByRole("combobox", { name: "Study topic" });
    for (let i = 0; i < 8; i++) {
      if (await select.evaluate((element) => element === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(select).toBeFocused();
    await page.keyboard.press("Enter");
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    await expect(page.locator(".lyceum-dialog")).toHaveAttribute("inert", "");
    await expect(page.locator("#storybook-root")).toHaveAttribute("inert", "");
    const bounds = await listbox.boundingBox();
    if (
      !bounds ||
      bounds.x < 0 ||
      bounds.y < 0 ||
      bounds.x + bounds.width > 800 ||
      bounds.y + bounds.height > 520
    ) {
      throw new Error("Portalled listbox exceeded the 800x520 viewport.");
    }
    await page.screenshot({
      path: fileURLToPath(new URL("./select-dialog-open.png", import.meta.url)),
      fullPage: false,
      animations: "disabled",
    });
    console.log("Real Dialog + portalled Select, keyboard open: 800x520 viewport screenshot saved");
  } finally {
    await page.close();
  }
} finally {
  await browser.close();
}
