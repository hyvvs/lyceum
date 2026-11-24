import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const origin = new URL(process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006");
if (origin.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
  throw new Error("Tall-body capture requires loopback Storybook.");
}
const story = `${origin.origin}/iframe.html?id=qa-runtimepreferences--mounted-dialog-select&viewMode=story`;
const png = (name) => fileURLToPath(new URL(`./${name}.png`, import.meta.url));
const browser = await chromium.launch();

async function tabTo(page, target) {
  for (let i = 0; i < 12; i++) {
    if (await target.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

async function measure(page) {
  return page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    };
    const dialog = document.querySelector(".lyceum-dialog");
    const popup = document.querySelector(".lyceum-select__content");
    return {
      viewport: { width: innerWidth, height: innerHeight },
      dialog: rect(dialog),
      dialogScrollTop: dialog?.scrollTop,
      reading: rect(document.querySelector("[data-qa-tall-reading]")),
      trigger: rect(document.querySelector("#qa-runtime-topic")),
      popup: rect(popup),
      wrapper: rect(popup?.closest("[data-radix-popper-content-wrapper]")),
      focused: rect(document.activeElement),
      side: popup?.getAttribute("data-side"),
    };
  });
}

async function start(page, scale) {
  await page.goto(story);
  await expect(page.locator("#qa-runtime-identity")).toBeVisible();
  await page.evaluate((value) => {
    window.dispatchEvent(
      new CustomEvent("lyceum:qa-variant-change", {
        // Historical, deliberately unbounded consumer. The new supported
        // tall composition is tested and captured separately.
        detail: { composition: "tall-unbounded", options: "long" },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("lyceum:qa-preference-change", {
        detail: { textScale: value, transparency: "off", motion: "reduced" },
      }),
    );
  }, scale);
  await expect(page.locator("html")).toHaveCSS("font-size", scale === "200%" ? "32px" : "16px");
  const trigger = page.getByRole("button", { name: "Open runtime study settings" });
  await tabTo(page, trigger);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  return page.locator("#qa-runtime-topic");
}

async function capture(page, name, positive, checkPopup = false) {
  const m = await measure(page);
  const frame = checkPopup ? m.popup : m.focused;
  if (!frame) throw new Error(`Missing measured frame at ${name}`);
  const visible = frame.top >= 0 && frame.bottom <= m.viewport.height;
  if (positive !== visible) throw new Error(`Unexpected geometry at ${name}: ${JSON.stringify(m)}`);
  await page.screenshot({ path: png(name), animations: "disabled" });
  console.info(`TALL_CAPTURE ${name} ${JSON.stringify(m)}`);
}

try {
  const initial = await browser.newPage({ viewport: { width: 320, height: 256 } });
  try {
    await start(initial, "200%");
    await expect(initial.getByRole("button", { name: "Acknowledge study notes" })).toBeFocused();
    await capture(initial, "tall-initial-focus-before", false);
  } finally {
    await initial.close();
  }

  // A DIAGNOSTIC ONLY: local ephemeral listener, not production or a proposed
  // global focus manager. It scrolls without changing Radix's focus target.
  const focusedDiagnostic = await browser.newPage({ viewport: { width: 320, height: 256 } });
  try {
    await focusedDiagnostic.addInitScript(() => {
      document.addEventListener(
        "focusin",
        (event) => {
          const el = event.target;
          if (!(el instanceof HTMLElement)) return;
          const dialog = el.closest(".lyceum-dialog");
          if (!dialog) return;
          const frame = dialog.getBoundingClientRect();
          const target = el.getBoundingClientRect();
          if (target.top < frame.top || target.bottom > frame.bottom) {
            el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
          }
        },
        true,
      );
    });
    await start(focusedDiagnostic, "200%");
    await capture(focusedDiagnostic, "tall-initial-focus-diagnostic-only", true);
  } finally {
    await focusedDiagnostic.close();
  }

  for (const diagnostic of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 320, height: 256 } });
    try {
      const trigger = await start(page, "100%");
      await tabTo(page, trigger);
      await expect(trigger).toBeInViewport({ ratio: 1 });
      await page.keyboard.press("Enter");
      await expect(page.getByRole("listbox")).toBeVisible();
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent("lyceum:qa-preference-change", {
            detail: { textScale: "200%", transparency: "off", motion: "reduced" },
          }),
        );
      });
      await expect(page.locator("html")).toHaveCSS("font-size", "32px");
      if (diagnostic) {
        // A one-time explicit trigger scroll, never run by production.
        await trigger.evaluate((node) => node.scrollIntoView({ block: "nearest" }));
      }
      await page.keyboard.press("End");
      await expect(page.getByRole("option", { name: "Literature" })).toBeFocused();
      await capture(
        page,
        diagnostic ? "tall-live-scale-diagnostic-only" : "tall-live-scale-before",
        diagnostic,
        true,
      );
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
