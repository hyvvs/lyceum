import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("B4 actual Today uses approved shared surfaces with native named sections and articles", async ({
  page,
}) => {
  await page.goto("/");
  const hero = page.locator(".today-screen > section.hero");
  const setup = page.locator(".today-screen .content-grid > section.setup-card");
  const sources = page.locator(
    ".today-screen article.mini-card[aria-labelledby='library-heading']",
  );
  const session = page.locator(
    ".today-screen article.mini-card[aria-labelledby='session-heading']",
  );
  const worker = page.locator(".today-screen > section.worker-card");

  await expect(hero).toHaveClass(/lyceum-glass-panel/);
  await expect(hero).toHaveClass(/glass-reading/);
  await expect(hero).toHaveAttribute("aria-labelledby", "welcome-heading");
  await expect(setup).toHaveClass(/lyceum-glass-panel/);
  await expect(setup).toHaveClass(/glass-raised/);
  await expect(setup).toHaveAttribute("aria-labelledby", "setup-title");
  for (const card of [sources, session]) {
    await expect(card).toHaveClass(/lyceum-glass-card/);
  }
  // Check *exclusive* approved surface recipes, not a regex that could
  // accidentally accept both standard and raised on the same article.
  const recipes = await page
    .locator(
      ".today-screen .hero,.today-screen .setup-card,.today-screen .mini-card,.today-screen .worker-card",
    )
    .evaluateAll((items) =>
      items.map((item) =>
        ["glass", "glass-raised", "glass-float", "glass-reading", "glass-tint"].filter((recipe) =>
          item.classList.contains(recipe),
        ),
      ),
    );
  expect(recipes).toEqual([
    ["glass-reading"],
    ["glass-raised"],
    ["glass-raised"],
    ["glass"],
    ["glass-reading"],
  ]);
  await expect(worker).toHaveClass(/lyceum-glass-panel/);
  await expect(worker).toHaveClass(/glass-reading/);
  await expect(worker).toHaveAttribute("aria-labelledby", "worker-heading");
  await expect(page.locator(".today-screen .lyceum-tint-card")).toHaveCount(0);
  await expect(page.locator(".today-screen .lyceum-glass-panel")).toHaveCount(3);
  await expect(page.locator(".today-screen .lyceum-glass-card")).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator(".today-screen h2")).toHaveCount(4);

  const semantics = await page.locator(".today-screen [aria-labelledby]").evaluateAll((elements) =>
    elements.map((element) => ({
      tag: element.tagName,
      heading: element.getAttribute("aria-labelledby"),
      actualHeading: document.getElementById(element.getAttribute("aria-labelledby") ?? "")
        ?.textContent,
    })),
  );
  expect(semantics).toHaveLength(5);
  expect(semantics.map((entry) => entry.tag)).toEqual([
    "SECTION",
    "SECTION",
    "ARTICLE",
    "ARTICLE",
    "SECTION",
  ]);
  expect(semantics.every((entry) => !!entry.actualHeading?.trim())).toBe(true);
});

test("B4 truthful production Today keeps all empty content, one CTA and real Worker actions", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "A clear place to begin." })).toBeVisible();
  await expect(
    page.getByText("No learning goal or sessions are configured", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".setup-list li")).toHaveCount(2);
  await expect(page.locator(".step-status").first()).toHaveText("Not started");
  await expect(page.locator(".step-status").last()).toHaveText("Coming later");
  await expect(page.getByRole("link", { name: "Personalize your space" })).toHaveCount(1);
  await expect(page.locator(".today-screen .primary-action")).toHaveCount(1);
  await expect(page.getByTestId("worker-status")).toBeVisible();
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByTestId("worker-status")).toHaveText("Worker transport connected");
  await page.getByRole("button", { name: "Test cancellation" }).click();
  await expect(page.getByTestId("worker-status")).toHaveText("Cancellation acknowledged");
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByTestId("worker-status")).toHaveText("Worker transport connected");
  await page.getByRole("link", { name: "Personalize your space" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Make this space yours." }),
  ).toBeVisible();
});

