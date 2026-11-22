#!/usr/bin/env node
/**
 * Keeps the repo readable by Codex (and other AGENTS.md-aware agents):
 *  1. Root AGENTS.md stays small (Codex caps combined instruction files; default 32 KiB).
 *  2. The longest AGENTS.md chain (root + one nested file) stays under the cap.
 *  3. Every skill in .agents/skills has valid frontmatter (name == folder, non-empty description).
 *  4. No agent-specific files that Codex ignores (CLAUDE.md, .claude/, .cursor/, copilot file).
 *  5. Every skill mentioned as `lyceum-*` in docs or AGENTS files exists.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const problems = [];
const CAP = 32 * 1024;

const walk = (dir, skip = new Set(["node_modules", ".git"])) =>
  readdirSync(dir).flatMap((name) => {
    if (skip.has(name)) return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p, skip) : [p];
  });

const agentsFiles = walk(root).filter((p) => basename(p) === "AGENTS.md");
const size = (p) => statSync(p).size;
const rootAgents = join(root, "AGENTS.md");
if (size(rootAgents) > 25_000)
  problems.push(`Root AGENTS.md is ${size(rootAgents)} bytes (keep under 25,000).`);
for (const f of agentsFiles) {
  if (f === rootAgents) continue;
  const chain = size(rootAgents) + size(f);
  if (chain > CAP - 2000)
    problems.push(
      `AGENTS chain for ${f.replace(root, "")} is ${chain} bytes; too close to the ${CAP} cap.`,
    );
}

const skillsDir = join(root, ".agents/skills");
const skillNames = existsSync(skillsDir) ? readdirSync(skillsDir) : [];
for (const name of skillNames) {
  const file = join(skillsDir, name, "SKILL.md");
  if (!existsSync(file)) {
    problems.push(`Skill ${name} has no SKILL.md`);
    continue;
  }
  const m = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/);
  if (!m) {
    problems.push(`Skill ${name}: missing frontmatter`);
    continue;
  }
  const fm = m[1];
  const n = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const d = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (n !== name) problems.push(`Skill ${name}: frontmatter name "${n}" must equal folder name`);
  if (!d) problems.push(`Skill ${name}: missing description`);
}

for (const ignored of ["CLAUDE.md", ".claude", ".cursor", ".github/copilot-instructions.md"]) {
  if (existsSync(join(root, ignored)))
    problems.push(
      `${ignored} exists but Codex does not read it; fold it into AGENTS.md or a skill.`,
    );
}

const textFiles = walk(root).filter(
  (p) => /\.(md|mdc)$/.test(p) && !p.includes(join(".agents", "skills")),
);
for (const f of textFiles) {
  for (const ref of readFileSync(f, "utf8").matchAll(/\blyceum-[a-z-]+\b/g)) {
    const n = ref[0];
    if (n === "lyceum-starter-kit") continue;
    if (!skillNames.includes(n))
      problems.push(`${f.replace(root, "")}: references unknown skill "${n}"`);
  }
}

if (problems.length > 0) {
  console.error(`Agent-file problems:\n - ${problems.join("\n - ")}`);
  process.exit(1);
}
console.log(`Agent files OK (${skillNames.length} skills, ${agentsFiles.length} AGENTS.md files)`);
