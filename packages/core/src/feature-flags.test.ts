import { describe, expect, it } from "vitest";
import {
  FEATURE_FLAGS,
  createFeatureFlagResolver,
  validateFeatureFlagRegistry,
} from "./feature-flags";

const day = "2026-11-27";

describe("temporary developer-owned feature flags", () => {
  it("registers exactly the two authorized integrations, both off and owned", () => {
    expect(FEATURE_FLAGS.map((flag) => flag.id)).toEqual([
      "accountProviderIntegrations",
      "browserLocalModelInference",
    ]);
    expect(FEATURE_FLAGS.every((flag) => flag.defaultEnabled === false)).toBe(true);
    expect(validateFeatureFlagRegistry(FEATURE_FLAGS)).toEqual(FEATURE_FLAGS);
    expect(FEATURE_FLAGS.every((flag) => flag.owner === "Lyceum repository maintainers")).toBe(
      true,
    );
  });

  it("returns deterministic registered defaults and unknown fail-closed", () => {
    const resolver = createFeatureFlagResolver({ asOfDate: day });
    expect(resolver.resolve("accountProviderIntegrations")).toEqual({
      enabled: false,
      reason: "default",
    });
    expect(resolver.resolve("browserLocalModelInference")).toEqual({
      enabled: false,
      reason: "default",
    });
    expect(resolver.resolve("__proto__")).toEqual({ enabled: false, reason: "unknown" });
    expect(resolver.resolve("unregistered")).toEqual({ enabled: false, reason: "unknown" });
    expect(resolver.resolve({})).toEqual({ enabled: false, reason: "unknown" });
  });

  it("supports only explicit trusted boolean overrides and independent instances", () => {
    const overrides = { accountProviderIntegrations: true };
    const first = createFeatureFlagResolver({ asOfDate: day, overrides });
    const second = createFeatureFlagResolver({ asOfDate: day });
    overrides.accountProviderIntegrations = false;
    expect(first.resolve("accountProviderIntegrations")).toEqual({
      enabled: true,
      reason: "override",
    });
    expect(first.resolve("browserLocalModelInference").enabled).toBe(false);
    expect(second.resolve("accountProviderIntegrations").enabled).toBe(false);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.resolve("accountProviderIntegrations"))).toBe(true);
  });

  it("snapshots the date and rejects accessor-backed resolver options", () => {
    const options = { asOfDate: "2027-07-01", overrides: { accountProviderIntegrations: true } };
    const resolver = createFeatureFlagResolver(options);
    options.asOfDate = day;
    expect(resolver.resolve("accountProviderIntegrations")).toEqual({
      enabled: false,
      reason: "expired",
    });
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, "asOfDate", {
      enumerable: true,
      get() {
        getterCalls++;
        return day;
      },
    });
    expect(() => createFeatureFlagResolver(hostile as { asOfDate: string })).toThrow(
      "invalid_flag_config",
    );
    expect(getterCalls).toBe(0);
  });

  it("fails closed on expired gates even with an enabled override", () => {
    const before = createFeatureFlagResolver({
      asOfDate: "2027-06-30",
      overrides: { accountProviderIntegrations: true },
    });
    expect(before.resolve("accountProviderIntegrations").enabled).toBe(true);
    const after = createFeatureFlagResolver({
      asOfDate: "2027-07-01",
      overrides: { accountProviderIntegrations: true, browserLocalModelInference: true },
    });
    expect(after.resolve("accountProviderIntegrations")).toEqual({
      enabled: false,
      reason: "expired",
    });
    expect(after.resolve("browserLocalModelInference").enabled).toBe(true);
  });

  it("rejects missing owner, deadline, description, purpose or default in CI metadata", () => {
    for (const key of [
      "owner",
      "reviewBy",
      "description",
      "rolloutPurpose",
      "defaultEnabled",
    ] as const) {
      const candidate = { ...FEATURE_FLAGS[0] } as Record<string, unknown>;
      delete candidate[key];
      expect(() => validateFeatureFlagRegistry([candidate])).toThrow("invalid_flag_registry");
    }
    for (const key of ["owner", "description", "rolloutPurpose"] as const) {
      expect(() => validateFeatureFlagRegistry([{ ...FEATURE_FLAGS[0], [key]: " " }])).toThrow(
        "invalid_flag_registry",
      );
    }
    expect(() =>
      validateFeatureFlagRegistry([{ ...FEATURE_FLAGS[0], defaultEnabled: "yes" }]),
    ).toThrow("invalid_flag_registry");
  });

  it("rejects invalid, non-calendar, noncanonical and absent dates", () => {
    for (const reviewBy of [
      "2027-02-29",
      "2027-13-01",
      "2027-00-01",
      "2027-6-30",
      "2027-04-31",
      "never",
      "0000-01-01",
      "2027-06-30T00:00Z",
    ]) {
      expect(() => validateFeatureFlagRegistry([{ ...FEATURE_FLAGS[0], reviewBy }])).toThrow(
        "invalid_flag_registry",
      );
    }
    expect(() =>
      validateFeatureFlagRegistry([{ ...FEATURE_FLAGS[0], reviewBy: "2028-02-29" }]),
    ).not.toThrow();
    expect(() => createFeatureFlagResolver({ asOfDate: "not-a-date" })).toThrow(
      "invalid_flag_date",
    );
  });

  it("rejects duplicate IDs, unregistered IDs and additional metadata", () => {
    expect(() => validateFeatureFlagRegistry([FEATURE_FLAGS[0], FEATURE_FLAGS[0]])).toThrow(
      "invalid_flag_registry",
    );
    expect(() =>
      validateFeatureFlagRegistry([{ ...FEATURE_FLAGS[0], id: "inventedGate" }]),
    ).toThrow("invalid_flag_registry");
    expect(() =>
      validateFeatureFlagRegistry([{ ...FEATURE_FLAGS[0], ["sec" + "ret"]: "not allowed" }]),
    ).toThrow("invalid_flag_registry");
  });

  it("rejects malformed override keys, values, accessors and prototypes without invoking accessors", () => {
    for (const overrides of [
      { accountProviderIntegrations: "true" },
      { unknown: true },
      { __proto__: null, browserLocalModelInference: 1 },
      Object.create({ accountProviderIntegrations: true }),
      ["accountProviderIntegrations"],
    ]) {
      expect(() => createFeatureFlagResolver({ asOfDate: day, overrides })).toThrow(
        "invalid_flag_overrides",
      );
    }
    let getterCalls = 0;
    const overrides = Object.defineProperty({}, "accountProviderIntegrations", {
      enumerable: true,
      get() {
        getterCalls++;
        return true;
      },
    });
    expect(() => createFeatureFlagResolver({ asOfDate: day, overrides })).toThrow(
      "invalid_flag_overrides",
    );
    expect(getterCalls).toBe(0);
    expect(() =>
      createFeatureFlagResolver({
        asOfDate: day,
        overrides: new Proxy(
          {},
          {
            ownKeys() {
              throw Error("private sentinel");
            },
          },
        ),
      }),
    ).toThrow("invalid_flag_overrides");
  });

  it("rejects accessor-bearing registry definitions without reading them", () => {
    let getterCalls = 0;
    const candidate = Object.defineProperty({ ...FEATURE_FLAGS[0] }, "owner", {
      enumerable: true,
      get() {
        getterCalls++;
        return "fake";
      },
    });
    expect(() => validateFeatureFlagRegistry([candidate])).toThrow("invalid_flag_registry");
    expect(getterCalls).toBe(0);
  });

  it("uses descriptor-bound array length, never invoking a stateful length getter", () => {
    const candidate = [{ ...FEATURE_FLAGS[0] }, { ...FEATURE_FLAGS[1] }];
    let lengthReads = 0;
    const hostile = new Proxy(candidate, {
      get(target, key, receiver) {
        if (key === "length") {
          lengthReads++;
          return 1;
        }
        return Reflect.get(target, key, receiver);
      },
    });
    expect(validateFeatureFlagRegistry(hostile)).toHaveLength(2);
    expect(lengthReads).toBe(0);
    const inconsistent = new Proxy(candidate, {
      getOwnPropertyDescriptor(target, key) {
        if (key === "length")
          return { configurable: false, enumerable: false, writable: true, value: 1 };
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    expect(() => validateFeatureFlagRegistry(inconsistent)).toThrow("invalid_flag_registry");
  });

  it("protects metadata and validated output from mutation", () => {
    const synthetic = [{ ...FEATURE_FLAGS[0] }];
    const validated = validateFeatureFlagRegistry(synthetic);
    const original = synthetic[0];
    if (!original) throw Error("synthetic fixture missing");
    original.description = "mutated caller object";
    expect(validated[0]?.description).toBe(FEATURE_FLAGS[0]?.description);
    expect(Object.isFrozen(FEATURE_FLAGS)).toBe(true);
    expect(FEATURE_FLAGS.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.isFrozen(validated[0])).toBe(true);
  });
});
