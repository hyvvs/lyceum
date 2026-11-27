import type { StorageErrorCode } from "./storage";

/** Canonical severity levels, ordered from most to least severe. */
export const LOG_LEVELS = Object.freeze(["error", "warn", "info", "debug"] as const);
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Stable, content-free operational event identifiers. */
export const DIAGNOSTIC_EVENT_CODES = Object.freeze([
  "operation.failed",
  "operation.cancelled",
  "operation.retry_scheduled",
  "provider.request.failed",
  "storage.operation.failed",
] as const);
export type DiagnosticEventCode = (typeof DIAGNOSTIC_EVENT_CODES)[number];

/** Approved subsystem identifiers; never use a learner or provider name here. */
export const DIAGNOSTIC_COMPONENTS = Object.freeze([
  "core",
  "gateway",
  "storage",
  "application",
  "ui",
  "worker",
] as const);
export type DiagnosticComponent = (typeof DIAGNOSTIC_COMPONENTS)[number];

/** Small, approved operation vocabulary for structured metadata. */
export const DIAGNOSTIC_OPERATIONS = Object.freeze([
  "initialize",
  "read",
  "write",
  "request",
  "parse",
  "validate",
  "retry",
  "shutdown",
] as const);
export type DiagnosticOperation = (typeof DIAGNOSTIC_OPERATIONS)[number];

/** Normalized provider failures; deliberately independent of gateway types. */
export const NORMALIZED_PROVIDER_ERROR_CODES = Object.freeze([
  "auth",
  "rate_limit",
  "context_length",
  "network",
  "invalid_request",
  "unsupported",
  "provider",
  "aborted",
] as const);
export type NormalizedProviderErrorCode = (typeof NORMALIZED_PROVIDER_ERROR_CODES)[number];

/** Error codes are identifiers only; raw error text is never diagnostic metadata. */
export type DiagnosticErrorCode = StorageErrorCode | NormalizedProviderErrorCode;

/**
 * The complete metadata allowlist. Values are fixed enums, booleans or bounded
 * numbers; arbitrary strings, nested objects and content-bearing fields are not
 * part of the Logger contract.
 */
export interface DiagnosticMetadata {
  readonly operation?: DiagnosticOperation;
  readonly errorCode?: DiagnosticErrorCode;
  readonly retryable?: boolean;
  /** HTTP status only (100–599); never a response body or header. */
  readonly statusCode?: number;
  /** Attempt number, 1–100. */
  readonly attempt?: number;
  /** Duration in milliseconds, 0–86,400,000. */
  readonly durationMs?: number;
  /** Bounded item count, 0–100,000. */
  readonly itemCount?: number;
}

/** Caller input for one content-free operational diagnostic. */
export interface DiagnosticInput {
  readonly level: LogLevel;
  readonly eventCode: DiagnosticEventCode;
  readonly component?: DiagnosticComponent;
  readonly metadata?: DiagnosticMetadata;
}

/** Immutable record stored by a diagnostics implementation. */
export interface DiagnosticRecord extends DiagnosticInput {
  /** ISO-8601 UTC timestamp from an injected Clock. */
  readonly timestamp: string;
}

/** Result of a write; logging failures never propagate into the core operation. */
export type DiagnosticWriteResult = "recorded" | "filtered" | "rejected";

/** Subject-agnostic logging port. Implementations must enforce the privacy boundary. */
export interface Logger {
  log(record: DiagnosticInput): DiagnosticWriteResult;
}

/** Immutable no-op implementation for consumers that do not need diagnostics. */
export const NOOP_LOGGER: Logger = Object.freeze({
  log: (): DiagnosticWriteResult => "filtered",
});
