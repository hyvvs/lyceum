#!/usr/bin/env node
/**
 * Fail-closed companion to cargo-deny 0.19.9. cargo-deny can match an exact
 * crate version, but not its checksum/parent graph; advisory ignores match an
 * ID, not a specific crate version or supported target. Those gaps are checked
 * here. cargo-deny and unrestricted cargo-audit MUST still run in native CI.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const approvedIds = [
  "cssparser@0.37.0",
  "cssparser@0.38.0",
  "cssparser-macros@0.7.1",
  "dtoa-short@0.3.5",
  "option-ext@0.2.0",
  "selectors@0.38.0",
  "selectors@0.41.0",
];
const reviewedTargets = [
  "x86_64-pc-windows-msvc",
  "aarch64-pc-windows-msvc",
  "x86_64-apple-darwin",
  "aarch64-apple-darwin",
];
const reviewedLinux = "x86_64-unknown-linux-gnu";
const reviewedExpiry = "2027-02-28";
const reviewedSource = "registry+https://github.com/rust-lang/crates.io-index";
const reviewedRustSec = "RUSTSEC-2024-0370";
const reviewedIntermediates = ["dom_query@0.28.0", "dom_query@0.30.0", "dirs-sys@0.5.0"];
// Audited ancestry fingerprint covers every reverse-dependency hop from each
// approved package (and the advisory) to the application root, not just its
// immediate parent. Change only in a separately reviewed AGENTS §13 rule PR.
const reviewedAncestrySha256 = "5a3e3df820f2ca520e9261d30892ff6895ad7edee2fb565988bb74aa8f53f72c"; // pragma: allowlist secret — published-lockfile ancestry SHA-256, not a credential
const permissive = [
  "0BSD",
  "Apache-2.0",
  "Apache-2.0 WITH LLVM-exception",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BSL-1.0",
  "CC0-1.0",
  "CDLA-Permissive-2.0",
  "ISC",
  "MIT",
  "MIT-0",
  "Unicode-3.0",
  "Unlicense",
  "Zlib",
];

function sameValues(actual, expected) {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    actual.every((value) => expected.includes(value))
  );
}

function field(section, key) {
  return new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"\\s*$`, "m").exec(section)?.[1];
}

// The Cargo.lock format is deliberately restricted to the standard
// [[package]]/quoted-scalar/dependencies-array form. Unknown shapes fail closed.
export function parseLockedPackages(text) {
  const normalized = text.replace(/^\s*#.*$/gm, "").trimStart();
  if (!/^version = [34]\s*\r?\n\s*\[\[package\]\]/.test(normalized)) {
    throw Error("unrecognized Cargo.lock format");
  }
  const chunks = normalized.split(/^\[\[package\]\]\s*$/m).slice(1);
  if (chunks.length === 0) throw Error("Cargo.lock contains no packages");
  return chunks.map((chunk) => {
    const name = field(chunk, "name");
    const version = field(chunk, "version");
    if (!name || !version) throw Error("malformed Cargo.lock package identity");
    const dependencies = /^dependencies\s*=\s*\[([\s\S]*?)^\]\s*$/m.exec(chunk)?.[1];
    if (/^dependencies\s*=/m.test(chunk) && dependencies === undefined) {
      throw Error(`malformed dependencies in ${name}@${version}`);
    }
    const recognized = chunk
      .replace(/^\s*(name|version|source|checksum)\s*=\s*"[^"]+"\s*$/gm, "")
      .replace(/^dependencies\s*=\s*\[[\s\S]*?^\]\s*$/gm, "")
      .trim();
    if (recognized) throw Error(`unreviewed Cargo.lock package syntax in ${name}@${version}`);
    const entries = dependencies?.match(/"[^"]+"/g) ?? [];
    if (dependencies?.replace(/"[^"]+"/g, "").replace(/[\s,]/g, "").length) {
      throw Error(`malformed dependencies in ${name}@${version}`);
    }
    return {
      name,
      version,
      source: field(chunk, "source"),
      checksum: field(chunk, "checksum"),
      dependencies: entries.map((item) => item.slice(1, -1)),
    };
  });
}

function splitDeny(text) {
  const sections = new Map();
  let current = "";
  for (const line of text.split(/\r?\n/)) {
    const header = /^\s*(\[\[?[^\]]+\]\]?)\s*$/.exec(line);
    if (header) {
      current = header[1];
      const allowed = ["[licenses]", "[advisories]", "[sources]", "[[licenses.exceptions]]"];
      if (!allowed.includes(current)) throw Error(`unreviewed cargo-deny section ${current}`);
      if (!sections.has(current)) sections.set(current, []);
      if (current !== "[[licenses.exceptions]]" && sections.get(current).length > 0) {
        throw Error(`duplicate cargo-deny section ${current}`);
      }
      sections.get(current).push("");
    } else if (current) {
      const blocks = sections.get(current);
      blocks[blocks.length - 1] += `${line.split("#")[0]}\n`;
    } else if (line.trim() && !line.trim().startsWith("#")) {
      throw Error("unexpected cargo-deny content outside sections");
    }
  }
  return sections;
}

function quotedList(block, key) {
  const match = new RegExp(`^\\s*${key}\\s*=\\s*\\[([\\s\\S]*?)\\]`, "m").exec(block);
  if (!match) throw Error(`cargo-deny missing array ${key}`);
  const values = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (match[1].replace(/"[^"]+"/g, "").replace(/[\s,]/g, "")) {
    throw Error(`cargo-deny invalid values in ${key}`);
  }
  return values;
}

function configValue(block, key, value) {
  return new RegExp(`^\\s*${key}\\s*=\\s*${value}\\s*$`, "m").test(block);
}

export function checkDenyConfiguration(text, policy) {
  const errors = [];
  let sections;
  try {
    sections = splitDeny(text);
  } catch (error) {
    return [String(error)];
  }
  const licenses = sections.get("[licenses]")?.[0] ?? "";
  const advisories = sections.get("[advisories]")?.[0] ?? "";
  const sources = sections.get("[sources]")?.[0] ?? "";
  try {
    if (!sameValues(quotedList(licenses, "allow"), permissive)) {
      errors.push("global license allowlist changed from the reviewed permissive-only set");
    }
  } catch (error) {
    errors.push(String(error));
  }
  for (const key of ["include-build", "include-dev"]) {
    if (!configValue(licenses, key, "true")) errors.push(`cargo-deny ${key} must remain true`);
  }
  if (!configValue(licenses, "confidence-threshold", "0\\.8")) {
    errors.push("cargo-deny license confidence threshold must remain 0.8");
  }
  if (/\b(exceptions|targets|exclude|ignore-sources)\s*=/.test(licenses)) {
    errors.push("unreviewed license policy shortcut");
  }
  const exceptions = sections.get("[[licenses.exceptions]]") ?? [];
  const ids = [];
  for (const block of exceptions) {
    const crate = field(block, "crate");
    ids.push(crate);
    if (!crate || !/^\s*crate\s*=\s*"[^"]+"\s*$/m.test(block)) {
      errors.push("malformed or missing crate identity in license exception");
    }
    try {
      if (!sameValues(quotedList(block, "allow"), ["MPL-2.0"])) {
        errors.push(`license exception ${crate} allows more than MPL-2.0`);
      }
    } catch (error) {
      errors.push(String(error));
    }
    if (
      block
        .replace(/^\s*crate\s*=\s*"[^"]+"\s*$/m, "")
        .replace(/^\s*allow\s*=\s*\[[\s\S]*?\]\s*$/m, "")
        .trim()
    ) {
      errors.push(`unreviewed fields in license exception ${crate}`);
    }
  }
  if (!sameValues(ids, approvedIds)) {
    errors.push("cargo-deny license exceptions are not exactly seven approved package versions");
  }
  if (
    !sameValues(
      policy.allowedMpl.map((item) => `${item.name}@${item.version}`),
      approvedIds,
    )
  ) {
    errors.push("native policy manifest contains unauthorized exception identity");
  }
  if (
    !/^\s*ignore\s*=\s*\[\s*\{\s*id\s*=\s*"RUSTSEC-2024-0370"\s*,\s*reason\s*=\s*"[^"]{12,}"\s*\}\s*\]\s*$/m.test(
      advisories,
    ) ||
    /\b(unmaintained|unsound|vulnerability|targets|exclude)\s*=/.test(advisories)
  ) {
    errors.push("cargo-deny may temporarily ignore only RUSTSEC-2024-0370, with a reason");
  }
  if (!configValue(sources, "unknown-registry", '"deny"')) {
    errors.push("unknown registries must remain denied");
  }
  if (!configValue(sources, "unknown-git", '"deny"')) {
    errors.push("unknown Git sources must remain denied");
  }
  for (const [section, blocks] of sections) {
    if (section === "[[licenses.exceptions]]") continue;
    const content = blocks[0]
      .replace(
        /^\s*(allow|include-dev|include-build|confidence-threshold|ignore|unknown-registry|unknown-git)\s*=\s*\[[\s\S]*?\]\s*$/gm,
        "",
      )
      .replace(
        /^\s*(include-dev|include-build|confidence-threshold|unknown-registry|unknown-git)\s*=\s*[^\n]+$/gm,
        "",
      )
      .replace(/^\s*ignore\s*=\s*\[\s*\{[^\n]+\}\s*\]\s*$/gm, "")
      .trim();
    if (content)
      errors.push(`unreviewed cargo-deny setting in ${section}: ${content.slice(0, 80)}`);
  }
  return errors;
}

export function checkLockedGraph(packages, policy) {
  const errors = [];
  errors.push(...checkPolicyManifest(policy));
  const ids = (p) => `${p.name}@${p.version}`;
  const byId = new Map();
  const versions = new Map();
  for (const pkg of packages) {
    const id = ids(pkg);
    if (byId.has(id)) errors.push(`duplicate Cargo.lock identity ${id}`);
    byId.set(id, pkg);
    versions.set(pkg.name, [...(versions.get(pkg.name) ?? []), pkg.version]);
  }
  const parents = (child) =>
    packages
      .filter((pkg) =>
        pkg.dependencies.some((dependency) => {
          const pair = dependency.split(" ");
          return (
            pair[0] === child.name &&
            (pair[1] === child.version ||
              (pair.length === 1 && versions.get(child.name)?.length === 1))
          );
        }),
      )
      .map(ids);
  for (const entry of [
    ...policy.allowedMpl,
    ...policy.reviewedIntermediates,
    policy.temporaryAdvisory,
  ]) {
    const id = ids(entry);
    const pkg = byId.get(id);
    if (!pkg) {
      errors.push(`approved locked crate absent: ${id}`);
      continue;
    }
    if (pkg.checksum !== entry.checksum || pkg.source !== reviewedSource) {
      errors.push(`source/checksum drift for ${id}`);
    }
    if (!sameValues(parents(pkg), entry.parents)) {
      errors.push(`changed incoming dependency relationships for ${id}`);
    }
  }
  const reviewedVersions = new Map();
  for (const allowed of [...policy.allowedMpl, policy.temporaryAdvisory]) {
    if (!reviewedVersions.has(allowed.name)) reviewedVersions.set(allowed.name, new Set());
    reviewedVersions.get(allowed.name).add(allowed.version);
  }
  for (const [name, reviewed] of reviewedVersions) {
    if (versions.get(name)?.some((version) => !reviewed.has(version))) {
      errors.push(`unreviewed locked version of ${name}`);
    }
  }
  if (computeAncestrySha256(packages) !== reviewedAncestrySha256) {
    errors.push("reviewed lockfile ancestry, origin or checksum changed");
  }
  if (
    policy.temporaryAdvisory.id !== "RUSTSEC-2024-0370" ||
    policy.temporaryAdvisory.classification !== "unmaintained" ||
    policy.temporaryAdvisory.name !== "proc-macro-error" ||
    policy.temporaryAdvisory.version !== "1.0.4"
  ) {
    errors.push("temporary RustSec identity/category changed without review");
  }
  return errors;
}

export function computeAncestrySha256(packages) {
  const versions = new Map();
  for (const pkg of packages)
    versions.set(pkg.name, [...(versions.get(pkg.name) ?? []), pkg.version]);
  const id = (pkg) => `${pkg.name}@${pkg.version}`;
  const byId = new Map(packages.map((pkg) => [id(pkg), pkg]));
  const reverse = new Map();
  for (const parent of packages) {
    for (const dependency of parent.dependencies) {
      const [name, version] = dependency.split(" ");
      const childVersion =
        version || (versions.get(name)?.length === 1 ? versions.get(name)[0] : null);
      if (!childVersion) continue;
      const childId = `${name}@${childVersion}`;
      if (!byId.has(childId)) continue;
      reverse.set(childId, [...(reverse.get(childId) ?? []), id(parent)]);
    }
  }
  const todo = [...approvedIds, "proc-macro-error@1.0.4"];
  const visited = new Set();
  while (todo.length) {
    const next = todo.pop();
    if (visited.has(next)) continue;
    visited.add(next);
    todo.push(...(reverse.get(next) ?? []));
  }
  const ancestry = [...visited].sort().map((key) => {
    const pkg = byId.get(key);
    return {
      id: key,
      source: pkg?.source ?? null,
      checksum: pkg?.checksum ?? null,
      parents: [...(reverse.get(key) ?? [])].sort(),
    };
  });
  return createHash("sha256").update(JSON.stringify(ancestry)).digest("hex");
}

export function checkPolicyManifest(policy, now = new Date()) {
  const errors = [];
  const advisory = policy?.temporaryAdvisory ?? {};
  if (
    policy?.schemaVersion !== 1 ||
    policy?.policyOwner !== "Repository maintainers" ||
    policy?.source !== reviewedSource ||
    policy?.reviewBy !== reviewedExpiry
  ) {
    errors.push("native policy identity, owner, source or fixed review deadline changed");
  }
  // Expiry is interpreted in UTC: the exception expires at 00:00 UTC on March 1.
  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime()) ||
    now.getTime() >= Date.parse("2027-03-01T00:00:00Z")
  ) {
    errors.push("temporary RustSec and MPL exception review expired on 2027-02-28 UTC");
  }
  if (
    !Array.isArray(policy?.allowedMpl) ||
    !sameValues(
      policy.allowedMpl.map((p) => `${p.name}@${p.version}`),
      approvedIds,
    )
  ) {
    errors.push("native policy manifest has an unauthorized MPL package/version");
  }
  if (!Array.isArray(policy?.reviewedIntermediates)) errors.push("reviewed ancestry is missing");
  if (
    !Array.isArray(policy?.reviewedIntermediates) ||
    !sameValues(
      policy.reviewedIntermediates.map((p) => `${p.name}@${p.version}`),
      reviewedIntermediates,
    )
  ) {
    errors.push("reviewed upstream intermediary identities changed");
  }
  for (const p of [
    ...(policy?.allowedMpl ?? []),
    ...(policy?.reviewedIntermediates ?? []),
    advisory,
  ]) {
    if (
      !p.name ||
      !p.version ||
      !/^[0-9a-f]{64}$/.test(p.checksum ?? "") ||
      !Array.isArray(p.parents) ||
      new Set(p.parents).size !== p.parents.length
    ) {
      errors.push(
        `missing mandatory exact checksum/parent identity: ${p.name ?? "unknown"}@${p.version ?? "unknown"}`,
      );
    }
  }
  if (
    advisory.id !== reviewedRustSec ||
    advisory.classification !== "unmaintained" ||
    advisory.name !== "proc-macro-error" ||
    advisory.version !== "1.0.4" ||
    advisory.unsupportedTarget !== reviewedLinux ||
    !Array.isArray(advisory.supportedTargets) ||
    !sameValues(advisory.supportedTargets, reviewedTargets)
  ) {
    errors.push("temporary advisory identity, classification or reviewed target set changed");
  }
  return errors;
}

/** RustSec advisory DB metadata, read AFTER unrestricted cargo-audit refresh. */
export function checkRustSecAdvisory(markdown) {
  const match = /^```toml\r?\n([\s\S]*?)\r?\n```(?:\r?\n|$)/.exec(markdown);
  if (!match) return ["RustSec advisory TOML front matter missing"];
  const blocks = match[1].trim().split(/^\[([^\]]+)\]\s*$/m);
  if (
    blocks.length !== 5 ||
    blocks[0].trim() !== "" ||
    blocks[1] !== "advisory" ||
    blocks[3] !== "versions"
  ) {
    return ["RustSec advisory sections changed; independent risk review required"];
  }
  const parse = (s) => {
    const m = new Map();
    for (const line of s
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)) {
      const pair = /^([\w-]+)\s*=\s*("[^"]*"|\[\s*\])$/.exec(line);
      if (!pair || m.has(pair[1])) return null;
      m.set(pair[1], pair[2]);
    }
    return m;
  };
  const advisory = parse(blocks[2]);
  const versions = parse(blocks[4]);
  if (
    !advisory ||
    !versions ||
    !sameValues([...advisory.keys()], ["id", "package", "date", "informational", "url"]) ||
    !sameValues([...versions.keys()], ["patched"]) ||
    advisory.get("id") !== '"RUSTSEC-2024-0370"' ||
    advisory.get("package") !== '"proc-macro-error"' ||
    advisory.get("informational") !== '"unmaintained"' ||
    advisory.get("date") !== '"2024-09-01"' ||
    advisory.get("url") !== '"https://gitlab.com/CreepySkeleton/proc-macro-error/-/issues/20"' ||
    versions.get("patched") !== "[]"
  ) {
    return [
      "RustSec advisory identity, classification, vulnerability status or affected scope changed",
    ];
  }
  return [];
}

