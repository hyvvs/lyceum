# M0-013 — Content-free diagnostics, structured logging and error mapping

**Owner acceptance (2026-11-27):** M0-013 and ADR-0011 explicitly **ACCEPTED** by independent owner audit. The owner authorized a documentation-only amendment, fresh amended-head three-job CI, controlled PR #28 readiness and normal squash merge, and fresh exact merged-main three-job CI. M0-013 remains `[~]` until that merged-main verification is complete; the completion marker and actual squash/CI evidence will be recorded on the subsequent M0-014 branch pending its publication. No overall M0 completion or release is authorized. Earlier Draft-only references below are historical checkpoints, superseded only by this explicit owner authorization.

## Scope and boundaries

The implementation is confined to `packages/core` and its tests. Core remains subject-agnostic and uses only its existing `Clock` port and `StorageErrorCode` contract. Gateway and storage implementations are not imported. No dependency, app package, UI integration, provider call, network transmission, persistent diagnostics storage, telemetry, learner event schema or learner data was added. All test sentinels are synthetic.

Deferred work remains deferred: production application wiring/localization catalogs, diagnostics-copy UI, persistence policy/configuration, real model and learner-data integration, clipboard/upload, native accessibility certification, M0-014 and later milestones.

## Delivered contracts

### Logger port — `packages/core/src/logger.ts`

- Frozen levels: `error`, `warn`, `info`, `debug`.
- Stable fixed event, component, operation and normalized provider-code vocabularies.
- `DiagnosticMetadata` permits only bounded numeric fields and fixed enum/boolean values; no arbitrary strings or nested data.
- `DiagnosticRecord`, `DiagnosticInput`, `DiagnosticWriteResult` and `Logger` are typed and readonly.
- `NOOP_LOGGER` is immutable and returns `filtered` without inspecting its input.
- Write outcomes are `recorded`, `filtered` and `rejected`.

### Structural privacy boundary — `packages/core/src/diagnostics-privacy.ts`

- Accepts plain and null-prototype records; rejects primitives, arrays, class instances and malformed records.
- Reads approved own data descriptors only; ordinary accessors are not invoked.
- Unknown fields are neither enumerated nor recursively traversed. No `message`, stack, cause, prompt, response, URL, path, credential or arbitrary free text is copied.
- Copies only fixed enum, boolean and bounded integer values; rejects malformed approved fields; freezes sanitized output.
- Reflection failures, including revoked Proxy reflection, fail closed with fixed failure codes.
- Proxy traps can execute caller JavaScript during reflection; this is documented as a boundary limitation, not a sandbox guarantee.

### Bounded diagnostics buffer — `packages/core/src/diagnostics-buffer.ts`

- Per-instance in-memory ring buffer; default capacity 100, maximum 1,000; oldest-first eviction and deterministic insertion order.
- Default minimum level `info`; `debug` requires explicit development/test configuration and is rejected in production configuration.
- Filters severity before metadata sanitization and clock access, then rechecks the sanitized severity before retention to defend against stateful Proxy descriptors.
- Uses the injected `Clock`; invalid/throwing clocks reject a write without changing retained history.
- No singleton, persistence, I/O or transmission. `clear()` empties the instance.
- Version-1 snapshots, records and metadata are immutable; snapshots are independent objects/arrays and contain only sanitized records.

### Typed error mapping — `packages/core/src/error-messages.ts`

Public API: `OperationalErrorCategory`, `RecoveryActionId`, `ErrorMessageKey`, `RetryGuidance`, `ErrorMessageDescriptor` and `mapOperationalError(error, category)`.

The mapper returns localization keys under `errors.storage.*`, `errors.provider.*` or `errors.unknown.*`; it does not contain English copy or callbacks. It reads only an own data descriptor for `code`, and for retryable provider errors only an own data descriptor for `retryAfterSeconds`. It never reads `message`, `cause`, `stack`, `retryable`, arbitrary fields or `toJSON`, and never uses `instanceof`.

All eight existing storage codes are mapped: `invalid_input`, `invalid_event`, `invalid_json`, `conflict`, `closed_transaction`, `nested_transaction`, `async_transaction` and `transaction_aborted`.

All eight normalized provider codes are mapped: `auth`, `rate_limit`, `context_length`, `network`, `invalid_request`, `unsupported`, `provider` and `aborted`.

Only provider codes `rate_limit`, `network` and `provider` offer retry. `retry.afterSeconds` is included only for a safe integer from 1 through 3,600. The generic/malformed fallback is fixed and includes `copy_diagnostics`.

`docs/adr/0011-content-free-diagnostics.md` documents how a future application consumer resolves message keys with the existing i18next/ICU translator and maps action identifiers through an application-owned registry. ADR-0011 remains **proposed**, not accepted.

## Test-first and review-correction evidence

