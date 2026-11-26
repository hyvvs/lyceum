import { expect, test } from "@playwright/test";
import { scanIndexedStory, storySlug } from "./axe-story-gate";
import { assertStoryScanCoverage, storiesForFamily } from "./story-inventory";

const story = (name: string, state: string) =>
  `/iframe.html?id=primitives-${name}--${state}&viewMode=story`;

test("B5b StatCard exposes honest zero, missing state, direction and textual trend with no extra focus", async ({
  page,
}) => {
  await page.goto(story("statcard", "with-trend"));
  const article = page.getByRole("article", { name: "Sample practice attempts" });
  await expect(article).toBeVisible();
  await expect(article).toContainText("Sample practice count rose");
  await expect(article.locator("svg")).toHaveAttribute("aria-hidden", "true");
  await expect(article.locator("svg")).toHaveAttribute("focusable", "false");
  await page.goto(story("statcard", "no-data"));
  await expect(page.locator(".lyceum-stat-card__value")).toHaveText("Not available");
  await expect(page.locator(".lyceum-stat-card__sparkline")).toHaveCount(0);
  await page.goto(story("statcard", "zero"));
  await expect(page.locator(".lyceum-stat-card__value")).toHaveText("0");
  await page.goto(story("statcard", "negative"));
  await expect(page.locator(".lyceum-stat-card__value")).toHaveText("-3");
  await expect(page.locator(".lyceum-stat-card__delta")).toContainText(
    "from a lower signed baseline",
  );
  await expect(page.locator(".lyceum-stat-card a,.lyceum-stat-card button")).toHaveCount(0);
});

test("B5b BarChart has a single non-color highlighted bar and truthful accessible values", async ({
  page,
}) => {
  await page.goto(story("barchart", "highlighted"));
  const chart = page.getByRole("figure", { name: "Synthetic weekly activity" });
  await expect(chart).toBeVisible();
  await expect(chart.getByText("Scale: 0–10 sample items")).toBeVisible();
  const items = chart.locator("li");
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("3 sample items");
  await expect(items.nth(1)).toContainText("8 sample items");
  await expect(items.nth(1)).toContainText("★ Highlighted");
  await expect(chart.locator('[data-highlighted="true"]')).toHaveCount(1);
  await expect(chart.locator(".lyceum-bar-chart__track").first()).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(chart.locator("[tabindex]")).toHaveCount(0);
  const heights = await chart
    .locator(".lyceum-bar-chart__bar")
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  expect(heights).toHaveLength(3);
  expect(heights[1] ?? 0).toBeGreaterThan(heights[0] ?? 0);
  await page.goto(story("barchart", "zero"));
  await expect(page.getByText("0 sample items", { exact: true })).toBeVisible();
  const zeroBar = await page
    .locator(".lyceum-bar-chart__item")
    .first()
    .locator(".lyceum-bar-chart__bar")
    .evaluate((node) => ({
      height: node.getBoundingClientRect().height,
      border: getComputedStyle(node).borderTopWidth,
    }));
  expect(zeroBar.height).toBe(0);
  expect(zeroBar.border).toBe("0px");
  await page.goto(story("barchart", "empty"));
  await expect(page.getByText("No data available")).toBeVisible();
});

test("B5b MasteryRing speaks explicit probability and uncertainty and never equates unknown with zero", async ({
  page,
}) => {
  await page.goto(story("masteryring", "default"));
  const ring = page.getByRole("figure", { name: "Synthetic concept mastery estimate" });
  await expect(ring).toContainText("62%");
  await expect(ring).toContainText("47%–77%");
  await expect(ring.locator("svg")).toHaveAttribute("aria-hidden", "true");
  await expect(ring.locator("svg")).toHaveAttribute("focusable", "false");
  await page.goto(story("masteryring", "unknown"));
  await expect(page.locator(".lyceum-mastery-ring")).toHaveAttribute("data-assessed", "false");
  await expect(page.getByText("Unassessed")).toBeVisible();
  await expect(page.locator(".lyceum-mastery-ring__visual")).toHaveCount(0);
  await page.goto(story("masteryring", "zero"));
  await expect(page.locator(".lyceum-mastery-ring__value")).toHaveText("0%");
});

test("B5b rendered MasteryRing uncertainty halo reflects the supplied partial interval, not a full circle", async ({
  page,
}) => {
  await page.goto(story("masteryring", "default"));
  const halo = await page.locator(".lyceum-mastery-ring__uncertainty").evaluate((node) => ({
    attr: node.getAttribute("stroke-dasharray"),
    computed: getComputedStyle(node).strokeDasharray,
  }));
  expect(halo.attr).not.toBeNull();
  expect(halo.computed).not.toBe("none");
  const firstDash = Number.parseFloat(halo.computed.split(/[ ,]/)[0] ?? "");
  const expected = (0.77 - 0.47) * 2 * Math.PI * 40;
  expect(Math.abs(firstDash - expected)).toBeLessThan(1);
});

test("B5b data surfaces retain meaningful visible content in narrow RTL, 200%-text and opaque modes", async ({
  page,
}) => {
  for (const family of ["statcard", "barchart", "masteryring"]) {
    for (const state of ["rtl", "double-text", "high-contrast", "opaque"]) {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(story(family, state));
      const surface = page.locator(
        family === "statcard"
          ? ".lyceum-stat-card"
          : family === "barchart"
            ? ".lyceum-bar-chart"
            : ".lyceum-mastery-ring",
      );
      await expect(surface).toBeVisible();
      const dims = await surface.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          filter: getComputedStyle(element).backdropFilter,
        };
      });
      expect(dims.left, `${family}/${state}`).toBeGreaterThanOrEqual(-1);
      expect(dims.right, `${family}/${state}`).toBeLessThanOrEqual(321);
      expect(dims.pageWidth, `${family}/${state}`).toBeLessThanOrEqual(dims.viewportWidth + 1);
      if (state === "high-contrast" || state === "opaque") {
        expect(dims.filter, `${family}/${state}`).toBe("none");
      }
    }
  }
});

for (const [family, selector] of [
  ["StatCard", ".lyceum-stat-card"],
  ["BarChart", ".lyceum-bar-chart"],
  ["MasteryRing", ".lyceum-mastery-ring"],
] as const) {
  test(`B5b fail-closed axe scans every generated ${family} story including data boundary/fallback states`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const stories = storiesForFamily(family);
    const checked: string[] = [];
    for (const entry of stories) {
      await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
      const surface = page.locator(selector);
      await expect(surface).toBeVisible();
      const state = storySlug(entry);
      if (state === "hover") {
        await surface.hover();
      }
      expect(await surface.locator("button,a,input,[tabindex]").count()).toBe(0);
      checked.push(await scanIndexedStory(page, entry, state));
    }
    assertStoryScanCoverage(stories, checked);
  });
}
