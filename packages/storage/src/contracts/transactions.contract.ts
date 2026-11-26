import type { LyceumEvent, StorageTransaction } from "@lyceum/core";
import { describe, expect, it } from "vitest";
import { type StorageFactory, attempt, content, deferred } from "./fixtures";

export function transactionContract(factory: StorageFactory): void {
  describe("atomic transactions, read visibility, and serialized writers", () => {
    it("commits an event batch, content and a transaction-local projection atomically", async () => {
      const store = await factory();
      const graph = content("atomic");
      await store.transaction((tx) => {
        tx.append([attempt("one"), attempt("two")]);
        tx.putContent(graph);
        tx.putProjection({
          id: "fold",
          asOfSeq: tx.getLastSeq(),
          algoVersion: "synthetic-v1",
          payload: { count: tx.readEntries().entries.length },
        });
      });
      expect((await store.readEntries()).entries.map((row) => row.seq)).toEqual([1, 2]);
      expect(await store.getContent("concept-graph", "atomic")).toEqual(graph);
      expect(await store.getProjection("fold")).toEqual({
        id: "fold",
        asOfSeq: 2,
        algoVersion: "synthetic-v1",
        payload: { count: 2 },
      });
    });

    it("transaction reads include the staged event, content and projection", async () => {
      const store = await factory();
      await store.transaction((tx) => {
        tx.append([attempt("staged")]);
        tx.putContent(content("pending"));
        tx.putProjection({
          id: "pending",
          asOfSeq: 1,
          algoVersion: "synthetic-v1",
          payload: { value: true },
        });
        expect(tx.getLastSeq()).toBe(1);
        expect(tx.readEntries().entries.map((entry) => entry.event.id)).toEqual(["staged"]);
        expect(tx.getContent("concept-graph", "pending")).toEqual(content("pending"));
        expect(tx.getProjection("pending")?.asOfSeq).toBe(1);
      });
    });

    it("paginates across committed and staged event boundaries without skipping entries", async () => {
      const store = await factory();
      await store.append([attempt("old-1"), attempt("old-2")]);
      await store.transaction((tx) => {
        tx.append([attempt("new-1"), attempt("new-2")]);
        const middle = tx.readEntries({ afterSeq: 1, limit: 2 });
        const tail = tx.readEntries({ afterSeq: middle.lastSeq, limit: 2 });
        expect(middle.entries.map((row) => [row.seq, row.event.id])).toEqual([
          [2, "old-2"],
          [3, "new-1"],
        ]);
        expect(tail.entries.map((row) => [row.seq, row.event.id])).toEqual([[4, "new-2"]]);
        expect(tail.lastSeq).toBe(4);
      });
      expect(await store.getLastSeq()).toBe(4);
    });

    it("transaction-local content revisions replay identically and reject gaps atomically", async () => {
      const store = await factory();
      await store.putContent(content("multi-revision"));
      await store.transaction((tx) => {
        tx.putContent(content("multi-revision", { nodes: ["two"] }, 2));
        tx.putContent(content("multi-revision", { nodes: ["two"] }, 2));
        tx.putContent(content("multi-revision", { nodes: ["three"] }, 3));
        expect(tx.getContent("concept-graph", "multi-revision")?.revision).toBe(3);
        expect(tx.getContent("concept-graph", "multi-revision", 1)).toEqual(
          content("multi-revision"),
        );
      });
      expect((await store.getContent("concept-graph", "multi-revision"))?.revision).toBe(3);
      await expect(
        store.transaction((tx) => {
          tx.putContent(content("gap-batch"));
          tx.putContent(content("gap-batch", { nodes: [8] }, 3));
        }),
      ).rejects.toMatchObject({ code: "invalid_input" });
      expect(await store.getContent("concept-graph", "gap-batch")).toBeNull();
    });

    it("rolls back replacement of an already committed projection without altering prior data", async () => {
      const store = await factory();
      const old = {
        id: "replaceable",
        asOfSeq: 0,
        algoVersion: "synthetic-v1",
        payload: { count: 0 },
      };
      await store.putProjection(old);
      await expect(
        store.transaction((tx) => {
          tx.append([attempt("uncommitted")]);
          tx.putProjection({
            id: old.id,
            asOfSeq: 1,
            algoVersion: "synthetic-v2",
            payload: { count: 1 },
          });
          throw Error("synthetic rollback");
        }),
      ).rejects.toMatchObject({ code: "transaction_aborted" });
      expect(await store.getProjection(old.id)).toEqual(old);
      expect(await store.getLastSeq()).toBe(0);
    });

    it("external reads observe only committed data while a write is staged", async () => {
      const store = await factory();
      let outsideRead!: ReturnType<typeof store.readEntries>;
      let outsideContent!: ReturnType<typeof store.getContent>;
      let outsideProjection!: ReturnType<typeof store.getProjection>;
      let outsideHead!: ReturnType<typeof store.getLastSeq>;
      await store.transaction((tx) => {
        tx.append([attempt("not-yet-committed")]);
        tx.putContent(content("not-yet-committed"));
        outsideRead = store.readEntries();
        outsideContent = store.getContent("concept-graph", "not-yet-committed");
        tx.putProjection({
          id: "not-yet-committed",
          asOfSeq: 1,
          algoVersion: "synthetic-v1",
          payload: { count: 1 },
        });
        outsideProjection = store.getProjection("not-yet-committed");
        outsideHead = store.getLastSeq();
        expect(tx.readEntries().entries).toHaveLength(1);
      });
      expect(await outsideRead).toEqual({ entries: [], lastSeq: 0 });
      expect(await outsideContent).toBeNull();
      expect(await outsideProjection).toBeNull();
      expect(await outsideHead).toBe(0);
      expect((await store.read()).events).toHaveLength(1);
      expect(await store.getContent("concept-graph", "not-yet-committed")).not.toBeNull();
      expect((await store.getProjection("not-yet-committed"))?.asOfSeq).toBe(1);
    });

    it("rolls back every store and sequence on arbitrary callback failure", async () => {
      const store = await factory();
      await expect(
        store.transaction((tx) => {
          tx.append([attempt("rollback")]);
          tx.putContent(content("rollback"));
          tx.putProjection({
            id: "rollback",
            asOfSeq: 1,
            algoVersion: "synthetic-v1",
            payload: true,
          });
          throw new Error("synthetic private payload MUST NOT LEAK");
        }),
      ).rejects.toMatchObject({ code: "transaction_aborted" });
      expect(await store.getLastSeq()).toBe(0);
      expect(await store.getContent("concept-graph", "rollback")).toBeNull();
      expect(await store.getProjection("rollback")).toBeNull();
    });

    it("rolls back valid changes when a final event is invalid", async () => {
      const store = await factory();
      const invalid = { ...attempt("invalid"), version: 500 } as unknown as LyceumEvent;
      await expect(
        store.transaction((tx) => {
          tx.append([attempt("valid")]);
          tx.putContent(content("valid"));
          tx.putProjection({
            id: "valid",
            asOfSeq: 1,
            algoVersion: "synthetic-v1",
            payload: { complete: false },
          });
          tx.append([invalid]);
        }),
      ).rejects.toMatchObject({ code: "invalid_event" });
      expect(await store.readEntries()).toEqual({ entries: [], lastSeq: 0 });
      expect(await store.getContent("concept-graph", "valid")).toBeNull();
      expect(await store.getProjection("valid")).toBeNull();
    });

    it("rolls back on a conflicting ID after other staged writes", async () => {
      const store = await factory();
      const original = attempt("immutable");
      await store.append([original]);
      await expect(
        store.transaction((tx) => {
          tx.putContent(content("rolled-back"));
          tx.append([attempt("new")]);
          tx.append([{ ...original, payload: { ...original.payload, score: 0 } }]);
        }),
      ).rejects.toMatchObject({ code: "conflict" });
      expect((await store.read()).events).toEqual([original]);
      expect(await store.getContent("concept-graph", "rolled-back")).toBeNull();
      expect(await store.getLastSeq()).toBe(1);
    });

    it("a caught validation failure poisons and rolls back the whole transaction", async () => {
      const store = await factory();
      await expect(
        store.transaction((tx) => {
          tx.append([attempt("valid")]);
          try {
            tx.append([{ ...attempt("invalid"), occurredAt: "wrong" }]);
          } catch {
            // A consumer must not be able to commit earlier writes by swallowing an error.
          }
          tx.putContent(content("must-not-commit"));
        }),
      ).rejects.toMatchObject({ code: "invalid_event" });
      expect(await store.getLastSeq()).toBe(0);
      expect(await store.getContent("concept-graph", "must-not-commit")).toBeNull();
    });

    it("serializes concurrently invoked batches without interleaving their events", async () => {
      const store = await factory();
      const one = store.append([attempt("a1"), attempt("a2"), attempt("a3")]);
      const two = store.append([attempt("b1"), attempt("b2")]);
      const three = store.append([attempt("c1")]);
      await Promise.all([one, two, three]);
      expect((await store.read()).events.map((e) => e.id)).toEqual([
        "a1",
        "a2",
        "a3",
        "b1",
        "b2",
        "c1",
      ]);
      expect((await store.readEntries()).entries.map((row) => row.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("concurrent identical replays remain idempotent while conflicting writes reject", async () => {
      const store = await factory();
      const original = attempt("race");
      const changed = { ...original, payload: { ...original.payload, score: 0.1 } };
      const one = store.append([original]);
      const replay = store.append([original]);
      const conflict = store.append([changed]);
      const next = store.append([attempt("after")]);
      const settled = await Promise.allSettled([one, replay, conflict, next]);
      expect(settled.map((outcome) => outcome.status)).toEqual([
        "fulfilled",
        "fulfilled",
        "rejected",
        "fulfilled",
      ]);
      expect((await store.read()).events.map((item) => item.id)).toEqual(["race", "after"]);
      expect(await store.getLastSeq()).toBe(2);
    });

    it("recovers its serialized writer queue after a failed transaction", async () => {
      const store = await factory();
      const failed = store.transaction((tx) => {
        tx.append([attempt("never")]);
        throw new Error("synthetic failure");
      });
      const succeeded = store.append([attempt("yes")]);
      await expect(failed).rejects.toMatchObject({ code: "transaction_aborted" });
      await expect(succeeded).resolves.toBeUndefined();
      expect((await store.read()).events.map((item) => item.id)).toEqual(["yes"]);
      expect(await store.getLastSeq()).toBe(1);
    });

    it("uses explicit deferred barriers to preserve caller-ordered writer causality", async () => {
      const store = await factory();
      const first = deferred();
      const second = deferred();
      const firstWrite = first.promise.then(() => store.append([attempt("barrier-first")]));
      const secondWrite = second.promise.then(() => store.append([attempt("barrier-second")]));
      first.resolve();
      await firstWrite;
      second.resolve();
      await secondWrite;
      expect((await store.read()).events.map((item) => item.id)).toEqual([
        "barrier-first",
        "barrier-second",
      ]);
    });

    it("rejects use of retained transaction handles after commit and rollback", async () => {
      const store = await factory();
      let committed!: StorageTransaction;
      await store.transaction((tx) => {
        committed = tx;
        tx.append([attempt("commit")]);
      });
      expect(() => committed.append([attempt("too-late")])).toThrow(
        expect.objectContaining({ code: "closed_transaction" }),
      );
      expect(() => committed.readEntries()).toThrow(
        expect.objectContaining({ code: "closed_transaction" }),
      );
      let rolledBack!: StorageTransaction;
      await expect(
        store.transaction((tx) => {
          rolledBack = tx;
          throw new Error("rollback");
        }),
      ).rejects.toMatchObject({ code: "transaction_aborted" });
      expect(() => rolledBack.putContent(content("too-late"))).toThrow(
        expect.objectContaining({ code: "closed_transaction" }),
      );
      expect(await store.getLastSeq()).toBe(1);
    });

    it("rejects nested/reentrant transactions rather than deadlocking", async () => {
      const store = await factory();
      await expect(
        store.transaction((tx) => {
          tx.append([attempt("never")]);
          void store.transaction(() => {
            throw new Error("must not execute");
          });
        }),
      ).rejects.toMatchObject({ code: "nested_transaction" });
      expect(await store.getLastSeq()).toBe(0);
      await store.append([attempt("after-nesting")]);
      expect(await store.getLastSeq()).toBe(1);
    });

    it("cannot commit a transaction when a nested write failure was caught", async () => {
      const store = await factory();
      await expect(
        store.transaction((tx) => {
          tx.append([attempt("discard-before-nesting")]);
          try {
            void store.append([attempt("nested")]);
          } catch {
            // Deliberately swallow the direct exception; the outer tx must
            // still be poisoned, not silently commit its earlier event.
          }
        }),
      ).rejects.toMatchObject({ code: "nested_transaction" });
      expect(await store.getLastSeq()).toBe(0);
      await store.append([attempt("after-caught-nesting")]);
      expect(await store.getLastSeq()).toBe(1);
    });

    it("rejects async transaction callbacks and rolls back staged state", async () => {
      const store = await factory();
      await expect(
        store.transaction(async (tx) => {
          tx.append([attempt("never-async")]);
        }),
      ).rejects.toMatchObject({ code: "async_transaction" });
      expect(await store.getLastSeq()).toBe(0);
    });

    it("rejects projections ahead of the transaction-local event head", async () => {
      const store = await factory();
      await expect(
        store.transaction((tx) => {
          tx.append([attempt("only-one")]);
          tx.putProjection({
            id: "future",
            asOfSeq: 2,
            algoVersion: "synthetic",
            payload: {},
          });
        }),
      ).rejects.toMatchObject({ code: "invalid_input" });
      expect(await store.getLastSeq()).toBe(0);
      expect(await store.getProjection("future")).toBeNull();
    });
  });
}
