import { describe, expect, it } from "vitest";
import { ConceptSchema, transitivePrerequisites, validateConceptGraph } from "./concept-graph";

const c = (id: string, prerequisites: string[] = []) =>
  ConceptSchema.parse({ id, name: id, prerequisites });

describe("validateConceptGraph", () => {
  it("returns prerequisites-first order", () => {
    const result = validateConceptGraph([c("c", ["b"]), c("b", ["a"]), c("a")]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.order).toEqual(["a", "b", "c"]);
  });

  it("detects cycles", () => {
    const result = validateConceptGraph([c("a", ["b"]), c("b", ["a"])]);
    expect(result.ok).toBe(false);
  });

  it("detects missing prerequisites and duplicates", () => {
    expect(validateConceptGraph([c("a", ["zzz"])]).ok).toBe(false);
    expect(validateConceptGraph([c("a"), c("a")]).ok).toBe(false);
  });
});

describe("transitivePrerequisites", () => {
  it("walks upstream, nearest first", () => {
    const graph = [c("c", ["b"]), c("b", ["a"]), c("a")];
    expect(transitivePrerequisites(graph, "c")).toEqual(["b", "a"]);
  });
});
