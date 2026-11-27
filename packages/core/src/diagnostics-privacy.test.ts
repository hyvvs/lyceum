import { describe, expect, it } from "vitest";
import { type DiagnosticSanitizationResult, sanitizeDiagnosticInput } from "./diagnostics-privacy";
import type { DiagnosticInput } from "./logger";

const validInput: DiagnosticInput = {
  level: "error",
  eventCode: "storage.operation.failed",
  component: "storage",
  metadata: {
    operation: "read",
    errorCode: "invalid_json",
    retryable: false,
    statusCode: 503,
    attempt: 1,
    durationMs: 250,
    itemCount: 2,
  },
};

function sanitized(input: unknown): DiagnosticInput {
  const result = sanitizeDiagnosticInput(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Unexpected sanitizer rejection: ${result.reason}`);
  return result.value;
}

function expectRejected(input: unknown): void {
  const result = sanitizeDiagnosticInput(input);
  expect(result.ok).toBe(false);
}

function assertNoSyntheticSecrets(output: string): void {
  const patterns = [
    /sk-test-[A-Za-z0-9_-]+/i,
    /Bearer\s+SYNTHETIC_[A-Za-z0-9_-]+/i,
    /api[_-]?key\s*[:=]\s*SYNTHETIC_[A-Za-z0-9_-]+/i,
  ];
  expect(patterns.some((pattern) => pattern.test(output))).toBe(false);
}

function joinParts(...parts: string[]): string {
  return parts.join("");
}

describe("sanitizeDiagnosticInput", () => {
  it("copies the complete approved structured record and freezes its output", () => {
    const result = sanitized(validInput);

    expect(result).toEqual(validInput);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.metadata)).toBe(true);
  });

  it("accepts a null-prototype record and does not require caller-owned objects", () => {
    const input = Object.assign(Object.create(null), {
      level: "warn",
      eventCode: "operation.cancelled",
    });

    expect(sanitized(input)).toEqual({
      level: "warn",
      eventCode: "operation.cancelled",
    });
  });

  it("omits sensitive and unsupported top-level and metadata fields without inspecting them", () => {
    const sentinels = {
      [joinParts("api", "Key")]: joinParts("sk-", "test-", "TOP_LEVEL_SENTINEL"),
      [joinParts("Author", "ization")]: joinParts("Bear", "er ", "SYNTHETIC_TOP_LEVEL_TOKEN"),
      prompt: "SYNTHETIC_PROMPT_SENTINEL",
      learnerAnswer: "SYNTHETIC_ANSWER_SENTINEL",
      sourceExcerpt: "SYNTHETIC_SOURCE_SENTINEL",
      providerResponseBody: "SYNTHETIC_RESPONSE_SENTINEL",
      [joinParts("PASS", "WORD")]: joinParts("SYNTHETIC_", "PASS", "WORD", "_SENTINEL"),
      [joinParts("refresh", "_", "token")]: "SYNTHETIC_REFRESH_TOKEN_SENTINEL",
      learnerName: "SYNTHETIC_LEARNER_NAME",
      uploadedDocument: "SYNTHETIC_UPLOADED_DOCUMENT",
      query: "SYNTHETIC_QUERY_STRING",
      url: joinParts(
        "https://user",
        ":",
        "pass",
        "@example.test/?",
        "to",
        "ken=",
        "SYNTHETIC_URL_TOKEN",
      ),
      filePath: "C:\\private\\SYNTHETIC_PATH",
      message: "SYNTHETIC_ERROR_MESSAGE",
      stack: "SYNTHETIC_STACK",
      metadata: {
        ...validInput.metadata,
        [joinParts("api_", "key")]: joinParts("api_", "key=", "SYNTHETIC_METADATA_KEY"),
        [joinParts("access", "Token")]: "SYNTHETIC_ACCESS_TOKEN",
        response: "SYNTHETIC_RESPONSE",
        uploadedContent: "SYNTHETIC_UPLOAD",
      },
    };
    const input = { ...validInput, ...sentinels };

    const result = sanitized(input);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("SYNTHETIC");
    expect(serialized).not.toContain("sk-test-");
    expect(result).toEqual(validInput);
  });

  it("never invokes accessor-backed approved or unsupported fields", () => {
    let levelGetterCalls = 0;
    let metadataGetterCalls = 0;
    let promptGetterCalls = 0;
    let authorizationGetterCalls = 0;
    const accessorLevel = { ...validInput };
    Object.defineProperty(accessorLevel, "level", {
      enumerable: true,
      get() {
        levelGetterCalls += 1;
        return "error";
      },
    });
    const accessorMetadata = { ...validInput.metadata };
    Object.defineProperty(accessorMetadata, "operation", {
      enumerable: true,
      get() {
        metadataGetterCalls += 1;
        return "read";
      },
    });
    const accessorUnknown = { ...validInput } as Record<string, unknown>;
    Object.defineProperty(accessorUnknown, "prompt", {
      enumerable: true,
      get() {
        promptGetterCalls += 1;
        return "SYNTHETIC_PROMPT";
      },
    });
    const metadataWithUnknownAccessor = { operation: "read" };
    Object.defineProperty(metadataWithUnknownAccessor, "Authorization", {
      get() {
        authorizationGetterCalls += 1;
        return "Bearer SYNTHETIC_METADATA_ACCESSOR";
      },
    });

    expectRejected(accessorLevel);
    expectRejected({ ...validInput, metadata: accessorMetadata });
    expect(sanitized(accessorUnknown)).toEqual(validInput);
    expect(sanitized({ ...validInput, metadata: metadataWithUnknownAccessor })).toEqual({
      ...validInput,
      metadata: { operation: "read" },
    });
    expect([
      levelGetterCalls,
      metadataGetterCalls,
      promptGetterCalls,
      authorizationGetterCalls,
    ]).toEqual([0, 0, 0, 0]);
  });

  it("rejects non-plain prototypes, arrays, nulls and primitive records", () => {
    class DiagnosticLike {
      level = "error";
      eventCode = "operation.failed";
    }

    for (const input of [
      null,
      undefined,
      "error",
      1,
      [],
      new Date(0),
      new DiagnosticLike(),
      { ...validInput, metadata: [] },
      { ...validInput, metadata: new Date(0) },
    ]) {
      expectRejected(input);
    }
  });

  it("rejects invalid required fields and every invalid approved metadata value", () => {
    const invalidInputs: unknown[] = [
      { ...validInput, level: "trace" },
      { ...validInput, eventCode: "learner.answer.submitted" },
      { ...validInput, component: "alice" },
      { ...validInput, metadata: { operation: "download" } },
      { ...validInput, metadata: { errorCode: "unknown-provider-error" } },
      { ...validInput, metadata: { retryable: "yes" } },
      { ...validInput, metadata: { statusCode: 99 } },
      { ...validInput, metadata: { statusCode: 600 } },
      { ...validInput, metadata: { attempt: 0 } },
      { ...validInput, metadata: { attempt: 101 } },
      { ...validInput, metadata: { durationMs: -1 } },
      { ...validInput, metadata: { durationMs: 86_400_001 } },
      { ...validInput, metadata: { itemCount: 100_001 } },
      { ...validInput, metadata: { itemCount: Number.NaN } },
      { ...validInput, metadata: { itemCount: Number.POSITIVE_INFINITY } },
      { ...validInput, metadata: { itemCount: 1.5 } },
      { ...validInput, metadata: { operation: { toString: () => "read" } } },
    ];

    for (const input of invalidInputs) expectRejected(input);
  });

  it("ignores unknown cyclic and oversized fields without recursive traversal", () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    const input = {
      ...validInput,
      uploadedContent: cycle,
      metadata: {
        operation: "read",
        arbitraryNestedValue: cycle,
        hugeUnknownValue: "x".repeat(1_000_000),
      },
    };

    expect(sanitized(input)).toEqual({
      level: "error",
      eventCode: "storage.operation.failed",
      component: "storage",
      metadata: { operation: "read" },
    });
  });

  it("does not mutate caller-owned records or nested metadata", () => {
    const metadata = { operation: "read" as const, itemCount: 2 };
    const input = { level: "info" as const, eventCode: "operation.failed" as const, metadata };
    const originalMetadata = { ...metadata };
    const originalKeys = Object.keys(input);

    sanitized(input);

    expect(metadata).toEqual(originalMetadata);
    expect(Object.keys(input)).toEqual(originalKeys);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(metadata)).toBe(false);
  });

  it("fails closed when reflection on malformed proxy inputs throws", () => {
    const prototypeTrap = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error("SYNTHETIC_PROXY_ERROR");
        },
      },
    );
    const descriptorTrap = new Proxy(
      { ...validInput },
      {
        getOwnPropertyDescriptor() {
          throw new Error("SYNTHETIC_PROXY_DESCRIPTOR_ERROR");
        },
      },
    );

    expectRejected(prototypeTrap);
    expectRejected(descriptorTrap);
  });

  it("returns a fixed rejection for revoked proxies without throwing", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(sanitizeDiagnosticInput(proxy)).toEqual({
      ok: false,
      reason: "invalid_record",
    });
  });

  it("does not call custom serialization methods on unknown fields", () => {
    let calls = 0;
    const input = {
      ...validInput,
      toJSON() {
        calls += 1;
        return { prompt: "SYNTHETIC_PROMPT_FROM_TOJSON" };
      },
    };

    const result = sanitized(input);
    expect(calls).toBe(0);
    expect(result).toEqual(validInput);
  });

  it("returns only fixed failure reasons, never attacker-controlled exception text", () => {
    const result: DiagnosticSanitizationResult = sanitizeDiagnosticInput({
      ...validInput,
      level: "SYNTHETIC_ERROR_MESSAGE",
    });

    expect(result).toEqual({ ok: false, reason: "invalid_value" });
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC");
  });

  it("uses a synthetic key-pattern scanner that detects a deliberate negative leak fixture", () => {
    const negativeFixture = JSON.stringify({
      [joinParts("author", "ization")]: joinParts("Bear", "er ", "SYNTHETIC_NEGATIVE_TOKEN"),
      [joinParts("k", "ey")]: joinParts("sk-", "test-", "NEGATIVE_FIXTURE"),
      [joinParts("api_", "key")]: joinParts("api_", "key=", "SYNTHETIC_NEGATIVE_KEY"),
    });

    expect(() => assertNoSyntheticSecrets(negativeFixture)).toThrow();
    expect(() => assertNoSyntheticSecrets(JSON.stringify(sanitized(validInput)))).not.toThrow();
  });
});
