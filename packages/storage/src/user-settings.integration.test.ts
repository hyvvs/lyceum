import {
  type Clock,
  type LyceumEvent,
  LyceumEventSchema,
  createUserSettingsStore,
} from "@lyceum/core";
import { describe, expect, it, vi } from "vitest";
import { createInMemoryStorage } from "./in-memory";

const clock: Clock = { now: () => new Date("2026-11-27T06:00:00.000Z") };
const context = {
  userId: "synthetic-user-one",
  deviceId: "synthetic-device-one",
  eventId: "synthetic-event-one",
};

function canonical(
  id: string,
  type: "preferences.changed" | "privacy.changed",
  payload: unknown,
  userId = context.userId,
  deviceId = context.deviceId,
  at = "2026-11-27T06:00:00.000Z",
): LyceumEvent {
  return LyceumEventSchema.parse({
    id,
    type,
    payload,
    userId,
    deviceId,
    occurredAt: at,
    version: 1,
  });
}

describe("M0-014 public Storage + settings integration", () => {
  it("reads safe defaults from empty in-memory storage without fabricating an identity", async () => {
    const storage = createInMemoryStorage();
    const store = createUserSettingsStore(storage, clock);
    const selected = await store.read(context.userId);
    expect(selected).toEqual({
      asOfSeq: 0,
      settings: {
        mockExamExtendedTime: null,
        localModelsOnly: true,
        telemetryConsent: "unset",
      },
    });
    expect(await storage.getLastSeq()).toBe(0);
  });

  it("reconstructs multiple user/device changes with timestamp inversion", async () => {
    const storage = createInMemoryStorage();
    await storage.append([
      canonical(
        "first",
        "privacy.changed",
        { setting: "telemetryConsent", value: "granted" },
        context.userId,
        "synthetic-device-a",
        "2026-11-27T20:00:00.000Z",
      ),
      canonical(
        "other",
        "privacy.changed",
        { setting: "telemetryConsent", value: "granted" },
        "synthetic-user-two",
      ),
      canonical(
        "latest",
        "privacy.changed",
        { setting: "telemetryConsent", value: "denied" },
        context.userId,
        "synthetic-device-b",
        "2026-01-01T00:00:00.000Z",
      ),
      canonical("accommodation", "preferences.changed", {
        setting: "mockExamExtendedTime",
        value: 1.5,
      }),
    ]);
    const settings = createUserSettingsStore(storage, clock);
    expect((await settings.read(context.userId)).settings).toEqual({
      mockExamExtendedTime: 1.5,
      localModelsOnly: true,
      telemetryConsent: "denied",
    });
    expect((await settings.read("synthetic-user-two")).settings.telemetryConsent).toBe("granted");
  });

  it("appends field-level changes concurrently without losing unrelated updates", async () => {
    const storage = createInMemoryStorage();
    const settings = createUserSettingsStore(storage, clock);
    await Promise.all([
      settings.changePrivacy(context, { setting: "localModelsOnly", value: false }),
      settings.changePrivacy(
        { ...context, eventId: "synthetic-event-two", deviceId: "synthetic-device-two" },
        { setting: "telemetryConsent", value: "granted" },
      ),
      settings.changePreference(
        { ...context, eventId: "synthetic-event-three" },
        { setting: "mockExamExtendedTime", value: 1.25 },
      ),
    ]);
    const result = await settings.read(context.userId);
    expect(result.asOfSeq).toBe(3);
    expect(result.settings).toEqual({
      mockExamExtendedTime: 1.25,
      localModelsOnly: false,
      telemetryConsent: "granted",
    });
  });

  it("does not grant consent from a default and explicitly distinguishes opt-in, opt-out and reset", async () => {
    const storage = createInMemoryStorage();
    const settings = createUserSettingsStore(storage, clock);
    expect((await settings.read(context.userId)).settings.telemetryConsent).toBe("unset");
    await settings.changePrivacy(context, { setting: "telemetryConsent", value: "granted" });
    expect((await settings.read(context.userId)).settings.telemetryConsent).toBe("granted");
    await settings.changePrivacy(
      { ...context, eventId: "synthetic-revoke" },
      { setting: "telemetryConsent", value: "denied" },
    );
    expect((await settings.read(context.userId)).settings.telemetryConsent).toBe("denied");
    await settings.changePrivacy(
      { ...context, eventId: "synthetic-reset" },
      { setting: "telemetryConsent", value: null },
    );
    expect((await settings.read(context.userId)).settings.telemetryConsent).toBe("unset");
    expect((await storage.readEntries()).entries).toHaveLength(3);
  });

  it("observes Storage idempotent replay and refuses conflicting IDs without updating settings", async () => {
    const storage = createInMemoryStorage();
    const settings = createUserSettingsStore(storage, clock);
    await settings.changePrivacy(context, { setting: "telemetryConsent", value: "granted" });
    await settings.changePrivacy(context, { setting: "telemetryConsent", value: "granted" });
    expect(await storage.getLastSeq()).toBe(1);
    await expect(
      settings.changePrivacy(context, { setting: "telemetryConsent", value: "denied" }),
    ).rejects.toMatchObject({ code: "conflict" });
    expect((await settings.read(context.userId)).settings.telemetryConsent).toBe("granted");
  });

  it("respects failed transactional rollback for mixed new and historical events", async () => {
    const storage = createInMemoryStorage();
    const item = canonical("valid-settings", "privacy.changed", {
      setting: "telemetryConsent",
      value: "granted",
    });
    await expect(
      storage.transaction((tx) => {
        tx.append([item]);
        tx.append([{ ...item, id: "invalid-settings", goalId: "not-permitted" } as LyceumEvent]);
      }),
    ).rejects.toMatchObject({ code: "invalid_event" });
    expect(await storage.getLastSeq()).toBe(0);
    expect(
      (await createUserSettingsStore(storage, clock).read(context.userId)).settings
        .telemetryConsent,
    ).toBe("unset");
  });

  it("has no cached false opt-in when an adapter write fails", async () => {
    const storage = createInMemoryStorage();
    const broken = {
      append: async (_events: readonly LyceumEvent[]) => {
        throw Error("synthetic private payload value");
      },
      getLastSeq: storage.getLastSeq,
      readEntries: storage.readEntries,
    };
    const settings = createUserSettingsStore(broken, clock);
    await expect(
      settings.changePrivacy(context, { setting: "telemetryConsent", value: "granted" }),
    ).rejects.toThrow();
    expect((await settings.read(context.userId)).settings.telemetryConsent).toBe("unset");
    expect(await storage.getLastSeq()).toBe(0);
  });

  it("rejects malformed privacy and secrets without persisting or printing sensitive sentinels", async () => {
    const storage = createInMemoryStorage();
    const settings = createUserSettingsStore(storage, clock);
    const forbidden = "private synthetic sentinel no persistence";
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await expect(
        settings.changePrivacy(context, {
          setting: "telemetryConsent",
          value: "granted",
          password: forbidden,
        } as never),
      ).rejects.toMatchObject({ code: "invalid_input" });
      const invalid = {
        ...canonical("bad-event", "privacy.changed", { setting: "localModelsOnly", value: true }),
        payload: { setting: "localModelsOnly", value: true, credential: forbidden },
      } as unknown as LyceumEvent;
      await expect(storage.append([invalid])).rejects.toMatchObject({ code: "invalid_event" });
      expect(await storage.getLastSeq()).toBe(0);
      expect(JSON.stringify((await storage.readEntries()).entries)).not.toContain(forbidden);
      expect(JSON.stringify([...log.mock.calls, ...warn.mock.calls])).not.toContain(forbidden);
    } finally {
      log.mockRestore();
      warn.mockRestore();
    }
  });

  it("does not read accessor payloads and retains no malformed object", async () => {
    const storage = createInMemoryStorage();
    let invoked = 0;
    const payload = Object.defineProperty({ setting: "telemetryConsent" }, "value", {
      enumerable: true,
      get() {
        invoked++;
        return "granted";
      },
    });
    await expect(
      storage.append([
        {
          ...canonical("accessor", "privacy.changed", { setting: "telemetryConsent", value: null }),
          payload,
        } as LyceumEvent,
      ]),
    ).rejects.toMatchObject({ code: "invalid_event" });
    expect(invoked).toBe(0);
    expect(await storage.getLastSeq()).toBe(0);
  });

  it("pages past 1,000 committed events without mixing other users or timestamps", async () => {
    const storage = createInMemoryStorage();
    await storage.append(
      Array.from({ length: 1003 }, (_, index) =>
        canonical(
          `synthetic-bulk-${index}`,
          "privacy.changed",
          { setting: "localModelsOnly", value: index !== 1002 },
          index % 3 === 0 && index !== 1002 ? "synthetic-user-two" : context.userId,
        ),
      ),
    );
    const snapshot = await createUserSettingsStore(storage, clock).read(context.userId);
    expect(snapshot.asOfSeq).toBe(1003);
    expect(snapshot.settings.localModelsOnly).toBe(false);
  });

  it("captures a stable snapshot head while a concurrent writer appends between pages", async () => {
    const storage = createInMemoryStorage();
    await storage.append(
      Array.from({ length: 1001 }, (_, index) =>
        canonical(`synthetic-first-${index}`, "privacy.changed", {
          setting: "telemetryConsent",
          value: "denied",
        }),
      ),
    );
    let calls = 0;
    const injected = {
      append: storage.append,
      getLastSeq: storage.getLastSeq,
      async readEntries(options?: { afterSeq?: number; limit?: number }) {
        calls++;
        if (calls === 2)
          await storage.append([
            canonical("synthetic-concurrent", "privacy.changed", {
              setting: "telemetryConsent",
              value: "granted",
            }),
          ]);
        return storage.readEntries(options);
      },
    };
    const settings = createUserSettingsStore(injected, clock);
    const first = await settings.read(context.userId);
    expect(first).toEqual({
      asOfSeq: 1001,
      settings: { mockExamExtendedTime: null, localModelsOnly: true, telemetryConsent: "denied" },
    });
    const second = await settings.read(context.userId);
    expect(second.asOfSeq).toBe(1002);
    expect(second.settings.telemetryConsent).toBe("granted");
  });

  it("isolates independent in-memory storage and returned frozen settings", async () => {
    const storage = createInMemoryStorage();
    const other = createInMemoryStorage();
    const settings = createUserSettingsStore(storage, clock);
    await settings.changePreference(context, { setting: "mockExamExtendedTime", value: 1.5 });
    const result = await settings.read(context.userId);
    expect(Object.isFrozen(result.settings)).toBe(true);
    expect(
      (await createUserSettingsStore(other, clock).read(context.userId)).settings
        .mockExamExtendedTime,
    ).toBe(null);
    expect((await settings.read(context.userId)).settings.mockExamExtendedTime).toBe(1.5);
  });
});
