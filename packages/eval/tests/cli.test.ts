import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const reportPath = resolve(root, "evals/reports/m0-010.json");
const negativeReportPath = resolve(root, "evals/reports/m0-010-negative.json");
const missingEvidenceReportPath = resolve(root, "evals/reports/m0-011-missing-evidence.json");

const run = (...args: string[]) =>
  spawnSync("corepack", ["pnpm", "eval", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 30_000,
  });

describe("actual root pnpm eval CLI", () => {
  it("executes all thirty canonical scenarios and writes repeatable machine-readable evidence", () => {
    const first = run();
    expect(first.status, first.stderr).toBe(0);
    expect(first.stdout).toContain("Tutoring-quality acceptance: INCOMPLETE");
    const firstJson = readFileSync(reportPath, "utf8");
    const report = JSON.parse(firstJson);
    expect(report.summary.scenarios).toEqual({
      total: 30,
      passed: 0,
      failed: 0,
      incomplete: 30,
      errors: 0,
    });
    expect(report.schemaVersion).toBe(2);
    expect(report.summary.rules).toMatchObject({
      evaluated: 29,
      denominator: 29,
      passed: 29,
      failed: 0,
      unevaluated: 0,
      errors: 0,
    });
    expect(report.summary.expectations).toMatchObject({
      evaluated: 0,
      passed: 0,
      unevaluated: 123,
    });
    const second = run();
    expect(second.status, second.stderr).toBe(0);
    expect(readFileSync(reportPath, "utf8")).toBe(firstJson);
    expect(second.stdout).toBe(first.stdout);
  });

  it("detects a fixed negative fixture with a nonzero exit code and genuine failed rules", () => {
    const negative = run("--negative-fixture");
    expect(negative.status, negative.stderr).toBe(1);
    const report = JSON.parse(readFileSync(negativeReportPath, "utf8"));
    expect(report.summary.scenarios.failed).toBe(1);
    expect(report.summary.scenarios.incomplete).toBe(29);
    expect(report.summary.rules).toMatchObject({ passed: 27, failed: 2, unevaluated: 0 });
    expect(report.summary.expectations.unevaluated).toBe(123);
    expect(report.qualityAcceptance.status).toBe("incomplete");
  });

  it("exits nonzero when only mandatory structured hint evidence is missing, without inventing a failed rule", () => {
    const missing = run("--missing-evidence-fixture");
    expect(missing.status, missing.stderr).toBe(1);
    const report = JSON.parse(readFileSync(missingEvidenceReportPath, "utf8"));
    expect(report.summary.scenarios).toMatchObject({
      total: 30,
      failed: 0,
      incomplete: 30,
      errors: 0,
    });
    expect(report.summary.rules).toMatchObject({
      evaluated: 28,
      passed: 28,
      failed: 0,
      unevaluated: 1,
      errors: 0,
    });
    expect(report.summary.expectations).toMatchObject({ evaluated: 0, unevaluated: 123 });
    const specific = report.scenarios.find(
      (scenario: { scenarioId: string }) => scenario.scenarioId === "hint-first-nudge-001",
    );
    expect(specific.classification).toBe("incomplete");
    expect(specific.ruleResults).toMatchObject([{ status: "unevaluated" }]);
    expect(report.qualityAcceptance.status).toBe("incomplete");
  });

  it("rejects unsupported CLI arguments instead of pretending to evaluate", () => {
    const result = run("--unknown-argument");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unsupported eval option");
    expect(existsSync(reportPath)).toBe(false);
  });
});
