import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findBoundaryViolations } from "./check-boundaries.mjs";

const fixtures: string[] = [];

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "lyceum-boundaries-"));
  fixtures.push(root);
  for (const name of ["core", "gateway", "profile-math", "ui"]) {
    mkdirSync(join(root, "packages", name, "src"), { recursive: true });
    writeFileSync(
      join(root, "packages", name, "package.json"),
      JSON.stringify({
        name: `@lyceum/${name}`,
        dependencies: name === "core" ? { zod: "*" } : {},
        scripts: { typecheck: "tsc --noEmit" },
      }),
    );
  }
  return root;
}

afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("architectural boundaries", () => {
  it("accepts the permitted package dependency direction", () => {
    const root = fixture();
    expect(findBoundaryViolations(root)).toEqual([]);
  });

  it("rejects subject tooling outside profile packages", () => {
    const root = fixture();
    writeFileSync(join(root, "packages", "core", "src", "illegal.ts"), 'import "sympy";');
    expect(findBoundaryViolations(root)).toEqual([
      expect.stringContaining("subject-specific tooling referenced outside a profile"),
    ]);
  });

  it("rejects provider code outside the gateway and extra core dependencies", () => {
    const root = fixture();
    writeFileSync(join(root, "packages", "ui", "src", "illegal.ts"), 'import "openai";');
    writeFileSync(
      join(root, "packages", "core", "package.json"),
      JSON.stringify({ dependencies: { zod: "*", react: "*" } }),
    );
    expect(findBoundaryViolations(root)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("core must only depend on zod, found: react"),
        expect.stringContaining("provider vendor referenced outside packages/gateway"),
      ]),
    );
  });

  it("rejects package imports from apps, including dynamic imports", () => {
    const root = fixture();
    writeFileSync(
      join(root, "packages", "ui", "src", "illegal.ts"),
      'import "../../../apps/web/src/app";\nvoid import("../../../apps/desktop/src/main");',
    );
    expect(findBoundaryViolations(root)).toEqual([
      expect.stringContaining("packages must not import from apps/"),
      expect.stringContaining("packages must not import from apps/"),
    ]);
  });

  it("allows app imports of packages and regular local imports", () => {
    const root = fixture();
    mkdirSync(join(root, "apps", "web", "src"), { recursive: true });
    writeFileSync(join(root, "apps", "web", "src", "app.ts"), 'import "@lyceum/core";');
    writeFileSync(
      join(root, "packages", "ui", "src", "legal.ts"),
      'import { x } from "./local";\nimport "@lyceum/core";',
    );
    expect(findBoundaryViolations(root)).toEqual([]);
  });

  it("rejects deep package imports, exports, and type-only imports", () => {
    const root = fixture();
    writeFileSync(
      join(root, "packages", "ui", "src", "illegal.ts"),
      [
        'import { x } from "@lyceum/core/src/events";',
        'export * from "@lyceum/core/src/index";',
        'import type { X } from "@lyceum/core/ports";',
        'type T = import("@lyceum/core/src/events").T;',
        'void import("@lyceum/core/src/ports");',
        'require("@lyceum/core/src/events");',
      ].join("\n"),
    );
    const problems = findBoundaryViolations(root);
    expect(problems).toHaveLength(6);
    expect(problems.every((p) => p.includes("deep cross-package import"))).toBe(true);
  });

  it("rejects cross-package source paths even when imported relatively", () => {
    const root = fixture();
    writeFileSync(
      join(root, "packages", "ui", "src", "illegal.ts"),
      'import "../../core/src/index";\nexport * from "../../core/src/events";',
    );
    expect(findBoundaryViolations(root)).toEqual([
      expect.stringContaining("relative cross-package import"),
      expect.stringContaining("relative cross-package import"),
    ]);
  });

  it("requires a nonempty typecheck script in every package", () => {
    const root = fixture();
    mkdirSync(join(root, "packages", "new-profile"), { recursive: true });
    writeFileSync(
      join(root, "packages", "new-profile", "package.json"),
      JSON.stringify({ name: "@lyceum/new-profile" }),
    );
    writeFileSync(
      join(root, "packages", "ui", "package.json"),
      JSON.stringify({ scripts: { typecheck: "  " } }),
    );
    expect(findBoundaryViolations(root)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("new-profile: missing typecheck script"),
        expect.stringContaining("ui: missing typecheck script"),
      ]),
    );
  });

  it("rejects nondeterministic time and random calls in core source", () => {
    const root = fixture();
    writeFileSync(
      join(root, "packages", "core", "src", "illegal.ts"),
      [
        "Date.now();",
        "new Date();",
        "Math.random();",
        "Date . now ( );",
        "new Date(/* default current time */);",
        "globalThis.Math.random();",
      ].join("\n"),
    );
    const problems = findBoundaryViolations(root);
    expect(problems).toHaveLength(6);
    expect(problems.every((p) => p.includes("injected Clock/Rng"))).toBe(true);
  });

  it("allows deterministic APIs, test-only calls, comments, and string literals", () => {
    const root = fixture();
    writeFileSync(
      join(root, "packages", "core", "src", "legal.ts"),
      [
        "// Date.now() and Math.random() are examples, not calls.",
        'const text = "new Date()";',
        "new Date(0);",
        "Date.parse('2026-01-01');",
        "Math.floor(1.5);",
      ].join("\n"),
    );
    writeFileSync(
      join(root, "packages", "core", "src", "legal.test.ts"),
      "Date.now();\nnew Date();\nMath.random();",
    );
    writeFileSync(join(root, "packages", "core", "src", "legal.spec.ts"), "Date.now();");
    expect(findBoundaryViolations(root)).toEqual([]);
  });

  it("reports the offending source location", () => {
    const root = fixture();
    writeFileSync(
      join(root, "packages", "ui", "src", "illegal.ts"),
      '\nimport "@lyceum/core/src/events";',
    );
    expect(findBoundaryViolations(root)[0]).toMatch(/illegal\.ts:2:\d+/);
  });

  it("rejects forbidden dependencies in every manifest field and gateway imports", () => {
    const root = fixture();
    writeFileSync(
      join(root, "packages", "core", "package.json"),
      JSON.stringify({
        name: "@lyceum/core",
        scripts: { typecheck: "tsc" },
        dependencies: { zod: "*" },
        devDependencies: { react: "*" },
        optionalDependencies: { vite: "*" },
        peerDependencies: { typescript: "*" },
      }),
    );
    writeFileSync(
      join(root, "packages", "gateway", "package.json"),
      JSON.stringify({
        name: "@lyceum/gateway",
        scripts: { typecheck: "tsc" },
        devDependencies: { "@lyceum/core": "workspace:*" },
        optionalDependencies: { "@lyceum/ui": "workspace:*" },
      }),
    );
    writeFileSync(join(root, "packages", "gateway", "src", "illegal.ts"), 'import "@lyceum/core";');
    const problems = findBoundaryViolations(root);
    expect(problems).toHaveLength(6);
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining("core must only depend on zod, found: react"),
        expect.stringContaining("core must only depend on zod, found: vite"),
        expect.stringContaining("core must only depend on zod, found: typescript"),
        expect.stringContaining("gateway must not depend on @lyceum/core"),
        expect.stringContaining("gateway must not depend on @lyceum/ui"),
        expect.stringContaining("gateway must not import @lyceum/core"),
      ]),
    );
  });

  it("rejects forbidden package dependency direction even without a manifest entry", () => {
    const root = fixture();
    writeFileSync(join(root, "packages", "core", "src", "illegal.ts"), 'import "@lyceum/gateway";');
    writeFileSync(join(root, "packages", "gateway", "src", "illegal.ts"), 'import "@lyceum/core";');
    expect(findBoundaryViolations(root)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("core must not import @lyceum/gateway"),
        expect.stringContaining("gateway must not import @lyceum/core"),
      ]),
    );
  });

  it("requires typecheck scripts in application workspaces as well as packages", () => {
    const root = fixture();
    mkdirSync(join(root, "apps", "web"), { recursive: true });
    writeFileSync(
      join(root, "apps", "web", "package.json"),
      JSON.stringify({ name: "@lyceum/web" }),
    );
    expect(findBoundaryViolations(root)).toEqual([
      expect.stringContaining("apps/web: missing typecheck script"),
    ]);
  });

  it("rejects computed and parenthesized globals and require.resolve imports", () => {
    const root = fixture();
    writeFileSync(
      join(root, "packages", "core", "src", "illegal.ts"),
      [
        'Date["now"]();',
        'Math["random"]();',
        "new (Date)();",
        'globalThis["Date"].now();',
        'require.resolve("../../../apps/web/src/main");',
      ].join("\n"),
    );
    const problems = findBoundaryViolations(root);
    expect(problems).toHaveLength(5);
    expect(problems[4]).toContain("packages must not import from apps/");
  });

  it("checks source outside src and rejects exports escaping the package", () => {
    const root = fixture();
    writeFileSync(join(root, "packages", "core", "outside.ts"), "Math.random();");
    writeFileSync(
      join(root, "packages", "ui", "package.json"),
      JSON.stringify({
        name: "@lyceum/ui",
        scripts: { typecheck: "tsc" },
        exports: { ".": "../../apps/web/src/app.ts" },
      }),
    );
    expect(findBoundaryViolations(root)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("core/outside.ts:1:1: core must use injected Clock/Rng"),
        expect.stringContaining("ui: export target escapes package"),
      ]),
    );
  });

  it.skipIf(process.platform === "win32")("rejects symlinked source code", () => {
    const root = fixture();
    writeFileSync(join(root, "packages", "core", "src", "actual.ts"), "Math.random();");
    symlinkSync(
      join(root, "packages", "core", "src", "actual.ts"),
      join(root, "packages", "core", "src", "linked.ts"),
    );
    expect(findBoundaryViolations(root)).toEqual(
      expect.arrayContaining([expect.stringContaining("source symlinks are not allowed")]),
    );
  });
});
