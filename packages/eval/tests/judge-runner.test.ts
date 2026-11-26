import { describe, expect, it } from "vitest";
import { type LlmJudge, UnavailableLlmJudge } from "../src/judge.ts";
import { runEvaluation } from "../src/runner.ts";
import { ScenarioSchema } from "../src/scenario-schema.ts";
import { type ScriptedOutcome, ScriptedProvider } from "../src/scripted-provider.ts";

const makeScenario = (
  id: string,
  expectBlock: Record<string, unknown> = { must: ["Keeps the learner's expectation visible."] },
  judges: string[] = ["rule", "llm"],
) =>
  ScenarioSchema.parse({
    id,
    description: "A synthetic evaluation-runner scenario.",
    tags: ["runner-test", "shared"],
    profile: "math",
    mode: "practice",
    learnerState: { goal: "Exercise honest result semantics" },
    turns: [{ role: "user", content: "A synthetic learner message." }],
    expect: expectBlock,
    judges,
  });

const scriptedResponse = (text: string, hintLevel?: number): ScriptedOutcome => ({
  kind: "response",
  response: {
    text,
    finishReason: "stop",
    ...(hintLevel === undefined ? {} : { evidence: { hintLevel } }),
  },
});

const runOne = async (scenario: ReturnType<typeof makeScenario>, outcome: ScriptedOutcome) =>
  runEvaluation([scenario], { provider: new ScriptedProvider({ [scenario.id]: [outcome] }) });

