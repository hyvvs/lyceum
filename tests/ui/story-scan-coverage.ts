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
        states = [name];
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
