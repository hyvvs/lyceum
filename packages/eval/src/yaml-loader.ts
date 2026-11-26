import {
  type Node,
  type YAMLParseError,
  type YAMLWarning,
  isAlias,
  isMap,
  isNode,
  isScalar,
  isSeq,
  parseDocument,
} from "yaml";
import { type Scenario, ScenarioSchema } from "./scenario-schema.ts";

export const SCENARIO_LIMITS = {
  maxFiles: 128,
  maxFileBytes: 64 * 1024,
  maxTotalBytes: 1024 * 1024,
  maxDepth: 32,
  maxNodes: 10_000,
  maxCollectionEntries: 1_000,
  maxScalarCharacters: 16 * 1024,
} as const;

export interface ScenarioDirectoryEntry {
  readonly name: string;
  readonly kind: "file" | "directory" | "symlink" | "other";
  readonly sizeBytes: number;
}

export interface ScenarioFileSystem {
  readDirectory(directory: string): Promise<readonly ScenarioDirectoryEntry[]>;
  readFile(directory: string, name: string): Promise<string>;
}

export interface ScenarioLoadIssue {
  readonly fileName: string;
  readonly code: string;
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
}

export class ScenarioLoadError extends Error {
  readonly issues: readonly ScenarioLoadIssue[];

  constructor(issues: readonly ScenarioLoadIssue[]) {
    super(`Scenario loading failed with ${issues.length} issue(s)`);
    this.name = "ScenarioLoadError";
    this.issues = issues;
  }
}

export interface LoadedScenario {
  readonly fileName: string;
  readonly scenario: Scenario;
}

const issue = (fileName: string, code: string, message: string): ScenarioLoadIssue => ({
  fileName,
  code,
  message,
});

const utf8Length = (value: string): number => new TextEncoder().encode(value).byteLength;

const hasUnsafeDirective = (doc: ReturnType<typeof parseDocument>): boolean => {
  const directives = doc.directives;
  if (!directives) return false;
  if (directives.yaml.explicit) return true;
  return Object.keys(directives.tags).some((handle) => handle !== "!!");
};

const validateYamlTree = (root: Node | null, fileName: string): void => {
  if (!root || !isMap(root)) {
    throw new ScenarioLoadError([
      issue(fileName, "unsupported_yaml_structure", "Scenario YAML must be a top-level mapping"),
    ]);
  }

  const pending: Array<{ node: Node; depth: number }> = [{ node: root, depth: 0 }];
  let nodeCount = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    nodeCount += 1;
    if (nodeCount > SCENARIO_LIMITS.maxNodes || current.depth > SCENARIO_LIMITS.maxDepth) {
      throw new ScenarioLoadError([
        issue(fileName, "yaml_resource_limit", "YAML nesting or node-count limit exceeded"),
      ]);
    }

    const { node, depth } = current;
    if (isAlias(node)) {
      throw new ScenarioLoadError([
        issue(fileName, "unsupported_yaml_structure", "YAML aliases are not supported"),
      ]);
    }
    if (isScalar(node)) {
      if (node.anchor || node.tag) {
        throw new ScenarioLoadError([
          issue(
            fileName,
            "unsupported_yaml_structure",
            "YAML anchors and explicit tags are not supported",
          ),
        ]);
      }
      if (
        typeof node.value === "string" &&
        node.value.length > SCENARIO_LIMITS.maxScalarCharacters
      ) {
        throw new ScenarioLoadError([
          issue(fileName, "yaml_resource_limit", "YAML scalar length limit exceeded"),
        ]);
      }
      continue;
    }
    if (isMap(node)) {
      if (node.anchor || node.tag) {
        throw new ScenarioLoadError([
          issue(
            fileName,
            "unsupported_yaml_structure",
            "YAML anchors and explicit tags are not supported",
          ),
        ]);
      }
      if (node.items.length > SCENARIO_LIMITS.maxCollectionEntries) {
        throw new ScenarioLoadError([
          issue(fileName, "yaml_resource_limit", "YAML mapping entry limit exceeded"),
        ]);
      }
      for (const pair of node.items) {
        if (isScalar(pair.key) && pair.key.value === "<<") {
          throw new ScenarioLoadError([
            issue(fileName, "unsupported_yaml_structure", "YAML merge keys are not supported"),
          ]);
        }
        if (isNode(pair.key)) pending.push({ node: pair.key, depth: depth + 1 });
        if (isNode(pair.value)) pending.push({ node: pair.value, depth: depth + 1 });
      }
      continue;
    }
    if (isSeq(node)) {
      if (node.anchor || node.tag) {
        throw new ScenarioLoadError([
          issue(
            fileName,
            "unsupported_yaml_structure",
            "YAML anchors and explicit tags are not supported",
          ),
        ]);
      }
      if (node.items.length > SCENARIO_LIMITS.maxCollectionEntries) {
        throw new ScenarioLoadError([
          issue(fileName, "yaml_resource_limit", "YAML sequence entry limit exceeded"),
        ]);
      }
      for (const item of node.items) {
        if (item) pending.push({ node: item as Node, depth: depth + 1 });
      }
      continue;
    }
    throw new ScenarioLoadError([
      issue(fileName, "unsupported_yaml_structure", "Unsupported YAML node type"),
    ]);
  }
};

