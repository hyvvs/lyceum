import {
  LOG_LEVELS,
  type DiagnosticInput,
  type DiagnosticRecord,
  type DiagnosticWriteResult,
  type LogLevel,
  type Logger,
} from "./logger";
import { sanitizeDiagnosticInput } from "./diagnostics-privacy";
import type { Clock } from "./ports";

export type DiagnosticEnvironment = "production" | "development" | "test";

export interface InMemoryDiagnosticsOptions {
  readonly clock: Clock;
  /** Maximum retained records. Defaults to 100; valid range is 1–1,000. */
  readonly capacity?: number;
  /** Lowest severity retained. Defaults to `info`. */
  readonly minimumLevel?: LogLevel;
  /** Defaults to production, where debug cannot be enabled. */
  readonly environment?: DiagnosticEnvironment;
}

export interface DiagnosticsSnapshot {
  readonly schemaVersion: 1;
  readonly records: readonly DiagnosticRecord[];
}

export interface InMemoryDiagnostics {
  readonly logger: Logger;
  snapshot(): DiagnosticsSnapshot;
  clear(): void;
}

type PropertyRead =
  | { readonly kind: "missing" }
  | { readonly kind: "data"; readonly value: unknown }
  | { readonly kind: "invalid" };

function isPlainRecord(value: unknown): value is object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function readOwnDataProperty(record: object, key: string): PropertyRead {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined) return { kind: "missing" };
    if (!("value" in descriptor)) return { kind: "invalid" };
    return { kind: "data", value: descriptor.value };
  } catch {
    return { kind: "invalid" };
  }
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function readLevelForFiltering(input: unknown): LogLevel | undefined {
  if (!isPlainRecord(input)) return undefined;
  const level = readOwnDataProperty(input, "level");
  return level.kind === "data" && isOneOf(level.value, LOG_LEVELS) ? level.value : undefined;
}

function readClockMethod(clock: unknown): (() => unknown) | undefined {
  if (typeof clock !== "object" || clock === null) return undefined;

  try {
    let current: object | null = clock;
    for (let depth = 0; current !== null && depth < 16; depth += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(current, "now");
      if (descriptor !== undefined) {
        if (!("value" in descriptor) || typeof descriptor.value !== "function") {
          return undefined;
        }
        return descriptor.value as () => unknown;
      }

      const prototype = Object.getPrototypeOf(current);
      if (prototype === Object.prototype) return undefined;
      current = prototype;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function readTimestamp(clock: object, now: () => unknown): string | undefined {
  try {
    const value = Reflect.apply(now, clock, []) as unknown;
    if (typeof value !== "object" || value === null) return undefined;

    // Call the built-in methods directly: never consult an injected Date-like
    // object's custom getTime/toISOString methods or accessors.
    const milliseconds = Date.prototype.getTime.call(value);
    if (!Number.isFinite(milliseconds)) return undefined;
    return Date.prototype.toISOString.call(value);
  } catch {
    return undefined;
  }
}

function readConfiguration(options: unknown): {
  readonly clock: object;
  readonly now: () => unknown;
  readonly capacity: number;
  readonly minimumLevel: LogLevel;
  readonly environment: DiagnosticEnvironment;
} {
  if (!isPlainRecord(options)) throw new Error("Invalid diagnostics configuration");

  const clockProperty = readOwnDataProperty(options, "clock");
  if (clockProperty.kind !== "data") throw new Error("Invalid diagnostics clock");
  const clock = clockProperty.value;
  const now = readClockMethod(clock);
  if (now === undefined || typeof clock !== "object" || clock === null) {
    throw new Error("Invalid diagnostics clock");
  }

  const capacityProperty = readOwnDataProperty(options, "capacity");
  if (capacityProperty.kind === "invalid") throw new Error("Invalid diagnostics capacity");
  const capacity = capacityProperty.kind === "missing" ? 100 : capacityProperty.value;
  if (
    typeof capacity !== "number" ||
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    capacity > 1_000
  ) {
    throw new Error("Invalid diagnostics capacity");
  }

  const minimumLevelProperty = readOwnDataProperty(options, "minimumLevel");
  if (minimumLevelProperty.kind === "invalid") {
    throw new Error("Invalid diagnostics severity threshold");
  }
  const minimumLevel = minimumLevelProperty.kind === "missing" ? "info" : minimumLevelProperty.value;
  if (!isOneOf(minimumLevel, LOG_LEVELS)) {
    throw new Error("Invalid diagnostics severity threshold");
  }

  const environmentProperty = readOwnDataProperty(options, "environment");
  if (environmentProperty.kind === "invalid") {
    throw new Error("Invalid diagnostics environment");
  }
  const environment =
    environmentProperty.kind === "missing" ? "production" : environmentProperty.value;
  if (!isOneOf(environment, ["production", "development", "test"] as const)) {
    throw new Error("Invalid diagnostics environment");
  }

  if (environment === "production" && minimumLevel === "debug") {
    throw new Error("Debug diagnostics are disabled in production");
  }

  return {
    clock,
    now,
    capacity,
    minimumLevel,
    environment,
  };
}

/**
 * Creates an isolated, bounded diagnostics store. All writes are structurally
 * sanitized before a timestamp or retained slot is allocated. No I/O or
 * persistence is performed.
 */
export function createInMemoryDiagnostics(
  options: InMemoryDiagnosticsOptions,
): InMemoryDiagnostics {
  const configuration = readConfiguration(options);
  const { clock, now, capacity, minimumLevel } = configuration;
  const minimumSeverityIndex = LOG_LEVELS.indexOf(minimumLevel);
  const slots: Array<DiagnosticRecord | undefined> = new Array(capacity);
  let count = 0;
  let nextWriteIndex = 0;

  const log = (input: DiagnosticInput): DiagnosticWriteResult => {
    try {
      const level = readLevelForFiltering(input);
      if (level === undefined) return "rejected";

      // Filter first: a disabled debug record does not cause metadata inspection
      // or clock access, even when it carries malformed/unsupported fields.
      if (LOG_LEVELS.indexOf(level) > minimumSeverityIndex) return "filtered";

      const sanitized = sanitizeDiagnosticInput(input);
      if (!sanitized.ok) return "rejected";

      const timestamp = readTimestamp(clock, now);
      if (timestamp === undefined) return "rejected";

      const record: DiagnosticRecord = Object.freeze({
        ...sanitized.value,
        timestamp,
      });

      slots[nextWriteIndex] = record;
      nextWriteIndex = (nextWriteIndex + 1) % capacity;
      if (count < capacity) count += 1;
      return "recorded";
    } catch {
      // Diagnostics must never make an otherwise successful core operation fail.
      return "rejected";
    }
  };

  const logger: Logger = Object.freeze({ log });

  const snapshot = (): DiagnosticsSnapshot => {
    const records: DiagnosticRecord[] = [];
    const firstIndex = count === capacity ? nextWriteIndex : 0;
    for (let offset = 0; offset < count; offset += 1) {
      const record = slots[(firstIndex + offset) % capacity];
      if (record !== undefined) records.push(record);
    }

    return Object.freeze({
      schemaVersion: 1 as const,
      records: Object.freeze(records),
    });
  };

  const clear = (): void => {
    slots.fill(undefined);
    count = 0;
    nextWriteIndex = 0;
  };

  return Object.freeze({ logger, snapshot, clear });
}
