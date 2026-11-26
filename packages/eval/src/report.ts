import type { ExpectationResult } from "./judge.ts";
import type { RuleResult } from "./rules.ts";
import type { ScenarioResult } from "./runner.ts";

export interface ResultCounts {
  readonly evaluated: number;
  readonly denominator: number;
  readonly passed: number;
  readonly failed: number;
  readonly unevaluated: number;
  readonly errors: number;
  readonly passRate: number | null;
}

export interface ScenarioCounts {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly incomplete: number;
  readonly errors: number;
}

export interface CategoryReport {
  readonly tag: string;
  readonly scenarioCount: number;
  readonly expectations: ResultCounts;
}

export interface EvaluationReport {
  readonly schemaVersion: 1;
  readonly summary: {
    readonly scenarios: ScenarioCounts;
    readonly expectations: ResultCounts;
    readonly rules: ResultCounts;
  };
  readonly qualityAcceptance: {
    readonly status: "incomplete";
    readonly reason: string;
  };
  readonly categories: readonly CategoryReport[];
  readonly scenarios: readonly ScenarioResult[];
}

const QUALITY_LIMITATION =
  "This deterministic fixture harness does not establish tutoring quality or human-calibrated judge acceptance.";

const countResults = (results: readonly (ExpectationResult | RuleResult)[]): ResultCounts => {
  const passed = results.filter((item) => item.status === "passed").length;
  const failed = results.filter((item) => item.status === "failed").length;
  const unevaluated = results.filter((item) => item.status === "unevaluated").length;
  const errors = results.filter((item) => item.status === "error").length;
  const evaluated = passed + failed;
  return {
    evaluated,
    denominator: evaluated,
    passed,
    failed,
    unevaluated,
    errors,
    passRate: evaluated === 0 ? null : passed / evaluated,
  };
};

export function createEvaluationReport(scenarios: readonly ScenarioResult[]): EvaluationReport {
  const expectationResults = scenarios.flatMap((scenario) => scenario.expectations);
  const ruleResults = scenarios.flatMap((scenario) => scenario.ruleResults);
  const scenarioCounts: ScenarioCounts = {
    total: scenarios.length,
    passed: scenarios.filter((scenario) => scenario.classification === "passed").length,
    failed: scenarios.filter((scenario) => scenario.classification === "failed").length,
    incomplete: scenarios.filter((scenario) => scenario.classification === "incomplete").length,
    errors: scenarios.filter((scenario) => scenario.classification === "error").length,
  };

  const categoryMap = new Map<
    string,
    { scenarioIds: Set<string>; expectations: ExpectationResult[] }
  >();
  for (const scenario of scenarios) {
    for (const tag of new Set(scenario.tags)) {
      let category = categoryMap.get(tag);
      if (!category) {
        category = { scenarioIds: new Set<string>(), expectations: [] };
        categoryMap.set(tag, category);
      }
      category.scenarioIds.add(scenario.scenarioId);
      category.expectations.push(...scenario.expectations);
    }
  }

  const categories = [...categoryMap.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([tag, category]) => ({
      tag,
      scenarioCount: category.scenarioIds.size,
      expectations: countResults(category.expectations),
    }));

  return {
    schemaVersion: 1,
    summary: {
      scenarios: scenarioCounts,
      expectations: countResults(expectationResults),
      rules: countResults(ruleResults),
    },
    qualityAcceptance: { status: "incomplete", reason: QUALITY_LIMITATION },
    categories,
    scenarios: scenarios.map((scenario) => ({
      scenarioId: scenario.scenarioId,
      tags: [...scenario.tags],
      classification: scenario.classification,
      expectations: scenario.expectations.map(({ id, kind, text, status, reason }) => ({
        id,
        kind,
        text,
        status,
        reason,
      })),
      ruleResults: scenario.ruleResults.map(({ id, type, status, expected, observed, reason }) => ({
        id,
        type,
        status,
        expected: { ...expected },
        ...(observed ? { observed: { ...observed } } : {}),
        reason,
      })),
      judges: scenario.judges.map(({ judge, status, reason }) => ({ judge, status, reason })),
      infrastructureErrors: [...scenario.infrastructureErrors],
    })),
  };
}

export function serializeEvaluationReport(report: EvaluationReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderEvaluationSummary(report: EvaluationReport): string {
  const { scenarios, expectations, rules } = report.summary;
  return [
    "M0-010 deterministic evaluation harness (scripted fixtures only)",
    `Scenarios: ${scenarios.total} total (${scenarios.passed} passed, ${scenarios.failed} failed, ${scenarios.incomplete} incomplete, ${scenarios.errors} errors)`,
    `Expectations: ${expectations.evaluated} evaluated / ${expectations.denominator} denominator (${expectations.passed} passed, ${expectations.failed} failed, ${expectations.unevaluated} unevaluated, ${expectations.errors} errors)`,
    `Rules: ${rules.evaluated} evaluated / ${rules.denominator} denominator (${rules.passed} passed, ${rules.failed} failed, ${rules.unevaluated} unevaluated, ${rules.errors} errors)`,
    `Tutoring-quality acceptance: INCOMPLETE — ${report.qualityAcceptance.reason}`,
  ].join("\n");
}

/** Incomplete subjective expectations do not fail a healthy deterministic harness. */
export function getEvaluationExitCode(report: EvaluationReport): 0 | 1 {
  return report.summary.scenarios.failed > 0 ||
    report.summary.scenarios.errors > 0 ||
    report.summary.expectations.failed > 0 ||
    report.summary.expectations.errors > 0 ||
    report.summary.rules.failed > 0 ||
    report.summary.rules.errors > 0
    ? 1
    : 0;
}
