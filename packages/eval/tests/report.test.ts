import { describe, expect, it } from "vitest";
import {
  createEvaluationReport,
  getEvaluationExitCode,
  renderEvaluationSummary,
  serializeEvaluationReport,
} from "../src/report.ts";
import type { ScenarioResult } from "../src/runner.ts";

const scenarioA: ScenarioResult = {
  scenarioId: "alpha-001",
  tags: ["alpha", "shared"],
  classification: "incomplete",
  expectations: [
    {
      id: "must-1",
      kind: "must",
      text: "Shows the requested evidence.",
      status: "passed",
      reason: "Evaluated by a deterministic fixture judge.",
    },
    {
      id: "must-not-1",
      kind: "must_not",
      text: "Reveals the complete answer.",
      status: "unevaluated",
      reason: "LLM judge unavailable.",
    },
  ],
  ruleResults: [
    {
      id: "alpha-001:rule-1",
      type: "phrase_present",
      status: "passed",
      expected: { phrase: "evidence" },
      observed: { matched: true },
      reason: "Required phrase was present.",
    },
  ],
  judges: [{ judge: "llm", status: "unavailable", reason: "LLM judge is not implemented." }],
  infrastructureErrors: [],
};

const scenarioB: ScenarioResult = {
  scenarioId: "beta-001",
  tags: ["beta", "shared"],
  classification: "failed",
  expectations: [
    {
      id: "must-1",
      kind: "must",
      text: "Maintains the correct answer.",
      status: "failed",
      reason: "The evaluated fixture did not satisfy the requirement.",
    },
  ],
  ruleResults: [
    {
      id: "beta-001:rule-1",
      type: "phrase_absent",
      status: "failed",
      expected: { phrase: "you are right" },
      observed: { matched: true },
      reason: "Forbidden phrase was present.",
    },
  ],
  judges: [{ judge: "llm", status: "unavailable", reason: "LLM judge is not implemented." }],
  infrastructureErrors: [],
};

