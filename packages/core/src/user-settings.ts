import { type LyceumEvent, PreferencesChanged, PrivacyChanged } from "./events";
import type { Clock } from "./ports";
import { type SequencedEvent, type Storage, StorageError } from "./storage";

/** Device appearance preferences are deliberately NOT included in this model. */
export interface UserSettings {
  /** Null means standard timing; applies only to future explicit mock exams. */
  readonly mockExamExtendedTime: null | 1.25 | 1.5;
  /** Future policy input; this module does not route provider requests. */
  readonly localModelsOnly: boolean;
  /** `unset` and `denied` both forbid telemetry; only `granted` permits future consumers. */
  readonly telemetryConsent: "unset" | "granted" | "denied";
}

export interface UserSettingsSnapshot {
  readonly asOfSeq: number;
  readonly settings: Readonly<UserSettings>;
}

export interface SettingsChangeContext {
  readonly userId: string;
  readonly deviceId: string;
  readonly eventId: string;
}

export type PreferenceChange = {
  readonly setting: "mockExamExtendedTime";
  readonly value: null | 1.25 | 1.5;
};

export type PrivacyChange =
  | { readonly setting: "localModelsOnly"; readonly value: boolean | null }
  | { readonly setting: "telemetryConsent"; readonly value: "granted" | "denied" | null };

export interface UserSettingsStore {
  /** Captures the committed sequence head before paging; never returns later appends. */
  read(userId: string): Promise<UserSettingsSnapshot>;
  /** Trusted app-originated command: caller must already have obtained learner confirmation. */
  changePreference(context: SettingsChangeContext, change: PreferenceChange): Promise<void>;
  /** Trusted app-originated command: this API does not obtain or imply UI consent. */
  changePrivacy(context: SettingsChangeContext, change: PrivacyChange): Promise<void>;
}

type MutableSettings = {
  mockExamExtendedTime: null | 1.25 | 1.5;
  localModelsOnly: boolean;
  telemetryConsent: "unset" | "granted" | "denied";
};

function freshDefaults(): MutableSettings {
  return { mockExamExtendedTime: null, localModelsOnly: true, telemetryConsent: "unset" };
}

/** Missing history is never affirmative telemetry consent. Fresh frozen output. */
export function defaultUserSettings(): Readonly<UserSettings> {
  return Object.freeze(freshDefaults());
}

function validIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value) &&
    value !== "constructor" &&
    value !== "prototype" &&
    value !== "__proto__"
  );
}

function requireUserId(value: unknown): string {
  if (!validIdentifier(value)) throw new StorageError("invalid_input");
  return value;
}

/** Never read accessor values, inherited fields or unexpected data keys. */
function ownFields(input: unknown, names: readonly string[]): Record<string, unknown> {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw Error();
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) throw Error();
    const keys = Reflect.ownKeys(input);
    if (keys.length !== names.length || keys.some((key) => !names.includes(String(key))))
      throw Error();
    const result: Record<string, unknown> = Object.create(null);
    for (const name of names) {
      const descriptor = Object.getOwnPropertyDescriptor(input, name);
      if (!descriptor?.enumerable || !("value" in descriptor)) throw Error();
      Object.defineProperty(result, name, { value: descriptor.value, enumerable: true });
    }
    return result;
  } catch {
    throw new StorageError("invalid_input");
  }
}

function parseContext(input: unknown): SettingsChangeContext {
  const context = ownFields(input, ["userId", "deviceId", "eventId"]);
  if (
    !validIdentifier(context.userId) ||
    !validIdentifier(context.deviceId) ||
    !validIdentifier(context.eventId)
  )
    throw new StorageError("invalid_input");
  return { userId: context.userId, deviceId: context.deviceId, eventId: context.eventId };
}

