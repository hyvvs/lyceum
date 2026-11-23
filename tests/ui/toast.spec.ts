import { type Page, expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";
import { scanIndexedStory, storySlug } from "./axe-story-gate";
import { assertStoryScanCoverage, storiesForFamily } from "./story-inventory";

const story = (name: string) => `/iframe.html?id=primitives-toast--${name}&viewMode=story`;
const toast = (page: Page) => page.locator(".lyceum-toast[data-state='open']");
const viewport = (page: Page) => page.locator(".lyceum-toast__viewport");

test("background notice uses one polite Radix announcer without stealing focus", async ({
  page,
}) => {
  await page.goto(story("default"));
  await expect(toast(page)).toHaveCount(1);
  const announcer = page.locator('[role="status"][aria-live="polite"]');
  await expect(announcer).toHaveCount(1);
  await expect(announcer).toContainText("Study notification");
  await expect(announcer).toContainText("Study reminder");
  await expect(page.locator('[aria-live="assertive"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show notification" })).not.toBeFocused();
  await expect(toast(page)).not.toHaveAttribute("role", "alert");
  await expect(toast(page)).not.toHaveAttribute("aria-live", "polite");
  expect((await scanStoryA11y(page)).violations).toEqual([]);
});

test("explicit foreground choice uses Radix assertive status, not a duplicate alert", async ({
  page,
}) => {
  await page.goto(story("foreground"));
  await expect(toast(page)).toHaveCount(1);
  await expect(page.locator('[role="status"][aria-live="assertive"]')).toHaveCount(1);
  await expect(page.locator('[aria-live="polite"]')).toHaveCount(0);
  expect((await scanStoryA11y(page)).violations).toEqual([]);
});

test("F8, Tab, Shift+Tab, actions, Escape and focus restoration remain keyboard usable", async ({
  page,
}) => {
  await page.goto(story("action"));
  const open = page.getByRole("button", { name: "Show notification" });
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(toast(page)).toHaveCount(1);
  await expect(open).toBeFocused();
  await page.keyboard.press("F8");
  await expect(viewport(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(toast(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "View" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(toast(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toast(page)).toHaveCount(0);
  await expect(open).toBeFocused();
  expect((await scanStoryA11y(page)).violations).toEqual([]);

  await page.keyboard.press("Enter");
  await page.keyboard.press("F8");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Review action chosen")).toBeVisible();
  await expect(open).toBeFocused();
});

test("default 8 second, configurable and persistent durations operate independently", async ({
  page,
}) => {
  await page.goto(story("timed-short"));
  await expect(toast(page)).toHaveCount(1);
  await expect(toast(page)).toHaveCount(0, { timeout: 5000 });
  await page.goto(story("persistent"));
  await expect(toast(page)).toHaveCount(1);
  await page.waitForTimeout(2400);
  await expect(toast(page)).toHaveCount(1);
  await page.goto(story("timed-default"));
  await expect(toast(page)).toHaveCount(1);
  await page.waitForTimeout(3000);
  await expect(toast(page)).toHaveCount(1);
  await expect(toast(page)).toHaveCount(0, { timeout: 8000 });
});

test("hover and focus pause the countdown; resumed timeout never steals external focus", async ({
  page,
}) => {
  await page.goto(story("timed-short"));
  const notice = toast(page);
  await expect(notice).toHaveCount(1);
  await notice.hover();
  await page.waitForTimeout(2100);
  await expect(notice).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expect(notice).toHaveCount(0, { timeout: 4000 });
  await page.goto(story("timed-default"));
  await expect(toast(page)).toHaveCount(1);
  await page.keyboard.press("F8");
  await page.keyboard.press("Tab");
  await expect(notice).toBeFocused();
  await page.waitForTimeout(8200);
  await expect(notice).toHaveCount(1);
  const trigger = page.getByRole("button", { name: "Show notification" });
  await trigger.focus();
  await expect(notice).toHaveCount(0, { timeout: 10000 });
  await expect(trigger).toBeFocused();
});

test("window blur and background-tab visibility pause the same Radix countdown", async ({
  page,
}) => {
  await page.goto(story("timed-short"));
  await expect(toast(page)).toHaveCount(1);
  // Chromium headless does not reliably change document.visibilityState when
  // switching tabs. Exercise native blur and a separate visibility event.
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(2100);
  await expect(toast(page)).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(toast(page)).toHaveCount(0, { timeout: 4000 });
  await page.goto(story("timed-short"));
  await expect(toast(page)).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(2100);
  await expect(toast(page)).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(toast(page)).toHaveCount(0, { timeout: 4000 });
});

test("visibility resume never overrides a still-hovered or keyboard-focused pause", async ({
  page,
}) => {
  // Browser clock avoids long real-time waits and Windows trace-worker races
  // while still exercising Radix's actual Date/setTimeout pause ownership.
  await page.clock.install();
  await page.goto(story("timed-short"));
  const notice = toast(page);
  await expect(notice).toHaveCount(1);
  await notice.hover();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(2100);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  // Browser may deliver a separate native window focus after tab visibility.
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.clock.fastForward(2100);
  await expect(notice).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expect(notice).toHaveCount(0, { timeout: 4000 });

  await page.goto(story("timed-default"));
  await expect(notice).toHaveCount(1);
  await page.keyboard.press("F8");
  await page.keyboard.press("Tab");
  await expect(notice).toBeFocused();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(8200);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.clock.fastForward(8200);
  await expect(notice).toHaveCount(1);
  await page.getByRole("button", { name: "Show notification" }).focus();
  await expect(notice).toHaveCount(0, { timeout: 10000 });
});

test("separate providers own their own viewport pause and resume lifecycle", async ({ page }) => {
  await page.clock.install();
  await page.goto(story("provider-isolation"));
  const first = page
    .locator(".lyceum-toast[data-state='open']")
    .filter({ hasText: "First notice" });
  const second = page
    .locator(".lyceum-toast[data-state='open']")
    .filter({ hasText: "Second notice" });
  await expect(first).toHaveCount(1);
  await expect(second).toHaveCount(1);
  await first.hover();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(8200);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await page.clock.fastForward(8200);
  await expect(first).toHaveCount(1);
  await expect(second).toHaveCount(0);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(8200);
  await expect(first).toHaveCount(0);
});

test("stacked example has exactly three readable, nonoverlapping notices", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 520 });
  await page.goto(story("stacked"));
  await expect(toast(page)).toHaveCount(3);
  await expect(toast(page).nth(0)).toContainText("Study reminder");
  await expect(toast(page).nth(1)).toContainText("Review completed");
  await expect(toast(page).nth(2)).toContainText("Reminder updated");
  const rects = await toast(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().toJSON()),
  );
  expect(rects[0]).toBeDefined();
  for (let i = 1; i < rects.length; i++) {
    expect(rects[i - 1].bottom).toBeLessThanOrEqual(rects[i].top);
  }
  const show = await page.getByRole("button", { name: "Show notification" }).boundingBox();
  if (!show || !rects[0]) throw new Error("Missing trigger or Toast bounds.");
  expect(show.y + show.height).toBeLessThan(rects[0].top);
  expect((await scanStoryA11y(page)).violations).toEqual([]);
});

test("the demo coalesces repeat requests, without claiming a global queue service", async ({
  page,
}) => {
  await page.goto(story("duplicate"));
  const repeat = page.getByRole("button", { name: "Repeat notification" });
  await repeat.click();
  await repeat.click();
  await expect(toast(page)).toHaveCount(1);
  await expect(page.getByText("Repeated requests: 2")).toBeVisible();
});

test("narrow 200% long notice stays scrollable and dismissable without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(story("double-text"));
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  const bounds = await toast(page).boundingBox();
  if (!bounds) throw new Error("Missing Toast bounds.");
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  const viewportBox = await viewport(page).boundingBox();
  if (!viewportBox) throw new Error("Missing Toast viewport bounds.");
  expect(viewportBox.x).toBeGreaterThanOrEqual(0);
  expect(viewportBox.y).toBeGreaterThanOrEqual(0);
  expect(viewportBox.y + viewportBox.height).toBeLessThanOrEqual(256);
  expect(viewportBox.height).toBeLessThanOrEqual(88);
  const triggerBox = await page.getByRole("button", { name: "Show notification" }).boundingBox();
  if (!triggerBox) throw new Error("Missing notice trigger bounds.");
  // Reserve room for a full keyboard-visible outline (width + offset).
  expect(viewportBox.y - (triggerBox.y + triggerBox.height)).toBeGreaterThanOrEqual(6);
  expect(await toast(page).evaluate((node) => getComputedStyle(node).flexShrink)).toBe("0");
  expect(await viewport(page).evaluate((node) => node.scrollHeight)).toBeGreaterThan(
    viewportBox.height,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const close = page.getByRole("button", { name: "Dismiss notification" });
  await close.focus();
  await expect(close).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(toast(page)).toHaveCount(0);
  expect((await scanStoryA11y(page)).violations).toEqual([]);
});

test("actual full glass remains single-layer; opaque, contrast and forced-colors are solid", async ({
  page,
}) => {
  for (const [name, hasBlur] of [
    ["full-transparency", true],
    ["opaque", false],
    ["high-contrast", false],
  ] as const) {
    await page.goto(story(name));
    const computed = await toast(page).evaluate((node) => {
      let parent: Element | null = node.parentElement;
      let parentBlur = false;
      while (parent) {
        if (getComputedStyle(parent).backdropFilter !== "none") parentBlur = true;
        parent = parent.parentElement;
      }
      return { filter: getComputedStyle(node).backdropFilter, parentBlur };
    });
    expect(computed.parentBlur).toBe(false);
    expect(computed.filter.includes("blur(")).toBe(hasBlur);
  }
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto(story("default"));
  await expect(toast(page)).toHaveCSS("backdrop-filter", "none");
  expect((await scanStoryA11y(page)).violations).toEqual([]);
});

test("real Dialog + Select portal compose with Toast and restore all background focus", async ({
  page,
}) => {
  await page.goto(story("dialog-select-integration"));
  const initial = page.getByRole("button", { name: "Open study settings" });
  await initial.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Study settings" });
  await expect(dialog).toBeVisible();
  const select = page.getByRole("combobox", { name: "Study topic" });
  await select.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  expect((await scanStoryA11y(page)).violations).toEqual([]);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(select).toHaveAttribute("aria-expanded", "false");
  await expect(select).toBeFocused();
  await page.getByRole("button", { name: "Save study settings" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(toast(page)).toContainText("Physics");
  await expect(initial).toBeFocused();
  await expect(page.locator('[data-aria-hidden="true"], [inert]')).toHaveCount(0);
  expect((await scanStoryA11y(page)).violations).toEqual([]);
  await page.keyboard.press("F8");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(toast(page)).toHaveCount(0);
  await expect(initial).toBeFocused();
});

test("all generated Toast stories, including timed notices, are axe clean", async ({ page }) => {
  test.slow();
  const stories = storiesForFamily("Toast");
  const scanned: string[] = [];
  for (const entry of stories) {
    const name = storySlug(entry);
    const timed = name === "timed-default" || name === "timed-short";
    if (timed) await page.clock.install();
    await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
    if (name === "dialog-select-integration") {
      await page.getByRole("button", { name: "Open study settings" }).click();
      await expect(page.getByRole("dialog", { name: "Study settings" })).toBeVisible();
      await page.getByRole("combobox", { name: "Study topic" }).click();
      await expect(page.getByRole("listbox")).toBeVisible();
      await scanIndexedStory(page, entry, "dialog-select-open");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Save study settings" }).click();
      await expect(toast(page)).toHaveCount(1);
      scanned.push(await scanIndexedStory(page, entry, "saved-toast-visible"));
    } else {
      if (name === "empty") {
        await expect(page.getByText("No notifications. Continue practicing.")).toBeVisible();
      } else {
        await expect(toast(page)).toHaveCount(
          name === "stacked" ? 3 : name === "provider-isolation" ? 2 : 1,
        );
      }
      if (timed) {
        // Pause the real Radix timer via the user's supported hover interaction.
        // Fast-forward beyond expiry to prove the notice remains present for axe.
        await toast(page).hover();
        await page.clock.fastForward(name === "timed-short" ? 2200 : 8500);
        await expect(toast(page)).toHaveCount(1);
      }
      scanned.push(await scanIndexedStory(page, entry, name));
      if (timed) await expect(toast(page)).toHaveCount(1);
    }
  }
  assertStoryScanCoverage(stories, scanned);
});