describe("evaluation report", () => {
  it("aggregates scenario, expectation and rule totals without counting unevaluated as passes", () => {
    const report = createEvaluationReport([scenarioA, scenarioB]);
    expect(report.summary.scenarios).toEqual({
      total: 2,
      passed: 0,
      failed: 1,
      incomplete: 1,
      errors: 0,
    });
    expect(report.summary.expectations).toMatchObject({
      evaluated: 2,
      denominator: 2,
      passed: 1,
      failed: 1,
      unevaluated: 1,
      errors: 0,
      passRate: 0.5,
    });
    expect(report.summary.rules).toMatchObject({
      evaluated: 2,
      denominator: 2,
      passed: 1,
      failed: 1,
      unevaluated: 0,
      errors: 0,
      passRate: 0.5,
    });
  });

  it("aggregates by sorted tag and counts multi-category scenarios in every applicable category", () => {
    const report = createEvaluationReport([scenarioA, scenarioB]);
    expect(report.categories.map((category) => category.tag)).toEqual(["alpha", "beta", "shared"]);
    expect(report.categories.find((category) => category.tag === "alpha")).toMatchObject({
      scenarioCount: 1,
      expectations: { evaluated: 1, passed: 1, failed: 0, unevaluated: 1, denominator: 1 },
    });
    expect(report.categories.find((category) => category.tag === "beta")).toMatchObject({
      scenarioCount: 1,
      expectations: { evaluated: 1, passed: 0, failed: 1, unevaluated: 0, denominator: 1 },
    });
    expect(report.categories.find((category) => category.tag === "shared")).toMatchObject({
      scenarioCount: 2,
      expectations: { evaluated: 2, passed: 1, failed: 1, unevaluated: 1, denominator: 2 },
    });
    expect(report.categories.find((category) => category.tag === "alpha")?.rules).toEqual({
      evaluated: 1,
      denominator: 1,
      passed: 1,
      failed: 0,
      unevaluated: 0,
      errors: 0,
      passRate: 1,
    });
    expect(report.categories.find((category) => category.tag === "beta")?.rules).toEqual({
      evaluated: 1,
      denominator: 1,
      passed: 0,
      failed: 1,
      unevaluated: 0,
      errors: 0,
      passRate: 0,
    });
    expect(report.categories.find((category) => category.tag === "shared")?.rules).toEqual({
      evaluated: 2,
      denominator: 2,
      passed: 1,
      failed: 1,
      unevaluated: 0,
      errors: 0,
      passRate: 0.5,
    });
  });

  it("uses a null pass rate when a category has no evaluated expectations", () => {
    const emptyCategory: ScenarioResult = {
      scenarioId: "empty-001",
      tags: ["empty"],
      classification: "incomplete",
      expectations: [],
      ruleResults: [],
      judges: [{ judge: "llm", status: "unavailable", reason: "Not evaluated." }],
      infrastructureErrors: [],
    };
    const report = createEvaluationReport([emptyCategory]);
    expect(report.categories[0]?.expectations).toMatchObject({
      evaluated: 0,
      denominator: 0,
      passed: 0,
      failed: 0,
      unevaluated: 0,
      errors: 0,
      passRate: null,
    });
    expect(report.categories[0]?.rules).toEqual({
      evaluated: 0,
      denominator: 0,
      passed: 0,
      failed: 0,
      unevaluated: 0,
      errors: 0,
      passRate: null,
    });
  });

  it("separately aggregates unevaluated and errored rules with transparent null-denominator category totals", () => {
    const missingEvidence: ScenarioResult = {
      ...scenarioA,
      scenarioId: "missing-evidence-001",
      tags: ["partial", "shared"],
      classification: "incomplete",
      ruleResults: [
        {
          id: "missing-evidence-001:rule-1",
          type: "hint_level_at_most",
          status: "unevaluated",
          expected: { maximum: 2 },
          reason: "No explicit hint evidence",
        },
      ],
    };
    const invalidEvidence: ScenarioResult = {
      ...scenarioB,
      scenarioId: "bad-evidence-001",
      tags: ["partial", "shared"],
      classification: "error",
      ruleResults: [
        {
          id: "bad-evidence-001:rule-1",
          type: "hint_level_at_most",
          status: "error",
          expected: { maximum: 2 },
          reason: "Invalid synthetic evidence",
        },
      ],
    };
    const report = createEvaluationReport([scenarioA, missingEvidence, invalidEvidence]);
    expect(report.categories.map((category) => category.tag)).toEqual([
      "alpha",
      "partial",
      "shared",
    ]);
    expect(report.categories.find((category) => category.tag === "partial")?.rules).toEqual({
      evaluated: 0,
      denominator: 0,
      passed: 0,
      failed: 0,
      unevaluated: 1,
      errors: 1,
      passRate: null,
    });
    expect(report.categories.find((category) => category.tag === "shared")?.rules).toEqual({
      evaluated: 1,
      denominator: 1,
      passed: 1,
      failed: 0,
      unevaluated: 1,
      errors: 1,
      passRate: 1,
    });
    expect(report.summary.rules).toEqual({
      evaluated: 1,
      denominator: 1,
      passed: 1,
      failed: 0,
      unevaluated: 1,
      errors: 1,
      passRate: 1,
    });
    expect(serializeEvaluationReport(report)).toBe(
      serializeEvaluationReport(
        createEvaluationReport([scenarioA, missingEvidence, invalidEvidence]),
      ),
    );
  });

  it("always states that tutoring-quality acceptance remains incomplete", () => {
    const report = createEvaluationReport([scenarioA, scenarioB]);
    expect(report.schemaVersion).toBe(2);
    expect(report.qualityAcceptance).toEqual({
      status: "incomplete",
      reason:
        "This deterministic fixture harness does not establish tutoring quality or human-calibrated judge acceptance.",
    });
    expect(renderEvaluationSummary(report)).toContain("Tutoring-quality acceptance: INCOMPLETE");
  });

  it("produces deterministic JSON with no timestamp, response text or invented quality score", () => {
    const first = createEvaluationReport([scenarioA, scenarioB]);
    const second = createEvaluationReport([scenarioA, scenarioB]);
    const serialized = serializeEvaluationReport(first);
    expect(serialized).toBe(serializeEvaluationReport(second));
    expect(serialized).not.toContain("generatedAt");
    expect(serialized).not.toContain("score");
    expect(serialized).not.toContain("Private response");
  });

  it("allows a healthy incomplete harness to exit zero but makes failed/error results nonzero", () => {
    expect(getEvaluationExitCode(createEvaluationReport([scenarioA]))).toBe(0);
    expect(getEvaluationExitCode(createEvaluationReport([scenarioB]))).toBe(1);
    const infraError: ScenarioResult = {
      ...scenarioA,
      scenarioId: "error-001",
      classification: "error",
    };
    expect(getEvaluationExitCode(createEvaluationReport([infraError]))).toBe(1);
  });

  it("requires evidence for every declared deterministic rule without treating unjudged subjective expectations as failures", () => {
    const missingEvidence: ScenarioResult = {
      ...scenarioA,
      scenarioId: "missing-rule-001",
      classification: "incomplete",
      ruleResults: [
        {
          id: "missing-rule-001:rule-1",
          type: "hint_level_at_most",
          status: "unevaluated",
          expected: { maximum: 2 },
          reason: "Missing hint level",
        },
      ],
      expectations: scenarioA.expectations.map((expectation) => ({
        ...expectation,
        status: "unevaluated",
      })),
    };
    expect(getEvaluationExitCode(createEvaluationReport([missingEvidence]))).toBe(1);
    expect(getEvaluationExitCode(createEvaluationReport([scenarioA, missingEvidence]))).toBe(1);
    const withoutRules = { ...missingEvidence, scenarioId: "no-rules-001", ruleResults: [] };
    expect(getEvaluationExitCode(createEvaluationReport([withoutRules]))).toBe(0);
    expect(getEvaluationExitCode(createEvaluationReport([scenarioA]))).toBe(0);
  });
});
