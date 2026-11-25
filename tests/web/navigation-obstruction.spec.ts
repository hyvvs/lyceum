import { expect, test } from "@playwright/test";

// B1 intentionally stays RED on the unmodified fixed mobile Dock. B2 must turn
// these same assertions green without changing the reading fixture or sampler.
const configurations = [
  { name: "mobile-390", width: 390, height: 844, rootSize: 16, direction: "ltr" },
  { name: "short-320", width: 320, height: 256, rootSize: 16, direction: "ltr" },
  { name: "mobile-390-text-200", width: 390, height: 844, rootSize: 32, direction: "ltr" },
  { name: "short-320-text-200", width: 320, height: 256, rootSize: 32, direction: "ltr" },
  { name: "mobile-390-rtl", width: 390, height: 844, rootSize: 16, direction: "rtl" },
] as const;

const paragraphs = [
  "A clear explanation begins by stating what the reader will learn and which prior ideas are useful. The first pass should build a mental map rather than demand a perfect answer.",
  "After reading a section, the learner can pause and explain its central claim in ordinary words. This is a useful check because recognition alone is not the same as understanding.",
  "When an explanation contains several steps, keep their order visible. A reader may need to return to an earlier sentence without losing the place where the next idea begins.",
  "An unfamiliar term deserves a short definition and one concrete example. Neither should crowd out the surrounding reasoning or require the learner to chase a hidden paragraph.",
  "A worked example can show how an idea is applied. The explanation should still leave enough room for the learner to compare the example with the general rule.",
  "Making a small prediction before seeing an answer is one way to discover what is already understood. The result can guide further reading without pretending mastery was measured.",
  "A common misconception should be described fairly. The reader needs to see both why it might seem plausible and which observation shows its limitation.",
  "Longer material benefits from meaningful headings. Each heading gives the reader a location to return to after adjusting the display or using a different input method.",
  "Some readers enlarge text to reduce strain. More lines then wrap onto the screen, but the reading sequence should remain complete and unobstructed.",
  "A short viewport can show only a few lines at once. Every line should be reachable as the reader scrolls, including those that are not links or other focusable elements.",
  "Persistent navigation is useful only when it does not conceal the substance of the page. Visual overlap matters even if the last paragraph can eventually be scrolled into view.",
  "For keyboard use, the next actionable control must follow the reading sequence. A reader should not have to guess whether the link is hidden behind another interface surface.",
  "When direction changes, the relationships among headings, paragraphs and navigation remain meaningful. The visible reading area still has to protect its text.",
  "A concise summary can reconnect the earlier steps. It should remain readable in the middle of the document, not merely at the first and final scroll positions.",
  "The last section prepares a transition to the next task. Reaching its final sentence and the following action is necessary, but does not alone prove that intermediate lines were clear.",
];

async function waitForScrollToSettle(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const frame = document.querySelector<HTMLElement>(".application-frame");
    const owner =
      frame &&
      /(auto|scroll)/.test(getComputedStyle(frame).overflowY) &&
      frame.scrollHeight > frame.clientHeight
        ? frame
        : document.scrollingElement;
    if (!owner) throw new Error("B1 actual reading scroll owner missing");
    let previous = owner.scrollTop;
    let stableFrames = 0;
    for (let frame = 0; frame < 80; frame++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const current = owner.scrollTop;
      stableFrames = Math.abs(current - previous) < 0.5 ? stableFrames + 1 : 0;
      previous = current;
      if (stableFrames >= 4) return;
    }
    throw new Error("B1 scroll did not settle after 80 animation frames");
  });
}

