import { describe, expect, it } from "vitest";
import { acquireSelectBackgroundInert, releaseSelectBackgroundInert } from "./select-inert";

const background = (initialInert = false) => ({ inert: initialInert }) as HTMLElement;

describe("Select portal background inert ownership", () => {
  it("keeps an overlapping hidden subtree inert until the last overlay releases it", () => {
    const subtree = background();
    const first = new Set<HTMLElement>();
    const second = new Set<HTMLElement>();
    acquireSelectBackgroundInert(subtree, first);
    expect(subtree.inert).toBe(true);
    acquireSelectBackgroundInert(subtree, second);
    acquireSelectBackgroundInert(subtree, first);
    releaseSelectBackgroundInert(first);
    expect(subtree.inert).toBe(true);
    releaseSelectBackgroundInert(second);
    expect(subtree.inert).toBe(false);
  });

  it("preserves a pre-existing inert state, including after repeated or unmount cleanup", () => {
    const subtree = background(true);
    const owners = new Set<HTMLElement>();
    acquireSelectBackgroundInert(subtree, owners);
    expect(subtree.inert).toBe(true);
    releaseSelectBackgroundInert(owners);
    releaseSelectBackgroundInert(owners);
    expect(subtree.inert).toBe(true);
  });

  it("does not retain ownership beyond close or an effect cleanup", () => {
    const subtree = background();
    const first = new Set<HTMLElement>();
    acquireSelectBackgroundInert(subtree, first);
    releaseSelectBackgroundInert(first);
    expect(subtree.inert).toBe(false);
    const later = new Set<HTMLElement>();
    acquireSelectBackgroundInert(subtree, later);
    expect(subtree.inert).toBe(true);
    releaseSelectBackgroundInert(later);
    expect(subtree.inert).toBe(false);
  });
});
