import { createRequire } from "node:module";
import { type Page, expect } from "@playwright/test";
import { WCAG_AA_TAGS, scanStoryA11y } from "./axe";
import type { PrimitiveStory } from "./story-inventory";

const nodeRequire = createRequire(import.meta.url);
const axeRequire = createRequire(nodeRequire.resolve("@axe-core/playwright"));
const axeCore = axeRequire("axe-core") as {
  getRules: () => { ruleId: string; tags: string[] }[];
};
export const ACTIVE_WCAG_RULE_IDS = axeCore
  .getRules()
  .filter(
    (rule) =>
      rule.tags.some((tag) => WCAG_AA_TAGS.includes(tag)) &&
      !rule.tags.includes("experimental") &&
      !rule.tags.includes("deprecated"),
  )
  .map((rule) => rule.ruleId)
  .sort();

if (ACTIVE_WCAG_RULE_IDS.length === 0) throw new Error("No axe WCAG A/AA rules enabled.");

/** Scan a real generated Storybook ID, verifying no rule was silently left out. */
export async function scanIndexedStory(
  page: Page,
  story: PrimitiveStory,
  state: string,
): Promise<string> {
  const result = await scanStoryA11y(page);
  const enabledRuleIds = [
    ...new Set(
      [...result.passes, ...result.violations, ...result.incomplete, ...result.inapplicable].map(
        (rule) => rule.id,
      ),
    ),
  ].sort();
  expect(enabledRuleIds, `enabled axe rules for ${story.id} (${state})`).toEqual(
    ACTIVE_WCAG_RULE_IDS,
  );
  expect(result.violations, `axe violations for ${story.id} (${state})`).toEqual([]);
  console.info(
    `AXE_STORY_CHECKED ${story.id} state=${state} rules=${enabledRuleIds.length} violations=0 incomplete=${result.incomplete.map((rule) => rule.id).join(",") || "none"}`,
  );
  return story.id;
}

export function storySlug(story: PrimitiveStory): string {
  const slug = story.id.split("--")[1];
  if (!slug) throw new Error(`Invalid generated Storybook story id ${story.id}`);
  return slug;
}
