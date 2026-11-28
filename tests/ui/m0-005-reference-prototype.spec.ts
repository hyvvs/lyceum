import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

const story = (variant: string) =>
  `/iframe.html?id=visual-prototypes-m0-005-reference-workspace--${variant}&viewMode=story`;

// Storybook's own accessibility addon may still be finishing an axe pass
// when our independently tagged, fail-closed Playwright scan starts. Axe
// prohibits two simultaneous runs in one frame. A narrowly bounded retry
// waits for that engine mutex; no WCAG tags are removed, no violations are
// filtered, and a persistent busy state still fails the test.
async function analyzeTaggedAxe(page: Page, name: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
    } catch (error) {
      if (!String(error).includes("Axe is already running") || attempt === 3) throw error;
      console.warn(`REFERENCE_AXE_BUSY_RETRY ${name} attempt=${attempt + 1}`);
      await page.waitForTimeout(250 * (attempt + 1));
    }
  }
  throw new Error(`Tagged axe scan did not return results for ${name}`);
}

test("prototype starts honestly empty, never inventing learner progress", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("empty-today"));
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toHaveCount(1);
  await expect(page.getByText("No goal yet. Create one to get a plan.")).toBeVisible();
  await expect(page.getByText("No mastery measurements have been recorded.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore setup" })).toBeVisible();
  await expect(page.getByText("Demo data")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Synthetic", exact: true })).toHaveCount(0);
  await expect(page.locator(".rp-today")).toHaveCount(0);

  await page.keyboard.press("Control+Shift+D");
  await expect(page.getByRole("region", { name: "Developer controls" })).toBeVisible();
  await expect(page.getByText("EMPTY STATE · NO LEARNER DATA")).toBeVisible();
  await page.getByRole("button", { name: "Synthetic", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Developer controls" })).toHaveCount(0);
  await expect(page.getByText("Demo data")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mastery by topic" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today's plan" })).toBeVisible();
  await expect(page.locator(".rp-fidelity-stat")).toHaveCount(4);
  await page.getByRole("button", { name: "Month" }).click();
  await expect(page.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Substitution practice/ }).click();
  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reading" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Give the idea some distance" })).toBeVisible();
  await page.keyboard.press("Control+Shift+D");
  await page.getByRole("button", { name: "Empty", exact: true }).click();
  await expect(page.getByText("Demo data")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Give the idea some distance" })).toBeVisible();
});

