import { expect, test } from "@playwright/test";

const sceneUrl = (name: string) =>
  `/iframe.html?id=visual-compositions-m0-017-v5-slice-a--${name}&viewMode=story`;

type DockIntersection = {
  text: string;
  kind: "line" | "control";
  overlapX: number;
  overlapY: number;
};

/** Check rendered text *lines*, not an enclosing card box or a footer eventually in view. */
async function measureDockOverlap(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const dock = document.querySelector<HTMLElement>(".v5-dock");
    if (!dock) throw new Error("Missing mobile dock");
    const bar = dock.getBoundingClientRect();
    const inside = document.querySelector<HTMLElement>(".v5-scene");
    if (!inside) throw new Error("Missing visual composition");
    const elements = inside.querySelectorAll<HTMLElement>(
      "h1, h2, h3, p, .v5-label, .v5-status, .v5-topic__kind, .v5-topic__foot, .v5-section-heading__tag, .v5-library__heading > span, a, button",
    );
    const collisions: DockIntersection[] = [];
    const testedLines: Array<{ text: string; top: number; bottom: number }> = [];
    const testRect = (rect: DOMRect, text: string, kind: DockIntersection["kind"]) => {
      // Only rendered content in the visible viewport can be obscured by the capsule.
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.bottom <= 0 ||
        rect.top >= innerHeight ||
        rect.right <= 0 ||
        rect.left >= innerWidth
      )
        return;
      const overlapX =
        Math.min(rect.right, bar.right, innerWidth) - Math.max(rect.left, bar.left, 0);
      const overlapY =
        Math.min(rect.bottom, bar.bottom, innerHeight) - Math.max(rect.top, bar.top, 0);
      if (kind === "line") testedLines.push({ text, top: rect.top, bottom: rect.bottom });
      if (overlapX > 0 && overlapY > 0) {
        collisions.push({ text, kind, overlapX, overlapY });
      }
    };
    for (const element of elements) {
      if (element.closest(".v5-dock")) continue;
      if (getComputedStyle(element).display === "none") continue;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let textNode: Node | null = walker.nextNode();
      while (textNode) {
        const text = textNode.textContent?.trim();
        if (text) {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of range.getClientRects()) testRect(rect, text, "line");
        }
        textNode = walker.nextNode();
      }
      if (element.matches("a, button")) {
        testRect(
          element.getBoundingClientRect(),
          element.textContent?.trim() || "control",
          "control",
        );
      }
    }
    return {
      scrollY,
      dock: { top: bar.top, bottom: bar.bottom, left: bar.left, right: bar.right },
      visibleLines: testedLines.length,
      collisions,
    };
  });
}

test("390px normal glass dock never masks visible reading lines or controls during actual wheel scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(sceneUrl("dark-full"));
  await expect(page.getByRole("navigation", { name: "Visual-only dock" })).toBeVisible();
  const samples: Array<{ stage: string; result: Awaited<ReturnType<typeof measureDockOverlap>> }> =
    [];
  const sample = async (stage: string) => {
    const result = await measureDockOverlap(page);
    samples.push({ stage, result });
    if (process.env.LYCEUM_CAPTURE_V5 === "1" && stage === "initial") {
      await page.screenshot({
        path: "docs/qa/m0-017-slice-a/mobile-dark-full-390x844.png",
        animations: "disabled",
      });
    }
    if (process.env.LYCEUM_CAPTURE_V5 === "1" && stage === "wheel-240") {
      await page.screenshot({
        path: "docs/qa/m0-017-slice-a/mobile-dark-full-mid-scroll-390x844.png",
        animations: "disabled",
      });
    }
  };
  await sample("initial");
  for (const distance of [120, 120, 160, 160, 180]) {
    const previous = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, distance);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(previous);
    await sample(`wheel-${Math.round(await page.evaluate(() => window.scrollY))}`);
  }
  // The CTA must be readable when reached in the actual scroll, not only at the footer.
  const featureCta = page.getByRole("link", { name: /Explore the visual library/ });
  await featureCta.scrollIntoViewIfNeeded();
  await expect(featureCta).toBeInViewport();
  await sample("feature-cta");
  console.info(`V5_DOCK_LINE_OVERLAP ${JSON.stringify(samples)}`);
  const all = samples.flatMap(({ stage, result }) =>
    result.collisions.map((collision) => ({ stage, ...collision })),
  );
  for (const { stage, result } of samples) {
    expect(result.visibleLines, `${stage} must include actual visible text lines`).toBeGreaterThan(
      0,
    );
  }
  expect(
    all,
    "Floating capsule must not cover rendered text or controls at any sampled scroll position",
  ).toEqual([]);
});

