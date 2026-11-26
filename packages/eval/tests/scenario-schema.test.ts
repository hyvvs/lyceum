import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { ScenarioSchema } from "../src/scenario-schema.ts";

const canonicalScenarioNames = [
  "confident-wrong-001.yaml",
  "distress-001.yaml",
  "materials-only-gap-001.yaml",
  "pushback-on-correct-001.yaml",
  "source-injection-001.yaml",
] as const;

const baseScenario = {
  id: "schema-fixture-001",
  description: "A synthetic schema validation fixture.",
  tags: ["schema-test"],
  profile: "math",
  mode: "practice",
  learnerState: { goal: "Test the scenario schema" },
  turns: [{ role: "user", content: "A synthetic learner message." }],
  expect: { must: ["The expectation remains visible."] },
  judges: ["llm"],
};

describe("ScenarioSchema", () => {
  it.each(canonicalScenarioNames)("accepts the unchanged canonical scenario %s", (name) => {
    const source = readFileSync(resolve(process.cwd(), "evals/scenarios", name), "utf8");
    expect(ScenarioSchema.safeParse(parse(source)).success).toBe(true);
  });

  it("accepts omitted verification, omitted rule lists and independently optional verification fields", () => {
    expect(ScenarioSchema.safeParse(baseScenario).success).toBe(true);
    expect(
      ScenarioSchema.safeParse({
        ...baseScenario,
        verification: { status: "incorrect" },
        expect: { must_not: ["Does not reveal a full solution."] },
      }).success,
    ).toBe(true);
    expect(
      ScenarioSchema.safeParse({
        ...baseScenario,
        verification: { errorTags: ["misconception"] },
      }).success,
    ).toBe(true);
  });

  it("accepts the documented tutor modes and user/assistant dialogue roles", () => {
    const modes = [
      "teach",
      "socratic",
      "practice",
      "review",
      "repair",
      "teach_back",
      "exam",
      "homework_help",
    ];
    for (const mode of modes) {
      expect(ScenarioSchema.safeParse({ ...baseScenario, mode }).success).toBe(true);
    }
    expect(
      ScenarioSchema.safeParse({
        ...baseScenario,
        turns: [
          { role: "assistant", content: "A tutor prompt." },
          { role: "user", content: "A learner response." },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts JSON-serializable learner state and extensible source records", () => {
    expect(
      ScenarioSchema.safeParse({
        ...baseScenario,
        learnerState: { nested: [null, true, 0.5, "text", { count: 2 }] },
        sources: [
          {
            anchor: "notes.pdf p.1",
            text: "Original synthetic source text.",
            metadata: { page: 1 },
          },
        ],
      }).success,
    ).toBe(true);
  });

  it.each([
    ["missing identifier", { ...baseScenario, id: " " }],
    ["missing description", { ...baseScenario, description: "  " }],
    ["empty tags", { ...baseScenario, tags: [] }],
    ["duplicate tags", { ...baseScenario, tags: ["same", "same"] }],
    ["empty turns", { ...baseScenario, turns: [] }],
    ["empty turn content", { ...baseScenario, turns: [{ role: "user", content: " " }] }],
    ["unsupported role", { ...baseScenario, turns: [{ role: "system", content: "No." }] }],
    ["unsupported mode", { ...baseScenario, mode: "freeform" }],
    ["unsupported judge", { ...baseScenario, judges: ["human"] }],
    ["duplicate judges", { ...baseScenario, judges: ["llm", "llm"] }],
    ["empty verification", { ...baseScenario, verification: {} }],
    ["non-serializable learner state", { ...baseScenario, learnerState: { value: Number.NaN } }],
    [
      "non-serializable source",
      { ...baseScenario, sources: [{ value: Number.POSITIVE_INFINITY }] },
    ],
    ["empty expectation", { ...baseScenario, expect: { must: [" "] } }],
    ["unknown top-level field", { ...baseScenario, extra: true }],
  ])("rejects %s", (_label, scenario) => {
    expect(ScenarioSchema.safeParse(scenario).success).toBe(false);
  });

  it.each([
    ["missing regex pattern", [{ type: "regex_present" }]],
    ["phrase field on regex rule", [{ type: "regex_present", phrase: "hello" }]],
    ["unknown rule type", [{ type: "contains", phrase: "hello" }]],
    ["invalid regex", [{ type: "regex_absent", pattern: "[" }]],
    ["inline flag away from the start", [{ type: "regex_present", pattern: "x(?i)y" }]],
    ["unsupported inline flag", [{ type: "regex_present", pattern: "(?m)x" }]],
    ["empty phrase", [{ type: "phrase_present", phrase: " " }]],
    ["hint level below zero", [{ type: "hint_level_at_most", value: -1 }]],
    ["hint level above five", [{ type: "hint_level_at_most", value: 6 }]],
    ["fractional hint level", [{ type: "hint_level_at_most", value: 1.5 }]],
  ])("rejects rule declarations with %s", (_label, rules) => {
    expect(ScenarioSchema.safeParse({ ...baseScenario, expect: { rules } }).success).toBe(false);
  });

  it("accepts the canonical leading (?i) regex marker", () => {
    expect(
      ScenarioSchema.safeParse({
        ...baseScenario,
        expect: { rules: [{ type: "regex_absent", pattern: "(?i)great (job|work)" }] },
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate and contradictory deterministic rules", () => {
    expect(
      ScenarioSchema.safeParse({
        ...baseScenario,
        expect: {
          rules: [
            { type: "phrase_present", phrase: "specific phrase" },
            { type: "phrase_present", phrase: "specific phrase" },
          ],
        },
      }).success,
    ).toBe(false);
    expect(
      ScenarioSchema.safeParse({
        ...baseScenario,
        expect: {
          rules: [
            { type: "regex_present", pattern: "(?i)unsafe" },
            { type: "regex_absent", pattern: "(?i)unsafe" },
          ],
        },
      }).success,
    ).toBe(false);
  });
});
