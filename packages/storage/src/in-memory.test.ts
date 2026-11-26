import {
  type ContentRecord,
  type LyceumEvent,
  StorageError,
  type StorageReadOptions,
} from "@lyceum/core";
import { describe, expect, it } from "vitest";
import { describeStorageContract } from "./contracts";
import { attempt, content } from "./contracts/fixtures";
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

describe("independent review regression evidence", () => {
  it("does not propagate forged StorageError messages from a callback or input proxy", async () => {
    const store = createInMemoryStorage();
    const marker = "SYNTHETIC_PRIVATE_LEARNER_PAYLOAD_DO_NOT_DISCLOSE";
    const forged = new StorageError("conflict");
    forged.message = marker;
    let callbackError: unknown;
    try {
      await store.transaction((tx) => {
        tx.append([attempt("should-rollback")]);
        throw forged;
      });
    } catch (error) {
      callbackError = error;
    }
    expect(callbackError).toMatchObject({ code: "conflict", message: "conflict" });
    expect(callbackError).not.toBe(forged);
    expect(String(callbackError)).not.toContain(marker);
    expect(await store.getLastSeq()).toBe(0);

    const hostile = new Proxy(content("hostile"), {
      getPrototypeOf() {
        const error = new StorageError("invalid_input");
        error.message = marker;
        throw error;
      },
    });
    let proxyError: unknown;
    try {
      await store.putContent(hostile);
    } catch (error) {
      proxyError = error;
    }
    expect(proxyError).toBeInstanceOf(StorageError);
    expect(String(proxyError)).not.toContain(marker);
  });

  it("rejects native async transaction callbacks without invoking their body", async () => {
    const store = createInMemoryStorage();
    let invoked = false;
    await expect(
      store.transaction(async (tx) => {
        invoked = true;
        await Promise.resolve();
        tx.append([attempt("never")]);
        throw new Error("SYNTHETIC_PRIVATE_DO_NOT_LEAK");
      }),
    ).rejects.toMatchObject({ code: "async_transaction" });
    expect(invoked).toBe(false);
    expect(await store.getLastSeq()).toBe(0);
    await store.append([attempt("after-async")]);
    expect(await store.getLastSeq()).toBe(1);
  });

  it("observes rejection from arbitrary thenables returned by a synchronous callback", async () => {
    const store = createInMemoryStorage();
    let rejectionHandled = false;
    // biome-ignore lint/suspicious/noThenProperty: deliberately tests an untrusted thenable.
    const returnedThenable = Object.defineProperty({}, "then", {
      value: (_resolve: unknown, reject?: (reason: Error) => void) => {
        rejectionHandled = typeof reject === "function";
        reject?.(new Error("SYNTHETIC_PRIVATE_REJECTION"));
      },
    });
    await expect(
      store.transaction((tx) => {
        tx.append([attempt("not-committed")]);
        return returnedThenable as unknown as undefined;
      }),
    ).rejects.toMatchObject({ code: "async_transaction" });
    await Promise.resolve();
    await Promise.resolve();
    expect(rejectionHandled).toBe(true);
    expect(await store.getLastSeq()).toBe(0);
  });

  it("rejects explicit null pagination and never executes caller accessor getters", async () => {
    const store = createInMemoryStorage();
    await store.append([attempt("record")]);
    for (const options of [
      { limit: null },
      { afterSeq: null },
    ] as unknown as StorageReadOptions[]) {
      await expect(store.readEntries(options)).rejects.toMatchObject({ code: "invalid_input" });
    }
    let getterCalled = false;
    const getter = Object.defineProperty({}, "limit", {
      enumerable: true,
      get() {
        getterCalled = true;
        throw new Error("SYNTHETIC_PRIVATE_DO_NOT_DISCLOSE");
      },
    }) as StorageReadOptions;
    await expect(store.readEntries(getter)).rejects.toMatchObject({ code: "invalid_input" });
    expect(getterCalled).toBe(false);
    expect(await store.getLastSeq()).toBe(1);
  });

  it("rejects accessor-backed input array lengths without executing an indexed getter", async () => {
    const store = createInMemoryStorage();
    const batch = [attempt("one")];
    let getterCalled = false;
    Object.defineProperty(batch, "0", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalled = true;
        throw Error("SYNTHETIC_PRIVATE");
      },
    });
    await expect(store.append(batch)).rejects.toMatchObject({ code: "invalid_event" });
    expect(getterCalled).toBe(false);
    expect(await store.getLastSeq()).toBe(0);
    const record = content("ok");
    await expect(store.putContent(record as ContentRecord)).resolves.toBeUndefined();
  });

  it("rejects Zod-default-expanded events that exceed the canonical JSON node boundary", async () => {
    const store = createInMemoryStorage();
    const fixture = attempt("synthetic-canonical-boundary");
    // Exactly 1,000,000 JSON nodes *before* Zod adds two default arrays:
    // root(1) + six envelope primitives + payload(1) + six payload
    // fields/array = 14, plus 999,986 concept ID strings.
    const raw = {
      ...fixture,
      payload: {
        itemId: "synthetic-item",
        conceptIds: Array(999_986).fill("synthetic-concept"),
        score: 0.75,
        responseMs: 1200,
        hintLevel: 0,
        context: "practice",
      },
    } as LyceumEvent;
    await expect(store.transaction((tx) => tx.append([raw]))).rejects.toMatchObject({
      code: "invalid_event",
    });
    expect(await store.getLastSeq()).toBe(0);
    await expect(store.append([raw])).rejects.toMatchObject({ code: "invalid_event" });
    expect(await store.getLastSeq()).toBe(0);
    await store.append([attempt("valid-after-large")]);
    expect((await store.readEntries()).entries[0]?.seq).toBe(1);
  }, 30_000);
});
