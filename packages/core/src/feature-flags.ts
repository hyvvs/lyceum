/** Temporary, local engineering gates. A flag is not a permission or consent. */
export type FeatureFlagId = "accountProviderIntegrations" | "browserLocalModelInference";

export interface FeatureFlagDefinition {
  readonly id: FeatureFlagId;
  readonly description: string;
  readonly owner: string;
  readonly rolloutPurpose: string;
  readonly defaultEnabled: boolean;
  /** Inclusive UTC calendar day for mandatory review/removal, not auto-enablement. */
  readonly reviewBy: string;
}

/** Review dates are temporary planning assumptions, not launch commitments. */
export const FEATURE_FLAGS: readonly FeatureFlagDefinition[] = Object.freeze([
  Object.freeze({
    id: "accountProviderIntegrations",
    description: "Future official account-based provider adapter integration gate",
    owner: "Lyceum repository maintainers",
    rolloutPurpose: "Reassess official documented access and approved adapter prerequisites",
    defaultEnabled: false,
    reviewBy: "2027-06-30",
  }),
  Object.freeze({
    id: "browserLocalModelInference",
    description: "Future experimental browser-local inference runtime integration gate",
    owner: "Lyceum repository maintainers",
    rolloutPurpose: "Review experimental browser runtime readiness before a rollout",
    defaultEnabled: false,
    reviewBy: "2027-09-30",
  }),
]);

const IDS: ReadonlySet<string> = new Set([
  "accountProviderIntegrations",
  "browserLocalModelInference",
]);
const KEYS = ["id", "description", "owner", "rolloutPurpose", "defaultEnabled", "reviewBy"];

function validDate(input: unknown): input is string {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const year = Number(input.slice(0, 4));
  const month = Number(input.slice(5, 7));
  const day = Number(input.slice(8, 10));
  if (year < 2000 || month < 1 || month > 12) return false;
  const days = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day > 0 && day <= (days[month - 1] ?? 0);
}

/** Own-data extraction: reject accessors and unexpected prototypes, not a JS sandbox. */
function ownData(input: unknown, keys: readonly string[], error: string): Record<string, unknown> {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) throw Error(error);
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) throw Error(error);
    const actual = Reflect.ownKeys(input);
    if (
      actual.length !== keys.length ||
      actual.some((key) => typeof key !== "string" || !keys.includes(key))
    ) {
      throw Error(error);
    }
    const result: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) throw Error(error);
      Object.defineProperty(result, key, { value: descriptor.value, enumerable: true });
    }
    return result;
  } catch {
    throw Error(error);
  }
}

/** Validates all metadata (including duplicate IDs) for CI and test fixtures. */
export function validateFeatureFlagRegistry(input: unknown): readonly FeatureFlagDefinition[] {
  try {
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
      throw Error("invalid_flag_registry");
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
    const length = lengthDescriptor?.value;
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length > 32 || length < 0) {
      throw Error("invalid_flag_registry");
    }
    const keys = Reflect.ownKeys(input);
    if (
      keys.length !== length + 1 ||
      !keys.includes("length") ||
      keys.some(
        (key) =>
          key !== "length" &&
          (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length),
      )
    ) {
      throw Error("invalid_flag_registry");
    }
    const seen = new Set<string>();
    const valid: FeatureFlagDefinition[] = [];
    for (let index = 0; index < length; index++) {
      const slot = Object.getOwnPropertyDescriptor(input, String(index));
      if (!slot?.enumerable || !("value" in slot)) throw Error("invalid_flag_registry");
      const data = ownData(slot.value, KEYS, "invalid_flag_registry");
      if (
        typeof data.id !== "string" ||
        !IDS.has(data.id) ||
        seen.has(data.id) ||
        typeof data.description !== "string" ||
        !data.description.trim() ||
        typeof data.owner !== "string" ||
        !data.owner.trim() ||
        typeof data.rolloutPurpose !== "string" ||
        !data.rolloutPurpose.trim() ||
        typeof data.defaultEnabled !== "boolean" ||
        !validDate(data.reviewBy)
      )
        throw Error("invalid_flag_registry");
      seen.add(data.id);
      valid.push(
        Object.freeze({
          id: data.id as FeatureFlagId,
          description: data.description,
          owner: data.owner,
          rolloutPurpose: data.rolloutPurpose,
          defaultEnabled: data.defaultEnabled,
          reviewBy: data.reviewBy,
        }),
      );
    }
    return Object.freeze(valid);
  } catch {
    throw Error("invalid_flag_registry");
  }
}

export type FlagResolutionReason = "default" | "override" | "expired" | "unknown";
export interface FlagResolution {
  readonly enabled: boolean;
  readonly reason: FlagResolutionReason;
}
export interface FeatureFlagResolver {
  resolve(id: unknown): FlagResolution;
}

/** Fixed UTC day input avoids ambient time and timezone-dependent expiry. */
export function createFeatureFlagResolver(options: {
  readonly asOfDate: string;
  readonly overrides?: unknown;
}): FeatureFlagResolver {
  let asOfDate: unknown;
  let overrideInput: unknown;
  try {
    if (options === null || typeof options !== "object" || Array.isArray(options)) throw Error();
    const prototype = Object.getPrototypeOf(options);
    if (prototype !== Object.prototype && prototype !== null) throw Error();
    const keys = Reflect.ownKeys(options);
    if (keys.some((key) => key !== "asOfDate" && key !== "overrides") || !keys.includes("asOfDate"))
      throw Error();
    const dateDescriptor = Object.getOwnPropertyDescriptor(options, "asOfDate");
    if (!dateDescriptor?.enumerable || !("value" in dateDescriptor)) throw Error();
    asOfDate = dateDescriptor.value;
    if (keys.includes("overrides")) {
      const descriptor = Object.getOwnPropertyDescriptor(options, "overrides");
      if (!descriptor?.enumerable || !("value" in descriptor)) throw Error();
      overrideInput = descriptor.value;
    }
  } catch {
    throw Error("invalid_flag_config");
  }
  if (!validDate(asOfDate)) throw Error("invalid_flag_date");
  const registry = validateFeatureFlagRegistry(FEATURE_FLAGS);
  const overrides = new Map<FeatureFlagId, boolean>();
  if (overrideInput !== undefined) {
    try {
      const input = overrideInput;
      if (input === null || typeof input !== "object" || Array.isArray(input)) throw Error();
      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) throw Error();
      for (const key of Reflect.ownKeys(input)) {
        if (typeof key !== "string" || !IDS.has(key)) throw Error();
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (
          !descriptor?.enumerable ||
          !("value" in descriptor) ||
          typeof descriptor.value !== "boolean"
        )
          throw Error();
        overrides.set(key as FeatureFlagId, descriptor.value);
      }
    } catch {
      throw Error("invalid_flag_overrides");
    }
  }

  return Object.freeze({
    resolve(id: unknown): FlagResolution {
      const definition = registry.find((item) => item.id === id);
      if (!definition) return Object.freeze({ enabled: false, reason: "unknown" });
      if (asOfDate > definition.reviewBy) {
        return Object.freeze({ enabled: false, reason: "expired" });
      }
      if (overrides.has(definition.id)) {
        return Object.freeze({
          enabled: overrides.get(definition.id) ?? false,
          reason: "override",
        });
      }
      return Object.freeze({ enabled: definition.defaultEnabled, reason: "default" });
    },
  });
}
