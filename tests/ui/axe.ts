import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/** Run our own WCAG scan even when Storybook's addon starts an overlapping axe scan. */
export async function scanStoryA11y(page: Page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
    } catch (error) {
      if (!String(error).includes("Axe is already running") || attempt === 4) throw error;
      await page.waitForTimeout((attempt + 1) * 250);
    }
  }
  throw new Error("Axe scan retries exhausted");
}
