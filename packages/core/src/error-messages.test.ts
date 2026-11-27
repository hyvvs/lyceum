import { describe, expect, it } from "vitest";
import { type OperationalErrorCategory, mapOperationalError } from "./error-messages";

const STORAGE_CASES = [
  ["invalid_input", ["review_input"]],
  ["invalid_event", ["review_input"]],
  ["invalid_json", ["refresh_data"]],
  ["conflict", ["refresh_data"]],
  ["closed_transaction", ["restart_operation"]],
  ["nested_transaction", ["restart_operation"]],
  ["async_transaction", ["restart_operation"]],
  ["transaction_aborted", ["restart_operation"]],
] as const;

const PROVIDER_CASES = [
  ["auth", ["review_provider_settings"], false],
  ["rate_limit", ["retry"], true],
  ["context_length", ["reduce_request"], false],
  ["network", ["check_connection", "retry"], true],
  ["invalid_request", ["review_request"], false],
  ["unsupported", ["choose_supported_option"], false],
  ["provider", ["retry"], true],
  ["aborted", ["restart_operation"], false],
] as const;

function errorWithCode(code: string, extra: object = {}): object {
  return Object.assign(Object.create(Error.prototype) as object, { code }, extra);
}

function genericDescriptor() {
  return {
    titleKey: "errors.unknown.title",
    explanationKey: "errors.unknown.explanation",
    recoveryActions: ["copy_diagnostics"],
  };
}