test("390px dock is keyboard reachable in natural order, with no masked feature CTA", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(sceneUrl("dark-full"));
  const overview = page.getByRole("link", { name: "Overview preview" });
  const library = page.getByRole("link", { name: "Library preview" });
  const featureCta = page.getByRole("link", { name: /Explore the visual library/ });
  // Follow the browser's own Tab order from initial load (no forced focus).
  let tabsToDock = 0;
  while (!(await overview.evaluate((node) => node === document.activeElement)) && tabsToDock < 6) {
    await page.keyboard.press("Tab");
    tabsToDock++;
  }
  console.info(`V5_NATURAL_TAB_TO_DOCK ${tabsToDock}`);
  expect(tabsToDock).toBeGreaterThanOrEqual(2);
  expect(tabsToDock).toBeLessThanOrEqual(5);
  await expect(overview).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(library).toBeFocused();
  for (let index = 0; index < 3; index++) await page.keyboard.press("Tab");
  await expect(featureCta).toBeFocused();
  await expect(featureCta).toBeInViewport();
  if (process.env.LYCEUM_CAPTURE_V5 === "1") {
    await page.screenshot({
      path: "docs/qa/m0-017-slice-a/mobile-dark-full-cta-focus-390x844.png",
      animations: "disabled",
    });
  }
  const result = await measureDockOverlap(page);
  expect(
    result.collisions,
    "Natural Tab to CTA must not put action or reading line under dock",
  ).toEqual([]);
  await page.keyboard.press("Shift+Tab");
  const privacy = page.getByRole("link", { name: "Privacy preview" });
  await expect(privacy).toBeFocused();
  await expect(privacy).toBeInViewport();
  expect(await privacy.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#scene-privacy$/);
  await expect(privacy).toHaveAttribute("aria-current", "location");
});

test("390px opaque, high contrast and RTL retain unobstructed reading; large and short text remain safe", async ({
  page,
}) => {
  const modes = [
    { name: "opaque", width: 390, height: 844 },
    { name: "high-contrast", width: 390, height: 844 },
    { name: "rtl", width: 390, height: 844 },
    { name: "double-text", width: 390, height: 844 },
    { name: "double-text", width: 320, height: 256 },
  ] as const;
  for (const mode of modes) {
    await page.setViewportSize({ width: mode.width, height: mode.height });
    await page.goto(sceneUrl(mode.name));
    const dock = page.getByRole("navigation", { name: "Visual-only dock" });
    await expect(dock.getByRole("link")).toHaveCount(4);
    for (const stage of ["initial", "wheel"]) {
      if (stage === "wheel") {
        const previous = await page.evaluate(() => window.scrollY);
        await page.mouse.wheel(0, 240);
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(previous);
      }
      const result = await measureDockOverlap(page);
      expect(result.collisions, `${mode.name} ${mode.width}x${mode.height} ${stage}`).toEqual([]);
      expect(result.visibleLines, `${mode.name} ${stage} must show text`).toBeGreaterThan(0);
      if (process.env.LYCEUM_CAPTURE_V5 === "1") {
        if (mode.name === "opaque" && stage === "wheel") {
          await page.screenshot({
            path: "docs/qa/m0-017-slice-a/mobile-opaque-mid-scroll-390x844.png",
            animations: "disabled",
          });
        }
        if (mode.name === "high-contrast" && stage === "initial") {
          await page.screenshot({
            path: "docs/qa/m0-017-slice-a/mobile-high-contrast-390x844.png",
            animations: "disabled",
          });
        }
        if (mode.name === "rtl" && stage === "initial") {
          await page.screenshot({
            path: "docs/qa/m0-017-slice-a/mobile-rtl-390x844.png",
            animations: "disabled",
          });
        }
      }
    }
    // A dock that starts below the fold at 200% or 320x256 must still be
    // visible and free of collisions once it is reached, not merely at page load.
    await dock.scrollIntoViewIfNeeded();
    await expect(dock).toBeInViewport();
    const atDock = await measureDockOverlap(page);
    expect(atDock.visibleLines, `${mode.name} ${mode.width} dock-visible text`).toBeGreaterThan(0);
    expect(atDock.collisions, `${mode.name} ${mode.width} dock-visible overlap`).toEqual([]);
    if (
      process.env.LYCEUM_CAPTURE_V5 === "1" &&
      mode.name === "double-text" &&
      mode.width === 320
    ) {
      await page.screenshot({
        path: "docs/qa/m0-017-slice-a/short-200-text-dock-320x256.png",
        animations: "disabled",
      });
    }
    // Start again and follow natural keyboard order at each theme/scale/RTL.
    await page.goto(sceneUrl(mode.name));
    const overview = page.getByRole("link", { name: "Overview preview" });
    let tabs = 0;
    while (!(await overview.evaluate((node) => node === document.activeElement)) && tabs < 6) {
      await page.keyboard.press("Tab");
      tabs++;
    }
    expect(
      tabs,
      `${mode.name} ${mode.width} native Tab route to navigation`,
    ).toBeGreaterThanOrEqual(2);
    expect(tabs, `${mode.name} ${mode.width} native Tab route to navigation`).toBeLessThanOrEqual(
      5,
    );
    for (const name of ["Overview preview", "Library preview"]) {
      const link = dock.getByRole("link", { name });
      await expect(link).toBeFocused();
      await expect(link).toBeInViewport();
      const rect = await link.boundingBox();
      if (!rect) throw new Error(`Missing ${name} target rectangle in ${mode.name}`);
      expect(rect.y, `${mode.name} ${name} top`).toBeGreaterThanOrEqual(0);
      expect(rect.y + rect.height, `${mode.name} ${name} bottom`).toBeLessThanOrEqual(mode.height);
      expect(rect.width, `${mode.name} ${name} width`).toBeGreaterThanOrEqual(44);
      expect(rect.height, `${mode.name} ${name} height`).toBeGreaterThanOrEqual(44);
      expect(await link.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
      await page.keyboard.press("Tab");
    }
    await page.keyboard.press("Shift+Tab");
    await expect(dock.getByRole("link", { name: "Library preview" })).toBeFocused();
  }
});
