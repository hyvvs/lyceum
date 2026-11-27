import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type ScenarioDirectoryEntry,
  type ScenarioFileSystem,
  ScenarioLoadError,
  loadScenarios,
} from "../src/yaml-loader.ts";

const baseScenario = {
  id: "loader-fixture-001",
  description: "A synthetic loader test scenario.",
  tags: ["loader-test"],
  profile: "math",
  mode: "practice",
  learnerState: { goal: "Exercise the loader" },
  turns: [{ role: "user", content: "A synthetic learner turn." }],
  expect: { must: ["Keep this expectation visible."] },
  judges: ["llm"],
};

const asYaml = (value: unknown): string => JSON.stringify(value);
const bytes = (text: string): number => new TextEncoder().encode(text).byteLength;

class MemoryFileSystem implements ScenarioFileSystem {
  readonly reads: string[] = [];

  constructor(
    readonly entries: readonly ScenarioDirectoryEntry[],
    readonly files: Readonly<Record<string, string>>,
  ) {}

  async readDirectory(_directory: string): Promise<readonly ScenarioDirectoryEntry[]> {
    return this.entries;
  }

  async readFile(_directory: string, name: string): Promise<string> {
    this.reads.push(name);
    const value = this.files[name];
    if (value === undefined) throw new Error("Synthetic read failure");
    return value;
  }
}

const entry = (
  name: string,
  content: string,
  kind: ScenarioDirectoryEntry["kind"] = "file",
): ScenarioDirectoryEntry => ({ name, kind, sizeBytes: bytes(content) });

const expectLoadError = async (fs: ScenarioFileSystem, code: string) => {
  try {
    await loadScenarios(fs, "/synthetic/scenarios");
    throw new Error("Expected loadScenarios to reject the input");
  } catch (error) {
    expect(error).toBeInstanceOf(ScenarioLoadError);
    expect((error as ScenarioLoadError).issues.map((issue) => issue.code)).toContain(code);
  }
};

