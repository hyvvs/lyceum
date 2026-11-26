import {
  type ExpectationResult,
  type JudgeExpectation,
  type LlmJudge,
  UnavailableLlmJudge,
} from "./judge.ts";
import { type RuleResult, evaluateRule, validateResponseEvidence } from "./rules.ts";
import type { Scenario } from "./scenario-schema.ts";
import {
  type ScriptedCompletion,
  type ScriptedProvider,
  ScriptedProviderError,
} from "./scripted-provider.ts";

export type ScenarioClassification = "passed" | "failed" | "incomplete" | "error";
export type JudgeSummaryStatus = "evaluated" | "unevaluated" | "unavailable" | "error";

export interface JudgeSummary {
  readonly judge: "rule" | "llm";
  readonly status: JudgeSummaryStatus;
  readonly reason: string;
}

export interface ScenarioResult {
  readonly scenarioId: string;
  readonly tags: readonly string[];
  readonly classification: ScenarioClassification;
  readonly expectations: readonly ExpectationResult[];
  readonly ruleResults: readonly RuleResult[];
  readonly judges: readonly JudgeSummary[];
  readonly infrastructureErrors: readonly string[];
}

export interface EvaluationRunnerOptions {
  readonly provider: ScriptedProvider;
  readonly llmJudge?: LlmJudge;
}

const buildExpectations = (scenario: Scenario): JudgeExpectation[] => [
  ...(scenario.expect.must ?? []).map((text, index) => ({
    id: `must-${index + 1}`,
    kind: "must" as const,
    text,
  })),
  ...(scenario.expect.must_not ?? []).map((text, index) => ({
    id: `must-not-${index + 1}`,
    kind: "must_not" as const,
    text,
  })),
];

const classify = (
  expectations: readonly ExpectationResult[],
  rules: readonly RuleResult[],
  judges: readonly JudgeSummary[],
  infrastructureErrors: readonly string[],
): ScenarioClassification => {
  if (
    infrastructureErrors.length > 0 ||
    expectations.some((item) => item.status === "error") ||
    rules.some((item) => item.status === "error") ||
    judges.some((item) => item.status === "error")
  ) {
    return "error";
  }
  if (
    expectations.some((item) => item.status === "failed") ||
    rules.some((item) => item.status === "failed")
  ) {
    return "failed";
  }
  if (
    expectations.some((item) => item.status === "unevaluated") ||
    rules.some((item) => item.status === "unevaluated") ||
    judges.some((item) => item.status === "unavailable" || item.status === "unevaluated")
  ) {
    return "incomplete";
  }
  return "passed";
};

const failedExpectations = (
  expectations: readonly JudgeExpectation[],
  reason: string,
): ExpectationResult[] =>
  expectations.map((expectation) => ({ ...expectation, status: "error", reason }));

