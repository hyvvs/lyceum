import { expect, test } from "@playwright/test";

test.skip(process.env.LYCEUM_B3_CAPTURE !== "1", "B3 screenshot capture is opt-in");
const base = "docs/qa/m0-017-stage-b3";

test("capture actual Storybook PillNav and Dock visual/accessibility state matrix", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 620 });
  for (const [id, filename] of [
    ["primitives-pillnav--light", "storybook-pill-light"],
    ["primitives-pillnav--dark-full", "storybook-pill-dark"],
    ["primitives-pillnav--high-contrast", "storybook-pill-high-contrast"],
    ["primitives-pillnav--double-text", "storybook-pill-200-text"],
    ["primitives-dock--vertical", "storybook-dock-vertical"],
    ["primitives-dock--horizontal", "storybook-dock-horizontal"],
    ["primitives-dock--opaque", "storybook-dock-opaque"],
    ["primitives-dock--rtl", "storybook-dock-rtl"],
    ["primitives-dock--reduced-motion", "storybook-dock-reduced-motion"],
  ] as const) {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await expect(page.getByRole("navigation")).toBeVisible();
    await page.screenshot({ path: `${base}/${filename}.png`, animations: "disabled" });
  }
  await page.goto("/iframe.html?id=primitives-dock--focus&viewMode=story");
  await page
    .getByRole("navigation", { name: "Quick navigation" })
    .getByRole("link", {
      name: "Today",
    })
    .focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.screenshot({
    path: `${base}/storybook-dock-keyboard-tooltip.png`,
    animations: "disabled",
  });
});