describe("mapOperationalError", () => {
  it.each(STORAGE_CASES)(
    "maps storage code %s to fixed localized keys and actions",
    (code, actions) => {
      const descriptor = mapOperationalError(errorWithCode(code), "storage");

      expect(descriptor).toEqual({
        titleKey: `errors.storage.${code}.title`,
        explanationKey: `errors.storage.${code}.explanation`,
        recoveryActions: actions,
      });
      expect(descriptor.retry).toBeUndefined();
    },
  );

  it.each(PROVIDER_CASES)(
    "maps provider code %s to fixed localized keys and actions",
    (code, actions, retryable) => {
      const descriptor = mapOperationalError(errorWithCode(code), "provider");

      expect(descriptor).toEqual({
        titleKey: `errors.provider.${code}.title`,
        explanationKey: `errors.provider.${code}.explanation`,
        recoveryActions: actions,
      });
      expect(descriptor.retry).toBeUndefined();
      const actionIds: readonly string[] = actions;
      expect(actionIds.includes("retry")).toBe(retryable);
    },
  );

  it("includes retry guidance only for retryable provider codes and bounded integer delays", () => {
    for (const code of ["rate_limit", "network", "provider"] as const) {
      expect(
        mapOperationalError(errorWithCode(code, { retryAfterSeconds: 7 }), "provider").retry,
      ).toEqual({ afterSeconds: 7 });
    }

    for (const code of [
      "auth",
      "context_length",
      "invalid_request",
      "unsupported",
      "aborted",
    ] as const) {
      expect(
        mapOperationalError(errorWithCode(code, { retryAfterSeconds: 7 }), "provider").retry,
      ).toBeUndefined();
    }

    expect(
      mapOperationalError(errorWithCode("conflict", { retryAfterSeconds: 7 }), "storage").retry,
    ).toBeUndefined();
  });

  it.each([undefined, 0, -1, 1.5, 3601, Number.NaN, Number.POSITIVE_INFINITY, "7"])(
    "omits missing or invalid retry delay %s",
    (retryAfterSeconds) => {
      const extra = retryAfterSeconds === undefined ? {} : { retryAfterSeconds };
      expect(
        mapOperationalError(errorWithCode("rate_limit", extra), "provider").retry,
      ).toBeUndefined();
    },
  );

  it("accepts the inclusive retry-delay bounds", () => {
    expect(
      mapOperationalError(errorWithCode("network", { retryAfterSeconds: 1 }), "provider").retry,
    ).toEqual({ afterSeconds: 1 });
    expect(
      mapOperationalError(errorWithCode("provider", { retryAfterSeconds: 3600 }), "provider").retry,
    ).toEqual({ afterSeconds: 3600 });
  });

  it("returns one fixed generic descriptor for unknown categories and malformed errors", () => {
    const unknownCategory = mapOperationalError(
      errorWithCode("rate_limit"),
      "other" as OperationalErrorCategory,
    );

    expect(unknownCategory).toEqual(genericDescriptor());
    expect(mapOperationalError(null, "storage")).toEqual(genericDescriptor());
    expect(mapOperationalError("invalid_input", "storage")).toEqual(genericDescriptor());
    expect(mapOperationalError({}, "storage")).toEqual(genericDescriptor());
    expect(mapOperationalError(errorWithCode("auth"), "storage")).toEqual(genericDescriptor());
    expect(mapOperationalError(errorWithCode("invalid_input"), "provider")).toEqual(
      genericDescriptor(),
    );
  });

  it("requires an own data descriptor for code and never invokes an accessor", () => {
    let codeGetterCalls = 0;
    const accessorCode = Object.create(null) as object;
    Object.defineProperty(accessorCode, "code", {
      get() {
        codeGetterCalls += 1;
        return "invalid_input";
      },
    });

    expect(mapOperationalError(accessorCode, "storage")).toEqual(genericDescriptor());
    expect(mapOperationalError(Object.create({ code: "invalid_input" }), "storage")).toEqual(
      genericDescriptor(),
    );
    expect(codeGetterCalls).toBe(0);
  });

  it("ignores an accessor-backed retry delay without invoking it", () => {
    let retryGetterCalls = 0;
    const error = errorWithCode("rate_limit");
    Object.defineProperty(error, "retryAfterSeconds", {
      get() {
        retryGetterCalls += 1;
        return 30;
      },
    });

    expect(mapOperationalError(error, "provider")).toEqual({
      titleKey: "errors.provider.rate_limit.title",
      explanationKey: "errors.provider.rate_limit.explanation",
      recoveryActions: ["retry"],
    });
    expect(retryGetterCalls).toBe(0);
  });

  it("does not inspect message, cause, stack, retryable, custom fields or toJSON", () => {
    const getterCalls: string[] = [];
    const error = errorWithCode("network", { retryAfterSeconds: 5 });
    for (const key of ["message", "cause", "stack", "retryable", "privatePayload", "toJSON"]) {
      Object.defineProperty(error, key, {
        configurable: true,
        get() {
          getterCalls.push(key);
          return `SYNTHETIC_${key.toUpperCase()}_SECRET`;
        },
      });
    }

    const descriptor = mapOperationalError(error, "provider");
    const serialized = JSON.stringify(descriptor);

    expect(descriptor.retry).toEqual({ afterSeconds: 5 });
    expect(getterCalls).toEqual([]);
    expect(serialized).not.toContain("SYNTHETIC_");
    expect(serialized).not.toContain("privatePayload");
  });

  it("fails closed when an own-property reflection trap throws", () => {
    const hostile = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error("SYNTHETIC_PROXY_FAILURE");
        },
      },
    );

    expect(mapOperationalError(hostile, "storage")).toEqual(genericDescriptor());
  });

  it("returns deeply immutable descriptors and action lists", () => {
    const descriptor = mapOperationalError(
      errorWithCode("rate_limit", { retryAfterSeconds: 12 }),
      "provider",
    );

    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(descriptor.recoveryActions)).toBe(true);
    expect(Object.isFrozen(descriptor.retry)).toBe(true);
    expect(() => (descriptor.recoveryActions as string[]).push("copy_diagnostics")).toThrow();
  });

  it("never returns raw error text, causes or stacks in its generic fallback", () => {
    const error = errorWithCode("not_a_known_code", {
      message: "SYNTHETIC_RAW_ERROR_MESSAGE",
      cause: "SYNTHETIC_RAW_CAUSE",
      stack: "SYNTHETIC_RAW_STACK",
    });

    expect(JSON.stringify(mapOperationalError(error, "provider"))).not.toMatch(/SYNTHETIC_RAW/);
    expect(mapOperationalError(error, "provider")).toEqual(genericDescriptor());
  });
});