const yamlIssue = (fileName: string, error: YAMLParseError | YAMLWarning): ScenarioLoadIssue => {
  const position = error.linePos?.[0];
  const code = error.code === "RESOURCE_EXHAUSTION" ? "yaml_resource_limit" : "yaml_parse_error";
  return {
    fileName,
    code,
    message: `Malformed or unsupported YAML (${error.code})`,
    ...(position ? { line: position.line, column: position.col } : {}),
  };
};

const parseScenario = (fileName: string, source: string): Scenario => {
  let doc: ReturnType<typeof parseDocument>;
  try {
    doc = parseDocument(source, {
      version: "1.2",
      schema: "core",
      strict: true,
      uniqueKeys: true,
      stringKeys: true,
      merge: false,
      resolveKnownTags: false,
      customTags: [],
      prettyErrors: false,
      logLevel: "error",
    });
  } catch (error) {
    const code = error instanceof RangeError ? "yaml_resource_limit" : "yaml_parse_error";
    throw new ScenarioLoadError([issue(fileName, code, "YAML parser rejected the document")]);
  }

  if (doc.errors.length > 0) {
    throw new ScenarioLoadError(
      doc.errors.map((error) =>
        error.code === "MULTIPLE_DOCS"
          ? { ...yamlIssue(fileName, error), code: "multiple_documents" }
          : yamlIssue(fileName, error),
      ),
    );
  }
  if (doc.warnings.length > 0 || hasUnsafeDirective(doc)) {
    throw new ScenarioLoadError([
      issue(
        fileName,
        "unsupported_yaml_structure",
        "YAML warnings, directives or custom tags are not supported",
      ),
    ]);
  }

  validateYamlTree(doc.contents, fileName);
  let value: unknown;
  try {
    value = doc.toJS({ maxAliasCount: 0 });
  } catch (error) {
    const code = error instanceof RangeError ? "yaml_resource_limit" : "unsupported_yaml_structure";
    throw new ScenarioLoadError([
      issue(fileName, code, "YAML document could not be safely converted"),
    ]);
  }

  const result = ScenarioSchema.safeParse(value);
  if (!result.success) {
    throw new ScenarioLoadError(
      result.error.issues.map((validationIssue) => ({
        fileName,
        code: "scenario_validation_error",
        message: `Invalid scenario field: ${validationIssue.path.join(".") || "<root>"} (${validationIssue.code})`,
      })),
    );
  }
  return result.data;
};

const compareNames = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

