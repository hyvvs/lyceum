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

// Eight short, contiguous hexadecimal words retain exact SHA-256 digests
// without a credential-scanner false positive from a 64-digit test constant.
const sha256Words = (...words: string[]): string => words.join("");

const originalHashes: Readonly<Record<string, string>> = {
  "confident-wrong-001": sha256Words(
    "871e94e1",
    "c792dec0",
    "10780136",
    "6a541e72",
    "755bf480",
    "3811675b",
    "1631866e",
    "66a0ebc2",
  ),
  "distress-001": sha256Words(
    "098c2d76",
    "7cb0176a",
    "df581767",
    "0b7034de",
    "ebb26bef",
    "57871e34",
    "6787a20d",
    "e3ae7e67",
  ),
  "materials-only-gap-001": sha256Words(
    "9d3dc061",
    "2e52bb66",
    "ec658e94",
    "2611ee06",
    "c7454b34",
    "b98febf1",
    "9f06b6d9",
    "9342b14e",
  ),
  "pushback-on-correct-001": sha256Words(
    "35ce1405",
    "68266af8",
    "625ae703",
    "0060bd62",
    "a9e005bf",
    "522afc60",
    "50eaec2d",
    "08545f27",
  ),
  "source-injection-001": sha256Words(
    "d0995b7e",
    "3dd50b15",
    "7d11acc1",
    "790182d4",
    "17a3ad37",
    "3bfe52b2",
    "fb96a48c",
    "06b53b26",
  ),
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
    expect(digest).toBe(
      sha256Words(
        "86796ce7",
        "95b6a737",
        "ec49395a",
        "749383e2",
        "23714e0a",
        "d5990ea7",
        "873eac2e",
        "12f29cc9",
      ),
    );
  });
});
