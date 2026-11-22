import { describe, expect, it } from "vitest";
import {
  cardVariants,
  ease,
  pageVariants,
  pickPageVariants,
  reducedPageVariants,
  spring,
  staggerDelay,
} from "./motion";

describe("staggerDelay", () => {
  it("grows linearly and is capped", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2)).toBeCloseTo(0.1, 10);
    expect(staggerDelay(100)).toBe(0.4);
  });

  it("never returns a negative delay", () => {
    expect(staggerDelay(-3)).toBe(0);
  });
});

describe("presets", () => {
  it("has well-formed easing curves and springs", () => {
    expect(ease.out).toHaveLength(4);
    expect(ease.inOut).toHaveLength(4);
    expect(spring.snappy.stiffness).toBeGreaterThan(spring.smooth.stiffness);
    expect(spring.smooth.stiffness).toBeGreaterThan(spring.gentle.stiffness);
  });

  it("uses only transform, opacity, and filter keys in page variants", () => {
    const allowed = new Set(["opacity", "y", "scale", "filter", "transition"]);
    for (const state of [pageVariants.initial, pageVariants.animate, pageVariants.exit]) {
      for (const key of Object.keys(state)) expect(allowed.has(key)).toBe(true);
    }
  });

  it("staggers cards by index", () => {
    expect(cardVariants.animate(3).transition.delay).toBeGreaterThan(
      cardVariants.animate(1).transition.delay,
    );
  });

  it("reduced motion removes movement and blur", () => {
    expect(pickPageVariants(true)).toBe(reducedPageVariants);
    expect(pickPageVariants(false)).toBe(pageVariants);
    expect(Object.keys(reducedPageVariants.initial)).toEqual(["opacity"]);
  });
});
