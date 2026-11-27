import { describe, expect, it } from "vitest";
import { type LyceumEvent, LyceumEventSchema } from "./events";
import type { Clock } from "./ports";
import type { SequencedEvent, Storage } from "./storage";
import {
  createUserSettingsStore,
  defaultUserSettings,
  reconstructUserSettings,
} from "./user-settings";

const clock: Clock = { now: () => new Date("2026-11-27T05:00:00.000Z") };
const context = {
  userId: "synthetic-user-a",
  deviceId: "synthetic-device-a",
  eventId: "synthetic-event",
};
const occurredAt = "2026-01-01T12:00:00.000Z";

function entry(
  seq: number,
  type: LyceumEvent["type"],
  payload: unknown,
  userId = context.userId,
  timestamp = occurredAt,
  deviceId = context.deviceId,
): SequencedEvent {
  return {
    seq,
    event: LyceumEventSchema.parse({
      id: `synthetic-${seq}`,
      deviceId,
      userId,
      occurredAt: timestamp,
      type,
      version: 1,
      payload,
    }),
  };
}

function preference(
  seq: number,
  value: null | 1.25 | 1.5,
  userId?: string,
  at?: string,
  device?: string,
) {
  return entry(
    seq,
    "preferences.changed",
    { setting: "mockExamExtendedTime", value },
    userId,
    at,
    device,
  );
}
function privacy(
  seq: number,
  setting: "localModelsOnly" | "telemetryConsent",
  value: unknown,
  userId?: string,
  at?: string,
  device?: string,
) {
  return entry(seq, "privacy.changed", { setting, value }, userId, at, device);
}

function memoryPort(initial: readonly SequencedEvent[] = []): {
  port: Pick<Storage, "append" | "getLastSeq" | "readEntries">;
  rows: SequencedEvent[];
} {
  const rows = initial.map((item) => ({ seq: item.seq, event: item.event }));
  const port: Pick<Storage, "append" | "getLastSeq" | "readEntries"> = {
    async append(events) {
      for (const event of events) rows.push({ seq: rows.length + 1, event });
    },
    async getLastSeq() {
      return rows.length;
    },
    async readEntries(options) {
      const afterSeq = options?.afterSeq ?? 0;
      const limited = rows.filter((item) => item.seq > afterSeq).slice(0, options?.limit ?? 1000);
      return { entries: limited, lastSeq: limited.at(-1)?.seq ?? afterSeq };
    },
  };
  return { port, rows };
}

