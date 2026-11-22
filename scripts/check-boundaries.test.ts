import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
});
