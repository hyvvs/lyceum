import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const story = (variant: string) =>
  `/iframe.html?id=visual-prototypes-m0-005-reference-workspace--${variant}&viewMode=story`;

test("prototype starts honestly empty, never inventing learner progress", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("empty-today"));
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
  await expect(page.getByText("EMPTY STATE · NO LEARNER DATA")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What would you like to learn?" })).toBeVisible();
  await expect(
    page.getByText("Nothing is due. Your space stays quiet until you choose a goal."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore setup" })).toBeVisible();
  await expect(page.getByText("Example plan")).toHaveCount(0);

  await page.getByRole("button", { name: "Synthetic", exact: true }).click();
  await expect(page.getByText("SYNTHETIC FIXTURE · NO LEARNER DATA")).toBeVisible();
  await expect(page.getByText("Example plan")).toBeVisible();
  await page.getByRole("button", { name: "Try a short exercise" }).click();
  await expect(page.getByRole("heading", { name: "Learn by trying." })).toBeVisible();
  await page.getByRole("button", { name: "Open sample reading" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reading" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Give the idea some distance" })).toBeVisible();
  await page.getByRole("button", { name: "Empty", exact: true }).click();
  await expect(page.getByText("EMPTY STATE · NO LEARNER DATA")).toBeVisible();
  await expect(page.getByText("Example plan")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Give the idea some distance" })).toBeVisible();
});

test("phone layout uses real navigation and keeps the canvas inside 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(story("empty-today"));
  const mobile = page.getByRole("navigation", { name: "Compact prototype navigation" });
  await expect(mobile).toBeVisible();
  await mobile.getByRole("button", { name: "Sources" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sources" })).toBeFocused();
  await expect(mobile.getByRole("button", { name: "Sources" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const size = await page.evaluate(() => ({
    width: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.width + 1);
});

test("short 200% text view keeps reading controls reachable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(story("double-text"));
  const size = await page.evaluate(() => ({
    width: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.width + 1);
  const continueButton = page.getByRole("button", { name: "Continue" });
  await continueButton.scrollIntoViewIfNeeded();
  await expect(continueButton).toBeVisible();
  await continueButton.click();
  await expect(page.getByRole("heading", { name: "Give the idea some distance" })).toBeVisible();
});

test("one connected selection morphs through open, successive targets, reverse, and collapse", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("empty-today"));
  const rail = page.getByRole("navigation", { name: "Prototype scenes" });
  await expect(rail).toHaveAttribute("data-expanded", "false");
  const toggle = page.getByRole("button", { name: "Expand navigation" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(rail).toHaveAttribute("data-expanded", "true");
  const connected = page.locator(".morphing-rail__connected");
  await expect
    .poll(async () => Number(await connected.evaluate((node) => getComputedStyle(node).opacity)))
    .toBeGreaterThan(0.98);

  const initialD = await connected.getAttribute("d");
  expect(initialD).toMatch(/^M /);
  expect(initialD).toMatch(/ Z$/);
  expect(initialD?.match(/\bM\b/g)).toHaveLength(1);
  const sources = rail.getByRole("button", { name: "Sources" });
  await sources.click();
  await expect(page.getByRole("heading", { level: 1, name: "Sources" })).toBeFocused();
  await expect(rail).toHaveAttribute("data-active", "sources");
  await expect.poll(async () => await connected.getAttribute("d")).not.toBe(initialD);

  await rail.getByRole("button", { name: "Reading" }).click();
  await rail.getByRole("button", { name: "Today" }).click();
  await expect(rail).toHaveAttribute("data-active", "today");
  await expect
    .poll(async () =>
      Number.parseFloat(
        (
          await rail.evaluate((node) =>
            getComputedStyle(node).getPropertyValue("--morph-width-current"),
          )
        ).trim(),
      ),
    )
    .toBeGreaterThan(260);
  const finalD = await connected.getAttribute("d");
  expect(finalD).not.toMatch(/NaN|Infinity/);
  expect(finalD?.match(/\bM\b/g)).toHaveLength(1);

  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await expect(rail).toHaveAttribute("data-expanded", "false");
  await expect
    .poll(async () => Number(await connected.evaluate((node) => getComputedStyle(node).opacity)))
    .toBeLessThan(0.02);
});

test("off-motion and high-contrast render without a spring or background blur", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(story("motion-off"));
  const rail = page.getByRole("navigation", { name: "Prototype scenes" });
  await page.getByRole("button", { name: "Expand navigation" }).click();
  await expect(rail).toHaveAttribute("data-expanded", "true");
  await expect
    .poll(async () =>
      Number.parseFloat(
        (
          await rail.evaluate((node) =>
            getComputedStyle(node).getPropertyValue("--morph-width-current"),
          )
        ).trim(),
      ),
    )
    .toBe(264);
  await page.goto(story("high-contrast"));
  const backdrop = page.locator(".morphing-rail__backdrop");
  await expect
    .poll(async () => backdrop.evaluate((node) => getComputedStyle(node).backdropFilter))
    .toBe("none");
  await expect(page.getByText("SYNTHETIC FIXTURE · NO LEARNER DATA")).toBeVisible();
});

test("expanded RTL utility spine mirrors to opposite side and does not obscure navigation icons", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("right-to-left"));
  const rail = page.getByRole("navigation", { name: "Prototype scenes" });
  await expect(rail).toHaveAttribute("data-expanded", "true");
  await expect
    .poll(async () => page.locator(".morphing-rail__connected").getAttribute("transform"))
    .toMatch(/^translate\(/);
  const positions = await rail.evaluate((node) => {
    const link = node.querySelector<HTMLButtonElement>('[data-rail-item="sources"]');
    const utility = node.querySelector<HTMLDivElement>(".morphing-rail__utilities");
    if (!link || !utility) throw new Error("Incomplete RTL navigation surface");
    const icon = link.querySelector(".morphing-rail__icon");
    if (!icon) throw new Error("Missing RTL icon");
    const linkBox = icon.getBoundingClientRect();
    const utilityBox = utility.getBoundingClientRect();
    const navBox = node.getBoundingClientRect();
    return {
      direction: getComputedStyle(node).direction,
      iconX: linkBox.left + linkBox.width / 2,
      utilityX: utilityBox.left + utilityBox.width / 2,
      expectedSpineCenter: navBox.left + 24,
      separation: Math.abs(
        linkBox.left + linkBox.width / 2 - utilityBox.left - utilityBox.width / 2,
      ),
    };
  });
  expect(positions.direction).toBe("rtl");
  expect(positions.utilityX).toBeLessThan(positions.iconX);
  expect(Math.abs(positions.utilityX - positions.expectedSpineCenter)).toBeLessThan(8);
  expect(positions.separation).toBeGreaterThan(80);
  await expect(rail.getByRole("button", { name: "Sources" })).toBeVisible();
});

test("named navigation and empty state have no serious or critical axe findings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("empty-today"));
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});