describe("unavailable LLM judge and evaluation runner", () => {
  it("explicitly leaves subjective must and must_not expectations unevaluated", async () => {
    const judge = new UnavailableLlmJudge();
    const result = await judge.evaluate({
      scenarioId: "judge-stub-001",
      responseText: "A synthetic tutor response.",
      expectations: [
        { id: "must-1", kind: "must", text: "Shows empathy." },
        { id: "must-not-1", kind: "must_not", text: "Continues drills." },
      ],
    });
    expect(result.status).toBe("unavailable");
    expect(result.expectations.map((item) => item.status)).toEqual(["unevaluated", "unevaluated"]);
    expect(result.expectations.map((item) => item.text)).toEqual([
      "Shows empathy.",
      "Continues drills.",
    ]);
  });

  it("keeps natural-language expectations incomplete even when every executable rule passes", async () => {
    const scenario = makeScenario("expectation-not-mapped-001", {
      must: ["Diagnoses the learner's misconception before explaining."],
      rules: [{ type: "phrase_present", phrase: "question" }],
    });
    const [result] = await runOne(scenario, scriptedResponse("Ask a question first."));
    expect(result?.ruleResults[0]?.status).toBe("passed");
    expect(result?.expectations[0]?.status).toBe("unevaluated");
    expect(result?.classification).toBe("incomplete");
  });

  it("does not promote a rule-only scenario that requests only LLM judgment", async () => {
    const scenario = makeScenario(
      "llm-only-001",
      { must: ["Responds appropriately to distress."] },
      ["llm"],
    );
    const [result] = await runOne(scenario, scriptedResponse("A fixed synthetic response."));
    expect(result?.ruleResults).toEqual([]);
    expect(result?.judges).toContainEqual(
      expect.objectContaining({ judge: "llm", status: "unavailable" }),
    );
    expect(result?.classification).toBe("incomplete");
    expect(result?.expectations[0]?.status).toBe("unevaluated");
  });

  it("classifies a mandatory deterministic rule failure as failed, not passed or incomplete", async () => {
    const scenario = makeScenario("rule-failure-001", {
      must: ["Does not praise an incorrect answer."],
      rules: [{ type: "phrase_absent", phrase: "great job" }],
    });
    const [result] = await runOne(scenario, scriptedResponse("Great job!"));
    expect(result?.ruleResults[0]?.status).toBe("failed");
    expect(result?.classification).toBe("failed");
  });

  it("classifies missing hint metadata as incomplete, never as a pass", async () => {
    const scenario = makeScenario("missing-hint-001", {
      must: ["Uses no more than a level-two hint."],
      rules: [{ type: "hint_level_at_most", value: 2 }],
    });
    const [result] = await runOne(scenario, scriptedResponse("A pointed question."));
    expect(result?.ruleResults[0]?.status).toBe("unevaluated");
    expect(result?.classification).toBe("incomplete");
  });

  it("classifies malformed structured hint metadata as an infrastructure error", async () => {
    const scenario = makeScenario("malformed-hint-001", {
      must: ["Uses no more than a level-two hint."],
      rules: [{ type: "hint_level_at_most", value: 2 }],
    });
    const [result] = await runOne(scenario, scriptedResponse("A response.", 7));
    expect(result?.ruleResults[0]?.status).toBe("error");
    expect(result?.classification).toBe("error");
  });

  it("does not ignore malformed response metadata when no hint-level rule consumes it", async () => {
    const scenario = makeScenario("unexpected-metadata-001", {
      must: ["Responds carefully."],
      rules: [{ type: "phrase_present", phrase: "carefully" }],
    });
    const outcome: ScriptedOutcome = {
      kind: "response",
      response: {
        text: "Responds carefully.",
        finishReason: "stop",
        evidence: null as unknown as { hintLevel?: number },
      },
    };
    const [result] = await runOne(scenario, outcome);
    expect(result?.ruleResults[0]?.status).toBe("passed");
    expect(result?.infrastructureErrors).toHaveLength(1);
    expect(result?.classification).toBe("error");
  });

  it("classifies provider failures separately from ordinary tutoring-rule failures", async () => {
    const scenario = makeScenario("provider-error-001", {
      must: ["Responds safely."],
      rules: [{ type: "phrase_present", phrase: "support" }],
    });
    const [result] = await runOne(scenario, { kind: "error", code: "provider" });
    expect(result?.classification).toBe("error");
    expect(result?.ruleResults[0]?.status).toBe("error");
    expect(result?.expectations[0]?.status).toBe("error");
    expect(result?.judges).toContainEqual(
      expect.objectContaining({ judge: "rule", status: "error" }),
    );
  });

  it("leaves expectations visible when no LLM judge is declared", async () => {
    const scenario = makeScenario("no-llm-judge-001", { must_not: ["Invents a citation."] }, [
      "rule",
    ]);
    const [result] = await runOne(scenario, scriptedResponse("No citations."));
    expect(result?.expectations).toEqual([
      expect.objectContaining({
        kind: "must_not",
        text: "Invents a citation.",
        status: "unevaluated",
      }),
    ]);
    expect(result?.classification).toBe("incomplete");
  });

  it("allows a deterministic-only scenario to pass only when it has no unjudged expectations", async () => {
    const scenario = makeScenario(
      "rules-only-001",
      { rules: [{ type: "phrase_present", phrase: "evidence" }] },
      ["rule"],
    );
    const [result] = await runOne(scenario, scriptedResponse("The evidence is explicit."));
    expect(result?.classification).toBe("passed");
    expect(result?.expectations).toEqual([]);
  });

  it("does not attach fabricated quality scores or raw response text to scenario results", async () => {
    const scenario = makeScenario("no-score-001", { must: ["Responds carefully."] }, ["llm"]);
    const [result] = await runOne(scenario, scriptedResponse("Private synthetic response text."));
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("qualityScore");
    expect(JSON.stringify(result)).not.toContain("Private synthetic response text.");
  });

  it("uses the public gateway error type without exposing provider error messages", async () => {
    const scenario = makeScenario("safe-error-001", { must: ["Responds carefully."] }, ["llm"]);
    const provider = new ScriptedProvider({
      [scenario.id]: [{ kind: "error", code: "provider" }],
    });
    const [result] = await runEvaluation([scenario], { provider });
    expect(result?.classification).toBe("error");
    expect(result?.expectations[0]?.reason).not.toContain("Scripted provider fixture failed");
  });

  it("does not accept a judge error that claims subjective expectations passed", async () => {
    const scenario = makeScenario("judge-error-001", { must: ["Responds carefully."] }, ["llm"]);
    const invalidJudge: LlmJudge = {
      async evaluate(request) {
        return {
          status: "error",
          reason: "Synthetic judge infrastructure error",
          expectations: request.expectations.map((expectation) => ({
            ...expectation,
            status: "passed",
            reason: "Must not be trusted",
          })),
        };
      },
    };
    const provider = new ScriptedProvider({
      [scenario.id]: [scriptedResponse("A fixed response.")],
    });
    const [result] = await runEvaluation([scenario], { provider, llmJudge: invalidJudge });
    expect(result?.classification).toBe("error");
    expect(result?.expectations[0]?.status).toBe("error");
    expect(result?.judges).toContainEqual(
      expect.objectContaining({ judge: "llm", status: "error" }),
    );
  });

  it("never serializes injected judge free-text or extra fields as response evidence", async () => {
    const secret = "PRIVATE_SENTINEL_FROM_RESPONSE_NOT_FOR_REPORT";
    const scenario = makeScenario("judge-sanitization-001", { must: ["Acts carefully."] }, ["llm"]);
    const injectedJudge: LlmJudge = {
      async evaluate(request) {
        return {
          status: "evaluated",
          reason: secret,
          expectations: request.expectations.map((expectation) => ({
            ...expectation,
            status: "passed" as const,
            reason: secret,
            responseText: secret,
          })),
        };
      },
    };
    const [result] = await runEvaluation([scenario], {
      provider: new ScriptedProvider({ [scenario.id]: [scriptedResponse(secret)] }),
      llmJudge: injectedJudge,
    });
    expect(result?.classification).toBe("error");
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("sanitizes free-text reasons from a structurally valid injected judge result", async () => {
    const secret = "PRIVATE_REASON_SENTINEL_NOT_FOR_REPORT";
    const scenario = makeScenario("judge-reason-001", { must: ["Asks for evidence."] }, ["llm"]);
    const injectedJudge: LlmJudge = {
      async evaluate(request) {
        return {
          status: "evaluated",
          reason: secret,
          expectations: request.expectations.map((expectation) => ({
            ...expectation,
            status: "passed" as const,
            reason: secret,
          })),
        };
      },
    };
    const [result] = await runEvaluation([scenario], {
      provider: new ScriptedProvider({ [scenario.id]: [scriptedResponse(secret)] }),
      llmJudge: injectedJudge,
    });
    expect(result?.classification).toBe("passed");
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("does not let a mutable injected judge rewrite canonical expectation text", async () => {
    const scenario = makeScenario("judge-mutation-001", { must: ["Preserve this text."] }, ["llm"]);
    const injectedJudge: LlmJudge = {
      async evaluate(request) {
        const expectation = request.expectations[0] as { text: string };
        expectation.text = "PRIVATE_MUTATED_TEXT";
        return {
          status: "evaluated",
          reason: "Synthetic",
          expectations: request.expectations.map((item) => ({
            ...item,
            status: "passed" as const,
            reason: "Synthetic",
          })),
        };
      },
    };
    const [result] = await runEvaluation([scenario], {
      provider: new ScriptedProvider({ [scenario.id]: [scriptedResponse("A fixture.")] }),
      llmJudge: injectedJudge,
    });
    expect(result?.classification).toBe("error");
    expect(result?.expectations[0]?.text).toBe("Preserve this text.");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_MUTATED_TEXT");
  });
});
