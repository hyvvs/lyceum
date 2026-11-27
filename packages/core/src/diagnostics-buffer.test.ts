import { describe, expect, it } from "vitest";
import { type DiagnosticsSnapshot, createInMemoryDiagnostics } from "./diagnostics-buffer";
import type { DiagnosticInput, DiagnosticRecord } from "./logger";
import type { Clock } from "./ports";

function clockFrom(values: readonly unknown[], onCall?: () => void): Clock {
  let index = 0;
  return {
    now() {
      onCall?.();
      const value = values[Math.min(index, values.length - 1)];
      index += 1;
      return value as Date;
    },
  };
}

function validInput(overrides: Partial<DiagnosticInput> = {}): DiagnosticInput {
  return {
    level: "info",
    eventCode: "operation.failed",
    component: "core",
    ...overrides,
  };
}

function expectNoSyntheticSecrets(serialized: string): void {
  const patterns = [
    /sk-test-[A-Za-z0-9_-]+/i,
    /Bearer\s+SYNTHETIC_[A-Za-z0-9_-]+/i,
    /api[_-]?key\s*[:=]\s*SYNTHETIC_[A-Za-z0-9_-]+/i,
  ];
  expect(patterns.some((pattern) => pattern.test(serialized))).toBe(false);
}

function joinParts(...parts: string[]): string {
  return parts.join("");
}

function makeTimestamp(value: string): Date {
  return new Date(value);
}

