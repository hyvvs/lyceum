import { lstat, mkdir, open, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { SCENARIO_LIMITS } from "./src/yaml-loader.ts";

/** For trusted stable repository checkouts only, never arbitrary uploaded paths. */
export async function assertRealDirectory(directory) {
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error("Expected a real, non-linked repository directory");
  }
}

/** Bounded read independent of a potentially stale directory-entry size. */
export async function readBoundedScenarioFile(path) {
  const handle = await open(path, "r");
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > SCENARIO_LIMITS.maxFileBytes) {
      throw new Error("Scenario file is not a regular bounded file");
    }
    const bytes = Buffer.alloc(SCENARIO_LIMITS.maxFileBytes + 1);
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await handle.read(bytes, length, bytes.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > SCENARIO_LIMITS.maxFileBytes) {
      throw new Error("Scenario file exceeds read bound");
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length));
  } finally {
    await handle.close();
  }
}

export const scenarioFs = {
  async readDirectory(directory) {
    await assertRealDirectory(directory);
    const entries = await readdir(directory, { withFileTypes: true });
    return Promise.all(
      entries.map(async (entry) => {
        const info = await lstat(join(directory, entry.name));
        return {
          name: entry.name,
          kind: entry.isSymbolicLink()
            ? "symlink"
            : entry.isFile()
              ? "file"
              : entry.isDirectory()
                ? "directory"
                : "other",
          sizeBytes: info.size,
        };
      }),
    );
  },
  async readFile(directory, name) {
    await assertRealDirectory(directory);
    return readBoundedScenarioFile(join(directory, name));
  },
};

/** A linked output directory must not redirect report deletion or publication. */
export async function ensureReportDirectory(parent, directory) {
  await assertRealDirectory(parent);
  try {
    await mkdir(directory);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }
  await assertRealDirectory(directory);
}

/** Writes a complete report to a same-directory exclusive file before renaming. */
export async function publishReport(reportPath, contents) {
  await assertRealDirectory(dirname(reportPath));
  const temp = `${reportPath}.tmp`;
  try {
    await writeFile(temp, contents, { encoding: "utf8", flag: "wx" });
    await rename(temp, reportPath);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}