/** Cargo's actual resolved package licenses, not an assertion in our JSON. */
export function checkResolvedLicenseMetadata(packages) {
  const errors = [];
  const found = [];
  for (const pkg of packages) {
    const id = `${pkg.name}@${pkg.version}`;
    // SPDX expressions may contain nested parentheses, spacing and OR/AND.
    // License choices never make an additional MPL-bearing crate authorized.
    const includesMpl = /(?:^|[^A-Za-z0-9.-])MPL-2\.0(?=$|[^A-Za-z0-9.-])/.test(pkg.license ?? "");
    if (includesMpl) {
      if (!approvedIds.includes(id)) errors.push(`unauthorized MPL-2.0 dependency: ${id}`);
      else found.push(id);
    }
    if (approvedIds.includes(id) && pkg.license !== "MPL-2.0")
      errors.push(`reviewed MPL license metadata changed: ${id}`);
    if (approvedIds.includes(id) && pkg.source !== reviewedSource) {
      errors.push(`reviewed MPL package registry changed: ${id}`);
    }
  }
  if (!sameValues(found, approvedIds))
    errors.push("resolved licenses are not exactly the seven reviewed MPL identities");
  return errors;
}

export function checkRealRustSecDatabase(advisoryDbRoot) {
  const errors = [];
  const advisoryPath = join(advisoryDbRoot, "crates", "proc-macro-error", `${reviewedRustSec}.md`);
  try {
    const origin = execFileSync("git", ["-C", advisoryDbRoot, "remote", "get-url", "origin"], {
      encoding: "utf8",
    }).trim();
    if (!/^https:\/\/github\.com\/RustSec\/advisory-db(?:\.git)?$/i.test(origin)) {
      errors.push("RustSec DB is not from the reviewed official upstream origin");
    }
    const trackedChanges = execFileSync(
      "git",
      ["-C", advisoryDbRoot, "status", "--porcelain", "--untracked-files=no"],
      { encoding: "utf8" },
    ).trim();
    if (trackedChanges) errors.push("RustSec advisory database contains uncommitted changes");
    errors.push(...checkRustSecAdvisory(readFileSync(advisoryPath, "utf8")));
  } catch (error) {
    errors.push(`cannot verify current authoritative RustSec advisory: ${error}`);
  }
  return errors;
}

