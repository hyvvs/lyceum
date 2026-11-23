import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { generatedPrimitiveStories } from "./story-inventory";
import { assertExecutedStoryStates, expectedStoryStates } from "./story-scan-coverage";

/** Global coverage proof: a missing family test fails even if that test file is deleted. */
export default class StoryCoverageReporter implements Reporter {
  private readonly checks: string[] = [];

  onTestEnd(_test: TestCase, result: TestResult): void {
    if (result.status !== "passed") return;
    const output = result.stdout.map((chunk) => String(chunk)).join("");
    for (const line of output.split(/\r?\n/)) {
      if (line.includes("AXE_STORY_CHECKED ")) this.checks.push(line);
    }
  }

  onEnd(_result: FullResult): { status: "failed" } | undefined {
    // Listing test metadata must not masquerade as a completed acceptance run.
    if (process.argv.includes("--list")) return;
    try {
      const stories = generatedPrimitiveStories();
      assertExecutedStoryStates(stories, this.checks);
      console.info(
        `AXE_COVERAGE_VERIFIED unique_stories=${stories.length} required_states=${expectedStoryStates(stories).length} executed_states=${this.checks.length}`,
      );
    } catch (error) {
      console.error(`AXE_COVERAGE_FAILED: ${String(error)}`);
      return { status: "failed" };
    }
  }
}
