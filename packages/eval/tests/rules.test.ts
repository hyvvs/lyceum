import { describe, expect, it } from "vitest";
import { evaluateRule } from "../src/rules.ts";

describe("deterministic rule evaluator", () => {
  it("evaluates positive and negative regex presence rules", () => {
    expect(evaluateRule({ type: "regex_present", pattern: "x\\^2" }, "Find x^2.").status).toBe(
      "passed",
    );
    expect(evaluateRule({ type: "regex_present", pattern: "x\\^2" }, "Find y^2.").status).toBe(
      "failed",
    );
    expect(
      evaluateRule({ type: "regex_absent", pattern: "great job" }, "A careful answer.").status,
    ).toBe("passed");
    expect(
      evaluateRule({ type: "regex_absent", pattern: "(?i)great job" }, "Great job.").status,
    ).toBe("failed");
  });

  it("supports the canonical leading (?i) marker without changing default case sensitivity", () => {
    expect(
      evaluateRule({ type: "regex_present", pattern: "(?i)great (job|work)" }, "GREAT WORK").status,
    ).toBe("passed");
    expect(evaluateRule({ type: "regex_present", pattern: "great job" }, "GREAT JOB").status).toBe(
      "failed",
    );
  });

  it("evaluates phrase presence and absence as NFC-normalized case-insensitive substrings", () => {
    expect(
      evaluateRule({ type: "phrase_present", phrase: "café" }, "The word CAFE\u0301 appears here.")
        .status,
    ).toBe("passed");
    expect(
      evaluateRule(
        { type: "phrase_absent", phrase: "outside knowledge" },
        "Only the notes are used.",
      ).status,
    ).toBe("passed");
    expect(
      evaluateRule(
        { type: "phrase_absent", phrase: "outside knowledge" },
        "Outside Knowledge was used.",
      ).status,
    ).toBe("failed");
  });

  it("preserves meaningful whitespace in regex patterns and phrases", () => {
    expect(evaluateRule({ type: "phrase_present", phrase: " target " }, "target").status).toBe(
      "failed",
    );
    expect(
      evaluateRule({ type: "phrase_present", phrase: " target " }, "before target after").status,
    ).toBe("passed");
    expect(evaluateRule({ type: "regex_present", pattern: "^x $" }, "x").status).toBe("failed");
    expect(evaluateRule({ type: "regex_present", pattern: "^x $" }, "x ").status).toBe("passed");
  });

  it("uses normal deterministic regex and phrase semantics for empty responses", () => {
    expect(evaluateRule({ type: "regex_present", pattern: "^$" }, "").status).toBe("passed");
    expect(evaluateRule({ type: "regex_absent", pattern: "^$" }, "").status).toBe("failed");
    expect(evaluateRule({ type: "phrase_present", phrase: "anything" }, "").status).toBe("failed");
    expect(evaluateRule({ type: "phrase_absent", phrase: "anything" }, "").status).toBe("passed");
  });

  it("rejects malformed regexes, unsupported rule types and unsupported flags", () => {
    expect(evaluateRule({ type: "regex_present", pattern: "[" }, "text").status).toBe("error");
    expect(evaluateRule({ type: "regex_present", pattern: "x", flags: "g" }, "x").status).toBe(
      "error",
    );
    expect(evaluateRule({ type: "contains", phrase: "x" }, "x").status).toBe("error");
    expect(evaluateRule({ type: "regex_present", pattern: "x(?i)y" }, "xY").status).toBe("error");
  });

  it("validates hint levels and compares only explicit structured metadata", () => {
    const rule = { type: "hint_level_at_most", value: 2 };
    expect(evaluateRule(rule, "The answer is not inspected.", { hintLevel: 2 }).status).toBe(
      "passed",
    );
    expect(evaluateRule(rule, "The answer is not inspected.", { hintLevel: 3 }).status).toBe(
      "failed",
    );
    expect(evaluateRule(rule, "A text mentioning hint level 1.").status).toBe("unevaluated");
    expect(evaluateRule(rule, "No metadata.", {}).status).toBe("unevaluated");
  });

  it.each([
    ["out-of-range", { hintLevel: 6 }],
    ["negative", { hintLevel: -1 }],
    ["fractional", { hintLevel: 1.5 }],
    ["string", { hintLevel: "2" }],
    ["null", null],
    ["date object", new Date(0)],
    ["unexpected-field", { hintLevel: 2, inferredFromText: true }],
  ])("returns an error for malformed hint metadata (%s)", (_name, evidence) => {
    expect(evaluateRule({ type: "hint_level_at_most", value: 2 }, "text", evidence).status).toBe(
      "error",
    );
  });

  it("does not leak regex state across repeated executions", () => {
    const rule = { type: "regex_present", pattern: "(?i)great" };
    const results = Array.from({ length: 5 }, () => evaluateRule(rule, "Great work."));
    expect(results.map((result) => result.status)).toEqual([
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
    ]);
  });

  it("returns stable identity and structured expected/observed evidence without response excerpts", () => {
    const result = evaluateRule(
      { type: "phrase_present", phrase: "reasoning" },
      "Private synthetic response text containing reasoning.",
      undefined,
      "scenario-a:rule-1",
    );
    expect(result).toMatchObject({
      id: "scenario-a:rule-1",
      type: "phrase_present",
      status: "passed",
      expected: { phrase: "reasoning" },
      observed: { matched: true },
    });
    expect(JSON.stringify(result)).not.toContain("Private synthetic response text");
  });

  it("reports invalid response input as an infrastructure error rather than a pass", () => {
    expect(evaluateRule({ type: "phrase_absent", phrase: "unsafe" }, undefined).status).toBe(
      "error",
    );
  });
});