export function checkRustSecDatabaseRevisions(auditRevision, denyRevision) {
  if (!/^[a-f0-9]{40}$/.test(auditRevision) || !/^[a-f0-9]{40}$/.test(denyRevision)) {
    return ["invalid or missing canonical RustSec database revision"];
  }
  return auditRevision === denyRevision
    ? []
    : ["cargo-audit and cargo-deny advisory DB revisions differ"];
}

/** Compare the two authoritative on-disk snapshots actually used by the tools.
 * cargo-audit refreshes advisory-db; cargo-deny fetches advisory-dbs/...
 * Recheck both only AFTER the unrestricted cargo-deny invocation.
 */
export function checkDualRustSecDatabases(cargoHome) {
  const errors = [];
  const auditDb = join(cargoHome, "advisory-db");
  errors.push(...checkRealRustSecDatabase(auditDb));
  try {
    const denyDir = join(cargoHome, "advisory-dbs");
    const candidates = readdirSync(denyDir, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory() && /^advisory-db-[a-f0-9]{16}$/.test(entry.name),
    );
    if (candidates.length !== 1) {
      errors.push("cargo-deny advisory database missing or ambiguous");
      return errors;
    }
    const denyDb = join(denyDir, candidates[0].name);
    errors.push(...checkRealRustSecDatabase(denyDb));
    const revision = (dir) =>
      execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    errors.push(...checkRustSecDatabaseRevisions(revision(auditDb), revision(denyDb)));
  } catch (error) {
    errors.push(`cannot compare cargo-audit and cargo-deny advisory DB revisions: ${error}`);
  }
  return errors;
}

