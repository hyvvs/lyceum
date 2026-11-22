import { describe, expect, it } from "vitest";
import { bktUpdate, hintWeight } from "./bkt";

describe("bktUpdate", () => {
  it("raises mastery after a correct answer and lowers it after an incorrect one", () => {
    expect(bktUpdate(0.5, { correct: true })).toBeGreaterThan(0.5);
    expect(bktUpdate(0.5, { correct: false })).toBeLessThan(0.5);
  });

  it("treats zero-weight evidence as uninformative", () => {
    const withEvidence = bktUpdate(0.5, { correct: true, weight: 0 });
    const without = bktUpdate(0.5, { correct: false, weight: 0 });
    expect(withEvidence).toBeCloseTo(without, 10);
  });

  it("counts hinted successes less than unaided ones", () => {
    const unaided = bktUpdate(0.4, { correct: true, weight: hintWeight(0) });
    const hinted = bktUpdate(0.4, { correct: true, weight: hintWeight(3) });
    expect(unaided).toBeGreaterThan(hinted);
  });

  it("stays within bounds", () => {
    let p = 0.5;
    for (let i = 0; i < 200; i++) p = bktUpdate(p, { correct: true });
    expect(p).toBeLessThanOrEqual(0.999);
    for (let i = 0; i < 200; i++) p = bktUpdate(p, { correct: false });
    expect(p).toBeGreaterThanOrEqual(0.001);
  });
});
