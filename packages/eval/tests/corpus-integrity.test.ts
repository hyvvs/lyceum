import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { scenarioFs } from "../cli-files.mjs";
import { CORPUS_SCRIPTED_FIXTURES } from "../src/corpus-fixtures.ts";
import { CANONICAL_SCRIPTED_FIXTURES } from "../src/fixtures.ts";
import {
  createEvaluationReport,
  getEvaluationExitCode,
  serializeEvaluationReport,
} from "../src/report.ts";
import { runEvaluation } from "../src/runner.ts";
import { ScriptedProvider } from "../src/scripted-provider.ts";
import { loadScenarios } from "../src/yaml-loader.ts";

const protectedIds = [
  "confident-wrong-001",
  "distress-001",
  "materials-only-gap-001",
  "pushback-on-correct-001",
  "source-injection-001",
] as const;

const newIds = [
  "wrong-sign-equation-001",
  "unsure-correct-percent-001",
  "unsupported-mastery-001",
  "hint-direct-answer-001",
  "hint-first-nudge-001",
  "hint-stuck-escalation-001",
  "hint-worked-parallel-001",
  "diagnose-fraction-sign-001",
  "diagnose-units-001",
  "diagnose-distributive-001",
  "tool-revises-tutor-001",
  "tool-recheck-disagreement-001",
  "tool-unverifiable-001",
  "injection-worksheet-001",
  "injection-citation-001",
  "injection-spanish-001",
  "distress-exam-panic-001",
  "distress-burnout-001",
  "materials-missing-formula-001",
  "materials-conflicting-pages-001",
  "materials-spanish-gap-001",
  "honesty-source-model-conflict-001",
  "honesty-unverified-citation-001",
  "honesty-low-confidence-001",
  "honesty-tool-unavailable-001",
] as const;

const categoryTags = [
  "anti-sycophancy",
  "hint-ladder",
  "diagnose-first",
  "tool-authority",
  "injection",
  "distress",
  "materials-only",
  "uncertainty",
] as const;

const scenarioDirectory = resolve(process.cwd(), "evals/scenarios");
const sorted = (strings: readonly string[]) =>
  [...strings].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