export async function loadScenarios(
  fs: ScenarioFileSystem,
  directory: string,
): Promise<LoadedScenario[]> {
  let entries: readonly ScenarioDirectoryEntry[];
  try {
    entries = await fs.readDirectory(directory);
  } catch {
    throw new ScenarioLoadError([
      issue("<directory>", "directory_read_error", "Scenario directory could not be read"),
    ]);
  }

  const yamlEntries = entries
    .filter((entry) => entry.name.endsWith(".yaml"))
    .slice()
    .sort((a, b) => compareNames(a.name, b.name));
  if (yamlEntries.length === 0) {
    throw new ScenarioLoadError([
      issue("<directory>", "empty_directory", "Scenario directory contains no .yaml files"),
    ]);
  }

  const issues: ScenarioLoadIssue[] = [];
  if (yamlEntries.length > SCENARIO_LIMITS.maxFiles) {
    issues.push(issue("<directory>", "file_count_limit", "Scenario file-count limit exceeded"));
  }
  const seenNames = new Set<string>();
  let declaredTotalBytes = 0;
  for (const entry of yamlEntries) {
    if (seenNames.has(entry.name)) {
      issues.push(issue(entry.name, "duplicate_file_name", "Duplicate scenario filename"));
    }
    seenNames.add(entry.name);
    if (entry.name === "." || entry.name === ".." || /[\\/]/.test(entry.name)) {
      issues.push(
        issue(entry.name, "invalid_file_name", "Scenario filename must be a direct child"),
      );
    }
    if (entry.kind !== "file") {
      issues.push(
        issue(entry.name, "unsupported_file_type", "Scenario YAML entry must be a regular file"),
      );
      continue;
    }
    if (!Number.isSafeInteger(entry.sizeBytes) || entry.sizeBytes < 0) {
      issues.push(issue(entry.name, "invalid_file_size", "Scenario file size is unavailable"));
      continue;
    }
    if (entry.sizeBytes > SCENARIO_LIMITS.maxFileBytes) {
      issues.push(
        issue(entry.name, "file_too_large", "Scenario file exceeds the per-file size limit"),
      );
    }
    declaredTotalBytes += entry.sizeBytes;
  }
  if (declaredTotalBytes > SCENARIO_LIMITS.maxTotalBytes) {
    issues.push(
      issue("<directory>", "total_size_limit", "Scenario directory exceeds the total size limit"),
    );
  }
  if (issues.length > 0) throw new ScenarioLoadError(issues);

  const loaded: LoadedScenario[] = [];
  const seenIds = new Map<string, string>();
  let actualTotalBytes = 0;
  for (const entry of yamlEntries) {
    let source: string;
    try {
      source = await fs.readFile(directory, entry.name);
    } catch {
      issues.push(issue(entry.name, "file_read_error", "Scenario file could not be read"));
      continue;
    }
    const fileBytes = utf8Length(source);
    actualTotalBytes += fileBytes;
    if (fileBytes > SCENARIO_LIMITS.maxFileBytes) {
      issues.push(
        issue(entry.name, "file_too_large", "Scenario file exceeds the per-file size limit"),
      );
      continue;
    }
    if (actualTotalBytes > SCENARIO_LIMITS.maxTotalBytes) {
      issues.push(
        issue(entry.name, "total_size_limit", "Scenario directory exceeds the total size limit"),
      );
      continue;
    }
    try {
      const scenario = parseScenario(entry.name, source);
      const previous = seenIds.get(scenario.id);
      if (previous) {
        issues.push(
          issue(entry.name, "duplicate_scenario_id", `Scenario ID duplicates ${previous}`),
        );
      } else {
        seenIds.set(scenario.id, entry.name);
      }
      loaded.push({ fileName: entry.name, scenario });
    } catch (error) {
      if (error instanceof ScenarioLoadError) issues.push(...error.issues);
      else issues.push(issue(entry.name, "yaml_parse_error", "Scenario could not be parsed"));
    }
  }

  if (issues.length > 0) throw new ScenarioLoadError(issues);
  return loaded;
}