async function sampleReading(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const fixture = document.querySelector<HTMLElement>("[data-b1-reading-fixture]");
    const dock = document.querySelector<HTMLElement>(".icon-dock");
    if (!fixture || !dock) throw new Error("B1 fixture or actual production Dock not found");

    type Rectangle = { left: number; top: number; right: number; bottom: number };
    const rect = (value: Rectangle) => ({
      left: value.left,
      top: value.top,
      right: value.right,
      bottom: value.bottom,
    });
    const clip = (a: Rectangle, b: Rectangle): Rectangle => ({
      left: Math.max(a.left, b.left),
      top: Math.max(a.top, b.top),
      right: Math.min(a.right, b.right),
      bottom: Math.min(a.bottom, b.bottom),
    });
    const area = (r: Rectangle) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
    const viewport = {
      left: window.visualViewport?.offsetLeft ?? 0,
      top: window.visualViewport?.offsetTop ?? 0,
      right:
        (window.visualViewport?.offsetLeft ?? 0) + (window.visualViewport?.width ?? innerWidth),
      bottom:
        (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? innerHeight),
    };
    const dockBounds = clip(rect(dock.getBoundingClientRect()), viewport);
    const frame = document.querySelector<HTMLElement>(".application-frame");
    const reservedScroll =
      frame &&
      /(auto|scroll)/.test(getComputedStyle(frame).overflowY) &&
      frame.scrollHeight > frame.clientHeight;
    const owner = reservedScroll ? frame : document.scrollingElement;
    if (!owner) throw new Error("B1 actual reading scroll owner missing");
    const fallback =
      document.querySelector(".application")?.getAttribute("data-navigation-mode") === "flow";
    if (area(dockBounds) <= 0 && !fallback) {
      throw new Error("Production Dock disappeared without independently active in-flow fallback");
    }
    if (fallback && (getComputedStyle(dock).position === "fixed" || dock.offsetParent === null)) {
      throw new Error("In-flow fallback Dock is fixed or inaccessible");
    }

    function visibleBounds(node: Element, bounds: Rectangle): Rectangle {
      let visible = clip(bounds, viewport);
      for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (/(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)) {
          visible = clip(visible, rect(ancestor.getBoundingClientRect()));
        }
      }
      return visible;
    }

    const obscured: Array<{
      kind: string;
      text: string;
      overlapWidth: number;
      overlapHeight: number;
      top: number;
    }> = [];
    let visibleLines = 0;
    let visibleControls = 0;
    for (const element of fixture.querySelectorAll<HTMLElement>("h2, h3, p")) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode;
        if (!text.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(text);
        for (const line of Array.from(range.getClientRects())) {
          const visible = visibleBounds(element, rect(line));
          if (area(visible) <= 1) continue;
          visibleLines++;
          const overlap = clip(visible, dockBounds);
          if (area(overlap) > 1) {
            obscured.push({
              kind: "text-line",
              text: text.textContent.trim().slice(0, 58),
              overlapWidth: Number((overlap.right - overlap.left).toFixed(2)),
              overlapHeight: Number((overlap.bottom - overlap.top).toFixed(2)),
              top: Number(visible.top.toFixed(2)),
            });
          }
        }
      }
    }
    for (const control of fixture.querySelectorAll<HTMLElement>(
      "a[href], button, input, select, textarea",
    )) {
      const visible = visibleBounds(control, rect(control.getBoundingClientRect()));
      if (area(visible) <= 1) continue;
      visibleControls++;
      const overlap = clip(visible, dockBounds);
      if (area(overlap) > 1) {
        obscured.push({
          kind: "control",
          text: control.textContent?.trim().slice(0, 58) ?? control.tagName,
          overlapWidth: Number((overlap.right - overlap.left).toFixed(2)),
          overlapHeight: Number((overlap.bottom - overlap.top).toFixed(2)),
          top: Number(visible.top.toFixed(2)),
        });
      }
    }
    const finalParagraph = fixture.querySelector<HTMLElement>("[data-b1-final-paragraph]");
    const action = fixture.querySelector<HTMLElement>("[data-b1-action]");
    if (!finalParagraph || !action) throw new Error("B1 final content missing");
    return {
      scrollY: Number(owner.scrollTop.toFixed(2)),
      scrollOwner: reservedScroll ? "frame" : "document",
      maxScrollY: Number((owner.scrollHeight - owner.clientHeight).toFixed(2)),
      viewport: { width: innerWidth, height: innerHeight },
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      direction: getComputedStyle(document.documentElement).direction,
      dock: dockBounds,
      dockVisible: area(dockBounds) > 1,
      fallback,
      visibleLines,
      visibleControls,
      finalParagraphVisible:
        area(visibleBounds(finalParagraph, rect(finalParagraph.getBoundingClientRect()))) > 1,
      actionVisible: area(visibleBounds(action, rect(action.getBoundingClientRect()))) > 1,
      obscured,
    };
  });
}