describe("M0-011 thirty-scenario canonical corpus and trusted fixed fixtures", () => {
  it("has exactly thirty actual YAML files, distinct validated IDs, and an exact fixture inventory", async () => {
    const filenames = readdirSync(scenarioDirectory).filter((name) => name.endsWith(".yaml"));
    const loaded = await loadScenarios(scenarioFs, scenarioDirectory);
    const scenarios = loaded.map(({ scenario }) => scenario);
    expect(filenames).toHaveLength(30);
    expect(scenarios).toHaveLength(30);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(30);
    expect(sorted(scenarios.map((scenario) => scenario.id))).toEqual(
      sorted([...protectedIds, ...newIds]),
    );
    expect(sorted(filenames)).toEqual(sorted(scenarios.map((scenario) => `${scenario.id}.yaml`)));
    expect(sorted(Object.keys(CANONICAL_SCRIPTED_FIXTURES))).toEqual(
      sorted(scenarios.map((scenario) => scenario.id)),
    );
    expect(sorted(Object.keys(CORPUS_SCRIPTED_FIXTURES))).toEqual(sorted(newIds));
    for (const scenario of scenarios.filter(({ id }) =>
      newIds.some((candidate) => candidate === id),
    )) {
      expect(scenario.expect.must?.length, scenario.id).toBeGreaterThan(0);
      expect(scenario.expect.must_not?.length, scenario.id).toBeGreaterThan(0);
      expect(scenario.expect.rules?.length, scenario.id).toBeGreaterThan(0);
      expect(scenario.judges, scenario.id).toEqual(["rule", "llm"]);
      expect(scenario.description.length, scenario.id).toBeGreaterThan(12);
      expect(scenario.turns.length, scenario.id).toBeGreaterThan(0);
    }
  });

  it("covers every genuinely tagged mandatory category with at least three scenarios", async () => {
    const scenarios = (await loadScenarios(scenarioFs, scenarioDirectory)).map(
      ({ scenario }) => scenario,
    );
    for (const category of categoryTags) {
      const covered = scenarios.filter((scenario) => scenario.tags.includes(category));
      expect(covered.length, category).toBeGreaterThanOrEqual(3);
      expect(new Set(covered.map((scenario) => scenario.id)).size, category).toBe(covered.length);
    }
    expect(scenarios.filter((scenario) => scenario.tags.includes("hint-ladder"))).toHaveLength(4);
    expect(scenarios.filter((scenario) => scenario.tags.includes("distress"))).toHaveLength(3);
    expect(scenarios.filter((scenario) => scenario.tags.includes("materials-only"))).toHaveLength(
      4,
    );
  });

  it("uses independent static one-response fixtures with supported finish reasons and real structured hint evidence", async () => {
    const scenarios = (await loadScenarios(scenarioFs, scenarioDirectory)).map(
      ({ scenario }) => scenario,
    );
    const newTexts: string[] = [];
    for (const scenario of scenarios) {
      const script = CANONICAL_SCRIPTED_FIXTURES[scenario.id];
      expect(script?.length, scenario.id).toBe(1);
      const outcome = script?.[0];
      expect(outcome?.kind, scenario.id).toBe("response");
      if (outcome?.kind !== "response") continue;
      expect(outcome.response.finishReason, scenario.id).toBe("stop");
      expect(outcome.response.text.trim().length, scenario.id).toBeGreaterThan(30);
      if (scenario.expect.rules?.some((rule) => rule.type === "hint_level_at_most")) {
        expect(Number.isInteger(outcome.response.evidence?.hintLevel), scenario.id).toBe(true);
        expect(outcome.response.evidence?.hintLevel, scenario.id).toBeGreaterThanOrEqual(0);
        expect(outcome.response.evidence?.hintLevel, scenario.id).toBeLessThanOrEqual(5);
      }
      if (newIds.some((id) => id === scenario.id)) {
        expect(Number.isInteger(outcome.response.evidence?.hintLevel), scenario.id).toBe(true);
        newTexts.push(outcome.response.text);
      }
    }
    expect(new Set(newTexts).size).toBe(25);
  });

  it("executes all declared rules through the ordinary runner with no false tutoring-quality judgment", async () => {
    const scenarios = (await loadScenarios(scenarioFs, scenarioDirectory)).map(
      ({ scenario }) => scenario,
    );
    const run = () =>
      runEvaluation(scenarios, { provider: new ScriptedProvider(CANONICAL_SCRIPTED_FIXTURES) });
    const first = createEvaluationReport(await run());
    const second = createEvaluationReport(await run());
    expect(serializeEvaluationReport(first)).toBe(serializeEvaluationReport(second));
    expect(first.schemaVersion).toBe(2);
    expect(first.summary.scenarios).toEqual({
      total: 30,
      passed: 0,
      failed: 0,
      incomplete: 30,
      errors: 0,
    });
    expect(first.summary.rules).toMatchObject({
      evaluated: 29,
      denominator: 29,
      passed: 29,
      failed: 0,
      unevaluated: 0,
      errors: 0,
      passRate: 1,
    });
    expect(first.summary.expectations).toMatchObject({
      evaluated: 0,
      denominator: 0,
      passed: 0,
      failed: 0,
      unevaluated: 123,
      errors: 0,
      passRate: null,
    });
    expect(getEvaluationExitCode(first)).toBe(0);
    expect(first.qualityAcceptance.status).toBe("incomplete");
    expect(
      first.scenarios.every((result) =>
        result.expectations.every((item) => item.status === "unevaluated"),
      ),
    ).toBe(true);
    for (const category of first.categories) {
      const relevant = scenarios.filter((scenario) => scenario.tags.includes(category.tag));
      const declaredRuleCount = relevant.reduce(
        (count, scenario) => count + (scenario.expect.rules?.length ?? 0),
        0,
      );
      const declaredSubjectiveCount = relevant.reduce(
        (count, scenario) =>
          count + (scenario.expect.must?.length ?? 0) + (scenario.expect.must_not?.length ?? 0),
        0,
      );
      expect(category.scenarioCount, category.tag).toBe(relevant.length);
      expect(category.rules.passed, category.tag).toBe(declaredRuleCount);
      expect(category.rules.evaluated, category.tag).toBe(declaredRuleCount);
      expect(category.rules.denominator, category.tag).toBe(declaredRuleCount);
      expect(
        category.rules.failed + category.rules.unevaluated + category.rules.errors,
        category.tag,
      ).toBe(0);
      expect(category.rules.passRate, category.tag).toBe(declaredRuleCount === 0 ? null : 1);
      expect(category.expectations.unevaluated, category.tag).toBe(declaredSubjectiveCount);
      expect(category.expectations.evaluated, category.tag).toBe(0);
      expect(category.expectations.passRate, category.tag).toBeNull();
    }
  });
});
