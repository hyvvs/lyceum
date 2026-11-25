import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";

const prefix = "visual-compositions-m0-017-v5-slice-a";
const story = (name: string) => `/iframe.html?id=${prefix}--${name}&viewMode=story`;
const capture = process.env.LYCEUM_CAPTURE_V5 === "1";
const folder = join("docs", "qa", "m0-017-slice-a");

async function shot(page: import("@playwright/test").Page, filename: string, fullPage = false) {
  if (!capture) return;
  mkdirSync(folder, { recursive: true });
  await page.screenshot({ path: join(folder, filename), fullPage, animations: "disabled" });
}

test("the V5 composition checks every exported visual story with a real WCAG axe run", async ({
  page,
}) => {
  test.slow();
  const index = JSON.parse(readFileSync(join("storybook-static", "index.json"), "utf8")) as {
    entries: Record<string, { title: string; type: string; id: string }>;
  };
  const entries = Object.values(index.entries).filter(
    (entry) => entry.type === "story" && entry.title === "Visual Compositions/M0-017 V5 Slice A",
  );
  const source = readFileSync(
    join("tests", "fixtures", "m0-017-v5-composition.stories.tsx"),
    "utf8",
  );
  const exportedSlugs = [...source.matchAll(/^export const ([A-Z]\w*): Story/gm)].map(([, name]) =>
    name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
  );
  expect(entries.map((entry) => entry.id).sort()).toEqual(
    exportedSlugs.map((name) => `${prefix}--${name}`).sort(),
  );
  expect(entries.map((entry) => entry.id).sort()).toEqual(
    [
      "dark-full",
      "light-full",
      "reduced-transparency",
      "opaque",
      "high-contrast",
      "reduced-motion",
      "rtl",
      "double-text",
    ]
      .map((name) => `${prefix}--${name}`)
      .sort(),
  );
  for (const entry of entries) {
    await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
    await expect(page.getByTestId("v5-composition")).toBeVisible();
    const report = await scanStoryA11y(page);
    expect(report.violations, entry.id).toEqual([]);
    console.info(
      `AXE_COMPOSITION_CHECKED ${entry.id} violations=0 incomplete=${report.incomplete.map((rule) => rule.id).join(",") || "none"}`,
    );
  }
});

test("desktop full glass has actual rendered depth, six-or-fewer blur surfaces, and truthful content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("dark-full"));
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "full");
  await expect(
    page.getByRole("heading", { level: 1, name: "Your space for deeper learning." }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Visual-only primary navigation" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Visual-only dock" })).toBeVisible();
  await expect(page.locator(".v5-topic")).toHaveCount(5);
  await expect(page.getByText("Visual-only sample · no learner data")).toBeVisible();
  const glass = await page
    .locator(
      ".v5-scene .glass, .v5-scene .glass-raised, .v5-scene .glass-float, .v5-scene .glass-reading, .v5-scene .glass-tint",
    )
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          const style = getComputedStyle(node);
          return style.backdropFilter !== "none" && style.backdropFilter !== "";
        })
        .map((node) => {
          let parent = node.parentElement;
          while (parent) {
            const filter = getComputedStyle(parent).backdropFilter;
            if (filter !== "none" && filter !== "") return { nested: true };
            parent = parent.parentElement;
          }
          return { nested: false };
        }),
    );
  expect(glass.length).toBeGreaterThan(0);
  expect(glass.length).toBeLessThanOrEqual(6);
  expect(glass.every((surface) => !surface.nested)).toBe(true);
  await page.mouse.move(0, 0);
  await shot(page, "desktop-dark-full-1440x900.png");
  await shot(page, "desktop-dark-full-complete.png", true);
});

