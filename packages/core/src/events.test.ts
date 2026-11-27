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

  it("preserves all four existing event types and historical Zod defaults", () => {
    const previous = [
      {
        type: "attempt.recorded",
        payload: {
          itemId: "i1",
          conceptIds: ["c1"],
          score: 0.5,
          responseMs: 10,
          hintLevel: 0,
          context: "practice",
          historicalExtra: true,
        },
      },
      { type: "session.started", payload: { sessionId: "s1", plannedMinutes: 20 } },
      { type: "session.ended", payload: { sessionId: "s1", actualMinutes: 12, completed: true } },
      {
        type: "goal.created",
        payload: {
          subjectId: "synthetic",
          outcome: "pass",
          definitionOfDone: "complete",
          weeklyHours: 2,
          sourceMode: "open",
        },
      },
    ];
    for (const old of previous) {
      expect(LyceumEventSchema.safeParse({ ...base, ...old }).success).toBe(true);
    }
    const parsed = LyceumEventSchema.parse({ ...base, ...previous[0] });
    if (parsed.type !== "attempt.recorded") throw Error("wrong type");
    expect(parsed.payload.skillIds).toEqual([]);
    expect(parsed.payload.errorTags).toEqual([]);
    expect("historicalExtra" in parsed.payload).toBe(false);
  });

  it("accepts only authorized strict version-one user-level preference events", () => {
    for (const value of [null, 1.25, 1.5]) {
      expect(
        LyceumEventSchema.safeParse({
          ...base,
          type: "preferences.changed",
          payload: { setting: "mockExamExtendedTime", value },
        }).success,
      ).toBe(true);
    }
    for (const value of [0, 1, 1.1, 2, -1, "1.25", {}, true]) {
      expect(
        LyceumEventSchema.safeParse({
          ...base,
          type: "preferences.changed",
          payload: { setting: "mockExamExtendedTime", value },
        }).success,
      ).toBe(false);
    }
  });

  it("accepts only authorized strict version-one privacy events and explicit resets", () => {
    for (const value of [true, false, null]) {
      expect(
        LyceumEventSchema.safeParse({
          ...base,
          type: "privacy.changed",
          payload: { setting: "localModelsOnly", value },
        }).success,
      ).toBe(true);
    }
    for (const value of ["granted", "denied", null]) {
      expect(
        LyceumEventSchema.safeParse({
          ...base,
          type: "privacy.changed",
          payload: { setting: "telemetryConsent", value },
        }).success,
      ).toBe(true);
    }
    for (const payload of [
      { setting: "telemetryConsent", value: true },
      { setting: "telemetryConsent", value: "unset" },
      { setting: "localModelsOnly", value: "false" },
      { setting: "localModelsOnly", value: 1 },
      { setting: "theme", value: "light" },
    ])
      expect(
        LyceumEventSchema.safeParse({ ...base, type: "privacy.changed", payload }).success,
      ).toBe(false);
  });

  it("rejects unknown settings names, bags, credentials and generic JSON patches", () => {
    for (const type of ["preferences.changed", "privacy.changed"] as const) {
      const payload =
        type === "preferences.changed"
          ? { setting: "mockExamExtendedTime", value: 1.25 }
          : { setting: "localModelsOnly", value: true };
      for (const bad of [
        { ...payload, arbitraryNested: { access: "not permitted" } },
        { ...payload, ["pass" + "word"]: "synthetic sentinel" },
        { settings: { [payload.setting]: payload.value } },
        { ...payload, setting: "__proto__" },
      ]) {
        expect(LyceumEventSchema.safeParse({ ...base, type, payload: bad }).success).toBe(false);
      }
    }
  });

  it("rejects unsafe locally scoped IDs on new settings events without changing historical envelopes", () => {
    const changed = {
      ...base,
      type: "privacy.changed",
      payload: { setting: "telemetryConsent", value: "denied" },
    };
    for (const unsafe of [
      "synthetic user",
      "../../synthetic",
      "__proto__",
      "constructor",
      "a".repeat(129),
    ]) {
      for (const key of ["userId", "deviceId", "id"] as const) {
        expect(LyceumEventSchema.safeParse({ ...changed, [key]: unsafe }).success).toBe(false);
      }
    }
    expect(
      LyceumEventSchema.safeParse({
        ...base,
        userId: "synthetic user",
        type: "session.started",
        payload: { sessionId: "synthetic-session", plannedMinutes: 20 },
      }).success,
    ).toBe(true);
  });

  it("forbids goalId and extra envelope fields on new user-level events", () => {
    for (const type of ["preferences.changed", "privacy.changed"] as const) {
      const payload =
        type === "preferences.changed"
          ? { setting: "mockExamExtendedTime", value: 1.25 }
          : { setting: "telemetryConsent", value: "granted" };
      const valid = { ...base, type, payload };
      expect(LyceumEventSchema.safeParse(valid).success).toBe(true);
      for (const bad of [
        { ...valid, goalId: "g1" },
        { ...valid, goalId: undefined },
        { ...valid, version: 2 },
        { ...valid, userId: "" },
        { ...valid, deviceId: "" },
        { ...valid, id: "" },
        { ...valid, occurredAt: "not-ISO" },
        { ...valid, extra: "rejected" },
      ])
        expect(LyceumEventSchema.safeParse(bad).success).toBe(false);
    }
    expect(
      LyceumEventSchema.safeParse({ ...base, type: "source_mode.changed", payload: {} }).success,
    ).toBe(false);
    expect(
      LyceumEventSchema.safeParse({ ...base, type: "identity.created", payload: {} }).success,
    ).toBe(false);
  });
});
