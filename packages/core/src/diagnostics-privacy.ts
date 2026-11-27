import {
  DIAGNOSTIC_COMPONENTS,
  DIAGNOSTIC_EVENT_CODES,
  DIAGNOSTIC_OPERATIONS,
  type DiagnosticComponent,
  type DiagnosticErrorCode,
  type DiagnosticEventCode,
  type DiagnosticInput,
  type DiagnosticMetadata,
  type DiagnosticOperation,
  LOG_LEVELS,
  type LogLevel,
  NORMALIZED_PROVIDER_ERROR_CODES,
} from "./logger";
import type { StorageErrorCode } from "./storage";

export type DiagnosticSanitizationFailure = "invalid_record" | "invalid_metadata" | "invalid_value";

export type DiagnosticSanitizationResult =
  | { readonly ok: true; readonly value: DiagnosticInput }
  | { readonly ok: false; readonly reason: DiagnosticSanitizationFailure };

const STORAGE_ERROR_CODES = Object.freeze([
  "invalid_input",
  "invalid_event",
  "invalid_json",
  "conflict",
  "closed_transaction",
  "nested_transaction",
  "async_transaction",
  "transaction_aborted",
] as const satisfies readonly StorageErrorCode[]);

type DataProperty =
  | { readonly kind: "missing" }
  | { readonly kind: "data"; readonly value: unknown }
  | { readonly kind: "accessor" }
  | { readonly kind: "reflection_error" };

function isPlainRecord(value: unknown): value is object {
  if (typeof value !== "object" || value === null) return false;

  try {
    if (Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

/** Reads a fixed own property without invoking an ordinary getter. */
function readOwnDataProperty(record: object, key: string): DataProperty {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined) return { kind: "missing" };
    if (!("value" in descriptor)) return { kind: "accessor" };
    return { kind: "data", value: descriptor.value };
  } catch {
    return { kind: "reflection_error" };
  }
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function isDiagnosticErrorCode(value: unknown): value is DiagnosticErrorCode {
  return isOneOf(value, STORAGE_ERROR_CODES) || isOneOf(value, NORMALIZED_PROVIDER_ERROR_CODES);
}

function isBoundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

function failure(reason: DiagnosticSanitizationFailure): DiagnosticSanitizationResult {
  return Object.freeze({ ok: false, reason });
}

/**
 * Structural minimization for diagnostic input. This is deliberately not a
 * generic text redactor: only fixed enums, booleans and bounded integers cross
 * the boundary. Unknown fields are never enumerated or read.
 */
export function sanitizeDiagnosticInput(input: unknown): DiagnosticSanitizationResult {
  if (!isPlainRecord(input)) return failure("invalid_record");

  const levelProperty = readOwnDataProperty(input, "level");
  const eventCodeProperty = readOwnDataProperty(input, "eventCode");
  if (levelProperty.kind !== "data" || eventCodeProperty.kind !== "data") {
    return failure("invalid_record");
  }
  if (!isOneOf(levelProperty.value, LOG_LEVELS)) return failure("invalid_value");
  if (!isOneOf(eventCodeProperty.value, DIAGNOSTIC_EVENT_CODES)) {
    return failure("invalid_value");
  }

  const result: {
    level: LogLevel;
    eventCode: DiagnosticEventCode;
    component?: DiagnosticComponent;
    metadata?: DiagnosticMetadata;
  } = {
    level: levelProperty.value,
    eventCode: eventCodeProperty.value,
  };

  const componentProperty = readOwnDataProperty(input, "component");
  if (componentProperty.kind === "accessor" || componentProperty.kind === "reflection_error") {
    return failure("invalid_record");
  }
  if (componentProperty.kind === "data") {
    if (!isOneOf(componentProperty.value, DIAGNOSTIC_COMPONENTS)) {
      return failure("invalid_value");
    }
    result.component = componentProperty.value;
  }

  const metadataProperty = readOwnDataProperty(input, "metadata");
  if (metadataProperty.kind === "accessor" || metadataProperty.kind === "reflection_error") {
    return failure("invalid_record");
  }
  if (metadataProperty.kind === "data") {
    if (!isPlainRecord(metadataProperty.value)) return failure("invalid_metadata");

    const metadata: {
      operation?: DiagnosticOperation;
      errorCode?: DiagnosticErrorCode;
      retryable?: boolean;
      statusCode?: number;
      attempt?: number;
      durationMs?: number;
      itemCount?: number;
    } = {};

    const operation = readOwnDataProperty(metadataProperty.value, "operation");
    if (operation.kind === "accessor" || operation.kind === "reflection_error") {
      return failure("invalid_metadata");
    }
    if (operation.kind === "data") {
      if (!isOneOf(operation.value, DIAGNOSTIC_OPERATIONS)) return failure("invalid_value");
      metadata.operation = operation.value;
    }

    const errorCode = readOwnDataProperty(metadataProperty.value, "errorCode");
    if (errorCode.kind === "accessor" || errorCode.kind === "reflection_error") {
      return failure("invalid_metadata");
    }
    if (errorCode.kind === "data") {
      if (!isDiagnosticErrorCode(errorCode.value)) return failure("invalid_value");
      metadata.errorCode = errorCode.value;
    }

    const retryable = readOwnDataProperty(metadataProperty.value, "retryable");
    if (retryable.kind === "accessor" || retryable.kind === "reflection_error") {
      return failure("invalid_metadata");
    }
    if (retryable.kind === "data") {
      if (typeof retryable.value !== "boolean") return failure("invalid_value");
      metadata.retryable = retryable.value;
    }

    const statusCode = readOwnDataProperty(metadataProperty.value, "statusCode");
    if (statusCode.kind === "accessor" || statusCode.kind === "reflection_error") {
      return failure("invalid_metadata");
    }
    if (statusCode.kind === "data") {
      if (!isBoundedInteger(statusCode.value, 100, 599)) return failure("invalid_value");
      metadata.statusCode = statusCode.value;
    }

    const attempt = readOwnDataProperty(metadataProperty.value, "attempt");
    if (attempt.kind === "accessor" || attempt.kind === "reflection_error") {
      return failure("invalid_metadata");
    }
    if (attempt.kind === "data") {
      if (!isBoundedInteger(attempt.value, 1, 100)) return failure("invalid_value");
      metadata.attempt = attempt.value;
    }

    const durationMs = readOwnDataProperty(metadataProperty.value, "durationMs");
    if (durationMs.kind === "accessor" || durationMs.kind === "reflection_error") {
      return failure("invalid_metadata");
    }
    if (durationMs.kind === "data") {
      if (!isBoundedInteger(durationMs.value, 0, 86_400_000)) {
        return failure("invalid_value");
      }
      metadata.durationMs = durationMs.value;
    }

    const itemCount = readOwnDataProperty(metadataProperty.value, "itemCount");
    if (itemCount.kind === "accessor" || itemCount.kind === "reflection_error") {
      return failure("invalid_metadata");
    }
    if (itemCount.kind === "data") {
      if (!isBoundedInteger(itemCount.value, 0, 100_000)) return failure("invalid_value");
      metadata.itemCount = itemCount.value;
    }

    if (Object.keys(metadata).length > 0) result.metadata = Object.freeze(metadata);
  }

  return Object.freeze({ ok: true, value: Object.freeze(result) });
}
