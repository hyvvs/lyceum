import { expect, test } from "@playwright/test";
import { scanStoryA11y } from "./axe";

test("WCAG 2.5.3 detects a visible-label / accessible-name mismatch", async ({ page }) => {
  await page.setContent('<button type="button" aria-label="Delete">Save</button>');
  const results = await scanStoryA11y(page);
  expect(results.violations).toContainEqual(
    expect.objectContaining({ id: "label-content-name-mismatch", impact: "serious" }),
  );
});
