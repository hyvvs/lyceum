import { expect, test } from "@playwright/test";
import { scanIndexedStory, storySlug } from "./axe-story-gate";
import { assertStoryScanCoverage, storiesForFamily } from "./story-inventory";

const pill = (name: string) => `/iframe.html?id=primitives-pillnav--${name}&viewMode=story`;
const dock = (name: string) => `/iframe.html?id=primitives-dock--${name}&viewMode=story`;

for (const family of ["PillNav", "Dock"] as const) {
  test(`fail-closed axe scans every ${family} story with required states`, async ({ page }) => {
    test.slow();
    const stories = storiesForFamily(family);
    const scanned: string[] = [];
    for (const entry of stories) {
      await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
      const selector = family === "PillNav" ? ".lyceum-pill-nav" : ".lyceum-dock";
      await expect(page.locator(selector)).toBeVisible();
      let state = storySlug(entry);
      const anchor = page.locator(`${selector} a`).first();
      if (family === "PillNav" && state === "hover") {
        const inactive = page.locator(`${selector} a`).last();
        const before = await inactive.evaluate((node) => getComputedStyle(node).backgroundColor);
        await inactive.hover();
        const after = await inactive.evaluate((node) => getComputedStyle(node).backgroundColor);
        expect(after).not.toBe(before);
      }
      if (family === "PillNav" && state === "focus") {
        await anchor.focus();
        await expect(anchor).toBeFocused();
      }
      if (family === "Dock" && state !== "empty") {
        if (storySlug(entry) === "hover") {
          await anchor.hover();
        } else {
          await anchor.focus();
        }
        await expect(page.getByRole("tooltip")).toBeVisible();
        state = "tooltip-open";
      }
      scanned.push(await scanIndexedStory(page, entry, state));
    }
    assertStoryScanCoverage(stories, scanned);
  });
}

test("native nav landmarks and native consumer links retain semantics, refs and current state", async ({
  page,
}) => {
  await page.goto(pill("focus"));
  const primary = page.getByRole("navigation", { name: "Study navigation" });
  await expect(primary).toHaveAttribute("data-ref-proof", "attached");
  expect(await primary.locator("nav").count()).toBe(0);
  expect(await primary.locator("button").count()).toBe(0);
  await expect(primary.getByRole("link", { name: "Today" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.keyboard.press("Tab");
  await expect(primary.getByRole("link", { name: "Today" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(primary.getByRole("link", { name: "Settings" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(primary.getByRole("link", { name: "Today" })).toBeFocused();

  await page.goto(dock("default"));
  const quick = page.getByRole("navigation", { name: "Quick navigation" });
  await expect(quick).toHaveAttribute("data-ref-proof", "attached");
  await expect(quick).toHaveAttribute("data-orientation", "vertical");
  expect(await quick.locator("button, nav").count()).toBe(0);
  await expect(quick.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
  await expect(quick.getByRole("link", { name: "Settings" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("Dock horizontal/vertical, keyboard Tooltip/Escape, pointer dismissal and 44px targets", async ({
  page,
}) => {
  for (const [story, direction] of [
    ["vertical", "column"],
    ["horizontal", "row"],
  ] as const) {
    await page.goto(dock(story));
    const nav = page.getByRole("navigation", { name: "Quick navigation" });
    await expect(nav).toHaveCSS("flex-direction", direction);
    const links = nav.getByRole("link");
    expect(await links.count()).toBe(2);
    for (const link of await links.all()) {
      const rect = await link.boundingBox();
      expect(rect?.width).toBeGreaterThanOrEqual(44);
      expect(rect?.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.goto(dock("default"));
  const first = page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link", {
    name: "Today",
  });
  for (let attempt = 0; attempt < 8; attempt++) {
    if (await first.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(first).toBeFocused();
  await expect(first).toHaveCSS("outline-style", "solid");
  await expect(page.getByRole("tooltip")).toContainText("Today");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).not.toBeVisible();
  await expect(first).toBeFocused();
  await page.keyboard.press("Tab");
  const second = page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link", {
    name: "Settings",
  });
  await expect(second).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(first).toBeFocused();
  // Test pointer-only dismissal in a fresh document so keyboard focus cannot
  // correctly keep the tooltip open after mouseleave.
  await page.goto(dock("default"));
  const pointerTrigger = page
    .getByRole("navigation", { name: "Quick navigation" })
    .getByRole("link", { name: "Today" });
  await pointerTrigger.hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  const bounds = await page.getByRole("tooltip").boundingBox();
  if (!bounds) throw new Error("Tooltip bounds unavailable");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, {
    steps: 8,
  });
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.mouse.move(900, 500, { steps: 12 });
  await expect(page.getByRole("tooltip")).not.toBeVisible();
});

test("200% root text, 320px narrow, RTL and solid fallback preserve focus and Tooltip bounds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  for (const story of ["double-text", "rtl", "high-contrast", "opaque", "reduced-motion"]) {
    await page.goto(dock(story));
    const nav = page.getByRole("navigation", { name: "Quick navigation" });
    const link = nav.getByRole("link", { name: "Today" });
    await link.focus();
    await expect(link).toBeFocused();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    const rect = await tooltip.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect?.x).toBeGreaterThanOrEqual(0);
    expect(rect?.y).toBeGreaterThanOrEqual(0);
    expect((rect?.x ?? 0) + (rect?.width ?? 0)).toBeLessThanOrEqual(320);
    expect((rect?.y ?? 0) + (rect?.height ?? 0)).toBeLessThanOrEqual(256);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
    if (story === "double-text") {
      await expect(page.locator("html")).toHaveCSS("font-size", "32px");
    }
    await page.keyboard.press("Escape");
    await expect(tooltip).not.toBeVisible();
  }
});
