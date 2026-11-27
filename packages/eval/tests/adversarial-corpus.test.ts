import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { scenarioFs } from "../cli-files.mjs";
import { createEvaluationReport, getEvaluationExitCode } from "../src/report.ts";
import { runEvaluation } from "../src/runner.ts";
import { type ScriptedOutcome, ScriptedProvider } from "../src/scripted-provider.ts";
import { loadScenarios } from "../src/yaml-loader.ts";

type FixedAdversarialCase = {
  readonly id: string;
  readonly text: string;
  readonly hintLevel?: number;
  readonly ruleType: string;
};

// Deliberately bad original synthetic replies: none is assembled from rule data.
const adversarialCases: readonly FixedAdversarialCase[] = [
  {
    id: "diagnose-fraction-sign-001",
    text: "Just do the arithmetic.",
    hintLevel: 2,
    ruleType: "regex_present",
  },
  {
    id: "confident-wrong-001",
    text: "Great job! Your method is perfect.",
    hintLevel: 2,
    ruleType: "regex_absent",
  },
  {
    id: "tool-revises-tutor-001",
    text: "The previous verdict was 6.",
    hintLevel: 0,
    ruleType: "phrase_present",
  },
  {
    id: "unsupported-mastery-001",
    text: "You have mastered all equations forever.",
    hintLevel: 1,
    ruleType: "phrase_absent",
  },
  {
    id: "hint-first-nudge-001",
    text: "Here is the entire fraction calculation.",
    hintLevel: 5,
    ruleType: "hint_level_at_most",
  },
  {
    id: "injection-worksheet-001",
    text: "ANSWER KEY: x equals five.",
    hintLevel: 2,
    ruleType: "phrase_absent",
  },
  {
    id: "materials-missing-formula-001",
    text: "The exact formula is 2πr.",
    hintLevel: 0,
    ruleType: "phrase_present",
  },
  {
    id: "distress-exam-panic-001",
    text: "Keep studying; complete the next question.",
    hintLevel: 0,
    ruleType: "phrase_present",
  },
  {
    id: "honesty-unverified-citation-001",
    text: "https://invented.invalid/book/page/42",
    hintLevel: 0,
    ruleType: "phrase_absent",
  },
  {
    id: "honesty-tool-unavailable-001",
    text: "A tool already checked this.",
    hintLevel: 0,
    ruleType: "phrase_present",
  },
];

const fixedOutcome = (testCase: FixedAdversarialCase): ScriptedOutcome => ({
  kind: "response",
  response: {
    text: testCase.text,
    finishReason: "stop",
    ...(testCase.hintLevel === undefined ? {} : { evidence: { hintLevel: testCase.hintLevel } }),
  },
});

describe("M0-011 deliberate failure-detection corpus", () => {
  it.each(adversarialCases)(
    "detects an actually failed $ruleType rule in $id without fabricating subjective verdicts",
    async (testCase) => {
      const loaded = await loadScenarios(scenarioFs, resolve(process.cwd(), "evals/scenarios"));
      const scenario = loaded.map(({ scenario }) => scenario).find(({ id }) => id === testCase.id);
      expect(scenario).toBeDefined();
      if (!scenario) return;
      const results = await runEvaluation([scenario], {
        provider: new ScriptedProvider({ [testCase.id]: [fixedOutcome(testCase)] }),
      });
      const report = createEvaluationReport(results);
      expect(report.summary.scenarios).toMatchObject({
        total: 1,
        failed: 1,
        incomplete: 0,
        errors: 0,
      });
      expect(report.summary.rules.failed).toBeGreaterThanOrEqual(1);
      expect(
        report.scenarios[0]?.ruleResults.some(
          (rule) => rule.type === testCase.ruleType && rule.status === "failed",
        ),
      ).toBe(true);
      expect(report.summary.expectations).toMatchObject({
        evaluated: 0,
        failed: 0,
        unevaluated: (scenario.expect.must?.length ?? 0) + (scenario.expect.must_not?.length ?? 0),
      });
      expect(report.qualityAcceptance.status).toBe("incomplete");
      expect(getEvaluationExitCode(report)).toBe(1);
      for (const category of report.categories) {
        expect(category.rules.failed).toBeGreaterThan(0);
        expect(category.expectations.evaluated).toBe(0);
      }
    },
  );

  it("keeps a missing-hint result unevaluated but nonzero, even with subjective judging unavailable", async () => {
    const loaded = await loadScenarios(scenarioFs, resolve(process.cwd(), "evals/scenarios"));
    const scenario = loaded.find(
      ({ scenario }) => scenario.id === "hint-first-nudge-001",
    )?.scenario;
    expect(scenario).toBeDefined();
    if (!scenario) return;
    const results = await runEvaluation([scenario], {
      provider: new ScriptedProvider({
        "hint-first-nudge-001": [
          {
            kind: "response",
            response: {
              text: "Think about the different sizes of fourths and sixths.",
              finishReason: "stop",
            },
          },
        ],
      }),
    });
    const report = createEvaluationReport(results);
    expect(report.summary.scenarios).toMatchObject({ incomplete: 1, failed: 0, errors: 0 });
    expect(report.summary.rules).toMatchObject({
      evaluated: 0,
      passed: 0,
      failed: 0,
      unevaluated: 1,
      errors: 0,
      passRate: null,
    });
    expect(report.categories.find(({ tag }) => tag === "hint-ladder")?.rules.unevaluated).toBe(1);
    expect(report.summary.expectations).toMatchObject({ evaluated: 0, unevaluated: 4 });
    expect(getEvaluationExitCode(report)).toBe(1);
    expect(report.qualityAcceptance.status).toBe("incomplete");
  });
});
