import type { LyceumEvent, StorageReadOptions } from "@lyceum/core";
import { describe, expect, it } from "vitest";
import { type StorageFactory, attempt, event } from "./fixtures";

export function eventContract(factory: StorageFactory): void {
  describe("events, local sequence and idempotency", () => {
    it("starts empty with a zero head and an empty first page", async () => {
      const store = await factory();
      expect(await store.getLastSeq()).toBe(0);
      expect(await store.read()).toEqual({ events: [], lastSeq: 0 });
      expect(await store.readEntries()).toEqual({ entries: [], lastSeq: 0 });
      await store.append([]);
      expect(await store.getLastSeq()).toBe(0);
    });

    it("appends one canonical event with local sequence one", async () => {
      const store = await factory();
      const first = attempt("first");
      await store.append([first]);
      expect(await store.getLastSeq()).toBe(1);
      expect(await store.read()).toEqual({ events: [first], lastSeq: 1 });
      expect(await store.readEntries()).toEqual({
        entries: [{ seq: 1, event: first }],
        lastSeq: 1,
      });
    });

    it("preserves batch and writer order rather than event timestamps", async () => {
      const store = await factory();
      const first = event("session.started", "first", "2026-12-01T00:00:00.000Z");
      const second = event("attempt.recorded", "second", "2026-01-01T00:00:00.000Z");
      const third = event("session.ended", "third", "2026-03-01T00:00:00.000Z");
      await store.append([first, second]);
      await store.append([third]);
      const page = await store.readEntries();
      expect(page.entries.map(({ seq, event: item }) => [seq, item.id])).toEqual([
        [1, "first"],
        [2, "second"],
        [3, "third"],
      ]);
      expect(page.entries[0]?.event.occurredAt).toBe(first.occurredAt);
    });

    it("supports precisely all four current canonical event variants", async () => {
      const store = await factory();
      const types = [
        "attempt.recorded",
        "session.started",
        "session.ended",
        "goal.created",
      ] as const;
      await store.append(types.map((type, index) => event(type, `variant-${index}`)));
      expect((await store.read()).events.map((item) => item.type)).toEqual(types);
      expect(await store.getLastSeq()).toBe(4);
    });

    it("provides exclusive cursor and bounded limit pagination without duplicates", async () => {
      const store = await factory();
      await store.append(Array.from({ length: 5 }, (_, n) => attempt(`page-${n}`)));
      const one = await store.readEntries({ afterSeq: 0, limit: 2 });
      const two = await store.readEntries({ afterSeq: one.lastSeq, limit: 2 });
      const three = await store.readEntries({ afterSeq: two.lastSeq, limit: 2 });
      const end = await store.readEntries({ afterSeq: three.lastSeq, limit: 2 });
      expect([one.lastSeq, two.lastSeq, three.lastSeq, end.lastSeq]).toEqual([2, 4, 5, 5]);
      expect([...one.entries, ...two.entries, ...three.entries].map((entry) => entry.seq)).toEqual([
        1, 2, 3, 4, 5,
      ]);
      expect(end.entries).toEqual([]);
      expect((await store.read({ afterSeq: 5 })).events).toEqual([]);
    });

    it("rejects invalid cursors and limits, including future sequence claims", async () => {
      const store = await factory();
      await store.append([attempt("only")]);
      const bad: StorageReadOptions[] = [
        { afterSeq: -1 },
        { afterSeq: 1.5 },
        { afterSeq: Number.POSITIVE_INFINITY },
        { afterSeq: Number.NaN },
        { afterSeq: 2 },
        { limit: 0 },
        { limit: -5 },
        { limit: 1.1 },
        { limit: 10001 },
        { limit: Number.MAX_SAFE_INTEGER },
        { limit: "2" } as unknown as StorageReadOptions,
      ];
      for (const options of bad) {
        await expect(store.readEntries(options)).rejects.toMatchObject({ code: "invalid_input" });
        await expect(store.read(options)).rejects.toMatchObject({ code: "invalid_input" });
      }
      expect(await store.getLastSeq()).toBe(1);
    });

    it("canonicalizes Zod default arrays before comparing identical replays", async () => {
      const store = await factory();
      const original = attempt("defaults");
      const withoutDefaults = {
        ...original,
        payload: {
          itemId: original.payload.itemId,
          conceptIds: original.payload.conceptIds,
          score: original.payload.score,
          responseMs: original.payload.responseMs,
          hintLevel: original.payload.hintLevel,
          context: original.payload.context,
        },
      } as LyceumEvent;
      await store.append([withoutDefaults]);
      await store.append([original]);
      expect(await store.getLastSeq()).toBe(1);
      expect((await store.read()).events).toEqual([original]);
    });

    it("compares canonical content independent of property insertion order", async () => {
      const store = await factory();
      const first = attempt("ordered-keys");
      const second = {
        type: first.type,
        payload: {
          context: first.payload.context,
          hintLevel: first.payload.hintLevel,
          errorTags: [],
          score: first.payload.score,
          responseMs: first.payload.responseMs,
          skillIds: [],
          conceptIds: ["synthetic-concept"],
          itemId: first.payload.itemId,
        },
        version: first.version,
        occurredAt: first.occurredAt,
        id: first.id,
        userId: first.userId,
        deviceId: first.deviceId,
      };
      await store.append([first]);
      await store.append([second]);
      expect(await store.getLastSeq()).toBe(1);
    });

    it("deduplicates identical IDs both within a batch and across calls", async () => {
      const store = await factory();
      const a = attempt("same");
      await store.append([a, a, a]);
      await store.append([a, attempt("after")]);
      expect((await store.readEntries()).entries.map((entry) => entry.seq)).toEqual([1, 2]);
      expect(await store.getLastSeq()).toBe(2);
    });

    it("rolls back an entire batch on conflicting IDs within the batch", async () => {
      const store = await factory();
      const a = attempt("conflicting");
      const b = { ...a, payload: { ...a.payload, score: 0.3 } };
      await expect(store.append([a, b])).rejects.toMatchObject({ code: "conflict" });
      expect(await store.readEntries()).toEqual({ entries: [], lastSeq: 0 });
      await store.append([attempt("next")]);
      expect(await store.getLastSeq()).toBe(1);
    });

    it("rejects a conflicting existing ID without swallowing other new batch events", async () => {
      const store = await factory();
      const a = attempt("existing");
      await store.append([a]);
      const changed = { ...a, payload: { ...a.payload, score: 0.1 } };
      await expect(store.append([attempt("new"), changed])).rejects.toMatchObject({
        code: "conflict",
      });
      expect((await store.read()).events).toEqual([a]);
      expect(await store.getLastSeq()).toBe(1);
    });

    it("rejects malformed payloads and unsupported versions without sequence advance", async () => {
      const store = await factory();
      const malformed = {
        ...attempt("bad-payload"),
        payload: { conceptIds: [] },
      } as unknown as LyceumEvent;
      const versioned = { ...attempt("bad-version"), version: 2 } as unknown as LyceumEvent;
      await expect(store.append([malformed])).rejects.toMatchObject({ code: "invalid_event" });
      await expect(store.append([versioned])).rejects.toMatchObject({ code: "invalid_event" });
      expect(await store.getLastSeq()).toBe(0);
    });

    it("rolls back valid prior items when the final batch event is invalid", async () => {
      const store = await factory();
      const invalid = { ...attempt("end"), occurredAt: "not-a-date" } as LyceumEvent;
      await expect(
        store.append([attempt("valid1"), attempt("valid2"), invalid]),
      ).rejects.toMatchObject({
        code: "invalid_event",
      });
      expect(await store.getLastSeq()).toBe(0);
      expect((await store.read()).events).toEqual([]);
      await store.append([attempt("after-failure")]);
      expect((await store.readEntries()).entries[0]?.seq).toBe(1);
    });
  });
}
