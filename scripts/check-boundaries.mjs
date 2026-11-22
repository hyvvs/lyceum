#!/usr/bin/env node
/**
 * Enforces the dependency, source ownership, and deterministic-core rules in
 * AGENTS.md. Uses the TypeScript parser so strings/comments cannot masquerade
 * as imports or calls.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const sourceFileName = /\.[cm]?[jt]sx?$/;
const testFileName = /\.(test|spec)\.[cm]?[jt]sx?$/;
const relativeName = (root, file) => relative(root, file).split(sep).join("/");
const dependencyFields = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];
const ignoredDirs = new Set(["node_modules", "dist", "build", "coverage", ".git", ".turbo"]);

function walk(dir, root, problems) {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = join(dir, entry.name);
      if (ignoredDirs.has(entry.name)) return [];
      if (entry.isSymbolicLink()) {
        problems.push(`${relativeName(root, file)}: source symlinks are not allowed`);
        return [];
      }
      if (entry.isDirectory()) return walk(file, root, problems);
      return entry.isFile() ? [file] : [];
    });
}

function unwrap(expression) {
  let current = expression;
  while (current && ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function member(expression) {
  const node = unwrap(expression);
  if (ts.isPropertyAccessExpression(node)) {
    return { target: node.expression, name: node.name.text };
  }
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
    return { target: node.expression, name: node.argumentExpression.text };
  }
  return null;
}

function globalObject(expression, name) {
  const node = unwrap(expression);
  const property = member(node);
  return (
    (ts.isIdentifier(node) && node.text === name) ||
    (property?.name === name &&
      ts.isIdentifier(unwrap(property.target)) &&
      unwrap(property.target).text === "globalThis")
  );
}

function globalCall(expression, owner, method) {
  const property = member(expression);
  return property?.name === method && globalObject(property.target, owner);
}

function inspectSource(root, pkg, file, problems) {
  const contents = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true);
  const location = (node) => {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    return `${relativeName(root, file)}:${line + 1}:${character + 1}`;
  };
  const report = (node, message) => problems.push(`${location(node)}: ${message}`);

  function checkImport(node) {
    if (!node || !ts.isStringLiteralLike(node)) return;
    const specifier = node.text;
    if (specifier === "apps" || specifier.startsWith("apps/")) {
      report(node, `packages must not import from apps/: ${specifier}`);
      return;
    }
    if (specifier.startsWith(".")) {
      const parts = relativeName(root, resolve(dirname(file), specifier)).split("/");
      if (parts[0] === "apps") {
        report(node, `packages must not import from apps/: ${specifier}`);
      } else if (parts[0] === "packages" && parts[1] !== pkg) {
        report(
          node,
          `relative cross-package import; use the public @lyceum entry point: ${specifier}`,
        );
      }
      return;
    }
    const scoped = /^@lyceum\/([^/]+)(\/.*)?$/.exec(specifier);
    if (scoped && pkg === "gateway" && scoped[1] !== pkg) {
      report(node, `gateway must not import ${specifier}`);
    } else if (scoped && pkg === "core" && scoped[1] !== pkg) {
      report(node, `core must not import ${specifier}`);
    } else if (scoped && scoped[1] !== pkg && scoped[2]) {
      report(node, `deep cross-package import; use @lyceum/${scoped[1]}: ${specifier}`);
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      checkImport(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      checkImport(node.moduleReference.expression);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      checkImport(node.argument.literal);
    }

    if (ts.isCallExpression(node)) {
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require") ||
        (member(node.expression)?.name === "resolve" &&
          ts.isIdentifier(unwrap(member(node.expression).target)) &&
          unwrap(member(node.expression).target).text === "require") ||
        (member(node.expression)?.name === "require" &&
          ts.isIdentifier(unwrap(member(node.expression).target)) &&
          unwrap(member(node.expression).target).text === "module")
      ) {
        checkImport(node.arguments[0]);
      }
      if (pkg === "core" && !testFileName.test(file)) {
        if (globalCall(node.expression, "Date", "now")) {
          report(node, "core must use injected Clock/Rng instead of Date.now()");
        }
        if (globalCall(node.expression, "Math", "random")) {
          report(node, "core must use injected Clock/Rng instead of Math.random()");
        }
      }
    }
    if (
      pkg === "core" &&
      !testFileName.test(file) &&
      ts.isNewExpression(node) &&
      globalObject(node.expression, "Date") &&
      (!node.arguments || node.arguments.length === 0)
    ) {
      report(node, "core must use injected Clock/Rng instead of new Date()");
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  // The existing vendor and subject tooling rules also apply to non-import usage.
  // Skip comment-only lines, preserving the original broad vocabulary guard.
  const code = contents
    .split("\n")
    .filter(
      (line) =>
        !line.trim().startsWith("*") &&
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("/*"),
    )
    .join("\n");
  const providerWords =
    /\b(openai|anthropic|ollama|openrouter|gemini|bedrock|vertex|llama\.cpp)\b/i;
  const subjectWords = /\b(sympy|pyodide|mathlive|katex)\b/i;
  if (pkg !== "gateway" && providerWords.test(code)) {
    problems.push(
      `${relativeName(root, file)}: provider vendor referenced outside packages/gateway`,
    );
  }
  if (!pkg.startsWith("profile-") && subjectWords.test(code)) {
    problems.push(
      `${relativeName(root, file)}: subject-specific tooling referenced outside a profile`,
    );
  }
}

export function findBoundaryViolations(root) {
  const problems = [];
  const corePkg = read(join(root, "packages/core/package.json"));
  const declaredDependencies = (manifest) =>
    new Set(dependencyFields.flatMap((field) => Object.keys(manifest[field] ?? {})));
  for (const dep of declaredDependencies(corePkg)) {
    if (dep !== "zod") problems.push(`core must only depend on zod, found: ${dep}`);
  }
  const gatewayPkg = read(join(root, "packages/gateway/package.json"));
  for (const dep of declaredDependencies(gatewayPkg)) {
    if (dep.startsWith("@lyceum/")) problems.push(`gateway must not depend on ${dep}`);
  }

  function checkTypecheck(manifest, name) {
    if (typeof manifest.scripts?.typecheck !== "string" || !manifest.scripts.typecheck.trim()) {
      problems.push(`${name}: missing typecheck script in package.json`);
    }
  }

  function exportTargets(value) {
    if (typeof value === "string") return [value];
    if (value && typeof value === "object") return Object.values(value).flatMap(exportTargets);
    return [];
  }

  const packagesDir = join(root, "packages");
  for (const pkg of readdirSync(packagesDir).sort()) {
    const manifestPath = join(packagesDir, pkg, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = read(manifestPath);
    checkTypecheck(manifest, pkg);
    for (const target of exportTargets(manifest.exports)) {
      if (!target.startsWith(".")) continue;
      const pkgDir = join(packagesDir, pkg);
      const outside = relative(pkgDir, resolve(pkgDir, target));
      if (outside === ".." || outside.startsWith(`..${sep}`) || isAbsolute(outside)) {
        problems.push(`${pkg}: export target escapes package: ${target}`);
      }
    }
    for (const file of walk(join(packagesDir, pkg), root, problems)) {
      if (sourceFileName.test(file) && !file.endsWith(".d.ts")) {
        inspectSource(root, pkg, file, problems);
      }
    }
  }

  const appsDir = join(root, "apps");
  if (existsSync(appsDir)) {
    for (const app of readdirSync(appsDir).sort()) {
      const manifestPath = join(appsDir, app, "package.json");
      if (existsSync(manifestPath)) checkTypecheck(read(manifestPath), `apps/${app}`);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = findBoundaryViolations(fileURLToPath(new URL("..", import.meta.url)));
  if (problems.length > 0) {
    console.error(`Boundary violations:\n - ${problems.join("\n - ")}`);
    process.exit(1);
  }
  console.log("Boundaries OK");
}
