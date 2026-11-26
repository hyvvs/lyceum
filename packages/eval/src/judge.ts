export type ExpectationKind = "must" | "must_not";
export type ExpectationStatus = "passed" | "failed" | "unevaluated" | "error";

export interface JudgeExpectation {
  readonly id: string;
  readonly kind: ExpectationKind;
  readonly text: string;
}

export interface ExpectationResult extends JudgeExpectation {
  readonly status: ExpectationStatus;
  readonly reason: string;
}

export interface LlmJudgeRequest {
  readonly scenarioId: string;
  readonly responseText: string;
  readonly expectations: readonly JudgeExpectation[];
}

export interface LlmJudgeResult {
  readonly status: "evaluated" | "unavailable" | "error";
  readonly expectations: readonly ExpectationResult[];
  readonly reason: string;
}

export interface LlmJudge {
  evaluate(request: LlmJudgeRequest): Promise<LlmJudgeResult>;
}

/** Explicitly unavailable M0-010 stub. It never calls a model or external service. */
export class UnavailableLlmJudge implements LlmJudge {
  async evaluate(request: LlmJudgeRequest): Promise<LlmJudgeResult> {
    return {
      status: "unavailable",
      expectations: request.expectations.map((expectation) => ({
        ...expectation,
        status: "unevaluated",
        reason: "Subjective expectation was not judged because the LLM judge is unavailable",
      })),
      reason: "LLM judge is intentionally unavailable in the M0-010 evaluation skeleton",
    };
  }
}
