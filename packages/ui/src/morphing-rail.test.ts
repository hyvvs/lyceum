import { describe, expect, it } from "vitest";
import { connectedSelectionPath } from "./morphing-rail";

describe("connected glass rail geometry", () => {
  it("uses one continuous closed shape connecting the selection and utility spine", () => {
    const path = connectedSelectionPath(264, 208, 44, 680, 48, 18);
    expect(path).toMatch(/^M /);
    expect(path).toMatch(/ Z$/);
    expect(path.match(/\bM\b/g)).toHaveLength(1);
    expect(path.match(/\bZ\b/g)).toHaveLength(1);
    expect(path).toContain("H 246");
    expect(path).toContain("V 662");
    expect(path).not.toMatch(/NaN|Infinity/);
  });

  it("morphs the same connected surface without changing shape topology", () => {
    const pathTop = connectedSelectionPath(264, 120, 44, 680, 48, 18);
    const pathBottom = connectedSelectionPath(264, 380, 44, 680, 48, 18);
    const pathHalfExpanded = connectedSelectionPath(192, 250, 44, 680, 48, 18);
    expect(new Set([pathTop, pathBottom, pathHalfExpanded]).size).toBe(3);
    for (const path of [pathTop, pathBottom, pathHalfExpanded]) {
      expect(path.match(/\bM\b/g)).toHaveLength(1);
      expect(path.match(/\bZ\b/g)).toHaveLength(1);
      expect(path.match(/\bQ\b/g)).toHaveLength(8);
    }
  });
});
