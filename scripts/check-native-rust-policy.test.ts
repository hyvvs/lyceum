import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkDenyConfiguration,
  checkGeneralCIWorkflow,
  checkLockedGraph,
  checkNativeWorkflow,
  checkPolicyManifest,
  checkResolvedLicenseMetadata,
  checkRustSecAdvisory,
  checkRustSecDatabaseRevisions,
  checkTargetGraph,
  computeAncestrySha256,
  findNativeRustPolicyViolations,
  parseLockedPackages,
} from "./check-native-rust-policy.mjs";

const policy = JSON.parse(
  readFileSync(new URL("./native-rust-policy.json", import.meta.url), "utf8"),
);
const approved = policy.allowedMpl.map((item: { name: string; version: string }) =>
  [item.name, item.version].join("@"),
);
const allow = [
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

function denyConfig() {
  return `[licenses]
allow = [${allow.map((x) => JSON.stringify(x)).join(", ")}]
confidence-threshold = 0.8
include-dev = true
include-build = true

${approved
  .map(
    (crate: string) => `[[licenses.exceptions]]
crate = "${crate}"
allow = ["MPL-2.0"]`,
  )
  .join("\n")}

[advisories]
ignore = [{ id = "RUSTSEC-2024-0370", reason = "Owner: Linux-only unmaintained; revisit before 2027-02-28" }]

[sources]
unknown-registry = "deny"
unknown-git = "deny"
`;
}

function nativeWorkflow() {
  return `on:
  pull_request:
    paths:
      - "apps/desktop/**"
      - "scripts/**"
jobs:
  rust-dependency-policy:
    runs-on: ubuntu-24.04
    steps:
      - name: Install exact Rust audit tools
        run: |
          cargo +1.94.0 install cargo-audit --version 0.23.0 --locked
          cargo +1.94.0 install cargo-deny --version 0.19.9 --locked
      - run: cargo audit --file apps/desktop/src-tauri/Cargo.lock
      - run: cargo +1.94.0 fetch --manifest-path apps/desktop/src-tauri/Cargo.toml --locked
      - run: cargo deny check licenses advisories sources
        working-directory: apps/desktop/src-tauri
      - run: node scripts/check-native-rust-policy.mjs --check-target-graph
`;
}

type Locked = {
  name: string;
  version: string;
  checksum?: string;
  source?: string;
  dependencies: string[];
};

function lockedPackages(): Locked[] {
  return structuredClone(
    JSON.parse(
      readFileSync(
        new URL("./fixtures/native-rust-reviewed-ancestry.json", import.meta.url),
        "utf8",
      ),
    ),
  );
}

function lockedText(packages: Locked[] = lockedPackages()) {
  return [
    "version = 4",
    ...packages.map(
      (p) =>
        `[[package]]
name = "${p.name}"
version = "${p.version}"
${p.source ? `source = "${p.source}"` : ""}
${p.checksum ? `checksum = "${p.checksum}"` : ""}
dependencies = [
${p.dependencies.map((dep) => ` "${dep}",`).join("\n")}
]
`,
    ),
  ].join("\n");
}

const created: string[] = [];
function foundationFiles(root: string) {
  mkdirSync(join(root, "scripts", "fixtures"), { recursive: true });
  mkdirSync(join(root, ".github", "workflows"), { recursive: true });
  writeFileSync(
    join(root, ".github", "workflows", "ci.yml"),
    readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
  );
  writeFileSync(join(root, "scripts", "native-rust-policy.json"), JSON.stringify(policy));
  writeFileSync(
    join(root, "scripts", "fixtures", "native-rust-reviewed-ancestry.json"),
    readFileSync(new URL("./fixtures/native-rust-reviewed-ancestry.json", import.meta.url), "utf8"),
  );
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "lyceum-native-policy-"));
  created.push(root);
  const native = join(root, "apps", "desktop", "src-tauri");
  mkdirSync(native, { recursive: true });
  foundationFiles(root);
  writeFileSync(join(root, ".github", "workflows", "desktop-native.yml"), nativeWorkflow());
  writeFileSync(join(native, "Cargo.toml"), '[package]\nname="fixture"\nversion="0.0.0"\n');
  writeFileSync(join(native, "Cargo.lock"), lockedText());
  writeFileSync(join(native, "deny.toml"), denyConfig());
  return { root, native };
}
afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("exact reviewed Rust supply-chain exceptions", () => {
  it("accepts no native project on the protected-main foundation", () => {
    const root = mkdtempSync(join(tmpdir(), "lyceum-no-native-"));
    created.push(root);
    foundationFiles(root);
    expect(findNativeRustPolicyViolations(root)).toEqual([]);
  });

  it("does not bypass rule enforcement when native source is absent on protected main", () => {
    const root = mkdtempSync(join(tmpdir(), "lyceum-main-rule-"));
    created.push(root);
    expect(findNativeRustPolicyViolations(root)).not.toEqual([]);
    foundationFiles(root);
    expect(findNativeRustPolicyViolations(root)).toEqual([]);
    rmSync(join(root, ".github", "workflows", "ci.yml"));
    expect(findNativeRustPolicyViolations(root)).toEqual(
      expect.arrayContaining([expect.stringContaining("general CI workflow missing")]),
    );
    foundationFiles(root);
    const changed = structuredClone(policy);
    changed.allowedMpl[0].checksum = "f".repeat(64);
    writeFileSync(join(root, "scripts", "native-rust-policy.json"), JSON.stringify(changed));
    expect(findNativeRustPolicyViolations(root)).not.toEqual([]);
    foundationFiles(root);
    const fixturePath = join(root, "scripts", "fixtures", "native-rust-reviewed-ancestry.json");
    writeFileSync(fixturePath, "[]");
    expect(findNativeRustPolicyViolations(root)).not.toEqual([]);
  });

  it("fails closed if only the manifest or only the lockfile exists", () => {
    const { root, native } = fixture();
    rmSync(join(native, "Cargo.lock"));
    expect(findNativeRustPolicyViolations(root)).toEqual([
      expect.stringContaining("must all exist"),
    ]);
  });

  it("accepts exactly seven locked, sourced and configured exceptions", () => {
    const { root } = fixture();
    expect(findNativeRustPolicyViolations(root)).toEqual([]);
    expect(parseLockedPackages(lockedText())).toHaveLength(lockedPackages().length);
    expect(computeAncestrySha256(lockedPackages())).toBe(
      "5a3e3df820f2ca520e9261d30892ff6895ad7edee2fb565988bb74aa8f53f72c", // pragma: allowlist secret — reviewed checksum fixture
    );
  });

  it("fails closed on unrecognized Cargo.lock dependency syntax", () => {
    expect(() =>
      parseLockedPackages(lockedText().replace("dependencies = [", "dependencies = {")),
    ).toThrow("malformed dependencies");
    expect(() =>
      parseLockedPackages(
        lockedText().replace('name = "cssparser"', 'name = "cssparser"\nlicenses = ["MPL-2.0"]'),
      ),
    ).toThrow("unreviewed Cargo.lock package syntax");
  });

  it("rejects new versions of an otherwise accepted MPL package", () => {
    const packages = lockedPackages();
    const original = packages.find((p) => p.name === "cssparser" && p.version === "0.38.0");
    if (!original) throw Error("fixture missing approved CSS parser");
    packages.push({ ...original, version: "0.39.0" });
    expect(checkLockedGraph(packages, policy)).toEqual(
      expect.arrayContaining([expect.stringContaining("unreviewed locked version")]),
    );
  });

  it("rejects new checksum or registry for approved packages", () => {
    const packages = lockedPackages();
    const entry = packages.find((p) => p.name === "cssparser" && p.version === "0.37.0");
    if (!entry) throw Error("fixture missing approved CSS parser");
    entry.checksum = "f".repeat(64);
    expect(checkLockedGraph(packages, policy)).toEqual(
      expect.arrayContaining([expect.stringContaining("source/checksum drift")]),
    );
    entry.checksum = policy.allowedMpl[0].checksum;
    entry.source = "git+https://unreviewed.invalid/crate";
    expect(checkLockedGraph(packages, policy)).toEqual(
      expect.arrayContaining([expect.stringContaining("source/checksum drift")]),
    );
  });

  it("rejects a newly introduced direct parent, even at the same approved version", () => {
    const packages = lockedPackages();
    packages.push({
      name: "new-unreviewed-consumer",
      version: "1.0.0",
      source: policy.source,
      checksum: "c".repeat(64),
      dependencies: ["option-ext"],
    });
    expect(checkLockedGraph(packages, policy)).toEqual(
      expect.arrayContaining([expect.stringContaining("incoming dependency relationships")]),
    );
  });

  it("rejects substitution of a reviewed intermediary's upstream parent", () => {
    const packages = lockedPackages();
    const pkg = packages.find((item) => item.name === "wry");
    if (!pkg) throw Error("synthetic Wry parent missing");
    pkg.dependencies = pkg.dependencies.filter((item) => item !== "dom_query 0.30.0");
    expect(checkLockedGraph(packages, policy)).toEqual(
      expect.arrayContaining([expect.stringContaining("dom_query@0.30.0")]),
    );
  });

  it("rejects graph drift above immediate parents, including root and upstream provenance", () => {
    const packages = lockedPackages();
    const root = packages.find((p) => p.name === "lyceum-desktop");
    if (!root) throw Error("root ancestry fixture missing");
    root.dependencies.push("wry");
    expect(checkLockedGraph(packages, policy)).toEqual(
      expect.arrayContaining([expect.stringContaining("reviewed lockfile ancestry")]),
    );
    const pristine = lockedPackages();
    const wry = pristine.find((p) => p.name === "wry");
    if (!wry) throw Error("Wry ancestry fixture missing");
    wry.checksum = "f".repeat(64);
    expect(checkLockedGraph(pristine, policy)).toEqual(
      expect.arrayContaining([expect.stringContaining("reviewed lockfile ancestry")]),
    );
  });

  it("rejects wildcard, extra, stale or duplicate license exemptions", () => {
    const valid = denyConfig();
    for (const modified of [
      valid.replace('crate = "cssparser@0.37.0"', 'crate = "cssparser"'),
      valid.replace('crate = "cssparser@0.37.0"', 'crate = "cssparser@0.39.0"'),
      valid.replace('crate = "cssparser@0.37.0"', 'crate = "option-ext@0.2.0"'),
      `${valid}\n[[licenses.exceptions]]\ncrate = "newcrate@1.0.0"\nallow = ["MPL-2.0"]\n`,
      valid.replace('allow = ["MPL-2.0"]', 'allow = ["MPL-2.0", "GPL-3.0"]'),
    ]) {
      expect(checkDenyConfiguration(modified, policy)).not.toEqual([]);
    }
  });

  it("rejects globally allowing MPL or another unreviewed license", () => {
    for (const license of ['"MPL-2.0", ', '"GPL-3.0", ']) {
      const config = denyConfig().replace(
        "[licenses]\nallow = [",
        `[licenses]\nallow = [${license}`,
      );
      expect(checkDenyConfiguration(config, policy)).toEqual(
        expect.arrayContaining([expect.stringContaining("permissive-only")]),
      );
    }
  });

  it("rejects arbitrary advisory suppression and broad alert severity relaxation", () => {
    const base = denyConfig();
    for (const modified of [
      base.replace("RUSTSEC-2024-0370", "RUSTSEC-2024-0429"),
      base.replace(
        'reason = "Owner: Linux-only unmaintained; revisit before 2027-02-28"',
        'reason = "anything" }, { id = "RUSTSEC-2026-0543", reason = "unreviewed"',
      ),
      base.replace("[advisories]", '[advisories]\nunsound = "allow"'),
    ]) {
      expect(checkDenyConfiguration(modified, policy)).not.toEqual([]);
    }
  });

  it("preserves all-target sources and full dev/build coverage", () => {
    for (const modified of [
      denyConfig().replace('unknown-git = "deny"', 'unknown-git = "allow"'),
      denyConfig().replace('unknown-registry = "deny"', 'unknown-registry = "allow"'),
      denyConfig().replace("include-dev = true", "include-dev = false"),
      denyConfig().replace("include-build = true", "include-build = false"),
      denyConfig().replace("confidence-threshold = 0.8", "confidence-threshold = 0.3"),
      `${denyConfig()}[graph]\ntargets = ["x86_64-pc-windows-msvc"]\n`,
    ]) {
      expect(checkDenyConfiguration(modified, policy)).not.toEqual([]);
    }
  });

  it("detects unsupported-platform advisory reaching a supported build/proc-macro graph", () => {
    const runner = (target: string) =>
      target === "x86_64-unknown-linux-gnu"
        ? "proc-macro-error v1.0.4\n├── glib-macros v0.18.5\n└── gtk3-macros v0.18.2\n"
        : "";
    expect(checkTargetGraph(policy, runner)).toEqual([]);
    expect(
      checkTargetGraph(policy, (target: string) =>
        target === "x86_64-pc-windows-msvc" ? "proc-macro-error v1.0.4\n" : runner(target),
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining("supported")]));
  });

  it("rejects failed or missing target-graph verification (not silently skipped)", () => {
    expect(checkTargetGraph(policy, () => "")).toEqual(
      expect.arrayContaining([expect.stringContaining("Linux GTK3-only")]),
    );
    expect(
      checkTargetGraph(policy, () => {
        throw Error("cargo command failed");
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining("cannot inspect")]));
  });

  it("rejects a modified approval manifest containing an eighth exception", () => {
    const changed = {
      ...policy,
      allowedMpl: [
        ...policy.allowedMpl,
        { name: "new-mpl", version: "1.0.0", parents: [], checksum: "d".repeat(64) },
      ],
    };
    expect(checkDenyConfiguration(denyConfig(), changed)).toEqual(
      expect.arrayContaining([expect.stringContaining("unauthorized exception identity")]),
    );
  });

  it("rejects changed temporary advisory version or category", () => {
    const changed = {
      ...policy,
      temporaryAdvisory: { ...policy.temporaryAdvisory, version: "1.0.5" },
    };
    expect(checkLockedGraph(lockedPackages(), changed)).toEqual(
      expect.arrayContaining([expect.stringContaining("RustSec identity/category")]),
    );
  });

  it("blocks the UTC review expiry automatically, including a modified manifest deadline", () => {
    expect(checkPolicyManifest(policy, new Date("2027-02-28T23:59:59Z"))).toEqual([]);
    expect(checkPolicyManifest(policy, new Date("2027-03-01T00:00:00Z"))).toEqual(
      expect.arrayContaining([expect.stringContaining("review expired")]),
    );
    expect(checkPolicyManifest({ ...policy, reviewBy: "2037-02-28" })).not.toEqual([]);
  });

  it("rejects emptied, changed or omitted Windows/macOS and Linux target scopes", () => {
    for (const changed of [
      { ...policy.temporaryAdvisory, supportedTargets: [] },
      { ...policy.temporaryAdvisory, supportedTargets: ["x86_64-pc-windows-msvc"] },
      { ...policy.temporaryAdvisory, unsupportedTarget: "x86_64-unknown-freebsd" },
    ]) {
      expect(checkPolicyManifest({ ...policy, temporaryAdvisory: changed })).not.toEqual([]);
      expect(checkTargetGraph({ ...policy, temporaryAdvisory: changed }, () => "")).not.toEqual([]);
    }
  });

  it("requires source/checksum and parent claims for every approved/intermediate entry", () => {
    for (const section of ["allowedMpl", "reviewedIntermediates"] as const) {
      const changed = structuredClone(policy);
      changed[section][0].checksum = undefined;
      expect(checkPolicyManifest(changed)).toEqual(
        expect.arrayContaining([expect.stringContaining("mandatory exact checksum")]),
      );
      const changedParents = structuredClone(policy);
      changedParents[section][0].parents = undefined;
      expect(checkPolicyManifest(changedParents)).not.toEqual([]);
    }
  });

  it("rejects RustSec advisory reclassification, withdrawal and new patched/version ranges", () => {
    const good = `\`\`\`toml
[advisory]
id = "RUSTSEC-2024-0370"
package = "proc-macro-error"
date = "2024-09-01"
informational = "unmaintained"
url = "https://gitlab.com/CreepySkeleton/proc-macro-error/-/issues/20"

[versions]
patched = []
\`\`\`
`;
    expect(checkRustSecAdvisory(good)).toEqual([]);
    for (const changed of [
      good.replace('informational = "unmaintained"', 'informational = "unsound"'),
      good.replace('informational = "unmaintained"', 'informational = "vulnerability"'),
      good.replace("patched = []", 'patched = ["1.0.5"]'),
      good.replace("[versions]", '[versions]\nunaffected = ["1.0.5"]'),
      good.replace("[advisory]", '[advisory]\nwithdrawn = "2026-12-01"'),
      good.replace('package = "proc-macro-error"', 'package = "other-crate"'),
    ])
      expect(checkRustSecAdvisory(changed)).not.toEqual([]);
  });

  it("rejects missing or divergent snapshots between unrestricted cargo-audit and cargo-deny", () => {
    const original = "a".repeat(40);
    expect(checkRustSecDatabaseRevisions(original, original)).toEqual([]);
    expect(checkRustSecDatabaseRevisions(original, "b".repeat(40))).toEqual(
      expect.arrayContaining([expect.stringContaining("revisions differ")]),
    );
    expect(checkRustSecDatabaseRevisions(original, "")).not.toEqual([]);
  });

  it("does not accept eighth MPL license or changed exact license metadata", () => {
    const metadata = policy.allowedMpl.map((p: { name: string; version: string }) => ({
      name: p.name,
      version: p.version,
      license: "MPL-2.0",
      source: policy.source,
    }));
    expect(checkResolvedLicenseMetadata(metadata)).toEqual([]);
    expect(
      checkResolvedLicenseMetadata([
        ...metadata,
        {
          name: "eighth",
          version: "1.0.0",
          license: "MIT OR MPL-2.0",
          source: policy.source,
        },
      ]),
    ).toEqual(expect.arrayContaining([expect.stringContaining("unauthorized MPL")]));
    expect(
      checkResolvedLicenseMetadata([
        ...metadata,
        { name: "eighth", version: "1.0.0", license: "MIT OR ( MPL-2.0 )", source: policy.source },
      ]),
    ).toEqual(expect.arrayContaining([expect.stringContaining("unauthorized MPL")]));
    metadata[0].license = "MPL-2.0 OR MIT";
    expect(checkResolvedLicenseMetadata(metadata)).toEqual(
      expect.arrayContaining([expect.stringContaining("reviewed MPL license metadata changed")]),
    );
    metadata[0].license = "MIT";
    expect(checkResolvedLicenseMetadata(metadata)).not.toEqual([]);
  });

  it("makes future native CI enforce the full audited graph without suppressing other gates", () => {
    expect(checkNativeWorkflow(nativeWorkflow())).toEqual([]);
    for (const altered of [
      nativeWorkflow().replace(
        "run: node scripts/check-native-rust-policy.mjs --check-target-graph",
        "run: node scripts/check-native-rust-policy.mjs",
      ),
      nativeWorkflow().replace(
        "cargo audit --file apps/desktop/src-tauri/Cargo.lock",
        "cargo audit --ignore RUSTSEC-2024-0429 --file apps/desktop/src-tauri/Cargo.lock",
      ),
      nativeWorkflow().replace(
        "cargo deny check licenses advisories sources",
        "cargo deny check licenses sources",
      ),
      nativeWorkflow().replace('"scripts/**"', '"apps/web/**"'),
      nativeWorkflow().replace("runs-on: ubuntu-24.04", "runs-on: ubuntu-24.04\n    if: false"),
      nativeWorkflow().replace(
        "runs-on: ubuntu-24.04",
        "runs-on: ubuntu-24.04\n    continue-on-error: true",
      ),
      nativeWorkflow().replace(
        "- run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
        "- run: cargo audit --file apps/desktop/src-tauri/Cargo.lock\n        continue-on-error: true",
      ),
      nativeWorkflow().replace(
        "- run: cargo deny check licenses advisories sources",
        "- run: cargo deny check licenses advisories sources\n        if: false",
      ),
      nativeWorkflow().replace(
        "- run: cargo deny check licenses advisories sources",
        "- run: cargo deny check licenses advisories sources\n        'continue-on-error': true",
      ),
      nativeWorkflow().replace("runs-on: ubuntu-24.04", "runs-on: ubuntu-24.04\n    'if': false"),
      nativeWorkflow().replace(
        "- run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
        "- if: false\n        run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
      ),
      nativeWorkflow().replace(
        "- run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
        "- continue-on-error: true\n        run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
      ),
      nativeWorkflow().replace(
        "cargo +1.94.0 install cargo-audit --version 0.23.0 --locked",
        "exit 0\n          cargo +1.94.0 install cargo-audit --version 0.23.0 --locked",
      ),
      nativeWorkflow().replace(
        "- run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
        "- run: cargo audit --file apps/desktop/src-tauri/Cargo.lock\n        shell: echo {0}",
      ),
      nativeWorkflow().replace("jobs:\n", "defaults:\n  run:\n    shell: echo {0}\njobs:\n"),
      nativeWorkflow().replace("jobs:\n", "env:\n  CARGO_HOME: /tmp/not-reviewed\njobs:\n"),
      nativeWorkflow().replace("jobs:\n", "defaults :\n  run:\n    shell: echo {0}\njobs:\n"),
      nativeWorkflow().replace(
        "- run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
        "- run: cargo audit --file apps/desktop/src-tauri/Cargo.lock\n        env:\n          CARGO_HOME: /tmp/not-reviewed",
      ),
      nativeWorkflow().replace(
        "- run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
        "- run: cargo audit --file apps/desktop/src-tauri/Cargo.lock\n        env :\n          CARGO_HOME: /tmp/not-reviewed",
      ),
      nativeWorkflow().replace(
        "- run: node scripts/check-native-rust-policy.mjs --check-target-graph",
        "- run: node scripts/check-native-rust-policy.mjs --check-target-graph\n        working-directory: apps/desktop/src-tauri",
      ),
      nativeWorkflow().replace(
        "working-directory: apps/desktop/src-tauri",
        "working-directory: apps/web",
      ),
    ])
      expect(checkNativeWorkflow(altered)).not.toEqual([]);
    const ci = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
    expect(checkGeneralCIWorkflow(ci)).toEqual([]);
    expect(
      checkGeneralCIWorkflow(ci.replace("pnpm audit", "pnpm audit --audit-level critical")),
    ).not.toEqual([]);
    expect(checkGeneralCIWorkflow(ci.replace("--check-target-graph", ""))).not.toEqual([]);
    for (const variant of [
      ci.replace("name: Dependency audit", "name: Dependency audit\n    if: false"),
      ci.replace("name: Dependency audit", "name: Dependency audit\n    continue-on-error: true"),
      ci.replace("name: Dependency audit", "name: Dependency audit\n    'if': false"),
      ci.replace("name: Dependency audit", "name: Dependency audit\n    'continue-on-error': true"),
      ci.replace(
        "run: node scripts/check-native-rust-policy.mjs --check-target-graph",
        "run: node scripts/check-native-rust-policy.mjs --check-target-graph\n        continue-on-error: true",
      ),
      ci.replace("- run: pnpm audit", "- run: pnpm audit\n        if: false"),
      ci.replace("- run: pnpm audit", "- run: pnpm audit\n        'if': false"),
      ci.replace("- run: pnpm audit", "- run: pnpm audit\n        shell: echo {0}"),
      ci.replace("jobs:\n", "defaults:\n  run:\n    working-directory: apps/web\njobs:\n"),
      ci.replace("jobs:\n", "'defaults':\n  run:\n    shell: echo {0}\njobs:\n"),
      ci.replace("jobs:\n", "env:\n  CARGO_HOME: /tmp/not-reviewed\njobs:\n"),
      ci.replace("jobs:\n", "defaults :\n  run:\n    shell: echo {0}\njobs:\n"),
      ci.replace("jobs:\n", "'env':\n  NODE_OPTIONS: --require ./skip-audit.js\njobs:\n"),
      ci.replace(
        "- run: pnpm audit",
        "- run: pnpm audit\n        env:\n          NODE_OPTIONS: --require ./skip-audit.js",
      ),
      ci.replace(
        "- run: pnpm audit",
        "- run: pnpm audit\n        env :\n          NODE_OPTIONS: --require ./skip-audit.js",
      ),
      ci.replace("- run: pnpm audit", "- run: pnpm audit\n        working-directory: apps/web"),
      ci.replace(
        "run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
        "run: cargo audit --file apps/desktop/src-tauri/Cargo.lock\n        working-directory: apps/web",
      ),
      ci.replace(
        "run: cargo deny check licenses advisories sources",
        "run: cargo deny check licenses advisories sources\n        env:\n          CARGO_HOME: /tmp/not-reviewed",
      ),
      ci.replace("working-directory: apps/desktop/src-tauri", "working-directory: apps/web"),
      ci.replace(
        "run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
        "run: cargo audit --file apps/desktop/src-tauri/Cargo.lock\n        shell: echo {0}",
      ),
      ci.replace("- run: pnpm audit", "- if: false\n        run: pnpm audit"),
      ci.replace("- run: pnpm audit", "- continue-on-error: true\n        run: pnpm audit"),
      ci.replace(
        "- run: pnpm audit",
        "- run: |\n          echo ignored by scalar\n          - run: pnpm audit\n          exit 0",
      ),
      ci.replace(
        "run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
        "run: |\n          exit 0\n          run: cargo audit --file apps/desktop/src-tauri/Cargo.lock",
      ),
      ci.replace(
        "cargo +1.94.0 install cargo-audit --version 0.23.0 --locked",
        "exit 0\n          cargo +1.94.0 install cargo-audit --version 0.23.0 --locked",
      ),
      ci.replace('record.get("checksum")', 'record.get("private_token")'),
      ci.replace("rust-policy-secrets.json", "ignored-policy-secrets.json"),
    ])
      expect(checkGeneralCIWorkflow(variant)).not.toEqual([]);
    expect(
      checkGeneralCIWorkflow(
        ci.replace("if: ${{ hashFiles('apps/desktop/src-tauri/Cargo.toml') != '' }}", "if: false"),
      ),
    ).not.toEqual([]);
  });
});
