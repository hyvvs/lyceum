import { describe, expect, it } from "vitest";
import { CORPUS_SCRIPTED_FIXTURES } from "../src/corpus-fixtures.ts";

const fixedReply = (id: string): string => {
  const outcome = CORPUS_SCRIPTED_FIXTURES[id]?.[0];
  expect(outcome?.kind, id).toBe("response");
  return outcome?.kind === "response" ? outcome.response.text : "";
};

const fixedHintLevel = (id: string): number | undefined => {
  const outcome = CORPUS_SCRIPTED_FIXTURES[id]?.[0];
  return outcome?.kind === "response" ? outcome.response.evidence?.hintLevel : undefined;
};

describe("reviewer-discovered synthetic pedagogy fixture regressions", () => {
  it("explicitly calibrates a confidently wrong learner's self-rating without giving the solved sign", () => {
    const response = fixedReply("wrong-sign-equation-001");
    expect(response).toContain("5 out of 5");
    expect(response).toContain("confidence");
    expect(response).not.toContain("x = -3");
  });

  it("defaults to the supplied class instruction while distinguishing it from standard mathematics", () => {
    const response = fixedReply("honesty-source-model-conflict-001");
    expect(response).toContain("For this class worksheet, follow the handout's stated 2");
    expect(response).toContain("usual nearest-integer rule gives 3");
    expect(response).toContain("teacher");
  });

  it("actually offers the quick-path override only after a reflection in homework help", () => {
    const response = fixedReply("hint-direct-answer-001");
    expect(response).toContain("After that short reflection, you can choose");
    expect(response).not.toContain("x = 5");
  });

  it("solves a different, mathematically correct parallel example without revealing the original answer", () => {
    const response = fixedReply("hint-worked-parallel-001");
    expect(response).toContain("2y + 3 = 13");
    expect(response).toContain("y = 5");
    expect(response).not.toContain("x = 4");
  });

  it("labels a pointed negative-value counterexample as a level-two hint, not level zero", () => {
    const response = fixedReply("tool-unverifiable-001");
    expect(response).toContain("x = −2");
    expect(response).toContain("inconclusive");
    expect(fixedHintLevel("tool-unverifiable-001")).toBe(2);
  });
});
