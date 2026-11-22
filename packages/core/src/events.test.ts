import { describe, expect, it } from "vitest";
import { LyceumEventSchema } from "./events";

describe("LyceumEventSchema", () => {
  const base = {
    id: "e1",
    deviceId: "d1",
    userId: "u1",
    occurredAt: "2026-11-21T10:00:00.000Z",
    version: 1,
  };

  it("accepts a valid attempt", () => {
    const parsed = LyceumEventSchema.safeParse({
      ...base,
      type: "attempt.recorded",
      payload: {
        itemId: "i1",
        conceptIds: ["c1"],
        score: 1,
        responseMs: 4200,
        hintLevel: 0,
        confidence: 4,
        context: "practice",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an attempt with no concepts", () => {
    const parsed = LyceumEventSchema.safeParse({
      ...base,
      type: "attempt.recorded",
      payload: {
        itemId: "i1",
        conceptIds: [],
        score: 1,
        responseMs: 1,
        hintLevel: 0,
        context: "practice",
      },
    });
    expect(parsed.success).toBe(false);
  });
});
