import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const origin = new URL(process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006");
if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("Bounded Dialog capture requires trusted local Storybook preview.");
}
const story = `${origin.origin}/iframe.html?id=qa-runtimepreferences--mounted-dialog-select&viewMode=story`;
const browser = await chromium.launch();

async function tabTo(page, target) {
  for (let index = 0; index < 12; index++) {
    if (await target.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

async function setup(page, scale, direction = "ltr") {
  await page.goto(story);
  await expect(page.locator("#qa-runtime-identity")).toBeVisible();
  await page.evaluate(
    ({ textScale, direction }) => {
      window.dispatchEvent(
        new CustomEvent("lyceum:qa-variant-change", {
          detail: { composition: "tall", options: "long", direction },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("lyceum:qa-preference-change", {
          detail: { textScale, transparency: "off", contrast: "high", motion: "reduced" },
        }),
      );
    },
    { textScale: scale, direction },
  );
  await expect(page.locator("html")).toHaveCSS("font-size", scale === "200%" ? "32px" : "16px");
  await tabTo(page, page.getByRole("button", { name: "Open runtime study settings" }));
  await page.keyboard.press("Enter");
  await expect(page.locator("#qa-tall-reading-start")).toBeFocused();
  await expect(page.locator("#qa-tall-reading-start")).toBeInViewport({ ratio: 1 });
}

async function measure(page) {
  return page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    };
    const dialog = document.querySelector(".lyceum-dialog");
    const reading = document.querySelector("[data-qa-tall-reading]");
    const popup = document.querySelector(".lyceum-select__content");
    const viewport = popup?.querySelector(".lyceum-select__viewport");
    return {
      screen: { width: innerWidth, height: innerHeight },
      dialog: rect(dialog),
      dialogScroll: dialog?.scrollTop,
      reading: rect(reading),
      readingScroll: reading && {
        top: reading.scrollTop,
        max: reading.scrollHeight - reading.clientHeight,
      },
      trigger: rect(document.querySelector('.lyceum-select__trigger[data-state="open"]')),
      popup: rect(popup),
      wrapper: rect(popup?.closest("[data-radix-popper-content-wrapper]")),
      focused: rect(document.activeElement),
      listScroll: viewport && {
        top: viewport.scrollTop,
        max: viewport.scrollHeight - viewport.clientHeight,
      },
    };
  });
}

async function save(page, name) {
  const measured = await measure(page);
  await page.screenshot({
    path: fileURLToPath(new URL(`./tall-bounded-${name}.png`, import.meta.url)),
    animations: "disabled",
    fullPage: false,
  });
  console.info(`BOUNDED_CAPTURE ${name} ${JSON.stringify(measured)}`);
}

try {
  for (const height of [190, 256]) {
    const page = await browser.newPage({ viewport: { width: 320, height } });
    try {
      await setup(page, "200%");
      await save(page, `initial-${height}`);
      if (height === 256) {
        await page.keyboard.press("Tab");
        const reading = page.getByRole("region", { name: "Study preparation notes" });
        await expect(reading).toBeFocused();
        await page.keyboard.press("End");
        await expect
          .poll(() =>
            reading.evaluate((el) => el.scrollTop >= el.scrollHeight - el.clientHeight - 1),
          )
          .toBe(true);
        await save(page, "reading-end-256");
      }
    } finally {
      await page.close();
    }
  }

  const page = await browser.newPage({ viewport: { width: 320, height: 256 } });
  try {
    await setup(page, "100%");
    await tabTo(page, page.locator("#qa-runtime-topic"));
    await page.keyboard.press("Enter");
    const popup = page.locator(".lyceum-select__content");
    const previousPopup = await popup.elementHandle();
    if (!previousPopup) throw new Error("No real portalled Select");
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent("lyceum:qa-preference-change", {
          detail: { textScale: "200%" },
        }),
      ),
    );
    await expect(page.locator("html")).toHaveCSS("font-size", "32px");
    expect(
      await popup.evaluate((node, old) => node === old && node.isConnected, previousPopup),
    ).toBe(true);
    await page.keyboard.press("End");
    await expect(page.getByRole("option", { name: "Literature" })).toBeFocused();
    await expect(page.locator('[role="option"]:focus')).toBeInViewport({ ratio: 1 });
    const geometry = await measure(page);
    if (
      !geometry.popup ||
      !geometry.wrapper ||
      Math.abs(geometry.popup.top - geometry.wrapper.top) > 1 ||
      geometry.popup.bottom > 256
    )
      throw new Error("Radix popup not aligned and visible");
    await save(page, "live-scale-256");
    await page.keyboard.press("Home");
    await expect(page.getByRole("option", { name: "Mathematics" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: "Physics" })).toBeFocused();
    await save(page, "arrow-focus-256");
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await save(page, "forced-colors-256");
  } finally {
    await page.close();
  }

  const rtl = await browser.newPage({ viewport: { width: 800, height: 256 } });
  try {
    await setup(rtl, "200%", "rtl");
    await tabTo(rtl, rtl.locator("#qa-runtime-topic"));
    await rtl.keyboard.press("Enter");
    await rtl.keyboard.press("End");
    await expect(rtl.getByRole("option", { name: "Literature" })).toBeFocused();
    await save(rtl, "rtl-800");
  } finally {
    await rtl.close();
  }
} finally {
  await browser.close();
}