function parseChange(input: unknown, kind: "preferences.changed" | "privacy.changed") {
  const payload = ownFields(input, ["setting", "value"]);
  const template = {
    id: "synthetic-validation",
    userId: "synthetic-validation",
    deviceId: "synthetic-validation",
    occurredAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    type: kind,
    payload,
  };
  const parsed =
    kind === "preferences.changed"
      ? PreferencesChanged.safeParse(template)
      : PrivacyChanged.safeParse(template);
  if (!parsed.success) throw new StorageError("invalid_input");
  return parsed.data.payload;
}

function fold(settings: MutableSettings, event: LyceumEvent, userId: string): void {
  if (event.userId !== userId) return;
  if (event.type === "preferences.changed") {
    const valid = PreferencesChanged.safeParse(event);
    if (!valid.success) throw new StorageError("invalid_event");
    settings.mockExamExtendedTime = valid.data.payload.value;
  } else if (event.type === "privacy.changed") {
    const valid = PrivacyChanged.safeParse(event);
    if (!valid.success) throw new StorageError("invalid_event");
    if (valid.data.payload.setting === "localModelsOnly") {
      settings.localModelsOnly = valid.data.payload.value ?? true;
    } else {
      settings.telemetryConsent = valid.data.payload.value ?? "unset";
    }
  }
}

/** Fold previously validated Storage events in local append sequence, not occurredAt. */
export function reconstructUserSettings(
  entries: readonly SequencedEvent[],
  userId: string,
): Readonly<UserSettings> {
  const selected = requireUserId(userId);
  const settings = freshDefaults();
  let lastSeq = 0;
  for (const row of entries) {
    if (!Number.isSafeInteger(row.seq) || row.seq <= lastSeq) {
      throw new StorageError("invalid_event");
    }
    lastSeq = row.seq;
    fold(settings, row.event, selected);
  }
  return Object.freeze(settings);
}

/** No cache, projection, network or persistent adapter is created in core. */
export function createUserSettingsStore(
  storage: Pick<Storage, "append" | "readEntries" | "getLastSeq">,
  clock: Clock,
): UserSettingsStore {
  async function append(
    kind: "preferences.changed" | "privacy.changed",
    context: SettingsChangeContext,
    change: PreferenceChange | PrivacyChange,
  ): Promise<void> {
    const ids = parseContext(context);
    const payload = parseChange(change, kind);
    let occurredAt: string;
    try {
      occurredAt = Date.prototype.toISOString.call(clock.now());
    } catch {
      throw new StorageError("invalid_input");
    }
    const input = {
      id: ids.eventId,
      deviceId: ids.deviceId,
      userId: ids.userId,
      occurredAt,
      type: kind,
      version: 1,
      payload,
    };
    const parsed =
      kind === "preferences.changed"
        ? PreferencesChanged.safeParse(input)
        : PrivacyChanged.safeParse(input);
    if (!parsed.success) throw new StorageError("invalid_input");
    await storage.append([parsed.data]);
  }

  return Object.freeze({
    async changePreference(context: SettingsChangeContext, change: PreferenceChange) {
      await append("preferences.changed", context, change);
    },
    async changePrivacy(context: SettingsChangeContext, change: PrivacyChange) {
      await append("privacy.changed", context, change);
    },
    async read(userId: string): Promise<UserSettingsSnapshot> {
      const selected = requireUserId(userId);
      const head = await storage.getLastSeq();
      if (!Number.isSafeInteger(head) || head < 0) throw new StorageError("invalid_event");
      const settings = freshDefaults();
      let cursor = 0;
      while (cursor < head) {
        const page = await storage.readEntries({
          afterSeq: cursor,
          limit: Math.min(1000, head - cursor),
        });
        if (page.entries.length === 0) throw new StorageError("invalid_event");
        for (const row of page.entries) {
          if (!Number.isSafeInteger(row.seq) || row.seq !== cursor + 1 || row.seq > head) {
            throw new StorageError("invalid_event");
          }
          fold(settings, row.event, selected);
          cursor = row.seq;
        }
        if (page.lastSeq !== cursor) throw new StorageError("invalid_event");
      }
      return Object.freeze({ asOfSeq: head, settings: Object.freeze(settings) });
    },
  });
}