describe("createInMemoryDiagnostics", () => {
  it("starts empty with a versioned snapshot and clears safely", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")]),
    });

    expect(diagnostics.snapshot()).toEqual({ schemaVersion: 1, records: [] });
    expect(Object.isFrozen(diagnostics.snapshot())).toBe(true);
    expect(Object.isFrozen(diagnostics.snapshot().records)).toBe(true);
    expect(() => diagnostics.clear()).not.toThrow();
    expect(diagnostics.snapshot()).toEqual({ schemaVersion: 1, records: [] });
  });

  it("stores accepted records in insertion order with injected ISO timestamps", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([
        makeTimestamp("2026-01-01T00:00:01.000Z"),
        makeTimestamp("2026-01-01T00:00:02.000Z"),
      ]),
    });

    expect(diagnostics.logger.log(validInput({ eventCode: "operation.failed" }))).toBe("recorded");
    expect(
      diagnostics.logger.log(validInput({ eventCode: "operation.cancelled", level: "warn" })),
    ).toBe("recorded");

    expect(diagnostics.snapshot().records).toEqual([
      {
        level: "info",
        eventCode: "operation.failed",
        component: "core",
        timestamp: "2026-01-01T00:00:01.000Z",
      },
      {
        level: "warn",
        eventCode: "operation.cancelled",
        component: "core",
        timestamp: "2026-01-01T00:00:02.000Z",
      },
    ]);
  });

  it("evicts the oldest record deterministically at exact capacity", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([
        makeTimestamp("2026-01-01T00:00:01.000Z"),
        makeTimestamp("2026-01-01T00:00:02.000Z"),
        makeTimestamp("2026-01-01T00:00:03.000Z"),
      ]),
      capacity: 2,
    });

    for (let itemCount = 1; itemCount <= 3; itemCount += 1) {
      expect(diagnostics.logger.log(validInput({ metadata: { itemCount } }))).toBe("recorded");
    }

    expect(diagnostics.snapshot().records.map((record) => record.metadata?.itemCount)).toEqual([
      2, 3,
    ]);
  });

  it("uses a default capacity of 100 and remains bounded under representative volume", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")]),
    });

    for (let itemCount = 0; itemCount < 500; itemCount += 1) {
      expect(diagnostics.logger.log(validInput({ metadata: { itemCount } }))).toBe("recorded");
    }

    const records = diagnostics.snapshot().records;
    expect(records).toHaveLength(100);
    expect(records[0]?.metadata?.itemCount).toBe(400);
    expect(records[99]?.metadata?.itemCount).toBe(499);
  });

  it("rejects invalid capacities and permits the documented maximum", () => {
    const clock = clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")]);
    for (const capacity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1_001]) {
      expect(() => createInMemoryDiagnostics({ clock, capacity })).toThrow();
    }
    expect(() => createInMemoryDiagnostics({ clock, capacity: 1_000 })).not.toThrow();
  });

  it("rejects accessor-backed configuration without invoking the accessor", () => {
    let clockGetterCalls = 0;
    const options = {} as { clock: Clock };
    Object.defineProperty(options, "clock", {
      get() {
        clockGetterCalls += 1;
        throw new Error("SYNTHETIC_OPTIONS_GETTER");
      },
    });

    expect(() => createInMemoryDiagnostics(options)).toThrow();
    expect(clockGetterCalls).toBe(0);

    let nowGetterCalls = 0;
    const clock = {} as Clock;
    Object.defineProperty(clock, "now", {
      get() {
        nowGetterCalls += 1;
        throw new Error("SYNTHETIC_CLOCK_GETTER");
      },
    });
    expect(() => createInMemoryDiagnostics({ clock })).toThrow();
    expect(nowGetterCalls).toBe(0);
  });

  it("filters by severity before inspecting other record fields or calling the clock", () => {
    let clockCalls = 0;
    let eventGetterCalls = 0;
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")], () => {
        clockCalls += 1;
      }),
    });
    const debugRecord = { level: "debug" };
    Object.defineProperty(debugRecord, "eventCode", {
      get() {
        eventGetterCalls += 1;
        throw new Error("SYNTHETIC_EVENT_GETTER");
      },
    });

    expect(diagnostics.logger.log(debugRecord as DiagnosticInput)).toBe("filtered");
    expect([clockCalls, eventGetterCalls]).toEqual([0, 0]);
  });

  it("rechecks sanitized severity before retaining a stateful Proxy record", () => {
    let levelReads = 0;
    let clockCalls = 0;
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")], () => {
        clockCalls += 1;
      }),
    });
    const input = validInput({ level: "info" });
    const statefulInput = new Proxy(input, {
      getOwnPropertyDescriptor(target, key) {
        const descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (key !== "level" || descriptor === undefined || !("value" in descriptor)) {
          return descriptor;
        }

        levelReads += 1;
        return { ...descriptor, value: levelReads === 1 ? "info" : "debug" };
      },
    });

    expect(diagnostics.logger.log(statefulInput)).toBe("filtered");
    expect(levelReads).toBe(2);
    expect(clockCalls).toBe(0);
    expect(diagnostics.snapshot().records).toEqual([]);
  });

  it("applies configured severity thresholds", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")]),
      minimumLevel: "warn",
    });

    expect(diagnostics.logger.log(validInput({ level: "debug" }))).toBe("filtered");
    expect(diagnostics.logger.log(validInput({ level: "info" }))).toBe("filtered");
    expect(diagnostics.logger.log(validInput({ level: "warn" }))).toBe("recorded");
    expect(diagnostics.logger.log(validInput({ level: "error" }))).toBe("recorded");
    expect(diagnostics.snapshot().records.map((record) => record.level)).toEqual(["warn", "error"]);
  });

  it("disables debug by default and permits it only in explicitly configured development/test", () => {
    const date = makeTimestamp("2026-01-01T00:00:00.000Z");
    const production = createInMemoryDiagnostics({ clock: clockFrom([date]) });
    expect(production.logger.log(validInput({ level: "debug" }))).toBe("filtered");
    expect(() =>
      createInMemoryDiagnostics({
        clock: clockFrom([date]),
        environment: "production",
        minimumLevel: "debug",
      }),
    ).toThrow();

    for (const environment of ["development", "test"] as const) {
      const diagnostics = createInMemoryDiagnostics({
        clock: clockFrom([date]),
        environment,
        minimumLevel: "debug",
      });
      expect(diagnostics.logger.log(validInput({ level: "debug" }))).toBe("recorded");
    }
  });

  it("supports all four levels when debug is explicitly enabled outside production", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")]),
      environment: "test",
      minimumLevel: "debug",
    });

    for (const level of ["error", "warn", "info", "debug"] as const) {
      expect(diagnostics.logger.log(validInput({ level }))).toBe("recorded");
    }
    expect(diagnostics.snapshot().records.map((record) => record.level)).toEqual([
      "error",
      "warn",
      "info",
      "debug",
    ]);
  });

  it("rejects malformed records without corrupting existing history", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")]),
    });
    expect(diagnostics.logger.log(validInput())).toBe("recorded");
    const malformed = { ...validInput() };
    Object.defineProperty(malformed, "component", {
      get() {
        throw new Error("SYNTHETIC_COMPONENT_GETTER");
      },
    });

    expect(diagnostics.logger.log(malformed as DiagnosticInput)).toBe("rejected");
    expect(diagnostics.snapshot().records).toHaveLength(1);
    expect(diagnostics.snapshot().records[0]?.eventCode).toBe("operation.failed");
  });

  it("copies caller-owned input before retaining records and freezes returned history", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")]),
    });
    const metadata = { operation: "read" as const, itemCount: 3 };
    const input = validInput({ metadata });
    expect(diagnostics.logger.log(input)).toBe("recorded");

    metadata.itemCount = 99;
    const snapshot = diagnostics.snapshot();
    const record = snapshot.records[0] as DiagnosticRecord;

    expect(record.metadata?.itemCount).toBe(3);
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.metadata)).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.records)).toBe(true);
    expect(() => {
      (record as { level: string }).level = "debug";
    }).toThrow();
    expect(() => {
      (snapshot.records as DiagnosticRecord[]).push(record);
    }).toThrow();
    expect(metadata.itemCount).toBe(99);
  });

  it("preserves append order across repeated and backwards clock values", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([
        makeTimestamp("2026-01-01T00:00:02.000Z"),
        makeTimestamp("2026-01-01T00:00:01.000Z"),
        makeTimestamp("2026-01-01T00:00:01.000Z"),
      ]),
      capacity: 3,
    });

    for (const attempt of [1, 2, 3]) {
      expect(diagnostics.logger.log(validInput({ metadata: { attempt } }))).toBe("recorded");
    }

    expect(diagnostics.snapshot().records.map((record) => record.metadata?.attempt)).toEqual([
      1, 2, 3,
    ]);
    expect(diagnostics.snapshot().records.map((record) => record.timestamp)).toEqual([
      "2026-01-01T00:00:02.000Z",
      "2026-01-01T00:00:01.000Z",
      "2026-01-01T00:00:01.000Z",
    ]);
  });

  it("rejects throwing and invalid clocks without changing existing history", () => {
    let call = 0;
    const diagnostics = createInMemoryDiagnostics({
      clock: {
        now() {
          call += 1;
          if (call === 2) throw new Error("SYNTHETIC_CLOCK_FAILURE");
          if (call === 3) return new Date(Number.NaN);
          return makeTimestamp("2026-01-01T00:00:00.000Z");
        },
      },
    });

    expect(diagnostics.logger.log(validInput())).toBe("recorded");
    expect(diagnostics.logger.log(validInput({ level: "warn" }))).toBe("rejected");
    expect(diagnostics.logger.log(validInput({ level: "error" }))).toBe("rejected");
    expect(diagnostics.snapshot().records).toHaveLength(1);
    expect(diagnostics.logger.log(validInput({ level: "warn" }))).toBe("recorded");
    expect(diagnostics.snapshot().records).toHaveLength(2);
  });

  it("returns stable independent snapshots and clear resets ring indices", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")]),
      capacity: 2,
    });
    diagnostics.logger.log(validInput({ metadata: { itemCount: 1 } }));
    const first = diagnostics.snapshot();
    const second = diagnostics.snapshot();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.records).not.toBe(second.records);

    diagnostics.clear();
    expect(diagnostics.snapshot()).toEqual({ schemaVersion: 1, records: [] });
    diagnostics.logger.log(validInput({ metadata: { itemCount: 2 } }));
    expect(diagnostics.snapshot().records[0]?.metadata?.itemCount).toBe(2);
  });

  it("keeps separate logger instances isolated", () => {
    const date = makeTimestamp("2026-01-01T00:00:00.000Z");
    const first = createInMemoryDiagnostics({ clock: clockFrom([date]), capacity: 1 });
    const second = createInMemoryDiagnostics({ clock: clockFrom([date]), capacity: 1 });

    first.logger.log(validInput({ eventCode: "operation.failed" }));
    second.logger.log(validInput({ eventCode: "operation.cancelled" }));

    expect(first.snapshot().records[0]?.eventCode).toBe("operation.failed");
    expect(second.snapshot().records[0]?.eventCode).toBe("operation.cancelled");
  });

  it("scans actual captured records and snapshots for synthetic secrets", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")]),
    });
    const unsafeAtRuntime = {
      ...validInput(),
      metadata: {
        operation: "request",
        [joinParts("api_", "key")]: joinParts("api_", "key=", "SYNTHETIC_CAPTURED_KEY"),
        [joinParts("access", "Token")]: "SYNTHETIC_CAPTURED_ACCESS_TOKEN",
        prompt: "SYNTHETIC_CAPTURED_PROMPT",
        learnerAnswer: "SYNTHETIC_CAPTURED_ANSWER",
        sourceExcerpt: "SYNTHETIC_CAPTURED_SOURCE",
        providerResponseBody: "SYNTHETIC_CAPTURED_RESPONSE",
      },
      [joinParts("api", "Key")]: joinParts("sk-", "test-", "CAPTURED_SYNTHETIC_KEY"),
      [joinParts("Author", "ization")]: joinParts("Bear", "er ", "SYNTHETIC_CAPTURED_BEARER"),
      [joinParts("pass", "word")]: "SYNTHETIC_CAPTURED_PASSWORD",
      url: joinParts(
        "https://user",
        ":",
        "pass",
        "@example.test/?",
        "to",
        "ken=",
        "SYNTHETIC_CAPTURED_URL_TOKEN",
      ),
    };

    expect(diagnostics.logger.log(unsafeAtRuntime as unknown as DiagnosticInput)).toBe("recorded");
    const snapshot = diagnostics.snapshot();
    const capturedOutputs = [
      JSON.stringify(snapshot),
      JSON.stringify(snapshot.records),
      JSON.stringify(snapshot.records[0]),
    ];

    for (const output of capturedOutputs) {
      expectNoSyntheticSecrets(output);
      expect(output).not.toContain("SYNTHETIC_CAPTURED");
    }
  });

  it("proves the captured-output scanner detects a deliberate negative leak fixture", () => {
    const negativeFixture = JSON.stringify({
      [joinParts("api", "Key")]: joinParts("sk-", "test-", "NEGATIVE_BUFFER_FIXTURE"),
      [joinParts("author", "ization")]: joinParts("Bear", "er ", "SYNTHETIC_NEGATIVE_BUFFER_TOKEN"),
      [joinParts("api_", "key")]: joinParts("api_", "key=", "SYNTHETIC_NEGATIVE_BUFFER_KEY"),
    });

    expect(() => expectNoSyntheticSecrets(negativeFixture)).toThrow();
  });

  it("does not expose arbitrary content or raw error fields in snapshot JSON", () => {
    const diagnostics = createInMemoryDiagnostics({
      clock: clockFrom([makeTimestamp("2026-01-01T00:00:00.000Z")]),
    });
    const input = {
      ...validInput(),
      message: "SYNTHETIC_RAW_ERROR_MESSAGE",
      cause: { message: "SYNTHETIC_CAUSE" },
      stack: "SYNTHETIC_STACK_TRACE",
      toJSON() {
        throw new Error("must not be called");
      },
    };

    expect(diagnostics.logger.log(input as unknown as DiagnosticInput)).toBe("recorded");
    const serialized = JSON.stringify(diagnostics.snapshot() satisfies DiagnosticsSnapshot);
    expect(serialized).not.toContain("SYNTHETIC");
  });
});