/** Narrow YAML layout inspection for our reviewed GitHub Actions job schema.
 * Unknown condition/failure controls on mandatory jobs/steps fail closed.
 */
function workflowJob(text, name) {
  const found = new RegExp(`^ {2}${name}:\\s*$`, "m").exec(text);
  if (!found) return null;
  const rest = text.slice(found.index + found[0].length);
  const next = /^ {2}[a-z][a-z0-9-]*:\s*$/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function workflowSteps(section) {
  const steps = [];
  for (const line of section.split(/\r?\n/)) {
    if (/^ {6}- /.test(line)) steps.push([line]);
    else if (steps.length) steps[steps.length - 1].push(line);
  }
  return steps.map((lines) => lines.join("\n"));
}

function mandatoryJobControls(section, label, conditionalSteps = []) {
  if (!section) return [`${label} job is missing`];
  const errors = [];
  // Accept only this repo's reviewed, *unquoted* job/step property grammar.
  // This intentionally rejects YAML aliases, quoted keys, and new controls
  // rather than attempting to parse the entire GitHub Actions YAML language.
  const jobKeys = new Set();
  for (const match of section.matchAll(/^ {4}([^\s:]+):/gm)) {
    if (jobKeys.has(match[1])) errors.push(`${label} duplicate job YAML control: ${match[1]}`);
    jobKeys.add(match[1]);
    if (!["name", "runs-on", "timeout-minutes", "steps"].includes(match[1])) {
      errors.push(`${label} unreviewed job control: ${match[1]}`);
    }
  }
  if (/^ {4}["']|^ {8}["']|^ {4,8}<<:/m.test(section)) {
    errors.push(`${label} quoted or merged YAML controls require new policy review`);
  }
  const steps = workflowSteps(section);
  for (const step of steps) {
    const first = /^ {6}- ([^\s:]+):/.exec(step)?.[1];
    if (!first || !["name", "run", "uses"].includes(first)) {
      errors.push(`${label} unreviewed initial step property`);
    }
    const seen = new Set([first]);
    for (const match of step.matchAll(/^ {8}([^\s:]+):/gm)) {
      if (seen.has(match[1])) errors.push(`${label} duplicate step YAML control: ${match[1]}`);
      seen.add(match[1]);
      if (
        !["name", "run", "if", "uses", "with", "shell", "working-directory", "env", "id"].includes(
          match[1],
        )
      ) {
        errors.push(`${label} unreviewed step control: ${match[1]}`);
      }
    }
    const conditions = [...step.matchAll(/^ {8}if:\s*(.+)$/gm)].map((m) => m[1]);
    const shells = [...step.matchAll(/^ {8}shell:\s*(.+)$/gm)].map((m) => m[1]);
    if (
      shells.length > 0 &&
      !(
        label === "general CI secrets" &&
        step.includes("- name: Reject suspected credentials\n") &&
        sameValues(shells, ["bash"])
      )
    ) {
      errors.push(`${label} unreviewed shell execution override`);
    }
    const eligible = conditionalSteps.find((name) => step.includes(`name: ${name}\n`));
    const expected = "${{ hashFiles('apps/desktop/src-tauri/Cargo.toml') != '' }}";
    if (eligible) {
      if (!sameValues(conditions, [expected])) {
        errors.push(`${label} exact conditional gate missing on ${eligible}`);
      }
    } else if (conditions.length) {
      errors.push(`${label} unreviewed condition on mandatory step`);
    }
  }
  for (const name of conditionalSteps) {
    if (steps.filter((step) => step.includes(`name: ${name}\n`)).length !== 1) {
      errors.push(`${label} reviewed step ${name} is absent or duplicated`);
    }
  }
  return errors;
}

function hasRunnableStep(section, command) {
  return workflowSteps(section).some((step) =>
    step
      .split(/\r?\n/)
      .some((line) => line === `      - ${command}` || line === `        ${command}`),
  );
}

const pinnedRustInstallCommands = [
  "cargo +1.94.0 install cargo-audit --version 0.23.0 --locked",
  "cargo +1.94.0 install cargo-deny --version 0.19.9 --locked",
];

function hasPinnedRustInstaller(section, stepName) {
  const step = workflowSteps(section).find((candidate) =>
    candidate.includes(`- name: ${stepName}\n`),
  );
  const commands = step
    ?.split(/\r?\n/)
    .filter((line) => line.startsWith("          ") && line.trim());
  return Boolean(
    step?.includes("        run: |\n") &&
      sameValues(
        commands ?? [],
        pinnedRustInstallCommands.map((command) => `          ${command}`),
      ),
  );
}

/** The native workflow belongs to M0-005; fail until it wires this preflight. */
export function checkNativeWorkflow(text) {
  const errors = [];
  if (!text.includes('"scripts/**"'))
    errors.push("native CI must trigger on policy script changes");
  const section = workflowJob(text, "rust-dependency-policy");
  errors.push(...mandatoryJobControls(section, "native Rust policy"));
  if (!section) return errors;
  const checks = [
    "run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
    "run: cargo +1.94.0 fetch --manifest-path apps/desktop/src-tauri/Cargo.toml --locked",
    "run: cargo deny check licenses advisories sources",
    "run: node scripts/check-native-rust-policy.mjs --check-target-graph",
  ];
  let previous = -1;
  for (const expected of checks) {
    const line = section
      .split(/\r?\n/)
      .findIndex((s) => s === `      - ${expected}` || s === `        ${expected}`);
    if (line <= previous)
      errors.push(`native CI missing or reordered unrestricted step: ${expected}`);
    else previous = line;
  }
  if (!hasPinnedRustInstaller(section, "Install exact Rust audit tools")) {
    errors.push("native CI Rust audit/deny tool versions changed");
  }
  return errors;
}

export function checkGeneralCIWorkflow(text) {
  const errors = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  for (const job of ["verify", "audit", "secrets"]) {
    const section = workflowJob(text, job);
    const conditionNames =
      job === "audit"
        ? [
            "Install pinned native Rust audit toolchain",
            "Install exact Rust supply-chain tools",
            "Audit the complete Rust lockfile without advisory exceptions",
            "Fetch all locked target families before offline graph verification",
            "Cargo deny full licenses advisories and sources",
            "Fail closed on advisory classification, both RustSec DB revisions, target graphs and expiry",
          ]
        : [];
    errors.push(...mandatoryJobControls(section, `general CI ${job}`, conditionNames));
  }
  if (!hasRunnableStep(workflowJob(text, "verify") ?? "", "run: pnpm verify"))
    errors.push("general CI protection missing: runnable pnpm verify");
  if (!hasRunnableStep(workflowJob(text, "audit") ?? "", "run: pnpm audit"))
    errors.push("general CI protection missing: runnable unrestricted pnpm audit");
  if (!lines.includes("name: Secret scan")) errors.push("general CI Secret scan missing");
  if (!text.includes("detect-secrets scan --all-files"))
    errors.push("general CI secret scanning missing");
  const secretJob = workflowJob(text, "secrets") ?? "";
  for (const required of [
    "sanitize_published_checksum(parsed, filename)",
    "sanitized-native-rust-policy.json",
    "sanitized-native-rust-reviewed-ancestry.json",
    "rust-policy-secrets.json",
    'record.get("checksum")',
  ]) {
    if (!secretJob.includes(required)) {
      errors.push(`checked policy JSON secret scan missing: ${required}`);
    }
  }
  if ((secretJob.match(/rust-policy-secrets\.json/g) ?? []).length !== 2) {
    errors.push("policy secret-scan report must be generated and consumed exactly once");
  }
  const rustChecks = [
    "cargo +1.94.0 install cargo-audit --version 0.23.0 --locked",
    "cargo +1.94.0 install cargo-deny --version 0.19.9 --locked",
    "run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
    "run: cargo +1.94.0 fetch --manifest-path apps/desktop/src-tauri/Cargo.toml --locked",
    "run: cargo deny check licenses advisories sources",
    "run: node scripts/check-native-rust-policy.mjs --check-target-graph",
  ];
  let previous = -1;
  for (const step of rustChecks) {
    const spacing = step.startsWith("run:") ? "        " : "          ";
    const index = text.split(/\r?\n/).findIndex((line) => line === `${spacing}${step}`);
    if (index <= previous) errors.push(`general CI missing or reordered Rust policy gate: ${step}`);
    else previous = index;
  }
  if (
    !hasPinnedRustInstaller(
      workflowJob(text, "audit") ?? "",
      "Install exact Rust supply-chain tools",
    )
  ) {
    errors.push("general CI pinned Rust audit tool installation block changed");
  }
  const condition = "if: ${{ hashFiles('apps/desktop/src-tauri/Cargo.toml') != '' }}";
  if (lines.filter((line) => line === condition).length !== 6) {
    errors.push(
      "general CI native-project detection must guard exactly six Rust setup/audit steps",
    );
  }
  return errors;
}

export function checkTargetGraph(policy, runner) {
  const errors = checkPolicyManifest(policy);
  if (errors.length) return errors;
  const advisory = policy.temporaryAdvisory;
  for (const extra of [[], ["--all-features"]]) {
    for (const target of [advisory.unsupportedTarget, ...advisory.supportedTargets]) {
      let stdout;
      try {
        stdout = runner(target, extra);
      } catch (error) {
        errors.push(`cannot inspect ${target} native graph: ${error}`);
        continue;
      }
      const root = `${advisory.name} v${advisory.version}`;
      if (target === advisory.unsupportedTarget) {
        if (
          !stdout.startsWith(root) ||
          !stdout.includes("glib-macros v0.18.5") ||
          !stdout.includes("gtk3-macros v0.18.2")
        ) {
          errors.push(`unsupported Linux GTK3-only RustSec chain changed on ${target}`);
        }
      } else if (stdout.trim()) {
        errors.push(`temporary RustSec exception reached supported ${target} build graph`);
      }
    }
  }
  return errors;
}

export function findNativeRustPolicyViolations(root, { targetGraph = false, graphRunner } = {}) {
  const ci = join(root, ".github", "workflows", "ci.yml");
  const errors = existsSync(ci)
    ? checkGeneralCIWorkflow(readFileSync(ci, "utf8"))
    : ["mandatory unrestricted general CI workflow missing"];
  let policy;
  try {
    policy = JSON.parse(readFileSync(join(root, "scripts", "native-rust-policy.json"), "utf8"));
    errors.push(...checkPolicyManifest(policy));
    const fixture = JSON.parse(
      readFileSync(join(root, "scripts", "fixtures", "native-rust-reviewed-ancestry.json"), "utf8"),
    );
    if (!Array.isArray(fixture) || fixture.length !== 39) {
      errors.push("reviewed 39-package Rust ancestry fixture missing or changed");
    } else {
      errors.push(...checkLockedGraph(fixture, policy));
    }
  } catch (error) {
    errors.push(`mandatory checked Rust policy/ancestry inventory missing: ${error}`);
  }
  const native = join(root, "apps", "desktop", "src-tauri");
  const manifest = join(native, "Cargo.toml");
  const lock = join(native, "Cargo.lock");
  const deny = join(native, "deny.toml");
  const present = [manifest, lock, deny].map((file) => existsSync(file));
  if (present.every((value) => !value)) return errors;
  if (present.some((value) => !value)) {
    return [...errors, "native desktop Cargo manifest/lockfile/deny.toml must all exist together"];
  }
  if (!policy) return errors;
  errors.push(...checkDenyConfiguration(readFileSync(deny, "utf8"), policy));
  const nativeWorkflow = join(root, ".github", "workflows", "desktop-native.yml");
  if (!existsSync(nativeWorkflow)) errors.push("native desktop CI workflow missing");
  else errors.push(...checkNativeWorkflow(readFileSync(nativeWorkflow, "utf8")));
  let packages;
  try {
    packages = parseLockedPackages(readFileSync(lock, "utf8"));
    errors.push(...checkLockedGraph(packages, policy));
  } catch (error) {
    errors.push(String(error));
  }
  if (targetGraph && packages) {
    // Run only after cargo-audit and cargo-deny have each refreshed their DB.
    errors.push(...checkDualRustSecDatabases(process.env.CARGO_HOME ?? join(homedir(), ".cargo")));
    try {
      const metadata = JSON.parse(
        execFileSync(
          "cargo",
          [
            "metadata",
            "--manifest-path",
            manifest,
            "--format-version",
            "1",
            "--locked",
            "--offline",
            "--all-features",
          ],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 2 ** 24 },
        ),
      );
      errors.push(...checkResolvedLicenseMetadata(metadata.packages));
    } catch (error) {
      errors.push(`cannot inspect real resolved Cargo license metadata: ${error}`);
    }
    const run =
      graphRunner ??
      ((target, extra) =>
        execFileSync(
          "cargo",
          [
            "tree",
            "--manifest-path",
            manifest,
            "--locked",
            "--offline",
            "--target",
            target,
            "--edges",
            "normal,build,dev",
            ...extra,
            "-i",
            "proc-macro-error@1.0.4",
          ],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 2 ** 20 },
        ));
    errors.push(...checkTargetGraph(policy, run));
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const errors = findNativeRustPolicyViolations(root, {
    targetGraph: process.argv.includes("--check-target-graph"),
  });
  if (errors.length) {
    console.error(`Native Rust policy violations:\n - ${errors.join("\n - ")}`);
    process.exit(1);
  }
  console.log("Native Rust exact dependency policy OK");
}
