import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const route = (scene: "overview" | "controls" | "feedback") =>
  `/iframe.html?id=visual-prototypes-m0-ui-fidelity-shared--${scene}&viewMode=story`;

test("shared chart and ring use one polished optical language with accessible data labels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route("overview"));
  await expect(page.getByRole("heading", { name: "Learning overview" })).toBeVisible();
  const chart = page.getByRole("figure", { name: "Mastery by topic" });
  await expect(chart.locator('[data-highlighted="true"]')).toHaveCount(1);
  const paired = await chart
    .locator(".lyceum-bar-chart__datum")
    .first()
    .evaluate((p) => {
      const label = p.querySelector("strong")?.getBoundingClientRect();
      const value = p.querySelector("span")?.getBoundingClientRect();
      return { labelY: label?.top, valueY: value?.top };
    });
  expect(Math.abs((paired.labelY ?? 0) - (paired.valueY ?? 0))).toBeLessThan(4);
  await expect(chart.locator(".lyceum-bar-chart__scale")).toHaveCSS("clip-path", "inset(50%)");
  await expect(chart.locator(".lyceum-bar-chart__highlight")).toHaveCSS("clip-path", "inset(50%)");
  await expect(chart.locator(".lyceum-bar-chart__bar").first()).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await page.goto(route("feedback"));
  const ring = page.getByRole("figure", { name: "Chain rule" });
  await expect(ring).toBeVisible();
  const arcs = await ring.locator("svg circle").evaluateAll((circles) =>
    circles.map((node) => ({
      cx: node.getAttribute("cx"),
      cy: node.getAttribute("cy"),
      cap: getComputedStyle(node).strokeLinecap,
    })),
  );
  expect(new Set(arcs.map((a) => `${a.cx}:${a.cy}`)).size).toBe(1);
  expect(arcs.slice(1).every((a) => a.cap === "round")).toBe(true);
  await expect(ring.locator(".lyceum-mastery-ring__progress")).toHaveCSS("filter", /drop-shadow/);
});

test("real shared controls change state and never display internal scaffolding", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route("overview"));
  await page.getByRole("radio", { name: "Month" }).check();
  await expect(page.getByRole("button", { name: /Review the monthly plan/ })).toBeVisible();
  await page.getByRole("button", { name: /Learn a new concept/ }).click();
  await expect(page.getByText("Selected: Learn a new concept")).toBeVisible();
  await page.getByRole("button", { name: "Confirm review" }).click();
  await expect(page.getByText("Review selected: Learn a new concept")).toBeVisible();
  await page.goto(route("controls"));
  await page.getByRole("textbox", { name: "Learning goal" }).fill("Understand chain rule");
  await page.getByRole("button", { name: "Apply preferences" }).click();
  await expect(page.getByText("Preferences updated for this workspace.")).toBeVisible();
  await page.getByRole("button", { name: "About preferences" }).click();
  await expect(page.getByText("Changes disappear on reload.")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Toggle bookmark" }).click();
  await expect(page.getByText("Bookmarked", { exact: true })).toBeVisible();
  await page.goto(route("feedback"));
  await page.getByRole("button", { name: "Finish loading" }).click();
  await expect(page.getByText("Review ready.")).toBeVisible();
  await page.getByRole("button", { name: "Add notes" }).click();
  await expect(page.getByText("Chain rule notes added").first()).toBeVisible();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByRole("button", { name: "Review details" }).click();
  await expect(page.getByRole("dialog", { name: "Review integration rules" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Review integration rules" })).toHaveCount(0);
  expect(errors).toEqual([]);
  for (const scene of ["overview", "controls", "feedback"] as const) {
    await page.goto(route(scene));
    const visibleText = await page.locator(".shared-gallery").evaluate((container) => {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const fragments: string[] = [];
      while (walker.nextNode()) {
        const element = walker.currentNode.parentElement;
        if (
          !element ||
          element.closest(
            '.lyceum-bar-chart__scale, .lyceum-bar-chart__highlight, [aria-hidden="true"]',
          )
        )
          continue;
        if (
          getComputedStyle(element).display === "none" ||
          getComputedStyle(element).visibility === "hidden"
        )
          continue;
        fragments.push(walker.currentNode.textContent ?? "");
      }
      return fragments.join(" ");
    });
    expect(visibleText).not.toMatch(
      /\b(sample|qa|preview|fixture|gallery|shared components|highlighted)\b|Scale: 0[–-]100\s*%/i,
    );
    expect((visibleText.match(/Demo data/g) ?? []).length).toBe(1);
  }
});

test("shared controls remain accessible on opaque high-contrast and mobile stages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route("controls"));
  await page.evaluate(() => {
    document.documentElement.dataset.transparency = "off";
    document.documentElement.dataset.contrast = "high";
    document.documentElement.dataset.motion = "off";
  });
  await expect(page.getByRole("textbox", { name: "Learning goal" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    audit.violations,
    JSON.stringify(
      audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ),
  ).toEqual([]);
});