describe("user-scoped event-backed settings", () => {
  it("uses safe isolated defaults: ordinary exam, local-only, no telemetry consent", () => {
    const a = defaultUserSettings();
    const b = defaultUserSettings();
    expect(a).toEqual({
      mockExamExtendedTime: null,
      localModelsOnly: true,
      telemetryConsent: "unset",
    });
    expect(Object.isFrozen(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(reconstructUserSettings([], context.userId)).toEqual(a);
  });

  it("replays by append sequence, never timestamp, with last setting change winning", () => {
    const rows = [
      preference(1, 1.25, undefined, "2026-11-27T10:00:00.000Z"),
      preference(2, 1.5, undefined, "2026-01-01T01:00:00.000Z"),
      privacy(3, "localModelsOnly", false),
      privacy(4, "telemetryConsent", "granted"),
      privacy(5, "telemetryConsent", "denied"),
    ];
    expect(reconstructUserSettings(rows, context.userId)).toEqual({
      mockExamExtendedTime: 1.5,
      localModelsOnly: false,
      telemetryConsent: "denied",
    });
  });

  it("isolates other users, but merges devices for one user", () => {
    const rows = [
      preference(1, 1.25, context.userId, occurredAt, "synthetic-device-a"),
      preference(2, 1.5, "synthetic-user-b"),
      privacy(3, "telemetryConsent", "granted", context.userId, occurredAt, "synthetic-device-b"),
      privacy(4, "localModelsOnly", false, "synthetic-user-b"),
    ];
    expect(reconstructUserSettings(rows, context.userId)).toEqual({
      mockExamExtendedTime: 1.25,
      localModelsOnly: true,
      telemetryConsent: "granted",
    });
    expect(reconstructUserSettings(rows, "synthetic-user-b")).toEqual({
      mockExamExtendedTime: 1.5,
      localModelsOnly: false,
      telemetryConsent: "unset",
    });
  });

  it("replays unrelated canonical events without settings effects", () => {
    const unrelated = entry(1, "session.started", {
      sessionId: "synthetic-session",
      plannedMinutes: 15,
    });
    expect(
      reconstructUserSettings([unrelated, preference(2, 1.25)], context.userId)
        .mockExamExtendedTime,
    ).toBe(1.25);
  });

  it("explicit revocation and reset both disable telemetry, preserving evidence distinctions", () => {
    const granted = privacy(1, "telemetryConsent", "granted");
    const denied = privacy(2, "telemetryConsent", "denied");
    const reset = privacy(3, "telemetryConsent", null);
    expect(reconstructUserSettings([granted], context.userId).telemetryConsent).toBe("granted");
    expect(reconstructUserSettings([granted, denied], context.userId).telemetryConsent).toBe(
      "denied",
    );
    expect(reconstructUserSettings([granted, denied, reset], context.userId).telemetryConsent).toBe(
      "unset",
    );
    expect(
      reconstructUserSettings([preference(1, 1.5), preference(2, null)], context.userId)
        .mockExamExtendedTime,
    ).toBe(null);
    expect(
      reconstructUserSettings(
        [privacy(1, "localModelsOnly", false), privacy(2, "localModelsOnly", null)],
        context.userId,
      ).localModelsOnly,
    ).toBe(true);
  });

  it("constructs validated canonical events only with explicit identity and an injected clock", async () => {
    const { port, rows } = memoryPort();
    const store = createUserSettingsStore(port, clock);
    await store.changePreference(context, { setting: "mockExamExtendedTime", value: 1.5 });
    await store.changePrivacy(
      { ...context, eventId: "synthetic-event-2" },
      { setting: "telemetryConsent", value: "granted" },
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.event).toEqual({
      id: "synthetic-event",
      userId: context.userId,
      deviceId: context.deviceId,
      occurredAt: "2026-11-27T05:00:00.000Z",
      type: "preferences.changed",
      version: 1,
      payload: { setting: "mockExamExtendedTime", value: 1.5 },
    });
    expect(rows[1]?.event.type).toBe("privacy.changed");
    expect((await store.read(context.userId)).settings.telemetryConsent).toBe("granted");
  });

  it("rejects unsupported values, unknown keys and missing identity without writing", async () => {
    const { port, rows } = memoryPort();
    const store = createUserSettingsStore(port, clock);
    for (const bad of [
      { setting: "mockExamExtendedTime", value: 2 },
      { setting: "theme", value: "dark" },
      { setting: "mockExamExtendedTime", value: 1.25, personalInfo: "not accepted" },
      { settings: { mockExamExtendedTime: 1.25 } },
    ]) {
      await expect(store.changePreference(context, bad as never)).rejects.toMatchObject({
        code: "invalid_input",
      });
    }
    for (const bad of [
      { setting: "telemetryConsent", value: true },
      { setting: "telemetryConsent", value: "unset" },
      { setting: "localModelsOnly", value: "yes" },
      { setting: "localModelsOnly", value: false, accessToken: "synthetic" },
    ])
      await expect(store.changePrivacy(context, bad as never)).rejects.toMatchObject({
        code: "invalid_input",
      });
    for (const userId of ["", "__proto__", "constructor", "../../synthetic", "synthetic user"]) {
      await expect(
        store.changePrivacy({ ...context, userId }, { setting: "localModelsOnly", value: true }),
      ).rejects.toMatchObject({ code: "invalid_input" });
    }
    expect(rows).toEqual([]);
  });

  it("rejects accessor and prototype commands without invoking getters", async () => {
    const { port, rows } = memoryPort();
    const store = createUserSettingsStore(port, clock);
    let invoked = 0;
    const change = Object.defineProperty({ setting: "localModelsOnly" }, "value", {
      enumerable: true,
      get() {
        invoked++;
        return false;
      },
    });
    await expect(store.changePrivacy(context, change as never)).rejects.toMatchObject({
      code: "invalid_input",
    });
    await expect(
      store.changePrivacy(
        context,
        Object.create({ setting: "localModelsOnly", value: false }) as never,
      ),
    ).rejects.toMatchObject({ code: "invalid_input" });
    const badIdentity = Object.defineProperty({ ...context }, "userId", {
      enumerable: true,
      get() {
        invoked++;
        return context.userId;
      },
    });
    await expect(
      store.changePreference(badIdentity, { setting: "mockExamExtendedTime", value: 1.25 }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(invoked).toBe(0);
    expect(rows).toEqual([]);
  });

  it("does not cache state on failed appends", async () => {
    const { port, rows } = memoryPort();
    const failed = {
      ...port,
      append: async () => {
        throw Error("synthetic private write failure");
      },
    };
    const store = createUserSettingsStore(failed, clock);
    await expect(
      store.changePrivacy(context, { setting: "telemetryConsent", value: "granted" }),
    ).rejects.toThrow();
    expect(rows).toHaveLength(0);
    expect((await store.read(context.userId)).settings.telemetryConsent).toBe("unset");
  });

  it("reconstructs beyond one page with a stable captured upper sequence", async () => {
    const first = Array.from({ length: 1005 }, (_, index) => preference(index + 1, 1.25));
    const { port, rows } = memoryPort(first);
    let pageCount = 0;
    const tracking = {
      ...port,
      async readEntries(options?: { afterSeq?: number; limit?: number }) {
        pageCount++;
        return port.readEntries(options);
      },
    };
    const result = await createUserSettingsStore(tracking, clock).read(context.userId);
    expect(result.asOfSeq).toBe(1005);
    expect(result.settings.mockExamExtendedTime).toBe(1.25);
    expect(pageCount).toBe(2);
    expect(rows).toHaveLength(1005);
  });

  it("excludes concurrent appended events after the read-start head, including across page boundaries", async () => {
    const first = Array.from({ length: 1001 }, (_, index) => preference(index + 1, 1.25));
    const { port, rows } = memoryPort(first);
    let reads = 0;
    const racing = {
      ...port,
      async readEntries(options?: { afterSeq?: number; limit?: number }) {
        reads++;
        if (reads === 2) rows.push(privacy(1002, "telemetryConsent", "granted"));
        return port.readEntries(options);
      },
    };
    const store = createUserSettingsStore(racing, clock);
    const before = await store.read(context.userId);
    expect(before).toEqual({
      asOfSeq: 1001,
      settings: { mockExamExtendedTime: 1.25, localModelsOnly: true, telemetryConsent: "unset" },
    });
    const after = await store.read(context.userId);
    expect(after.asOfSeq).toBe(1002);
    expect(after.settings.telemetryConsent).toBe("granted");
  });

  it("preserves independent fields under concurrent app-originated changes", async () => {
    const { port } = memoryPort();
    const store = createUserSettingsStore(port, clock);
    await Promise.all([
      store.changePrivacy(context, { setting: "localModelsOnly", value: false }),
      store.changePrivacy(
        { ...context, eventId: "synthetic-event-2" },
        { setting: "telemetryConsent", value: "granted" },
      ),
      store.changePreference(
        { ...context, eventId: "synthetic-event-3" },
        { setting: "mockExamExtendedTime", value: 1.5 },
      ),
    ]);
    expect((await store.read(context.userId)).settings).toEqual({
      mockExamExtendedTime: 1.5,
      localModelsOnly: false,
      telemetryConsent: "granted",
    });
  });

  it("returns independent frozen snapshots and does not retain caller changes", async () => {
    const { port, rows } = memoryPort();
    const store = createUserSettingsStore(port, clock);
    const request = { setting: "mockExamExtendedTime" as const, value: 1.25 as 1.25 | 1.5 };
    const sending = store.changePreference(context, request);
    request.value = 1.5;
    await sending;
    const a = await store.read(context.userId);
    const b = await store.read(context.userId);
    expect(a.settings.mockExamExtendedTime).toBe(1.25);
    expect(a).not.toBe(b);
    expect(a.settings).not.toBe(b.settings);
    expect(Object.isFrozen(a.settings)).toBe(true);
    expect(Object.isFrozen(a)).toBe(true);
    expect(rows[0]?.event.type).toBe("preferences.changed");
  });
});