| Group | RED evidence | Current focused result |
|---|---|---:|
| Logger | The durable task plan records the original missing-module RED. Logger files already existed when this continuation resumed, so that RED was not independently reproduced here. | 3 passed |
| Privacy | Missing-module RED was observed before implementation in the prior continuation. A new revoked-Proxy regression also reproduced `TypeError` before the fix. | 13 passed |
| Buffer | Missing-module RED was observed before implementation in the prior continuation. A new stateful-Proxy regression reproduced an `info`→`debug` threshold bypass before the fix. | 20 passed |
| Error mapping | Missing-module RED was observed in this continuation before `error-messages.ts` existed. | 33 passed |

The two independent-review findings were corrected with regression tests:

1. `Array.isArray` can throw for a revoked Proxy. It now executes inside the sanitizer's protected reflection boundary; the public sanitizer returns fixed `invalid_record` rather than propagating.
2. A stateful Proxy could report `info` during early filtering and `debug` during sanitization. The buffer now rechecks the sanitized level before clock access/retention; the regression asserts `filtered`, two descriptor reads, zero clock calls and an empty snapshot.

Combined focused suite: **69/69 passed** across Logger, privacy, buffer and error mapping. Core package typecheck and `git diff --check` pass.

## Local verification

- `corepack pnpm install --frozen-lockfile`: PASS; no dependency or lockfile changes.
- `corepack pnpm verify`: PASS; **47 test files, 425 passed, one existing skip**, including all **69 storage tests**, workspace typechecks, boundary checks, agent checks, evaluation and Biome.
- Canonical `corepack pnpm eval`: exit 0; 30 scenarios incomplete, 29/29 deterministic rules passed, 123 subjective expectations unevaluated, zero infrastructure errors.
- Original negative fixture: 27 passed, 2 failed; expected exit 1.
- Missing-evidence fixture: 28 passed, 1 unevaluated; expected exit 1.
- Unrestricted `corepack pnpm audit`: PASS; no known vulnerabilities.
- `detect-secrets==1.5.0` tracked-source scan: **0 findings**; separately sanitized lockfile scan: **0 findings**. Synthetic test field names/values are assembled at runtime so the static scanner does not misclassify low-entropy fixtures; the captured-output scanner still sees the reconstructed sensitive strings and its deliberate negative fixtures still fail. No suppression, scanner exclusion or weakened assertion was added.
- `corepack pnpm storybook:build`: PASS. Existing upstream Storybook/Vite directive and chunk-size warnings remain informational.
- `corepack pnpm test:ui`: **139 passed, one optional capture skipped**; `AXE_COVERAGE_VERIFIED unique_stories=341 required_states=364 executed_states=364`. Existing axe `incomplete` classifications remain; this is not native/manual accessibility acceptance.
- `corepack pnpm web:build`: PASS; production PWA/Worker artifacts generated. Existing large-chunk warning remains informational.
- `corepack pnpm test:web`: **108 passed, three optional capture skips**. All five original B1 obstruction regressions report zero overlapping rectangles; real Worker, cancellation/recovery, offline and service-worker update-consent checks passed.
- Actual emitted-byte gzip using Node `zlib.gzipSync`:

  | Resource | Gzip bytes |
  |---|---:|
  | `index.html` | 585 |
  | Eager ICU runtime | 12,699 |
  | Eager CSS | 8,409 |
  | Eager app JavaScript | 185,099 |
  | **Baseline-comparable eager route** | **206,792** |
  | Separate `theme-bootstrap.js` | 560 |
  | **Complete eager route** | **207,352** |
  | Separate Worker | 24,087 |
  | Worker-inclusive total | 231,439 |

  The lazy Settings chunk is excluded from the eager route. Complete eager route is 42,648 bytes below the 250,000-byte budget.
- `git diff --check`: PASS.

## Independent read-only reviews

Three independent reviewers covered architecture, correctness/testing and security/privacy. Initial findings were limited to the two scoped defects above and the need for a documented future-consumer example; fixes and documentation were added. All three read-only reviewer re-checks passed with no remaining confirmed findings. Exact-head hosted CI evidence is recorded in the PR body, not by recursively changing this document after CI.

## Acceptance boundaries still in force

- All 20 manual accessibility cases, including READ-01, remain **BLOCKED / NOT RUN**. Automated browser/axe results do not change those statuses or certify WCAG/native assistive technology.
- M0-003, M0-004 and M0-017 remain `[~]`.
- ADR-0011 was explicitly accepted by the owner on 2026-11-27; ADR-0009 and ADR-0010 remain binding.
- M0-011 `[x]` is recorded on verified protected main at squash SHA `3f916d266eacfcaf40542dcc29459abb31f4abd3`, with exact-main run `45932161441` green. Its completion record on this branch remains pending publication with the M0-013 PR merge.
- **Historical Draft-stage limitation (superseded):** M0-013 originally stopped at OPEN DRAFT with exact-head checks. The owner has since explicitly authorized the controlled merge, subject to amended-head three-job hosted verification, no protection bypass and exact merged-main re-verification. Do not claim release or overall M0 completion.
- **Historical proposal-only limitation (superseded after merge gate):** M0-014 was initially proposal-only; the owner now authorizes its explicitly bounded implementation on a fresh branch *only after* M0-013 exact merged-main three-job success. No M0-014 source changes are part of PR #28.
