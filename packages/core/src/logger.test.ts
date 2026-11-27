import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_EVENT_CODES,
  type DiagnosticInput,
  LOG_LEVELS,
  type Logger,
  NOOP_LOGGER,
} from "./logger";

describe("Logger port", () => {
  it("exposes the four canonical immutable levels and stable event codes", () => {
    expect(LOG_LEVELS).toEqual(["error", "warn", "info", "debug"]);
    expect(Object.isFrozen(LOG_LEVELS)).toBe(true);
    expect(DIAGNOSTIC_EVENT_CODES).toContain("operation.failed");
    expect(Object.isFrozen(DIAGNOSTIC_EVENT_CODES)).toBe(true);
  });

  it("supports an explicitly structured, content-free record contract", () => {
    const record: DiagnosticInput = {
      level: "info",
      eventCode: "storage.operation.failed",
      component: "storage",
      metadata: {
        operation: "read",
        errorCode: "invalid_json",
        retryable: false,
        statusCode: 503,
        attempt: 1,
        durationMs: 25,
        itemCount: 1,
      },
    };
    const logger: Logger = NOOP_LOGGER;

    expect(logger.log(record)).toBe("filtered");
  });

  it("provides an immutable no-op logger that does not inspect records", () => {
    const record = new Proxy(
      {},
      {
        get() {
          throw new Error("the no-op logger must not inspect input");
        },
        getOwnPropertyDescriptor() {
          throw new Error("the no-op logger must not inspect descriptors");
        },
      },
    );

    expect(Object.isFrozen(NOOP_LOGGER)).toBe(true);
    expect(NOOP_LOGGER.log(record as DiagnosticInput)).toBe("filtered");
  });
});
