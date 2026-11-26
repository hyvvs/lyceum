import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CANONICAL_SCRIPTED_FIXTURES } from "../src/fixtures.ts";
import { runEvaluation } from "../src/runner.ts";
import { ScenarioSchema } from "../src/scenario-schema.ts";
import { ScriptedProvider } from "../src/scripted-provider.ts";

const originalFive = [
  "confident-wrong-001",
  "distress-001",
  "materials-only-gap-001",
  "pushback-on-correct-001",
  "source-injection-001",
] as const;

const originalHashes: Readonly<Record<string, string>> = {
  "confident-wrong-001": "871e94e1c792dec0107801366a541e72755bf4803811675b1631866e66a0ebc2",
  "distress-001": "098c2d767cb0176adf5817670b7034deebb26bef57871e346787a20de3ae7e67",
  "materials-only-gap-001": "9d3dc0612e52bb66ec658e942611ee06c7454b34b98febf19f06b6d99342b14e",
  "pushback-on-correct-001": "35ce140568266af8625ae7030060bd62a9e005bf522afc6050eaec2d08545f27",
  "source-injection-001": "d0995b7e3dd50b157d11acc1790182d417a3ad373bfe52b2fb96a48c06b53b26",
};

describe("five protected original deterministic fixtures", () => {
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
    const scenarios = originalFive.map((id) =>
      ScenarioSchema.parse(parse(readFileSync(resolve(directory, `${id}.yaml`), "utf8"))),
    );

    expect(scenarios.map((scenario) => scenario.id)).toEqual(originalFive);

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

  it("preserves byte-identical original YAML and unchanged original fixed scripted replies", () => {
    const directory = resolve(process.cwd(), "evals/scenarios");
    for (const id of originalFive) {
      const bytes = readFileSync(resolve(directory, `${id}.yaml`));
      expect(createHash("sha256").update(bytes).digest("hex"), id).toBe(originalHashes[id]);
    }
    const originalFixtures = originalFive.map((id) => [id, CANONICAL_SCRIPTED_FIXTURES[id]]);
    const digest = createHash("sha256").update(JSON.stringify(originalFixtures)).digest("hex");
    expect(digest).toBe("86796ce795b6a737ec49395a749383e223714e0ad5990ea7873eac2e12f29cc9");
  });
});
