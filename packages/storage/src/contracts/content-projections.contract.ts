import type { ContentRecord, ProjectionRecord, StorageJson } from "@lyceum/core";
import { describe, expect, it } from "vitest";
import { type StorageFactory, attempt, content } from "./fixtures";

export function contentProjectionContract(factory: StorageFactory): void {
  describe("versioned content and rebuildable projections", () => {
    it("returns null for missing content, revisions and projections", async () => {
      const store = await factory();
      expect(await store.getContent("concept-graph", "missing")).toBeNull();
      expect(await store.getContent("concept-graph", "missing", 1)).toBeNull();
      expect(await store.getProjection("missing")).toBeNull();
    });

    it("stores and retrieves the exact content envelope and schema metadata", async () => {
      const store = await factory();
      const record = content("graph-1", { provenance: "synthetic", nodes: [{ id: "x" }] });
      await store.putContent(record);
      expect(await store.getContent("concept-graph", "graph-1")).toEqual(record);
      expect(await store.getContent("concept-graph", "graph-1", 1)).toEqual(record);
      expect(await store.getContent("concept-graph", "graph-1", 2)).toBeNull();
      expect(await store.getLastSeq()).toBe(0);
    });

    it("isolates content by namespace and identity, not object prototype keys", async () => {
      const store = await factory();
      const graph = content("shared");
      const goal = { ...content("shared"), namespace: "goal" as const, payload: { target: 1 } };
      await store.putContent(graph);
      await store.putContent(goal);
      expect(await store.getContent("goal", "shared")).toEqual(goal);
      expect(await store.getContent("concept-graph", "shared")).toEqual(graph);
      expect(await store.getContent("item", "shared")).toBeNull();
    });

    it("retains immutable graph revisions while exposing the latest", async () => {
      const store = await factory();
      const first = content("versioned", { nodes: ["initial"] });
      const second = {
        ...first,
        schemaVersion: 2,
        revision: 2,
        payload: { nodes: ["updated", "synthetic"] },
      };
      await store.putContent(first);
      await store.putContent(second);
      expect(await store.getContent("concept-graph", "versioned", 1)).toEqual(first);
      expect(await store.getContent("concept-graph", "versioned", 2)).toEqual(second);
      expect(await store.getContent("concept-graph", "versioned")).toEqual(second);
    });

    it("identical revisions replay, but different contents at an existing revision conflict", async () => {
      const store = await factory();
      const original = content("idempotent", { labels: ["one", "two"] });
      await store.putContent(original);
      await store.putContent({ ...original, payload: { labels: ["one", "two"] } });
      await expect(
        store.putContent({ ...original, payload: { labels: ["different"] } }),
      ).rejects.toMatchObject({ code: "conflict" });
      expect(await store.getContent("concept-graph", "idempotent")).toEqual(original);
    });

    it("rejects skipped and nonpositive revisions or schema versions", async () => {
      const store = await factory();
      await expect(store.putContent(content("gap", {}, 2))).rejects.toMatchObject({
        code: "invalid_input",
      });
      for (const bad of [
        { ...content("badrev"), revision: 0 },
        { ...content("badrev"), revision: -1 },
        { ...content("badrev"), revision: 1.2 },
        { ...content("badver"), schemaVersion: 0 },
        { ...content("badver"), schemaVersion: Number.POSITIVE_INFINITY },
      ]) {
        await expect(store.putContent(bad)).rejects.toMatchObject({ code: "invalid_input" });
      }
      expect(await store.getContent("concept-graph", "gap")).toBeNull();
    });

    it("validates content namespace and lookup identities at runtime", async () => {
      const store = await factory();
      await expect(
        store.putContent({
          ...content("secret"),
          namespace: "credentials",
        } as unknown as ContentRecord),
      ).rejects.toMatchObject({ code: "invalid_input" });
      await expect(store.getContent("concept-graph", "")).rejects.toMatchObject({
        code: "invalid_input",
      });
      await expect(store.getContent("concept-graph", "x", 0)).rejects.toMatchObject({
        code: "invalid_input",
      });
    });

    it("creates a projection at asOfSeq zero on an empty event log", async () => {
      const store = await factory();
      const empty: ProjectionRecord = {
        id: "synthetic-fold",
        asOfSeq: 0,
        algoVersion: "synthetic-v1",
        payload: { foldedCount: 0 },
      };
      await store.putProjection(empty);
      expect(await store.getProjection("synthetic-fold")).toEqual(empty);
      expect(await store.getLastSeq()).toBe(0);
    });

    it("rejects projections ahead of the committed event head", async () => {
      const store = await factory();
      await store.append([attempt("one")]);
      const valid = {
        id: "fold",
        algoVersion: "synthetic-v1",
        payload: { count: 1 } as StorageJson,
        asOfSeq: 1,
      };
      await store.putProjection(valid);
      for (const asOfSeq of [-1, 1.5, Number.POSITIVE_INFINITY, 2]) {
        await expect(store.putProjection({ ...valid, asOfSeq })).rejects.toMatchObject({
          code: "invalid_input",
        });
      }
      expect(await store.getProjection("fold")).toEqual(valid);
    });

    it("rejects invalid projection identity or algorithm metadata", async () => {
      const store = await factory();
      const valid: ProjectionRecord = {
        id: "synthetic",
        algoVersion: "version-1",
        asOfSeq: 0,
        payload: [],
      };
      await expect(store.putProjection({ ...valid, id: "" })).rejects.toMatchObject({
        code: "invalid_input",
      });
      await expect(store.putProjection({ ...valid, algoVersion: "" })).rejects.toMatchObject({
        code: "invalid_input",
      });
      await expect(store.getProjection("")).rejects.toMatchObject({ code: "invalid_input" });
    });

    it("rejects nonserializable projection payloads without replacing committed state", async () => {
      const store = await factory();
      const valid: ProjectionRecord = {
        id: "safe-projection",
        asOfSeq: 0,
        algoVersion: "synthetic-v1",
        payload: { folded: 0 },
      };
      await store.putProjection(valid);
      await expect(
        store.putProjection({
          ...valid,
          payload: { fn: () => "execute" },
        } as unknown as ProjectionRecord),
      ).rejects.toMatchObject({ code: "invalid_json" });
      expect(await store.getProjection("safe-projection")).toEqual(valid);
    });

    it("replaces projections deterministically and leaves the event log unchanged", async () => {
      const store = await factory();
      const events = [attempt("a"), attempt("b")];
      await store.append(events);
      // Synthetic infrastructure fixture only: counting IDs is NOT a learner algorithm.
      const fold = async () => {
        const page = await store.readEntries();
        return {
          id: "synthetic-count",
          asOfSeq: page.lastSeq,
          algoVersion: "synthetic-count-v1",
          payload: { count: page.entries.length, ids: page.entries.map((row) => row.event.id) },
        };
      };
      const original = await fold();
      await store.putProjection(original);
      await store.append([attempt("c")]);
      const newer = await fold();
      await store.putProjection(newer);
      expect(await store.getProjection("synthetic-count")).toEqual(newer);
      await store.putProjection({ ...newer, asOfSeq: 0, payload: { count: 0, ids: [] } });
      await store.putProjection(await fold());
      expect(await store.getProjection("synthetic-count")).toEqual(newer);
      expect((await store.read()).events).toEqual([...events, attempt("c")]);
      expect(await store.getLastSeq()).toBe(3);
    });
  });
}
