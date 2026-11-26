import type { ContentRecord, LyceumEvent, ProjectionRecord, StorageJson } from "@lyceum/core";
import { describe, expect, it } from "vitest";
import { type StorageFactory, attempt, content } from "./fixtures";

export function serializationContract(factory: StorageFactory): void {
  describe("portable data, mutation isolation, privacy and representative volume", () => {
    it("snapshots caller-owned nested event input at append invocation", async () => {
      const store = await factory();
      const input = attempt("snapshot");
      const pending = store.append([input]);
      input.payload.conceptIds[0] = "mutated-after-invocation";
      input.payload.skillIds.push("uncommitted-skill");
      await pending;
      const recorded = (await store.read()).events[0];
      expect(recorded?.type).toBe("attempt.recorded");
      if (recorded?.type !== "attempt.recorded") throw Error("synthetic fixture mismatch");
      expect(recorded.payload.conceptIds).toEqual(["synthetic-concept"]);
      expect(recorded.payload.skillIds).toEqual([]);
    });

    it("returns independently mutable event copies without modifying committed records", async () => {
      const store = await factory();
      await store.append([attempt("copy")]);
      const first = (await store.read()).events[0];
      if (first?.type !== "attempt.recorded") throw Error("synthetic fixture mismatch");
      first.payload.conceptIds.push("external-mutation");
      first.payload.skillIds.splice(0, 0, "external-skill");
      const entry = (await store.readEntries()).entries[0];
      if (entry?.event.type !== "attempt.recorded") throw Error("synthetic fixture mismatch");
      entry.event.payload.conceptIds[0] = "malicious";
      const second = (await store.read()).events[0];
      if (second?.type !== "attempt.recorded") throw Error("synthetic fixture mismatch");
      expect(second.payload.conceptIds).toEqual(["synthetic-concept"]);
      expect(second.payload.skillIds).toEqual([]);
    });

    it("snapshots content and projections before queued writes and on every read", async () => {
      const store = await factory();
      const contentInput = content("nested", { deep: { values: [1, 2] } });
      const projInput: ProjectionRecord = {
        id: "nested-projection",
        asOfSeq: 0,
        algoVersion: "synthetic",
        payload: { deep: { values: [5, 6] } },
      };
      const writeContent = store.putContent(contentInput);
      const writeProjection = store.putProjection(projInput);
      const mutableContent = contentInput.payload as { deep: { values: number[] } };
      const mutableProjection = projInput.payload as { deep: { values: number[] } };
      mutableContent.deep.values[0] = 99;
      mutableProjection.deep.values[0] = 99;
      await Promise.all([writeContent, writeProjection]);
      const firstContent = await store.getContent("concept-graph", "nested");
      const firstProjection = await store.getProjection("nested-projection");
      if (!firstContent || !firstProjection) throw Error("synthetic fixture mismatch");
      (firstContent.payload as { deep: { values: number[] } }).deep.values.push(500);
      (firstProjection.payload as { deep: { values: number[] } }).deep.values.push(500);
      expect(await store.getContent("concept-graph", "nested")).toEqual(
        content("nested", { deep: { values: [1, 2] } }),
      );
      expect(await store.getProjection("nested-projection")).toEqual({
        id: "nested-projection",
        asOfSeq: 0,
        algoVersion: "synthetic",
        payload: { deep: { values: [5, 6] } },
      });
    });

    it("rejects non-JSON content without silently coercing unsupported values", async () => {
      const store = await factory();
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      const getter = Object.defineProperty({}, "value", {
        enumerable: true,
        get() {
          return "must-not-execute";
        },
      });
      const invalid: unknown[] = [
        { run: () => 1 },
        { nested: { field: undefined } },
        { nan: Number.NaN },
        { infinity: Number.POSITIVE_INFINITY },
        { value: 1n },
        { value: Symbol("synthetic") },
        { created: new Date("2026-01-01T00:00:00.000Z") },
        { map: new Map([["x", 1]]) },
        cyclic,
        getter,
      ];
      for (const payload of invalid) {
        await expect(
          store.putContent({ ...content("untrusted"), payload } as unknown as ContentRecord),
        ).rejects.toMatchObject({ code: "invalid_json" });
      }
      expect(await store.getContent("concept-graph", "untrusted")).toBeNull();
    });

    it("rejects malformed event runtime data before accepting it as an event", async () => {
      const store = await factory();
      const invalid = {
        ...attempt("nonjson"),
        payload: { ...attempt("nonjson").payload, conceptIds: [() => "bad"] },
      } as unknown as LyceumEvent;
      await expect(store.append([invalid])).rejects.toMatchObject({ code: "invalid_event" });
      expect(await store.getLastSeq()).toBe(0);
    });

    it("rejects pathological payload depth rather than overflowing the stack", async () => {
      const store = await factory();
      let nested: unknown = true;
      for (let i = 0; i < 120; i++) nested = { value: nested };
      await expect(
        store.putContent({ ...content("deep"), payload: nested } as unknown as ContentRecord),
      ).rejects.toMatchObject({ code: "invalid_json" });
    });

    it("handles dangerous IDs and own __proto__ data without prototype pollution", async () => {
      const store = await factory();
      const oddIds = ["__proto__", "toString", "constructor", "null\u0000id", "hasOwnProperty"];
      await store.append(oddIds.map((id) => attempt(id)));
      const protoPayload = JSON.parse(
        '{"__proto__":{"polluted":true},"plain":"synthetic"}',
      ) as StorageJson;
      for (const id of oddIds) {
        await store.putContent(content(id, protoPayload));
        expect(await store.getContent("concept-graph", id)).toEqual(content(id, protoPayload));
      }
      expect((await store.read()).events.map((item) => item.id)).toEqual(oddIds);
      expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    });

    it("isolates independent adapter instances with the same IDs", async () => {
      const a = await factory();
      const b = await factory();
      await a.append([attempt("same-id")]);
      await a.putContent(content("same-id"));
      await a.putProjection({
        id: "same-id",
        asOfSeq: 1,
        algoVersion: "synthetic",
        payload: { independent: true },
      });
      expect(await b.getLastSeq()).toBe(0);
      expect(await b.getContent("concept-graph", "same-id")).toBeNull();
      expect(await b.getProjection("same-id")).toBeNull();
      await b.append([attempt("same-id")]);
      expect(await b.getLastSeq()).toBe(1);
    });

    it("never embeds a supplied sensitive marker in a storage error message", async () => {
      const store = await factory();
      const marker = "SYNTHETIC_SENSITIVE_CONTENT_MUST_NOT_APPEAR";
      const invalid = {
        ...content(marker),
        payload: { marker, invalid: () => marker },
      } as unknown as ContentRecord;
      let thrown: unknown;
      try {
        await store.putContent(invalid);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect(String(thrown)).not.toContain(marker);
      expect(String(thrown)).not.toContain("invalid: ()");
    });

    it("accepts large synthetic JSON payloads without call-spread or recursive array failure", async () => {
      const store = await factory();
      const data = Array.from({ length: 30000 }, (_, i) => i);
      const payload: StorageJson = {
        synthetic: true,
        largeText: "x".repeat(256 * 1024),
        data,
      };
      await store.putContent(content("large", payload));
      const record = await store.getContent("concept-graph", "large");
      expect((record?.payload as { largeText: string }).largeText.length).toBe(256 * 1024);
      expect((record?.payload as { data: number[] }).data).toHaveLength(30000);
      expect((record?.payload as { data: number[] }).data[29999]).toBe(29999);
    });

    it("handles 3,072 ordered synthetic events in deterministic atomic batches", async () => {
      const store = await factory();
      for (let batch = 0; batch < 12; batch++) {
        await store.append(
          Array.from({ length: 256 }, (_, index) => attempt(`bulk-${batch * 256 + index}`)),
        );
      }
      expect(await store.getLastSeq()).toBe(3072);
      const last = await store.readEntries({ afterSeq: 3062, limit: 10 });
      expect(last.entries.map((entry) => entry.seq)).toEqual([
        3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3071, 3072,
      ]);
      expect(last.lastSeq).toBe(3072);
    });
  });
}
