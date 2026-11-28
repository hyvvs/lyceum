import type { PrimitiveStory } from "./story-inventory";

/** Actual axe states required for each indexed story, independent of per-family test loops. */
export function expectedStoryStates(stories: readonly PrimitiveStory[]): string[] {
  return stories.flatMap((story) => {
    const name = story.id.split("--")[1];
    if (!name) throw new Error(`Invalid Storybook story ID: ${story.id}`);
    let states: string[];
    switch (story.title) {
      case "Primitives/Button":
      case "Primitives/Tabs":
      case "Primitives/VisuallyHidden":
      case "Primitives/GlassPanel":
      case "Primitives/GlassCard":
      case "Primitives/TintCard":
      case "Primitives/PillNav":
      case "Primitives/RoundIconButton":
      case "Primitives/SegmentedControl":
      case "Primitives/StatCard":
      case "Primitives/BarChart":
      case "Primitives/MasteryRing":
      case "Primitives/ChatBubble":
      case "Primitives/Avatar":
      case "Primitives/Chip":
      case "Primitives/EmptyStateCard":
      case "Primitives/Input":
      case "Primitives/ListRow":
      case "Primitives/SkeletonLoader":
        states = [name];
        break;
      case "Primitives/Popover":
        states =
          name === "disabled" || name === "loading" ? ["closed"] : ["popover-open", "closed"];
        break;
      case "Primitives/Dock":
        // Empty, disabled, loading and error fixtures intentionally contain
        // no operable link. They still receive full axe scans as-is.
        states = [
          ["empty", "disabled", "loading", "error-state"].includes(name) ? name : "tooltip-open",
        ];
        break;
      case "Primitives/Dialog":
        states = [name === "disabled" ? "disabled" : "dialog-open"];
        break;
      case "Primitives/Tooltip":
        states = [name === "disabled" ? "disabled" : "tooltip-open"];
        break;
      case "Primitives/Select":
        states =
          name === "disabled"
            ? ["closed"]
            : name === "dialog-integration"
              ? ["dialog-open", "select-open"]
              : ["closed", "select-open"];
        break;
      case "Primitives/Toast":
        states =
          name === "dialog-select-integration"
            ? ["dialog-select-open", "saved-toast-visible"]
            : [name];
        break;
      default:
        throw new Error(`No axe state acceptance contract for ${story.title}`);
    }
    return states.map((state) => `${story.id}:${state}`);
  });
}

/** Called by the Playwright reporter, using only successful axe scan output. */
export function assertExecutedStoryStates(
  stories: readonly PrimitiveStory[],
  checkedLines: readonly string[],
): void {
  const expected = new Set(expectedStoryStates(stories));
  const seen = new Set<string>();
  for (const line of checkedLines) {
    const match =
      /AXE_STORY_CHECKED\s+([^\s]+)\s+state=([^\s]+)\s+rules=\d+\s+violations=0\s+incomplete=/.exec(
        line,
      );
    if (!match) throw new Error(`Unrecognized axe scan evidence: ${line}`);
    seen.add(`${match[1]}:${match[2]}`);
  }
  const missing = [...expected].filter((key) => !seen.has(key));
  const unexpected = [...seen].filter((key) => !expected.has(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Full-suite axe execution coverage failed; missing ${missing.length}: ${missing.slice(0, 12).join(", ") || "none"}; unexpected ${unexpected.length}: ${unexpected.slice(0, 12).join(", ") || "none"}`,
    );
  }
}
