# ADR-0011: Content-free operational diagnostics

- Status: accepted
- Date: 2026-11-27
- Accepted: 2026-11-27
- Deciders: Lyceum project owner (explicit Independent Audit acceptance of M0-013 and ADR-0011)

The owner **ACCEPTED ADR-0011 on 2026-11-27** after independent review of the actual Logger, sanitizer, buffer, error mapping, captured-log regressions, Proxy corrections, and exact-head hosted CI on PR #28. Acceptance preserves the stronger content-free policy, production debug restrictions, immutable in-memory snapshots, and the documented trusted-JavaScript/Proxy boundary. It does not authorize production diagnostics wiring, persistence, telemetry, app/UI integration, learner data, or release.

## Context

`docs/14-engineering-standards.md` §§4–5 require a central error-to-message mapper, structured leveled logging and a local diagnostics foundation. `docs/16-security-privacy.md` §§1–3 requires minimum necessary local handling, no hidden telemetry, keys never in logs/errors/exports, and diagnostics local unless the learner chooses to copy. `AGENTS.md` further prohibits logging keys and requires production debug off. The M0-013 owner authorization adopts a stronger rule: credentials must never enter diagnostic output at any level, and raw learner content is not accepted by the default logger or snapshot at any level.

Free-form messages and nested arbitrary objects cannot be reliably secret-classified or anonymized with regular expressions. Existing `GatewayError.message` may include provider response text; `StorageError` has a typed code, but consumers may still receive malformed or hostile error objects. Core must remain deterministic, subject-agnostic and independent of gateway/storage implementations.

## Options considered

1. **Free-form structured messages plus regex redaction:** flexible, but arbitrary prompt/answer/provider-body/credential content can be missed, including new fields and URL/path representations. Rejected as the primary privacy boundary.
2. **Recursive generic JSON sanitizer:** supports nested structures, but adds traversal/cycle/size/accessor complexity and still risks future fields becoming accidental content channels. Rejected for this foundation.
3. **Fixed content-free event and metadata allowlist (chosen):** accept only stable event/component/operation/error-code enums, booleans and bounded numeric metadata. Omit unsupported fields and reject invalid allowlisted values before buffering. No free-form message, URL, path, source, prompt, response, answer, arbitrary error, or nested object is representable.

## Decision

The M0-013 core logger uses `error`, `warn`, `info` and `debug` levels and a fixed structured record contract. A structural sanitizer reads only own data-property descriptors for a fixed list of approved fields; it does not invoke ordinary getters, serialize input objects, recurse into nested objects or mutate caller input. Unsupported fields are omitted. Invalid approved fields reject the record. Reflection exceptions fail closed. This is not a sandbox for arbitrary JavaScript or Proxy traps.

The default minimum level is `info` and default environment is `production`; debug is disabled by default and production configuration rejects a debug threshold. Any explicitly enabled development/test debug record crosses the same content-free validation boundary.

The local diagnostics implementation uses an injected existing `Clock` and a fixed-capacity in-memory ring buffer (default 100 records, maximum 1,000), evicts the oldest record deterministically, and exposes a version-1 immutable snapshot containing only sanitized records. It has no persistence, network, telemetry, clipboard, upload, provider-health polling, production panel or global mutable singleton.

Central error mapping accepts a consumer-supplied normalized category (`storage`, `provider`, `unknown`) and inspects only own data descriptors for the approved code and bounded retry delay. It never reads raw error messages, causes, stacks, arbitrary custom fields or `toJSON`. It returns typed localization keys and recovery-action identifiers, not English presentation or executable callbacks. Unknown errors receive a fixed generic descriptor with a `copy_diagnostics` action.

### Future consumer resolution example

The later application consumer resolves message keys through the established i18next/ICU translator and maps each recovery identifier through an application-owned action registry. The core descriptor remains data-only:

```ts
const descriptor = mapOperationalError(error, category);
const title = t(descriptor.titleKey);
const explanation = t(descriptor.explanationKey);
const actions = descriptor.recoveryActions.map((id) => recoveryActionRegistry[id]);
const retryAfterSeconds = descriptor.retry?.afterSeconds;
```

`recoveryActionRegistry` owns labels and callbacks at the application boundary; neither callbacks nor translated presentation are stored in the core descriptor. This is an integration example only, not authorization for M0-015, app wiring or UI work in M0-013.

## Consequences

- Secrets and learner content are structurally excluded at every level rather than redacted after capture. Synthetic key-pattern scans remain defense-in-depth regressions, not proof that arbitrary text can be anonymized.
- The schema is intentionally less expressive than free-form logging. New metadata requires an explicit allowlist/type/test change.
- Clock failures or malformed records are rejected without affecting the core operation; configuration errors are rejected at factory creation.
- Snapshot consumers may later resolve typed keys through the established i18next/ICU localization architecture and map action IDs to application-owned actions. This ADR does not authorize an app package, UI, persistence or diagnostic transmission.
- Reflection on a Proxy may execute its traps; this API is not an arbitrary-JavaScript sandbox. Reflection exceptions are caught and rejected.

Revisit only when a concrete, separately authorized application consumer needs a new bounded metadata field or diagnostics integration. Do not relax the content-free boundary by adding arbitrary text or nested error serialization.