for (const config of configurations) {
  test(`B1 unfocused reading stays clear of production Dock: ${config.name}`, async ({ page }) => {
    await page.setViewportSize({ width: config.width, height: config.height });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "A clear place to begin." })).toBeVisible();
    await page.evaluate(
      ({ content, fontSize, direction }) => {
        document.documentElement.style.fontSize = `${fontSize}px`;
        document.documentElement.dir = direction;
        const main = document.getElementById("main-content");
        const screen = main?.querySelector(".screen");
        if (!main || !screen) throw new Error("Real Today main/reading surface missing");
        const fixture = document.createElement("article");
        fixture.className = "glass-reading";
        fixture.dataset.b1ReadingFixture = "test-only-no-learner-data";
        fixture.style.padding = "var(--space-5)";
        fixture.style.marginBlock = "var(--space-5)";
        const heading = document.createElement("h2");
        heading.textContent = "B1 test-only extended reading: no learner data";
        fixture.append(heading);
        for (const [index, prose] of content.entries()) {
          if (index === 7) {
            const subheading = document.createElement("h3");
            subheading.textContent = "Continuing a long explanation";
            fixture.append(subheading);
          }
          const paragraph = document.createElement("p");
          paragraph.textContent = prose;
          if (index === content.length - 1) paragraph.dataset.b1FinalParagraph = "true";
          fixture.append(paragraph);
        }
        const action = document.createElement("a");
        action.href = "/settings";
        action.className = "secondary-action";
        action.dataset.b1Action = "true";
        action.textContent = "Review settings after reading";
        fixture.append(action);
        screen.append(fixture);
      },
      { content: paragraphs, fontSize: config.rootSize, direction: config.direction },
    );

    const samples: Awaited<ReturnType<typeof sampleReading>>[] = [];
    const capture = process.env.LYCEUM_B2_CAPTURE === "1";
    if (capture && config.name === "mobile-390") {
      await page.screenshot({ path: "docs/qa/m0-017-stage-b2/mobile-initial.png" });
    }
    let evidenceSaved = false;
    let lastScroll = -1;
    let finalParagraphReached = false;
    let actionReached = false;
    const wheelPoint = await page.evaluate(() => {
      const frame = document.querySelector<HTMLElement>(".application-frame");
      const scrollingFrame = frame && /(auto|scroll)/.test(getComputedStyle(frame).overflowY);
      const target = scrollingFrame ? frame : document.querySelector("main");
      if (!target) throw new Error("B1 reading wheel target absent");
      const bounds = target.getBoundingClientRect();
      return {
        x: Math.min(innerWidth - 12, Math.max(12, bounds.left + bounds.width / 2)),
        y: Math.min(
          innerHeight - 12,
          Math.max(12, bounds.top + Math.min(bounds.height, innerHeight) / 2),
        ),
      };
    });
    await page.mouse.move(wheelPoint.x, wheelPoint.y);
    for (let step = 0; step < 120; step++) {
      const observation = await sampleReading(page);
      finalParagraphReached ||= observation.finalParagraphVisible;
      actionReached ||= observation.actionVisible;
      if (observation.visibleLines > 0) {
        samples.push(observation);
        if (capture && samples.length === 3) {
          await page.screenshot({
            path: `docs/qa/m0-017-stage-b2/${config.name}-reading.png`,
          });
        }
        if (
          !evidenceSaved &&
          observation.obscured.some(
            (hit) =>
              hit.kind === "text-line" && !hit.text.startsWith("B1 test-only extended reading"),
          )
        ) {
          await page.screenshot({ path: `docs/qa/m0-017-stage-b-b1/${config.name}-overlap.png` });
          evidenceSaved = true;
        }
      }
      if (finalParagraphReached && actionReached && observation.actionVisible) break;
      if (observation.scrollY === lastScroll) {
        throw new Error(
          `B1 scrolling stalled before final reading content: ${config.name}; final paragraph reached=${finalParagraphReached}, action reached=${actionReached}, scrollY=${observation.scrollY}`,
        );
      }
      lastScroll = observation.scrollY;
      await page.mouse.wheel(0, Math.max(120, Math.round(config.height * 0.48)));
      await waitForScrollToSettle(page);
    }

    // Genuine Tab navigation after the primary unfocused wheel-reading sample.
    let reachedAction = false;
    for (let tab = 0; tab < 50; tab++) {
      await page.keyboard.press("Tab");
      if (
        await page
          .locator("[data-b1-action]")
          .evaluate((action) => action === document.activeElement)
      ) {
        reachedAction = true;
        break;
      }
    }
    expect(reachedAction, "Natural Tab traversal must reach the final action").toBe(true);
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("[data-b1-action]")).not.toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("[data-b1-action]")).toBeFocused();
    if (samples[0]?.fallback) {
      const nav = page.getByRole("navigation", { name: "Quick navigation" });
      await page.keyboard.press("Tab");
      await expect(nav.getByRole("link", { name: "Today" })).toBeFocused();
      await expect(nav).toBeInViewport();
      await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
      if (capture) {
        await page.screenshot({
          path: `docs/qa/m0-017-stage-b2/${config.name}-in-flow-navigation.png`,
        });
      }
    }

    const overlapping = samples.flatMap((sample) =>
      sample.obscured.map((hit) => ({ scrollY: sample.scrollY, ...hit })),
    );
    console.log(
      `B1_MEASUREMENTS ${JSON.stringify({
        configuration: config.name,
        baseline: "PR #20 merged production baseline; exact SHA in B1/B2 QA evidence",
        first: samples[0]
          ? {
              scrollY: samples[0].scrollY,
              visibleLines: samples[0].visibleLines,
              rootFontSize: samples[0].rootFontSize,
              direction: samples[0].direction,
              viewport: samples[0].viewport,
              dock: samples[0].dock,
              scrollOwner: samples[0].scrollOwner,
              fallback: samples[0].fallback,
              dockVisible: samples[0].dockVisible,
            }
          : null,
        last: samples.at(-1)
          ? { scrollY: samples.at(-1)?.scrollY, visibleLines: samples.at(-1)?.visibleLines }
          : null,
        samples: samples.length,
        scrollPositionsWithOverlap: samples
          .filter((sample) => sample.obscured.length > 0)
          .map((sample) => sample.scrollY),
        totalObscuredRectangles: overlapping.length,
        overlapping: overlapping.slice(0, 8),
        screenshot: evidenceSaved ? `docs/qa/m0-017-stage-b-b1/${config.name}-overlap.png` : null,
      })}`,
    );
    expect(
      samples.length,
      "Must sample meaningful reading content at multiple scroll positions",
    ).toBeGreaterThan(2);
    expect(samples.every((sample) => sample.visibleLines > 0)).toBe(true);
    expect(samples[0]?.rootFontSize).toBe(`${config.rootSize}px`);
    expect(samples[0]?.direction).toBe(config.direction);
    expect(finalParagraphReached).toBe(true);
    expect(actionReached).toBe(true);
    expect(
      overlapping,
      "Meaningful visible text lines/controls must not be covered by the Dock",
    ).toEqual([]);
  });
}
