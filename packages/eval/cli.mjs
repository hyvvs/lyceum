import { rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertRealDirectory,
  ensureReportDirectory,
  publishReport,
  scenarioFs,
} from "./cli-files.mjs";
import {
  CANONICAL_SCRIPTED_FIXTURES,
  NEGATIVE_SCRIPTED_FIXTURES,
  ScenarioLoadError,
  ScriptedProvider,
  createEvaluationReport,
  getEvaluationExitCode,
  loadScenarios,
  renderEvaluationSummary,
  runEvaluation,
  serializeEvaluationReport,
} from "./src/index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const scenarioDirectory = join(root, "evals", "scenarios");
const reportDirectory = join(root, "evals", "reports");

async function main() {
  const args = process.argv.slice(2);
  const negative = args[0] === "--negative-fixture";
  const reportName = negative ? "m0-010-negative.json" : "m0-010.json";
  const reportPath = join(reportDirectory, reportName);
  const pendingReportPath = `${reportPath}.tmp`;
  await assertRealDirectory(root);
  await ensureReportDirectory(join(root, "evals"), reportDirectory);
  // A prior successful report must never survive an invalid or failed invocation.
  await rm(reportPath, { force: true });
  await rm(pendingReportPath, { force: true });
  if (args.length > 1 || (args.length === 1 && args[0] !== "--negative-fixture")) {
    throw new Error("Unsupported eval option; use no arguments or --negative-fixture");
  }
  const loaded = await loadScenarios(scenarioFs, scenarioDirectory);
  const fixtures = negative ? NEGATIVE_SCRIPTED_FIXTURES : CANONICAL_SCRIPTED_FIXTURES;
  const ids = loaded.map(({ scenario }) => scenario.id).sort();
  const fixtureIds = Object.keys(fixtures).sort();
  if (JSON.stringify(ids) !== JSON.stringify(fixtureIds)) {
    throw new Error("The canonical scripted fixture inventory does not match scenarios");
  }
  const results = await runEvaluation(
    loaded.map(({ scenario }) => scenario),
    { provider: new ScriptedProvider(fixtures) },
  );
  const report = createEvaluationReport(results);
  try {
    await publishReport(reportPath, serializeEvaluationReport(report));
  } catch {
    await rm(pendingReportPath, { force: true });
    throw new Error("Failed to publish complete evaluation report");
  }
  process.stdout.write(`${renderEvaluationSummary(report)}\nReport: evals/reports/${reportName}\n`);
  process.exitCode = getEvaluationExitCode(report);
}

main().catch((error) => {
  // Only bounded validation codes and trusted repo filenames; no YAML/body/provider excerpts.
  if (error instanceof ScenarioLoadError) {
    process.stderr.write(
      `Evaluation scenario loading failed: ${error.issues.map(({ code, fileName }) => `${fileName} (${code})`).join(", ")}\n`,
    );
  } else if (error instanceof Error && error.message.startsWith("Unsupported eval option")) {
    process.stderr.write(`${error.message}\n`);
  } else {
    process.stderr.write("Evaluation infrastructure failed; report was not produced\n");
  }
  process.exitCode = 1;
});
