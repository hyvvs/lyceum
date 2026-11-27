import type { NormalizedProviderErrorCode } from "./logger";
import type { StorageErrorCode } from "./storage";

export type OperationalErrorCategory = "storage" | "provider" | "unknown";

export type RecoveryActionId =
  | "retry"
  | "check_connection"
  | "review_provider_settings"
  | "reduce_request"
  | "review_request"
  | "choose_supported_option"
  | "refresh_data"
  | "review_input"
  | "restart_operation"
  | "copy_diagnostics";

type MessagePart = "title" | "explanation";

/** Dotted localization keys; the application owns all translated presentation. */
export type ErrorMessageKey =
  | `errors.storage.${StorageErrorCode}.${MessagePart}`
  | `errors.provider.${NormalizedProviderErrorCode}.${MessagePart}`
  | `errors.unknown.${MessagePart}`;

export interface RetryGuidance {
  readonly afterSeconds?: number;
}

export interface ErrorMessageDescriptor {
  readonly titleKey: ErrorMessageKey;
  readonly explanationKey: ErrorMessageKey;
  readonly recoveryActions: readonly RecoveryActionId[];
  readonly retry?: RetryGuidance;
}

interface StaticDescriptor {
  readonly titleKey: ErrorMessageKey;
  readonly explanationKey: ErrorMessageKey;
  readonly recoveryActions: readonly RecoveryActionId[];
}

function createDescriptor(
  category: "storage" | "provider" | "unknown",
  code: StorageErrorCode | NormalizedProviderErrorCode | "unknown",
  recoveryActions: readonly RecoveryActionId[],
): StaticDescriptor {
  if (category === "unknown") {
    return Object.freeze({
      titleKey: "errors.unknown.title",
      explanationKey: "errors.unknown.explanation",
      recoveryActions: Object.freeze([...recoveryActions]),
    });
  }

  return Object.freeze({
    titleKey: `errors.${category}.${code}.title` as ErrorMessageKey,
    explanationKey: `errors.${category}.${code}.explanation` as ErrorMessageKey,
    recoveryActions: Object.freeze([...recoveryActions]),
  });
}

const STORAGE_DESCRIPTORS: Readonly<Record<StorageErrorCode, StaticDescriptor>> = Object.freeze({
  invalid_input: createDescriptor("storage", "invalid_input", ["review_input"]),
  invalid_event: createDescriptor("storage", "invalid_event", ["review_input"]),
  invalid_json: createDescriptor("storage", "invalid_json", ["refresh_data"]),
  conflict: createDescriptor("storage", "conflict", ["refresh_data"]),
  closed_transaction: createDescriptor("storage", "closed_transaction", ["restart_operation"]),
  nested_transaction: createDescriptor("storage", "nested_transaction", ["restart_operation"]),
  async_transaction: createDescriptor("storage", "async_transaction", ["restart_operation"]),
  transaction_aborted: createDescriptor("storage", "transaction_aborted", ["restart_operation"]),
});

const PROVIDER_DESCRIPTORS: Readonly<Record<NormalizedProviderErrorCode, StaticDescriptor>> =
  Object.freeze({
    auth: createDescriptor("provider", "auth", ["review_provider_settings"]),
    rate_limit: createDescriptor("provider", "rate_limit", ["retry"]),
    context_length: createDescriptor("provider", "context_length", ["reduce_request"]),
    network: createDescriptor("provider", "network", ["check_connection", "retry"]),
    invalid_request: createDescriptor("provider", "invalid_request", ["review_request"]),
    unsupported: createDescriptor("provider", "unsupported", ["choose_supported_option"]),
    provider: createDescriptor("provider", "provider", ["retry"]),
    aborted: createDescriptor("provider", "aborted", ["restart_operation"]),
  });

const UNKNOWN_DESCRIPTOR = createDescriptor("unknown", "unknown", ["copy_diagnostics"]);
const RETRYABLE_PROVIDER_CODES: readonly NormalizedProviderErrorCode[] = Object.freeze([
  "rate_limit",
  "network",
  "provider",
]);

type OwnDataProperty =
  | { readonly kind: "missing" }
  | { readonly kind: "data"; readonly value: unknown }
  | { readonly kind: "accessor" }
  | { readonly kind: "reflection_error" };

/** Read one approved own data property without invoking ordinary accessors. */
function readOwnDataProperty(record: object, key: string): OwnDataProperty {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined) return { kind: "missing" };
    if (!("value" in descriptor)) return { kind: "accessor" };
    return { kind: "data", value: descriptor.value };
  } catch {
    return { kind: "reflection_error" };
  }
}

function isStorageErrorCode(value: unknown): value is StorageErrorCode {
  return typeof value === "string" && Object.hasOwn(STORAGE_DESCRIPTORS, value);
}

function isProviderErrorCode(value: unknown): value is NormalizedProviderErrorCode {
  return typeof value === "string" && Object.hasOwn(PROVIDER_DESCRIPTORS, value);
}

function isRetryableProviderCode(code: NormalizedProviderErrorCode): boolean {
  return RETRYABLE_PROVIDER_CODES.includes(code);
}

function withRetryGuidance(
  descriptor: StaticDescriptor,
  afterSeconds: number,
): ErrorMessageDescriptor {
  return Object.freeze({
    ...descriptor,
    retry: Object.freeze({ afterSeconds }),
  });
}

/**
 * Map only normalized own error codes. Raw exception text and all unapproved
 * properties are deliberately outside this API's observable output.
 */
export function mapOperationalError(
  error: unknown,
  category: OperationalErrorCategory,
): ErrorMessageDescriptor {
  if (category === "unknown") return UNKNOWN_DESCRIPTOR;
  if (category !== "storage" && category !== "provider") return UNKNOWN_DESCRIPTOR;
  if (typeof error !== "object" || error === null) return UNKNOWN_DESCRIPTOR;

  const codeProperty = readOwnDataProperty(error, "code");
  if (codeProperty.kind !== "data") return UNKNOWN_DESCRIPTOR;

  if (category === "storage") {
    if (!isStorageErrorCode(codeProperty.value)) return UNKNOWN_DESCRIPTOR;
    return STORAGE_DESCRIPTORS[codeProperty.value];
  }

  if (!isProviderErrorCode(codeProperty.value)) return UNKNOWN_DESCRIPTOR;
  const descriptor = PROVIDER_DESCRIPTORS[codeProperty.value];
  if (!isRetryableProviderCode(codeProperty.value)) return descriptor;

  const retryAfterProperty = readOwnDataProperty(error, "retryAfterSeconds");
  if (retryAfterProperty.kind === "reflection_error") return UNKNOWN_DESCRIPTOR;
  if (
    retryAfterProperty.kind !== "data" ||
    typeof retryAfterProperty.value !== "number" ||
    !Number.isSafeInteger(retryAfterProperty.value) ||
    retryAfterProperty.value < 1 ||
    retryAfterProperty.value > 3_600
  ) {
    return descriptor;
  }

  return withRetryGuidance(descriptor, retryAfterProperty.value);
}
