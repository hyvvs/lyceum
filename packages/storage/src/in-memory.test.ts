import { describe, expect, it } from "vitest";
import { describeStorageContract } from "./contracts";
import { createInMemoryStorage } from "./index";

// The exact same public-interface suite can be bound to native/WASM SQLite later.
describeStorageContract("in-memory", () => createInMemoryStorage());

describe("in-memory adapter-specific lifecycle", () => {
  it("creates separate, unshared storage objects", () => {
    const a = createInMemoryStorage();
    const b = createInMemoryStorage();
    expect(a).not.toBe(b);
  });
});
