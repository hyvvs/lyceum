import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";

const title = "Visual Compositions/M0-017 B5 Complete";
const prefix = "visual-compositions-m0-017-b5-complete";
const story = (name: string) => `/iframe.html?id=${prefix}--${name}&viewMode=story`;

test("B5 integrated visual-only composition includes all eleven actual named M0-017 component families", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("dark-full"));
  const scene = page.getByTestId("b5-composition");
  await expect(scene).toBeVisible();
  await expect(scene.getByText("Synthetic fixture · not a tutoring product")).toBeVisible();
  await expect(scene.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(scene.locator(".lyceum-glass-panel")).toHaveCount(1);
  await expect(scene.locator(".lyceum-glass-card")).toHaveCount(1);
  await expect(scene.locator(".lyceum-tint-card")).toHaveCount(1);
  await expect(scene.locator(".lyceum-pill-nav")).toHaveCount(1);
  await expect(scene.locator(".lyceum-dock")).toHaveCount(1);
  await expect(scene.locator(".lyceum-round-icon-button")).toHaveCount(1);
  await expect(scene.locator(".lyceum-segmented-control")).toHaveCount(1);
  await expect(scene.locator(".lyceum-stat-card")).toHaveCount(1);
  await expect(scene.locator(".lyceum-bar-chart")).toHaveCount(1);
  await expect(scene.locator(".lyceum-mastery-ring")).toHaveCount(1);
  await expect(scene.locator(".lyceum-chat-bubble")).toHaveCount(2);
  await expect(
    scene.getByRole("navigation", { name: "Visual-only component sections" }),
  ).toBeVisible();
  const dock = scene.getByRole("navigation", { name: "Visual-only component Dock" });
  await expect(dock).toBeVisible();
  await expect(dock.getByRole("link")).toHaveCount(4);
  for (const item of await scene.locator("a,button").all()) {
    if (!(await item.isVisible())) continue;
    const box = await item.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await expect(
    scene.getByText("These are synthetic Storybook numbers", { exact: false }),
  ).toBeVisible();
  await expect(scene.getByText("No tutor is connected.", { exact: false })).toBeVisible();
});

test("B5 integrated compositional blur never nests or exceeds six visible surfaces across real reading scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("dark-full"));
  // Storybook applies theme/glass globals in a React effect. Do not sample the
  // initial opaque fallback before the requested full-glass mode is mounted.
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "full");
  await expect(page.getByTestId("b5-composition")).toBeVisible();
  const samples: { scroll: number; count: number; nested: string[] }[] = [];
  for (const scroll of [0, 320, 700, 1050, 1400, 1800, 2250, 2700]) {
    await page.evaluate((y) => window.scrollTo(0, y), scroll);
    const sample = await page.evaluate(() => {
      const active = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".b5-scene .glass, .b5-scene .glass-raised, .b5-scene .glass-float, .b5-scene .glass-reading, .b5-scene .glass-tint",
        ),
      ).filter((node) => {
        const s = getComputedStyle(node);
        const b = node.getBoundingClientRect();
        return (
          s.backdropFilter !== "none" &&
          s.backdropFilter !== "" &&
          b.height > 0 &&
          b.width > 0 &&
          b.bottom > 0 &&
          b.top < innerHeight &&
          b.right > 0 &&
          b.left < innerWidth
        );
      });
      return {
        count: active.length,
        nested: active
          .filter((node) => {
            let ancestor = node.parentElement;
            while (ancestor) {
              const filter = getComputedStyle(ancestor).backdropFilter;
              if (filter !== "none" && filter !== "") return true;
              ancestor = ancestor.parentElement;
            }
            return false;
          })
          .map((node) => node.className),
      };
    });
    samples.push({ scroll, ...sample });
    expect(sample.count, JSON.stringify(samples)).toBeLessThanOrEqual(6);
    expect(sample.nested, JSON.stringify(samples)).toEqual([]);
  }
  expect(samples.some((sample) => sample.count > 0)).toBe(true);
});

