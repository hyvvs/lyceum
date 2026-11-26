import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CANONICAL_SCRIPTED_FIXTURES } from "../src/fixtures.ts";
import { runEvaluation } from "../src/runner.ts";
import { ScenarioSchema } from "../src/scenario-schema.ts";
import { ScriptedProvider } from "../src/scripted-provider.ts";

describe("five canonical deterministic fixtures", () => {
  it("uses a discriminating synthetic counterexample for the confident-wrong derivative", () => {
    const outcome = CANONICAL_SCRIPTED_FIXTURES["confident-wrong-001"]?.[0];
    expect(outcome?.kind).toBe("response");
    if (outcome?.kind !== "response") return;
    expect(outcome.response.text).toContain("Not quite");
    expect(outcome.response.text).toContain("x = 1");
    expect(outcome.response.text).not.toContain("x = 0");
  });
  it("executes every unchanged canonical scenario with honest incomplete quality status", async () => {
    const directory = resolve(process.cwd(), "evals/scenarios");
    const scenarios = readdirSync(directory)
      .filter((name) => name.endsWith(".yaml"))
      .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
      .map((name) => ScenarioSchema.parse(parse(readFileSync(resolve(directory, name), "utf8"))));

    expect(Object.keys(CANONICAL_SCRIPTED_FIXTURES).sort()).toEqual(
      scenarios.map((scenario) => scenario.id).sort(),
    );

    const results = await runEvaluation(scenarios, {
      provider: new ScriptedProvider(CANONICAL_SCRIPTED_FIXTURES),
    });
    expect(results.map((result) => result.scenarioId)).toEqual(
      scenarios.map((scenario) => scenario.id),
    );
    expect(results.every((result) => result.classification === "incomplete")).toBe(true);
    expect(results.every((result) => result.infrastructureErrors.length === 0)).toBe(true);

    const expectations = results.flatMap((result) => result.expectations);
    const rules = results.flatMap((result) => result.ruleResults);
    expect(expectations).toHaveLength(17);
    expect(expectations.every((expectation) => expectation.status === "unevaluated")).toBe(true);
    expect(rules).toHaveLength(4);
    expect(rules.every((rule) => rule.status === "passed")).toBe(true);
    expect(
      results.flatMap((result) => result.judges).filter((judge) => judge.status === "unavailable"),
    ).toHaveLength(5);
  });
});