test("an unsaved learning-goal draft carries into Setup and clears on Reset", async ({ page }) => {
  await page.goto(story("empty-today"));
  const draft = page.getByRole("textbox", { name: "Your learning goal" });
  await expect(draft).toBeVisible();
  await draft.fill("Understand tidal forces");
  await page.getByRole("button", { name: "Explore setup" }).click();
  await expect(page.getByText("Unsaved goal draft:")).toBeVisible();
  await expect(page.getByText("Understand tidal forces")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Prototype scenes" })
    .getByRole("button", { name: "Today" })
    .click();
  await expect(draft).toHaveValue("Understand tidal forces");
  await page.keyboard.press("Control+Shift+D");
  await page.getByRole("button", { name: "Reset prototype" }).click();
  await expect(draft).toHaveValue("");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Your learning goal" })).toHaveValue("");
});

test("developer shortcut restores focus and demo disclosure remains visible on phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(story("synthetic-today"));
  await expect(page.getByText("Demo data")).toBeVisible();
  await expect(page.getByRole("button", { name: "Synthetic", exact: true })).toHaveCount(0);
  const search = page.getByRole("button", { name: "Search workspace" });
  await search.focus();
  await page.keyboard.press("Control+Shift+D");
  await expect(page.getByRole("region", { name: "Developer controls" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Empty", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Developer controls" })).toHaveCount(0);
  await expect(search).toBeFocused();
  await expect(page.getByText("Demo data")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("combined light theme and solid transparency keeps dashboard panels opaque", async ({
  page,
}) => {
  await page.goto(story("light-solid"));
  const styles = await page
    .locator(".rp-fidelity-glass")
    .first()
    .evaluate((element) => {
      const computed = getComputedStyle(element);
      return { background: computed.backgroundColor, blur: computed.backdropFilter };
    });
  expect(styles.background).toBe("rgb(245, 248, 252)");
  expect(styles.blur).toBe("none");
  const inputBorder = await page
    .getByRole("textbox", { name: "Your learning goal" })
    .evaluate((element) => getComputedStyle(element).borderTopColor);
  expect(inputBorder).not.toBe("rgb(255, 255, 255)");
});

test("compact dock tooltip is dismissible and Plan navigates to the actual plan", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(story("synthetic-today"));
  const dock = page.getByRole("navigation", { name: "Prototype scenes" });
  const sources = dock.getByRole("button", { name: "Sources" });
  await sources.hover();
  await expect
    .poll(() => sources.evaluate((element) => getComputedStyle(element, "::after").content))
    .toContain("Sources");
  await page.keyboard.press("Escape");
  await expect
    .poll(() => sources.evaluate((element) => getComputedStyle(element, "::after").content))
    .toBe("none");
  await page
    .getByRole("navigation", { name: "Main sections" })
    .getByRole("button", { name: "Sources" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Sources" })).toBeFocused();
  await page
    .getByRole("navigation", { name: "Main sections" })
    .getByRole("button", { name: "Plan" })
    .click();
  await expect(page.getByRole("heading", { name: "Today's plan" })).toBeFocused();
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

test("phone's last plan action can scroll clear of the fixed navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(story("empty-today"));
  await expect(page.getByRole("button", { name: "Explore setup" })).toBeVisible();
  await expect
    .poll(() => page.locator(".rp-scene").evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeGreaterThan(0.999);
  await page.evaluate(() => window.scrollTo(0, document.scrollingElement?.scrollHeight ?? 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const positions = await page.evaluate(() => {
    const last = document.querySelector(".rp-fidelity-plan-empty button");
    const dock = document.querySelector(".rp-mobile-navigation");
    if (!last || !dock) throw new Error("Phone plan action or dock missing");
    return {
      lastBottom: last.getBoundingClientRect().bottom,
      dockTop: dock.getBoundingClientRect().top,
      viewportHeight: window.innerHeight,
    };
  });
  expect(positions.lastBottom).toBeLessThanOrEqual(positions.dockTop - 4);
  expect(positions.dockTop).toBeLessThan(positions.viewportHeight);
});

test("expanded rail remains separate from the workspace at intermediate desktop widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(story("expanded-rail"));
  await expect(page.locator(".rp-morphing-rail")).toBeVisible();
  await expect(page.locator(".rp-main")).toBeVisible();
  await expect
    .poll(() => page.locator(".rp-scene").evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeGreaterThan(0.999);
  const positions = await page.evaluate(() => {
    const rail = document.querySelector(".rp-morphing-rail");
    const main = document.querySelector(".rp-main");
    if (!rail || !main) throw new Error("Expanded desktop rail or workspace missing");
    return {
      railRight: rail.getBoundingClientRect().right,
      mainLeft: main.getBoundingClientRect().left,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
  expect(positions.railRight).toBeLessThanOrEqual(positions.mainLeft - 4);
  expect(positions.documentWidth).toBeLessThanOrEqual(positions.viewportWidth + 1);
  await expect(page.getByRole("textbox", { name: "Your learning goal" })).toBeVisible();
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
  await page.evaluate(() => window.scrollTo(0, document.scrollingElement?.scrollHeight ?? 0));
  const clearance = await page.evaluate(() => {
    const continueControl = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Continue"),
    );
    const dock = document.querySelector(".rp-mobile-navigation");
    if (!continueControl || !dock) throw new Error("Reading control or phone dock missing");
    return {
      continueBottom: continueControl.getBoundingClientRect().bottom,
      dockTop: dock.getBoundingClientRect().top,
    };
  });
  expect(clearance.continueBottom).toBeLessThan(clearance.dockTop - 4);
  await continueButton.click();
  await expect(page.getByRole("heading", { name: "Give the idea some distance" })).toBeVisible();
});

test("reflection toggle always points at an existing collapsible explanation", async ({ page }) => {
  await page.goto(story("reading-surface"));
  const toggle = page.getByRole("button", { name: "Reflection prompt" });
  const content = page.locator("#rp-reflection-content");
  await expect(toggle).toHaveAttribute("aria-controls", "rp-reflection-content");
  await expect(content).toHaveCount(1);
  await expect(content).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(content).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(content).toHaveCount(1);
  await expect(content).toBeHidden();
});

test("solid and high-contrast phone chrome does not rely on translucent blur", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const variant of ["solid-fallback", "high-contrast"]) {
    await page.goto(story(variant));
    await expect(
      page.getByRole("navigation", { name: "Compact prototype navigation" }),
    ).toBeVisible();
    await page.keyboard.press("Control+Shift+D");
    const styles = await page.evaluate(() => {
      const dock = document.querySelector(".rp-mobile-navigation");
      const switcher = document.querySelector(".rp-data-switch");
      if (!dock || !switcher) throw new Error("Chrome fallback missing");
      return {
        dockBlur: getComputedStyle(dock).backdropFilter,
        switchBlur: getComputedStyle(switcher).backdropFilter,
        dockColor: getComputedStyle(dock).backgroundColor,
        switchColor: getComputedStyle(switcher).backgroundColor,
      };
    });
    expect(styles.dockBlur).toBe("none");
    expect(styles.switchBlur).toBe("none");
    expect(styles.dockColor).toBe("rgb(255, 255, 255)");
    expect(styles.switchColor).toBe("rgb(255, 255, 255)");
  }
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
  await expect(page.getByText("SYNTHETIC FIXTURE · NO LEARNER DATA")).toHaveCount(0);
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
  const copy = await page.locator(".rp-fidelity-dashboard").evaluate((element) => {
    const title = element.querySelector(".rp-fidelity-intro h2");
    const input = element.querySelector("input");
    if (!title || !input) throw new Error("RTL Today content missing");
    return {
      englishCopyBidi: getComputedStyle(title).unicodeBidi,
      englishCopyDirection: getComputedStyle(title).direction,
      titleDirection: title.dir,
      inputDirection: input.dir,
    };
  });
  await expect(page.locator(".rp-today")).toHaveCount(0);
  expect(["plaintext", "isolate"]).toContain(copy.englishCopyBidi);
  expect(copy.englishCopyDirection).toBe("ltr");
  expect(copy.titleDirection).toBe("ltr");
  expect(copy.inputDirection).toBe("auto");
});

test("all thirteen reference workspace variants have no tagged axe violations or horizontal overflow", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const variants = [
    "empty-today",
    "synthetic-today",
    "synthetic-sources",
    "reading-surface",
    "expanded-rail",
    "light-glass",
    "light-solid",
    "solid-fallback",
    "high-contrast",
    "reduced-motion",
    "motion-off",
    "right-to-left",
    "double-text",
  ];
  for (const variant of variants) {
    await page.setViewportSize({ width: variant === "double-text" ? 320 : 1440, height: 900 });
    await page.goto(story(variant));
    await expect(page.locator(".reference-prototype")).toBeVisible();
    // Check the settled presentation. An interrupted entrance is independently
    // covered by the morph/navigation test; axe's contrast algorithm attributes
    // an animated ancestor's partial opacity to the background, not the glyphs.
    await expect
      .poll(() => page.locator(".rp-scene").evaluate((el) => Number(getComputedStyle(el).opacity)))
      .toBeGreaterThan(0.999);
    const results = await analyzeTaggedAxe(page, variant);
    expect(results.violations, `Tagged axe violations in ${variant}`).toEqual([]);
    const horizontal = await page.evaluate(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(horizontal.content, `Horizontal overflow in ${variant}`).toBeLessThanOrEqual(
      horizontal.viewport + 1,
    );
    console.log(
      `REFERENCE_VARIANT_AXE ${variant} violations=0 incomplete=${results.incomplete.map((item) => item.id).join(",") || "none"}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(story("empty-today"));
  await expect(
    page.getByRole("navigation", { name: "Compact prototype navigation" }),
  ).toBeVisible();
  await expect
    .poll(() => page.locator(".rp-scene").evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeGreaterThan(0.999);
  const mobileResult = await analyzeTaggedAxe(page, "mobile-390");
  expect(mobileResult.violations, "Tagged axe violations in 390px mobile").toEqual([]);
});
