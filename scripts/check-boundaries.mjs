#!/usr/bin/env node
/**
 * Enforces Lyceum's architectural invariants (see AGENTS.md "Invariants").
 *  1. packages/core depends on nothing but zod and contains no subject- or provider-specific code.
 *  2. packages/gateway depends on no other @lyceum package.
 *  3. Only packages/gateway may reference model-provider vendors.
 *  4. Only profile packages (packages/profile-*) may reference subject-specific tooling.
 * Add new rules here when you add new invariants.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

export function findBoundaryViolations(root) {
  const problems = [];
  // 1 & 2: dependency direction
  const corePkg = read(join(root, "packages/core/package.json"));
  const coreDeps = Object.keys({ ...corePkg.dependencies, ...corePkg.peerDependencies });
  for (const dep of coreDeps) {
    if (dep !== "zod") problems.push(`core must only depend on zod, found: ${dep}`);
  }
  const gatewayPkg = read(join(root, "packages/gateway/package.json"));
  for (const dep of Object.keys(gatewayPkg.dependencies ?? {})) {
    if (dep.startsWith("@lyceum/")) problems.push(`gateway must not depend on ${dep}`);
  }

  // 3 & 4: forbidden vocabulary outside the owning package
  const providerWords =
    /\b(openai|anthropic|ollama|openrouter|gemini|bedrock|vertex|llama\.cpp)\b/i;
  const subjectWords = /\b(sympy|pyodide|mathlive|katex)\b/i;

  const packagesDir = join(root, "packages");
  for (const pkg of readdirSync(packagesDir)) {
    const src = join(packagesDir, pkg, "src");
    if (!existsSync(src)) continue;
    for (const file of walk(src)) {
      if (!/\.(ts|tsx)$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
      const text = readFileSync(file, "utf8")
        .split("\n")
        .filter(
          (l) =>
            !l.trim().startsWith("*") && !l.trim().startsWith("//") && !l.trim().startsWith("/*"),
        )
        .join("\n");
      if (pkg !== "gateway" && providerWords.test(text)) {
        problems.push(
          `${file.replace(root, "")}: provider vendor referenced outside packages/gateway`,
        );
      }
      if (!pkg.startsWith("profile-") && subjectWords.test(text)) {
        problems.push(
          `${file.replace(root, "")}: subject-specific tooling referenced outside a profile`,
        );
      }
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