test("all desktop/mobile screenshot states retain contrast modes, 44px controls and responsive dock", async ({
  page,
}) => {
  test.slow();
  const scenarios = [
    { name: "dark-full", width: 390, height: 844, file: "mobile-dark-full-390x844.png" },
    { name: "light-full", width: 1440, height: 900, file: "desktop-light-full-1440x900.png" },
    {
      name: "reduced-transparency",
      width: 1440,
      height: 900,
      file: "desktop-reduced-1440x900.png",
    },
    { name: "reduced-transparency", width: 390, height: 844, file: "mobile-reduced-390x844.png" },
    { name: "opaque", width: 1440, height: 900, file: "desktop-opaque-1440x900.png" },
    { name: "opaque", width: 390, height: 844, file: "mobile-opaque-390x844.png" },
    { name: "high-contrast", width: 1440, height: 900, file: "desktop-high-contrast-1440x900.png" },
    { name: "double-text", width: 390, height: 844, file: "mobile-200-text-390x844.png" },
    { name: "double-text", width: 320, height: 256, file: "short-200-text-320x256.png" },
  ] as const;
  for (const scenario of scenarios) {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.goto(story(scenario.name));
    await expect(page.getByTestId("v5-composition")).toBeVisible();
    const htmlWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(htmlWidth, scenario.file).toBeLessThanOrEqual(scenario.width);
    const dock = page.getByRole("navigation", { name: "Visual-only dock" });
    await expect(dock).toBeVisible();
    const links = await dock.getByRole("link").all();
    expect(links).toHaveLength(4);
    for (const link of await page.locator(".v5-scene a, .v5-scene button").all()) {
      if (!(await link.isVisible())) continue;
      const bounds = await link.boundingBox();
      expect(bounds?.width, scenario.file).toBeGreaterThanOrEqual(44);
      expect(bounds?.height, scenario.file).toBeGreaterThanOrEqual(44);
    }
    const headingBounds = await page.locator(".v5-scene :is(h1, h2, h3)").evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: node.textContent,
        left: node.getBoundingClientRect().left,
        right: node.getBoundingClientRect().right,
      })),
    );
    for (const bounds of headingBounds) {
      expect(bounds.left, `${scenario.file} ${bounds.text}`).toBeGreaterThanOrEqual(-1);
      expect(bounds.right, `${scenario.file} ${bounds.text}`).toBeLessThanOrEqual(
        scenario.width + 1,
      );
    }
    await page.mouse.move(0, 0);
    await shot(page, scenario.file);
    if (scenario.name === "opaque" && scenario.width === 1440) {
      await shot(page, "desktop-opaque-complete.png", true);
    }
    if (scenario.height <= 360 || scenario.name === "double-text") {
      const dockTop = await dock.evaluate((node) => node.getBoundingClientRect().top);
      expect(
        dockTop,
        `${scenario.file}: dock must be below initial reading viewport`,
      ).toBeGreaterThanOrEqual(scenario.height);
    }
    if (scenario.width <= 390) {
      const footer = page.locator("#scene-privacy");
      await footer.scrollIntoViewIfNeeded();
      const bounds = await footer.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
      });
      console.info(`MOBILE_FOOTER_REACH ${scenario.file} ${JSON.stringify(bounds)}`);
      expect(bounds.height, scenario.file).toBeGreaterThan(0);
      expect(bounds.top, scenario.file).toBeLessThan(scenario.height);
      expect(bounds.bottom, scenario.file).toBeGreaterThan(0);
    }
    if (scenario.width === 390 && scenario.name === "dark-full") {
      await shot(page, "mobile-dark-full-complete.png", true);
    }
  }
});

test("mobile navigation is semantic and keyboard operable without suppressing focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(story("dark-full"));
  const dock = page.getByRole("navigation", { name: "Visual-only dock" });
  const overview = dock.getByRole("link", { name: "Overview preview" });
  await overview.focus();
  await expect(overview).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dock.getByRole("link", { name: "Library preview" })).toBeFocused();
  const focusStyle = await page.evaluate(
    () => getComputedStyle(document.activeElement as HTMLElement).outlineStyle,
  );
  expect(focusStyle).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#scene-library$/);
  await expect(dock.getByRole("link", { name: "Library preview" })).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expect(overview).not.toHaveAttribute("aria-current", "location");
  const library = dock.getByRole("link", { name: "Library preview" });
  await library.focus();
  await expect(library).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(overview).toBeFocused();
  await page.getByRole("link", { name: "Reading preview" }).focus();
  await expect(page.getByRole("link", { name: "Reading preview" })).toBeFocused();
});

test("RTL desktop dock occupies the logical start gutter without covering the main panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("rtl"));
  await expect(page.getByTestId("v5-composition")).toBeVisible();
  const dock = await page.getByRole("navigation", { name: "Visual-only dock" }).boundingBox();
  const main = await page.locator(".v5-main").boundingBox();
  if (!dock || !main) throw new Error("Expected visible dock and main surface in RTL");
  expect(dock.x).toBeGreaterThanOrEqual(main.x + main.width);
});

test("visual viewport pinch magnification and true 200% root text are separately verified", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(story("double-text"));
  await expect(page.getByTestId("v5-composition")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize)),
    )
    .toBeGreaterThanOrEqual(32);
  // CDP pinch zoom is NOT native Chromium page zoom. Native page-zoom remains an explicit manual gate.
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  const viewport = await page.evaluate(() => window.visualViewport?.scale ?? 1);
  expect(viewport).toBeGreaterThanOrEqual(1.9);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
});
