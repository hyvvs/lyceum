import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/** Invented values only, inside Storybook; no production learner or assessment data. */
const story = (family: string, state: string) =>
  `/iframe.html?id=primitives-${family}--${state}&viewMode=story`;
const capture = process.env.LYCEUM_CAPTURE_B5_LOCALE === "1";
const screenshots = join("docs", "qa", "m0-017-stage-b5", "localization-screenshots");

async function saveEvidence(locator: import("@playwright/test").Locator, filename: string) {
  if (!capture) return;
  mkdirSync(screenshots, { recursive: true });
  await locator.screenshot({ path: join(screenshots, filename), animations: "disabled" });
}

test("B5 SegmentedControl Spanish empty wording and native options stay distinct from RTL", async ({
  page,
}) => {
  await page.goto(story("segmentedcontrol", "localized-spanish-empty"));
  const empty = page.getByRole("group", { name: "Modo de ejemplo" });
  await expect(empty).toHaveAttribute("dir", "ltr");
  await expect(empty).toHaveAttribute("lang", "es-ES");
  await expect(empty.getByText("No hay opciones disponibles")).toBeVisible();
  await expect(empty.getByRole("radio")).toHaveCount(0);
  await saveEvidence(empty, "segmented-es-empty.png");

  await page.goto(story("segmentedcontrol", "localized-spanish-selected"));
  const group = page.getByRole("group", { name: "Densidad ficticia" });
  await expect(group).toHaveAttribute("dir", "ltr");
  await page.keyboard.press("Tab");
  await expect(group.getByRole("radio", { name: "Breve" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "Cómoda" })).toBeChecked();
  await expect(page.getByText("Selección: comoda")).toBeVisible();

  await page.goto(story("segmentedcontrol", "rtl"));
  await expect(page.getByRole("group", { name: "Sample session length" })).toHaveAttribute(
    "dir",
    "rtl",
  );
  await expect(page.getByRole("radio", { name: "Brief" })).toBeVisible();
});

test("B5 BarChart Spanish fractional values, bounded scale, units and highlight are textual equivalents", async ({
  page,
}) => {
  await page.goto(story("barchart", "localized-spanish"));
  const chart = page.getByRole("figure", { name: "Frecuencias ficticias" });
  await expect(chart).toHaveAttribute("lang", "es-ES");
  await expect(chart.locator(".lyceum-bar-chart__scale")).toHaveText("Escala: 0–10,5 artículos");
  const bars = chart.locator("li");
  await expect(bars).toHaveCount(3);
  await expect(bars.nth(0)).toContainText("0 artículos");
  await expect(bars.nth(1)).toContainText("1,25 artículos");
  await expect(bars.nth(1)).toContainText("★ Destacado");
  await expect(bars.nth(2)).toContainText("2,5 artículos");
  await expect(chart.locator('[data-highlighted="true"]')).toHaveCount(1);
  await expect(chart.locator('[data-zero="true"]')).toHaveCount(1);
  await expect(chart.locator(".lyceum-bar-chart__track").first()).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(chart.locator("[tabindex]")).toHaveCount(0);
  const heights = await chart
    .locator(".lyceum-bar-chart__bar")
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(heights[0]).toBe(0);
  expect(heights[2] ?? 0).toBeGreaterThan(heights[1] ?? 0);

  await page.goto(story("barchart", "localized-spanish-empty"));
  const empty = page.getByRole("figure", { name: "Frecuencias ficticias" });
  await expect(empty.getByText("Sin datos todavía")).toBeVisible();
  await expect(empty.locator("li")).toHaveCount(0);
  await expect(empty.getByText("Escala: 0–10,5 artículos")).toBeVisible();
});

test("B5 MasteryRing has Spanish percent/interval text and unchanged actual SVG uncertainty", async ({
  page,
}) => {
  await page.goto(story("masteryring", "localized-spanish"));
  const ring = page.getByRole("figure", { name: "Probabilidad ficticia" });
  await expect(ring).toHaveAttribute("lang", "es-ES");
  const value = (await ring.locator(".lyceum-mastery-ring__value").textContent())?.replace(
    /[\u00a0\u202f]/g,
    " ",
  );
  const interval = (await ring.locator(".lyceum-mastery-ring__interval").textContent())?.replace(
    /[\u00a0\u202f]/g,
    " ",
  );
  expect(value).toBe("62,5 %");
  expect(interval).toBe("Incertidumbre: 47,5 %–77,5 %");
  await expect(ring.locator("svg")).toHaveAttribute("aria-hidden", "true");
  const halo = await ring.locator(".lyceum-mastery-ring__uncertainty").evaluate((node) => ({
    computed: getComputedStyle(node).strokeDasharray,
    attr: node.getAttribute("stroke-dasharray"),
  }));
  expect(halo.computed).not.toBe("none");
  expect(Number.parseFloat(halo.computed)).toBeCloseTo((0.775 - 0.475) * 2 * Math.PI * 40, 1);
  expect(halo.attr).not.toBeNull();
  await saveEvidence(ring, "mastery-es-interval.png");
});

test("B5 StatCard Spanish numeric text is localized; explicit comparison remains caller-owned", async ({
  page,
}) => {
  await page.goto(story("statcard", "localized-spanish"));
  const card = page.getByRole("article", { name: "Observaciones ficticias" });
  await expect(card).toHaveAttribute("lang", "es-ES");
  await expect(card.locator(".lyceum-stat-card__value")).toHaveText("12.345,5");
  await expect(card.locator(".lyceum-stat-card__delta")).toContainText("que la muestra previa");
  await expect(card.locator(".lyceum-stat-card__value")).toHaveAttribute("data-available", "true");
  await page.goto(story("statcard", "no-data"));
  await expect(page.locator(".lyceum-stat-card__value")).toHaveAttribute("data-available", "false");
  await page.goto(story("masteryring", "unknown"));
  await expect(page.locator(".lyceum-mastery-ring")).toHaveAttribute("data-assessed", "false");
});

test("B5 Spanish chart at actual 200%-root text and 320px preserves complete unit words", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(story("barchart", "localized-spanish-double-text"));
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "200%");
  const chart = page.getByRole("figure", { name: "Frecuencias ficticias" });
  const geometry = await chart.evaluate((node) => {
    const list = node.querySelector<HTMLElement>(".lyceum-bar-chart__bars");
    if (!list) throw new Error("Localized chart bars missing");
    return [...list.querySelectorAll<HTMLElement>(".lyceum-bar-chart__item")].map((item) => {
      const span = item.querySelector<HTMLElement>(".lyceum-bar-chart__datum > span");
      const textNode = [...(span?.childNodes ?? [])].find(
        (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.includes("artículos"),
      );
      if (!textNode?.textContent) throw new Error("Missing consumer-supplied units");
      const start = textNode.textContent.indexOf("artículos");
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, start + "artículos".length);
      return {
        fragments: [...range.getClientRects()].filter((rect) => rect.width > 0).length,
        width: item.getBoundingClientRect().width,
        container: list.getBoundingClientRect().width,
      };
    });
  });
  expect(geometry).toHaveLength(3);
  for (const item of geometry) {
    expect(item.fragments, JSON.stringify(item)).toBe(1);
    expect(item.width, JSON.stringify(item)).toBeGreaterThanOrEqual(item.container - 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  await expect(chart).toContainText("1,25 artículos");
  await saveEvidence(chart, "bar-es-200-text-narrow.png");
});