const validateJudgeResult = (
  request: readonly JudgeExpectation[],
  result: Awaited<ReturnType<LlmJudge["evaluate"]>>,
): boolean => {
  const plainKeys = (value: unknown, keys: readonly string[]): boolean => {
    if (!isRecord(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return (
      (prototype === Object.prototype || prototype === null) &&
      Object.keys(Object.getOwnPropertyDescriptors(value)).every((key) => keys.includes(key)) &&
      Object.values(Object.getOwnPropertyDescriptors(value)).every((descriptor) =>
        Object.hasOwn(descriptor, "value"),
      )
    );
  };
  if (!plainKeys(result, ["status", "expectations", "reason"])) return false;
  if (!result || !["evaluated", "unavailable", "error"].includes(result.status)) return false;
  if (!Array.isArray(result.expectations) || result.expectations.length !== request.length)
    return false;
  const expectedById = new Map(request.map((expectation) => [expectation.id, expectation]));
  const seen = new Set<string>();
  for (const item of result.expectations) {
    if (!plainKeys(item, ["id", "kind", "text", "status", "reason"])) return false;
    const expected = expectedById.get(item.id);
    if (
      !expected ||
      seen.has(item.id) ||
      item.kind !== expected.kind ||
      item.text !== expected.text ||
      !["passed", "failed", "unevaluated", "error"].includes(item.status) ||
      typeof item.reason !== "string"
    ) {
      return false;
    }
    if (result.status === "unavailable" && item.status !== "unevaluated") return false;
    if (result.status === "error" && item.status !== "error") return false;
    seen.add(item.id);
  }
  return seen.size === request.length && typeof result.reason === "string";
};

const ruleJudgeSummary = (rules: readonly RuleResult[]): JudgeSummary => {
  if (rules.length === 0) {
    return {
      judge: "rule",
      status: "unevaluated",
      reason: "No deterministic rules were declared",
    };
  }
  if (rules.some((rule) => rule.status === "error")) {
    return {
      judge: "rule",
      status: "error",
      reason: "One or more deterministic rules had infrastructure errors",
    };
  }
  if (rules.some((rule) => rule.status === "passed" || rule.status === "failed")) {
    return {
      judge: "rule",
      status: "evaluated",
      reason: "Declared deterministic rules were executed",
    };
  }
  return {
    judge: "rule",
    status: "unevaluated",
    reason: "No deterministic rule had the evidence required to evaluate",
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isValidScriptedCompletion = (value: unknown): value is ScriptedCompletion => {
  try {
    if (!isRecord(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.keys(descriptors).some((key) => !["result", "evidence"].includes(key))) return false;
    const resultDescriptor = descriptors.result;
    const evidenceDescriptor = descriptors.evidence;
    if (!resultDescriptor || !("value" in resultDescriptor)) return false;
    if (evidenceDescriptor && !("value" in evidenceDescriptor)) return false;

    const completion = resultDescriptor.value;
    if (!isRecord(completion)) return false;
    const resultPrototype = Object.getPrototypeOf(completion);
    if (resultPrototype !== Object.prototype && resultPrototype !== null) return false;
    const resultDescriptors = Object.getOwnPropertyDescriptors(completion);
    if (Object.keys(resultDescriptors).some((key) => !["text", "finishReason"].includes(key))) {
      return false;
    }
    const textDescriptor = resultDescriptors.text;
    const finishDescriptor = resultDescriptors.finishReason;
    if (
      !textDescriptor ||
      !("value" in textDescriptor) ||
      !finishDescriptor ||
      !("value" in finishDescriptor)
    ) {
      return false;
    }
    return (
      typeof textDescriptor.value === "string" &&
      typeof finishDescriptor.value === "string" &&
      finishDescriptor.value.trim().length > 0
    );
  } catch {
    return false;
  }
};

const providerFailureResult = (
  scenario: Scenario,
  expectations: readonly JudgeExpectation[],
  error: unknown,
): ScenarioResult => {
  const allowedCodes = [
    "auth",
    "rate_limit",
    "context_length",
    "network",
    "invalid_request",
    "unsupported",
    "provider",
    "aborted",
  ];
  const code =
    error instanceof ScriptedProviderError && allowedCodes.includes(error.code)
      ? error.code
      : "unknown";
  const reason = `Provider operation failed (${code}); scenario expectations were not evaluated`;
  const ruleResults = (scenario.expect.rules ?? []).map((rule, index) =>
    evaluateRule(rule, undefined, undefined, `${scenario.id}:rule-${index + 1}`),
  );
  const expectationResults = failedExpectations(expectations, reason);
  const judgeSummaries: Partial<Record<"rule" | "llm", JudgeSummary>> = {};
  if (scenario.judges.includes("rule")) {
    judgeSummaries.rule = {
      judge: "rule",
      status: "error",
      reason: "Provider failed before rule evaluation",
    };
  }
  if (scenario.judges.includes("llm")) {
    judgeSummaries.llm = {
      judge: "llm",
      status: "error",
      reason: "Provider failed before judge evaluation",
    };
  }
  const judges = scenario.judges.flatMap((judge) =>
    judgeSummaries[judge] ? [judgeSummaries[judge]] : [],
  ) as JudgeSummary[];
  return {
    scenarioId: scenario.id,
    tags: [...scenario.tags],
    classification: "error",
    expectations: expectationResults,
    ruleResults,
    judges,
    infrastructureErrors: [reason],
  };
};

/** Runs scenarios sequentially in their supplied deterministic order. */
export async function runEvaluation(
  scenarios: readonly Scenario[],
  options: EvaluationRunnerOptions,
): Promise<ScenarioResult[]> {
  const llmJudge = options.llmJudge ?? new UnavailableLlmJudge();
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    const requestedExpectations = buildExpectations(scenario);
    let completion: ScriptedCompletion;
    try {
      completion = await options.provider.completeForScenario(scenario.id, {
        model: "scripted-fixture",
        messages: scenario.turns.map((turn) => ({ role: turn.role, content: turn.content })),
      });
    } catch (error) {
      results.push(providerFailureResult(scenario, requestedExpectations, error));
      continue;
    }

    if (!isValidScriptedCompletion(completion)) {
      results.push(
        providerFailureResult(
          scenario,
          requestedExpectations,
          new ScriptedProviderError("provider", "Malformed scripted completion"),
        ),
      );
      continue;
    }

    const ruleResults = (scenario.expect.rules ?? []).map((rule, index) =>
      evaluateRule(
        rule,
        completion.result.text,
        completion.evidence,
        `${scenario.id}:rule-${index + 1}`,
      ),
    );
    const evidenceValidation = validateResponseEvidence(completion.evidence);
    const infrastructureErrors = evidenceValidation.valid
      ? []
      : [`Malformed response evidence: ${evidenceValidation.reason}`];
    const judgeSummaries: Partial<Record<"rule" | "llm", JudgeSummary>> = {};
    let expectationResults: ExpectationResult[];

    if (scenario.judges.includes("llm")) {
      try {
        const judgeResult = await llmJudge.evaluate({
          scenarioId: scenario.id,
          responseText: completion.result.text,
          // A test double must not mutate our reference copy of canonical declarations.
          expectations: requestedExpectations.map((expectation) => ({ ...expectation })),
        });
        if (!validateJudgeResult(requestedExpectations, judgeResult)) {
          const reason = "LLM judge returned malformed or incomplete expectation metadata";
          expectationResults = failedExpectations(requestedExpectations, reason);
          judgeSummaries.llm = { judge: "llm", status: "error", reason };
        } else {
          const judgedById = new Map(judgeResult.expectations.map((item) => [item.id, item]));
          expectationResults = requestedExpectations.map((expected) => {
            const item = judgedById.get(expected.id);
            // Exact IDs/count were validated above, so every original expectation has a result.
            const status = item?.status ?? "error";
            return {
              ...expected,
              status,
              reason:
                status === "unevaluated"
                  ? "LLM judge did not evaluate this subjective expectation"
                  : `Judge returned ${status}; explanation withheld from fixture report`,
            };
          });
          judgeSummaries.llm = {
            judge: "llm",
            status: judgeResult.status,
            reason:
              judgeResult.status === "unavailable"
                ? "LLM judge intentionally unavailable in the M0-010 evaluation skeleton"
                : `Judge returned ${judgeResult.status}; explanation withheld from fixture report`,
          };
        }
      } catch {
        const reason = "LLM judge operation failed; expectations were not evaluated";
        expectationResults = failedExpectations(requestedExpectations, reason);
        judgeSummaries.llm = { judge: "llm", status: "error", reason };
      }
    } else {
      expectationResults = requestedExpectations.map((expectation) => ({
        ...expectation,
        status: "unevaluated",
        reason: "No LLM judge was declared for this scenario",
      }));
    }

    if (scenario.judges.includes("rule")) judgeSummaries.rule = ruleJudgeSummary(ruleResults);
    const judges = scenario.judges.flatMap((judge) =>
      judgeSummaries[judge] ? [judgeSummaries[judge]] : [],
    ) as JudgeSummary[];
    results.push({
      scenarioId: scenario.id,
      tags: [...scenario.tags],
      classification: classify(expectationResults, ruleResults, judges, infrastructureErrors),
      expectations: expectationResults,
      ruleResults,
      judges,
      infrastructureErrors,
    });
  }

  return results;
}