test("B5 composition retains real actions, native radio arrows and visible natural focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("dark-full"));
  const button = page.getByRole("button", { name: "Inspect example notices" });
  await expect(button).toHaveAccessibleDescription("Two synthetic sample notices");
  let reachedByTab = false;
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press("Tab");
    if (await button.evaluate((node) => document.activeElement === node)) {
      reachedByTab = true;
      break;
    }
  }
  expect(reachedByTab).toBe(true);
  expect(await button.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Example notice activations: 1.", { exact: false })).toBeVisible();
  const radio = page.getByRole("radio", { name: "Compact" });
  await radio.check();
  await expect(radio).toBeChecked();
  await expect(page.getByText("Selected demonstration: compact.", { exact: false })).toBeVisible();
  await page.getByRole("radio", { name: "Comfortable" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(radio).toBeChecked();
});

test("B5 full composition stays horizontally contained across RTL, mobile, 200% text, solid fallback and forced colors", async ({
  page,
}) => {
  test.slow();
  for (const scenario of [
    { state: "dark-full", width: 390, height: 844 },
    { state: "rtl", width: 390, height: 844 },
    { state: "double-text", width: 390, height: 844 },
    { state: "double-text", width: 320, height: 256 },
    { state: "opaque", width: 390, height: 844 },
    { state: "high-contrast", width: 390, height: 844 },
    { state: "light-full", width: 1440, height: 900 },
  ]) {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.goto(story(scenario.state));
    const report = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      headings: Array.from(
        document.querySelectorAll<HTMLElement>(".b5-scene h1,.b5-scene h2,.b5-scene h3"),
      ).map((item) => {
        const b = item.getBoundingClientRect();
        return { name: item.textContent, left: b.left, right: b.right };
      }),
    }));
    expect(report.width, JSON.stringify(scenario)).toBeLessThanOrEqual(report.viewport + 1);
    for (const heading of report.headings) {
      expect(heading.left, JSON.stringify({ scenario, heading })).toBeGreaterThanOrEqual(-1);
      expect(heading.right, JSON.stringify({ scenario, heading })).toBeLessThanOrEqual(
        scenario.width + 1,
      );
    }
    for (const link of await page.locator(".b5-scene .lyceum-dock a").all()) {
      const rect = await link.boundingBox();
      expect(rect?.width).toBeGreaterThanOrEqual(44);
      expect(rect?.height).toBeGreaterThanOrEqual(44);
    }
    if (scenario.state === "opaque" || scenario.state === "high-contrast") {
      const activeBlur = await page
        .locator(
          ".b5-scene .glass,.b5-scene .glass-raised,.b5-scene .glass-float,.b5-scene .glass-reading,.b5-scene .glass-tint",
        )
        .evaluateAll((nodes) =>
          nodes.some((node) => getComputedStyle(node).backdropFilter !== "none"),
        );
      expect(activeBlur).toBe(false);
    }
  }
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto(story("high-contrast"));
  await expect(page.getByRole("link", { name: "Explore the sample controls" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Comfortable" })).toBeChecked();
});

test("B5 chart keeps supplied words intact at 320px with 200% root text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(story("double-text"));
  const layout = await page.locator(".b5-scene .lyceum-bar-chart").evaluate((chart) => {
    const list = chart.querySelector<HTMLElement>(".lyceum-bar-chart__bars");
    if (!list) throw new Error("B5 chart must render its labeled bars");
    const available = list.getBoundingClientRect().width;
    return Array.from(list.querySelectorAll<HTMLElement>(".lyceum-bar-chart__item")).map((item) => {
      const value = item.querySelector<HTMLElement>(".lyceum-bar-chart__datum > span");
      const node = Array.from(value?.childNodes ?? []).find(
        (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.includes("sample"),
      );
      if (!node || node.nodeType !== Node.TEXT_NODE || !node.textContent) {
        throw new Error("B5 chart needs visible supplied value text");
      }
      const index = node.textContent.indexOf("sample");
      if (index < 0) throw new Error("Missing the fixture's supplied unit word");
      const word = document.createRange();
      word.setStart(node, index);
      word.setEnd(node, index + "sample".length);
      return {
        label: item.textContent,
        width: item.getBoundingClientRect().width,
        available,
        fragments: Array.from(word.getClientRects()).filter((rect) => rect.width > 0).length,
      };
    });
  });
  expect(layout).toHaveLength(3);
  for (const item of layout) {
    expect(item.width, JSON.stringify(item)).toBeGreaterThanOrEqual(item.available - 1);
    expect(item.fragments, JSON.stringify(item)).toBe(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
});

test("B5 all eight integrated Storybook themes are inventoried and axe scanned, no bypass", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const index = JSON.parse(readFileSync(join("storybook-static", "index.json"), "utf8")) as {
    entries: Record<string, { title: string; type: string; id: string }>;
  };
  const entries = Object.values(index.entries).filter(
    (entry) => entry.type === "story" && entry.title === title,
  );
  const source = readFileSync(
    join("tests", "fixtures", "m0-017-b5-composition.stories.tsx"),
    "utf8",
  );
  const exported = [...source.matchAll(/^export const ([A-Z]\w*): Story/gm)].map(([, name]) =>
    name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
  );
  expect(entries.map((entry) => entry.id).sort()).toEqual(
    exported.map((slug) => `${prefix}--${slug}`).sort(),
  );
  expect(exported.sort()).toEqual(
    [
      "dark-full",
      "light-full",
      "reduced-transparency",
      "opaque",
      "high-contrast",
      "reduced-motion",
      "double-text",
      "rtl",
    ].sort(),
  );
  for (const entry of entries) {
    await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
    await expect(page.getByTestId("b5-composition")).toBeVisible();
    const a11y = await scanStoryA11y(page);
    expect(a11y.violations, entry.id).toEqual([]);
    console.info(
      `AXE_B5_COMPOSITION_CHECKED ${entry.id} violations=0 incomplete=${a11y.incomplete.map((item) => item.id).join(",") || "none"}`,
    );
  }
});
