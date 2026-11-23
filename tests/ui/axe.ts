import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/** All A/AA WCAG level tags supported by the installed axe-core 4.14.1 rules. */
export const WCAG_AA_TAGS: readonly string[] = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

/** Run our own WCAG scan even when Storybook's addon starts an overlapping axe scan. */
export async function scanStoryA11y(page: Page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await new AxeBuilder({ page }).withTags([...WCAG_AA_TAGS]).analyze();
    } catch (error) {
      if (!String(error).includes("Axe is already running") || attempt === 4) throw error;
      await page.waitForTimeout((attempt + 1) * 250);
    }
  }
  throw new Error("Axe scan retries exhausted");
}
