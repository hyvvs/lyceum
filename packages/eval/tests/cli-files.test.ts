import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertRealDirectory,
  ensureReportDirectory,
  publishReport,
  readBoundedScenarioFile,
} from "../cli-files.mjs";

const created: string[] = [];
const makeTemp = async () => {
  const directory = await mkdtemp(resolve(process.cwd(), "packages/eval/tests/.cli-security-"));
  created.push(directory);
  return directory;
};

afterEach(async () => {
  for (const directory of created.splice(0)) await rm(directory, { recursive: true, force: true });
});

describe("CLI local filesystem boundaries", () => {
  it("rejects non-directory paths and linked report directories before any report write", async () => {
    const base = await makeTemp();
    const normal = join(base, "real");
    await mkdir(normal);
    await expect(assertRealDirectory(normal)).resolves.toBeUndefined();
    const file = join(base, "ordinary.txt");
    await writeFile(file, "ordinary file");
    await expect(assertRealDirectory(file)).rejects.toThrow();
    const linked = join(base, "linked");
    await symlink(normal, linked, process.platform === "win32" ? "junction" : "dir");
    await expect(assertRealDirectory(linked)).rejects.toThrow();
    await expect(ensureReportDirectory(base, linked)).rejects.toThrow();
  });

  it("bounds a file read even when a file exceeds its declared loader metadata", async () => {
    const base = await makeTemp();
    const file = join(base, "oversize.yaml");
    await writeFile(file, "x".repeat(64 * 1024 + 1));
    await expect(readBoundedScenarioFile(file)).rejects.toThrow();
    await writeFile(file, "safe content");
    await expect(readBoundedScenarioFile(file)).resolves.toBe("safe content");
  });

  it("publishes a complete deterministic report and leaves no temporary file", async () => {
    const base = await makeTemp();
    const reportDirectory = join(base, "reports");
    await ensureReportDirectory(base, reportDirectory);
    const report = join(reportDirectory, "report.json");
    await publishReport(report, '{"schemaVersion":1}\n');
    expect(await readFile(report, "utf8")).toBe('{"schemaVersion":1}\n');
    await expect(readFile(`${report}.tmp`, "utf8")).rejects.toThrow();
  });
});
