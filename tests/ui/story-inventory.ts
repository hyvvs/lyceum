import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import ts from "typescript";

export interface PrimitiveStory {
  id: string;
  title: string;
  exportName: string;
  importPath: string;
}

/** Explicitly gated primitives, including the owner-approved M0-017 Slice A families. */
export const PRIMITIVE_FAMILIES = [
  "Button",
  "Dialog",
  "Select",
  "Tabs",
  "Toast",
  "Tooltip",
  "VisuallyHidden",
  "GlassPanel",
  "GlassCard",
  "TintCard",
  "PillNav",
  "Dock",
  "RoundIconButton",
  "SegmentedControl",
  "StatCard",
  "BarChart",
  "MasteryRing",
  "ChatBubble",
] as const;

interface StorySource {
  importPath: string;
  source: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function exportedStoryNames(source: string, importPath: string): string[] {
  const ast = ts.createSourceFile(
    importPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const names: string[] = [];
  for (const statement of ast.statements) {
    if (!ts.canHaveModifiers(statement)) continue;
    if (!ts.getModifiers(statement)?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)) {
      continue;
    }
    if (
      !ts.isVariableStatement(statement) ||
      !(statement.declarationList.flags & ts.NodeFlags.Const)
    ) {
      throw new Error(`Unsupported story export in ${importPath}; update the inventory parser.`);
    }
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        throw new Error(`Unsupported destructured story export in ${importPath}`);
      }
      names.push(declaration.name.text);
    }
  }
  if (names.length === 0) throw new Error(`No story exports in ${importPath}`);
  return names;
}

/** Fail closed if the built Storybook index differs from exported primitive stories. */
export function validatePrimitivesStoryIndex(
  index: unknown,
  sourceFiles: readonly StorySource[],
): PrimitiveStory[] {
  if (!isRecord(index) || index.v !== 5 || !isRecord(index.entries)) {
    throw new Error("Missing or unsupported generated Storybook index v5; run storybook:build.");
  }
  if (sourceFiles.length === 0) throw new Error("No primitive Storybook source files found.");

  const expected = new Set<string>();
  for (const { importPath, source } of sourceFiles) {
    for (const exportName of exportedStoryNames(source, importPath)) {
      const key = `${importPath}#${exportName}`;
      if (expected.has(key)) throw new Error(`Duplicate story source export ${key}`);
      expected.add(key);
    }
  }

  const stories: PrimitiveStory[] = [];
  const observed = new Set<string>();
  for (const [id, candidate] of Object.entries(index.entries)) {
    if (!isRecord(candidate) || candidate.type !== "story") continue;
    const { title, importPath, exportName, tags } = candidate;
    const primitiveTitle = typeof title === "string" && title.startsWith("Primitives/");
    const primitiveSource =
      typeof importPath === "string" && importPath.startsWith("./packages/ui/src/");
    if (!primitiveTitle && !primitiveSource) {
      continue;
    }
    if (
      candidate.id !== id ||
      !primitiveTitle ||
      !primitiveSource ||
      typeof exportName !== "string" ||
      !Array.isArray(tags) ||
      !tags.includes("test")
    ) {
      throw new Error(`Invalid primitive story id/title/test tag: ${id}`);
    }
    const key = `${importPath}#${exportName}`;
    if (!expected.has(key) || observed.has(key)) {
      throw new Error(`Unexpected or duplicate generated primitive story ${key} (${id})`);
    }
    observed.add(key);
    stories.push({ id, title, importPath, exportName });
  }
  for (const key of expected) {
    if (!observed.has(key)) throw new Error(`Generated Storybook index is missing ${key}`);
  }
  if (stories.length === 0) throw new Error("No generated Primitives/* stories available for axe.");
  return stories.sort((a, b) => a.id.localeCompare(b.id));
}

function collectSources(folder: string): StorySource[] {
  const sources: StorySource[] = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) sources.push(...collectSources(path));
    else if (entry.isFile() && /\.stories\.tsx?$/.test(entry.name)) {
      sources.push({
        importPath: `./${relative(process.cwd(), path).split(sep).join("/")}`,
        source: readFileSync(path, "utf8"),
      });
    }
  }
  return sources;
}

export function generatedPrimitiveStories(): PrimitiveStory[] {
  const path = resolve(process.cwd(), "storybook-static/index.json");
  const index: unknown = JSON.parse(readFileSync(path, "utf8"));
  return validatePrimitivesStoryIndex(index, collectSources(resolve("packages/ui/src")));
}

export function storiesForFamily(family: string): PrimitiveStory[] {
  const stories = generatedPrimitiveStories();
  const allowedFamilies: readonly string[] = PRIMITIVE_FAMILIES;
  const families = [...new Set(stories.map((story) => story.title.slice("Primitives/".length)))];
  if (
    families.length !== allowedFamilies.length ||
    families.some((name) => !allowedFamilies.includes(name))
  ) {
    throw new Error(`Uncovered primitive story family: ${families.join(", ")}`);
  }
  const matching = stories.filter((story) => story.title === `Primitives/${family}`);
  if (!allowedFamilies.includes(family) || matching.length === 0) {
    throw new Error(`Missing axe story family ${family}`);
  }
  return matching;
}

/** Verify successful scans matched every generated ID, with no duplicates or omissions. */
export function assertStoryScanCoverage(
  stories: readonly PrimitiveStory[],
  scannedIds: string[],
): void {
  const expected = stories.map(({ id }) => id).sort();
  const actual = [...scannedIds].sort();
  if (expected.length !== actual.length || expected.some((id, index) => id !== actual[index])) {
    throw new Error(
      `Axe story coverage mismatch; expected ${expected.join(", ")}; scanned ${actual.join(", ")}`,
    );
  }
}