describe("loadScenarios", () => {
  it("loads every actual canonical scenario without modifying the source files", async () => {
    const directory = resolve(process.cwd(), "evals/scenarios");
    const names = readdirSync(directory).filter((name) => name.endsWith(".yaml"));
    const files = Object.fromEntries(
      names.map((name) => [name, readFileSync(resolve(directory, name), "utf8")]),
    );
    const fs = new MemoryFileSystem(
      names.map((name) => entry(name, files[name] ?? "")),
      files,
    );
    const loaded = await loadScenarios(fs, directory);
    expect(loaded).toHaveLength(30);
    expect(loaded.map((item) => item.fileName)).toEqual(
      [...names].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)),
    );
    expect(loaded.map((item) => item.scenario.id)).toEqual(
      loaded.map((item) => item.fileName.slice(0, -".yaml".length)),
    );
    // Exact 30-name membership and original-five byte integrity are independently
    // pinned in corpus-integrity.test.ts and canonical-fixtures.test.ts.
    expect(loaded.map((item) => item.scenario.id)).toEqual(
      expect.arrayContaining([
        "confident-wrong-001",
        "distress-001",
        "materials-only-gap-001",
        "pushback-on-correct-001",
        "source-injection-001",
      ]),
    );
  });

  it("discovers only direct .yaml files in locale-independent deterministic order", async () => {
    const first = asYaml({ ...baseScenario, id: "alpha-001" });
    const second = asYaml({ ...baseScenario, id: "zeta-001" });
    const fs = new MemoryFileSystem(
      [entry("zeta.yaml", second), entry("README.md", "not YAML"), entry("alpha.yaml", first)],
      { "alpha.yaml": first, "zeta.yaml": second },
    );
    const loaded = await loadScenarios(fs, "/synthetic/scenarios");
    expect(loaded.map((item) => item.fileName)).toEqual(["alpha.yaml", "zeta.yaml"]);
    expect(fs.reads).toEqual(["alpha.yaml", "zeta.yaml"]);
  });

  it("rejects an empty scenario directory", async () => {
    await expectLoadError(new MemoryFileSystem([], {}), "empty_directory");
  });

  it("rejects malformed YAML without exposing source excerpts", async () => {
    const source = "id: [learner private content\n";
    const fs = new MemoryFileSystem([entry("broken.yaml", source)], { "broken.yaml": source });
    try {
      await loadScenarios(fs, "/synthetic/scenarios");
      throw new Error("Expected malformed YAML to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ScenarioLoadError);
      const message = (error as Error).message;
      expect(message).not.toContain("learner private content");
    }
  });

  it("rejects duplicate YAML keys", async () => {
    const source = `${asYaml(baseScenario)}\nid: duplicate-id\n`;
    await expectLoadError(
      new MemoryFileSystem([entry("duplicate-key.yaml", source)], { "duplicate-key.yaml": source }),
      "yaml_parse_error",
    );
  });

  it("rejects multiple YAML documents in one file", async () => {
    const source = `${asYaml(baseScenario)}\n---\n${asYaml({ ...baseScenario, id: "second" })}`;
    await expectLoadError(
      new MemoryFileSystem([entry("multi.yaml", source)], { "multi.yaml": source }),
      "multiple_documents",
    );
  });

  it("rejects duplicate scenario IDs across different files", async () => {
    const first = asYaml(baseScenario);
    const second = asYaml({ ...baseScenario, description: "A second file with the same ID." });
    await expectLoadError(
      new MemoryFileSystem([entry("a.yaml", first), entry("b.yaml", second)], {
        "a.yaml": first,
        "b.yaml": second,
      }),
      "duplicate_scenario_id",
    );
  });

  it("rejects invalid scenarios rather than silently skipping them", async () => {
    const source = asYaml({ ...baseScenario, mode: "unknown-mode" });
    await expectLoadError(
      new MemoryFileSystem([entry("invalid.yaml", source)], { "invalid.yaml": source }),
      "scenario_validation_error",
    );
  });

  it("rejects aliases and custom YAML tags", async () => {
    const alias = [
      "id: alias-001",
      "description: Alias fixture",
      "tags: [x]",
      "profile: math",
      "mode: practice",
      "learnerState: &state { goal: test }",
      "turns: [{ role: user, content: hello }]",
      "expect: { must: [visible] }",
      "judges: [llm]",
      "sources: [*state]",
    ].join("\n");
    await expectLoadError(
      new MemoryFileSystem([entry("alias.yaml", alias)], { "alias.yaml": alias }),
      "unsupported_yaml_structure",
    );
    const customTag = [
      "id: tag-001",
      "description: Tag fixture",
      "tags: [x]",
      "profile: math",
      "mode: practice",
      "learnerState: !custom value",
      "turns: [{ role: user, content: hello }]",
      "expect: { must: [visible] }",
      "judges: [llm]",
    ].join("\n");
    await expectLoadError(
      new MemoryFileSystem([entry("tag.yaml", customTag)], { "tag.yaml": customTag }),
      "unsupported_yaml_structure",
    );
  });

  it("rejects oversized files before reading them", async () => {
    const fs = new MemoryFileSystem([{ name: "large.yaml", kind: "file", sizeBytes: 65 * 1024 }], {
      "large.yaml": asYaml(baseScenario),
    });
    await expectLoadError(fs, "file_too_large");
    expect(fs.reads).toEqual([]);
  });

  it("rejects excessive YAML nesting", async () => {
    let nested: unknown = "leaf";
    for (let index = 0; index < 40; index += 1) nested = [nested];
    const source = asYaml({ ...baseScenario, learnerState: { nested } });
    await expectLoadError(
      new MemoryFileSystem([entry("deep.yaml", source)], { "deep.yaml": source }),
      "yaml_resource_limit",
    );
  });

  it("rejects excessive YAML node counts, collection entries and scalar lengths", async () => {
    const largeRecord = Object.fromEntries(
      Array.from({ length: 5_000 }, (_, index) => [`k${index}`, index]),
    );
    const tooManyNodes = asYaml({ ...baseScenario, learnerState: largeRecord });
    await expectLoadError(
      new MemoryFileSystem([entry("nodes.yaml", tooManyNodes)], { "nodes.yaml": tooManyNodes }),
      "yaml_resource_limit",
    );

    const tooManyEntries = asYaml({
      ...baseScenario,
      tags: Array.from({ length: 1_001 }, (_, index) => `tag-${index}`),
    });
    await expectLoadError(
      new MemoryFileSystem([entry("entries.yaml", tooManyEntries)], {
        "entries.yaml": tooManyEntries,
      }),
      "yaml_resource_limit",
    );

    const tooLongScalar = asYaml({
      ...baseScenario,
      description: "x".repeat(16 * 1024 + 1),
    });
    await expectLoadError(
      new MemoryFileSystem([entry("scalar.yaml", tooLongScalar)], { "scalar.yaml": tooLongScalar }),
      "yaml_resource_limit",
    );
  });

  it("rejects more than the configured scenario-file count before reading", async () => {
    const names = Array.from({ length: 129 }, (_, index) => `scenario-${index}.yaml`);
    const fs = new MemoryFileSystem(
      names.map((name) => ({ name, kind: "file" as const, sizeBytes: 1 })),
      {},
    );
    await expectLoadError(fs, "file_count_limit");
    expect(fs.reads).toEqual([]);
  });

  it("rejects symlinked and non-regular YAML entries", async () => {
    const symlink = new MemoryFileSystem(
      [{ name: "linked.yaml", kind: "symlink", sizeBytes: 10 }],
      { "linked.yaml": asYaml(baseScenario) },
    );
    await expectLoadError(symlink, "unsupported_file_type");
    const directory = new MemoryFileSystem(
      [{ name: "nested.yaml", kind: "directory", sizeBytes: 0 }],
      {},
    );
    await expectLoadError(directory, "unsupported_file_type");
  });

  it("reports unreadable files and directory errors", async () => {
    await expectLoadError(
      new MemoryFileSystem([entry("unreadable.yaml", asYaml(baseScenario))], {}),
      "file_read_error",
    );
    const brokenDirectory: ScenarioFileSystem = {
      async readDirectory() {
        throw new Error("Private path detail");
      },
      async readFile() {
        throw new Error("not reached");
      },
    };
    await expectLoadError(brokenDirectory, "directory_read_error");
  });

  it("rejects total input beyond the configured resource budget", async () => {
    const source = asYaml(baseScenario);
    const names = Array.from({ length: 20 }, (_, index) => `scenario-${index}.yaml`);
    const fs = new MemoryFileSystem(
      names.map((name) => ({ name, kind: "file" as const, sizeBytes: 60 * 1024 })),
      Object.fromEntries(names.map((name) => [name, source])),
    );
    await expectLoadError(fs, "total_size_limit");
  });
});