test("B4 reading surfaces use shared readable recipes with no nested or excessive blur", async ({
  page,
}) => {
  for (const scenario of [
    { theme: "dark", transparency: "full" },
    { theme: "dark", transparency: "reduced" },
    { theme: "dark", transparency: "off" },
    { theme: "high-contrast", transparency: "off" },
  ] as const) {
    await page.goto("/");
    await page.evaluate(({ transparency, theme }) => {
      localStorage.setItem(
        "lyceum.web.preferences.v1",
        JSON.stringify({
          theme,
          transparency,
          locale: "en",
        }),
      );
    }, scenario);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-transparency", scenario.transparency);
    const surfaces = await page
      .locator(".today-screen .lyceum-glass-panel, .today-screen .lyceum-glass-card")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const computed = getComputedStyle(element);
          const descendants = Array.from(element.querySelectorAll<HTMLElement>("*"));
          return {
            tag: element.tagName,
            className: element.className,
            background: computed.backgroundColor,
            blur: computed.backdropFilter,
            nestedBlur: descendants.some(
              (child) => getComputedStyle(child).backdropFilter !== "none",
            ),
            nestedSurface: descendants.some((child) =>
              child.matches(".glass,.glass-raised,.glass-float,.glass-reading,.glass-tint"),
            ),
          };
        }),
      );
    expect(surfaces).toHaveLength(5);
    expect(surfaces.every((surface) => !surface.nestedBlur && !surface.nestedSurface)).toBe(true);
    const reading = surfaces.filter((surface) => surface.className.includes("glass-reading"));
    expect(reading).toHaveLength(2);
    for (const item of reading) {
      const alphaMatch = item.background.match(/rgba?\([^)]*[, ]\s*(0\.\d+)\)$/);
      const alpha = alphaMatch ? Number(alphaMatch[1]) : 1;
      expect(alpha, JSON.stringify(item)).toBeGreaterThanOrEqual(0.82);
      if (scenario.transparency !== "full") expect(item.blur).toBe("none");
    }
    // Count the *whole rendered viewport*, including the shell's real Dock
    // and primary nav; measuring only exactly five Today surfaces would be
    // tautological and could miss an expensive new nested/header blur.
    const viewportBlur = await page.evaluate(() => {
      const visible = Array.from(document.body.querySelectorAll<HTMLElement>("*")).filter(
        (element) => {
          const rect = element.getBoundingClientRect();
          const styles = getComputedStyle(element);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.right > 0 &&
            rect.left < innerWidth &&
            rect.top < innerHeight &&
            rect.bottom > 0 &&
            styles.display !== "none" &&
            styles.visibility === "visible" &&
            styles.backdropFilter !== "none"
          );
        },
      );
      return visible.map((element) => ({
        className: element.className,
        nested: !!element.parentElement?.closest(
          ".glass,.glass-raised,.glass-float,.glass-reading,.glass-tint",
        ),
      }));
    });
    expect(
      viewportBlur.every((surface) => !surface.nested),
      JSON.stringify(viewportBlur),
    ).toBe(true);
    expect(viewportBlur.length, JSON.stringify(viewportBlur)).toBeLessThanOrEqual(6);
    if (scenario.transparency !== "full") {
      expect(viewportBlur, JSON.stringify(viewportBlur)).toEqual([]);
    }
  }
});

test("B4 responsive Today retains horizontal containment, real reading and native navigation", async ({
  page,
}) => {
  test.slow();
  for (const scenario of [
    { width: 1440, height: 900, root: 16, dir: "ltr", mode: "reserved" },
    { width: 390, height: 844, root: 16, dir: "rtl", mode: "reserved" },
    { width: 320, height: 640, root: 16, dir: "ltr", mode: "reserved" },
    { width: 320, height: 640, root: 32, dir: "ltr", mode: "flow" },
    { width: 320, height: 256, root: 32, dir: "rtl", mode: "flow" },
  ] as const) {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.goto("/");
    await page.evaluate(({ root, dir }) => {
      document.documentElement.style.fontSize = `${root}px`;
      document.documentElement.dir = dir;
    }, scenario);
    if (scenario.width <= 900) {
      await expect(page.locator(".application")).toHaveAttribute(
        "data-navigation-mode",
        scenario.mode,
      );
    }
    const report = await page.evaluate(() => {
      const items = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".today-screen .hero,.today-screen .setup-card,.today-screen .mini-card,.today-screen .worker-card",
        ),
      );
      const action = document.querySelector<HTMLElement>(".today-screen .primary-action");
      return {
        viewport: window.innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        surfaces: items.map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            width: rect.width,
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
            decorativeOverflowClipped: ["hidden", "clip"].includes(
              getComputedStyle(node).overflowX,
            ),
            meaningfulContent: Array.from(
              node.querySelectorAll<HTMLElement>("h1,h2,p,li,a,button,output"),
            ).map((item) => {
              const content = item.getBoundingClientRect();
              return { left: content.left, right: content.right };
            }),
          };
        }),
        actionableWidth: action?.getBoundingClientRect().width ?? 0,
      };
    });
    expect(report.surfaces).toHaveLength(5);
    expect(report.pageWidth, JSON.stringify({ scenario, report })).toBeLessThanOrEqual(
      report.viewport + 1,
    );
    for (const surface of report.surfaces) {
      expect(surface.left, JSON.stringify({ scenario, surface })).toBeGreaterThanOrEqual(-1);
      expect(surface.right, JSON.stringify({ scenario, surface })).toBeLessThanOrEqual(
        scenario.width + 1,
      );
      // The hero intentionally clips an orbit that extends behind the panel.
      // Enforce document containment, every real text/control rectangle, and
      // un-clipped panel scrollWidth without mistaking hidden art for content.
      if (!surface.decorativeOverflowClipped) {
        expect(surface.scrollWidth, JSON.stringify({ scenario, surface })).toBeLessThanOrEqual(
          surface.clientWidth + 2,
        );
      }
      for (const content of surface.meaningfulContent) {
        expect(content.left, JSON.stringify({ scenario, content })).toBeGreaterThanOrEqual(
          surface.left - 1,
        );
        expect(content.right, JSON.stringify({ scenario, content })).toBeLessThanOrEqual(
          surface.right + 1,
        );
      }
    }
    expect(report.actionableWidth).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Personalize your space" })).toBeAttached();
  }
});

test("B4 shared Today screens retain real localized RTL and automated accessibility gates", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.locator("#language").selectOption("es");
  await page
    .getByRole("navigation", { name: "Navegación rápida" })
    .getByRole("link", { name: "Hoy" })
    .click();
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
  });
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".today-screen .lyceum-glass-panel")).toHaveCount(3);
  await expect(page.locator(".today-screen .lyceum-glass-card")).toHaveCount(2);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations, JSON.stringify(axe.violations.map((item) => item.id))).toEqual([]);
});
