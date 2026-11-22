import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("../packages/ui/src/glass.css", import.meta.url)),
  "utf8",
);

describe("Lyceum theme token contract", () => {
  it("provides shared spacing, readable type, and minimum touch target tokens", () => {
    for (const name of [
      "--space-1",
      "--space-2",
      "--space-3",
      "--space-4",
      "--space-5",
      "--space-6",
      "--space-7",
      "--type-reading",
      "--line-height-reading",
      "--target-min",
      "--surface-reading-solid",
    ]) {
      expect(css).toContain(`${name}:`);
    }
    expect(css).toMatch(/--target-min:\s*44px/);
  });

  it("supports automatic and explicitly selected light themes", () => {
    expect(css).toContain('data-theme="light"');
    expect(css).toContain('data-theme="auto"');
    expect(css).toContain("prefers-color-scheme: light");
    expect(css).toContain(":root:is(:not([data-theme])");
    expect(css).toContain("--backdrop-solid");
  });

  it("uses opaque surfaces when transparency is reduced or off", () => {
    expect(css).toContain('data-transparency="reduced"');
    expect(css).toContain('data-transparency="off"');
    expect(css).toContain("prefers-reduced-transparency: reduce");
    expect(css).toMatch(/--surface-reading-solid:\s*#[0-9a-f]{6}/i);
    expect(css).toContain("backdrop-filter: none");
    expect(css).toContain("background: var(--surface-raised-solid)");
    expect(css).toContain("background: var(--surface-float-solid)");
  });

  it("offers user-selected and system high contrast with solid glass levels", () => {
    expect(css).toContain('data-contrast="high"');
    expect(css).toContain('data-contrast="standard"');
    expect(css).toContain("prefers-contrast: more");
    expect(css).toContain("border-color: var(--contrast-border)");
    expect(css).toContain("background: var(--surface-reading-solid)");
    expect(css).toMatch(/--text-3:\s*rgb\(15 20 30 \/ 0\.78\)/);
  });

  it("provides motion-level preferences without requiring an animation runtime", () => {
    expect(css).toContain('data-motion="reduced"');
    expect(css).toContain('data-motion="off"');
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
