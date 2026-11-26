import { StorageError, type StorageErrorCode } from "@lyceum/core";

const CODES: ReadonlySet<string> = new Set([
  "invalid_input",
  "invalid_event",
  "invalid_json",
  "conflict",
  "closed_transaction",
  "nested_transaction",
  "async_transaction",
  "transaction_aborted",
]);

/**
 * Exception values are untrusted, even when they inherit from StorageError.
 * Construct a new error with a fixed allowlisted code and message; never
 * propagate a caller-controlled .message, .stack, .cause or custom properties.
 */
export function safeStorageError(error: unknown, fallback: StorageErrorCode): StorageError {
  let code = fallback;
  try {
    if (error instanceof StorageError) {
      // Never invoke an accessor-backed .code supplied by caller JavaScript.
      const descriptor = Object.getOwnPropertyDescriptor(error, "code");
      const candidate: unknown = descriptor && "value" in descriptor ? descriptor.value : null;
      if (typeof candidate === "string" && CODES.has(candidate)) {
        code = candidate as StorageErrorCode;
      }
    }
  } catch {
    // A hostile Proxy can throw in instanceof or property access.
  }
  return new StorageError(code);
}
