# M0-010 — deterministic evaluation harness skeleton (Draft evidence)

## Acceptance boundary

M0-010 is **in development `[~]`**, not independently accepted. This package tests a **fixed scripted fixture harness**, not a real tutor, real model, real LLM judge, or real learner outcome. Tutoring-quality acceptance is **INCOMPLETE**, even when the deterministic command exits zero. No M0-011 scenario expansion or M0-007 implementation is authorized. All five original `evals/scenarios/*.yaml` files and their pedagogical expectations remain unchanged.

The prerequisite M0-006 was accepted and squash-merged via [PR #25](https://github.com/hyvvs/lyceum/pull/25) at `2307a5fbe92b4961b5fa0116fce8ffe2bd334962`; exact merged-main [run 45763339003](https://github.com/hyvvs/lyceum/actions/runs/45763339003) passed Verify, unrestricted Dependency audit and Secret scan. Its `[x]` task marker is in this branch's pending documentation amendment, not the previously protected-main tree.

## Contracts and architecture

- `@lyceum/eval` exports the Zod `ScenarioSchema`/`RuleSchema`, bounded `loadScenarios(fs, directory)`, scripted gateway-compatible `ScriptedProvider`, structured `ResponseEvidence`, deterministic `evaluateRule`, `UnavailableLlmJudge`, `runEvaluation`, and deterministic summary/JSON/exit-code helpers from `src/index.ts`. No production gateway or core contracts were modified.
- `yaml@2.9.1` is the single newly authorized direct parser dependency, scoped to eval tooling only. It is ISC-licensed, has no runtime dependencies, and is installed using the existing locked version decision. The CLI invokes Node's built-in TypeScript stripping; there is no new executor dependency.
- Only trusted repository-authored `.yaml` scenarios are supported. The loader rejects aliases, custom tags, merge keys, duplicate keys/IDs, multiple documents, malformed structures, symlinks, unreadable files, and unsupported rules/judges; bounds include 64 KiB/file, 1 MiB total, 128 files, depth 32, 10,000 YAML nodes and regex length 256. JavaScript regex length limits do **not** establish ReDoS safety for arbitrary untrusted scenarios.
- The fake provider uses fixed, original synthetic response scripts, per-scenario cursors, defensive fixture cloning, explicit missing/exhausted/error outcomes and cancellation before consumption. Concurrent completions cannot consume the same outcome. No real network/model, credentials, token usage, model inventory, latency, or live capability measurements.
- Rules are regex presence/absence (fresh JavaScript `RegExp`, canonical leading `(?i)` mapped to `i`), phrase presence/absence (Unicode NFC case-insensitive substring), and `hint_level_at_most` (only explicit structured integer hint metadata 0–5). Missing hint evidence is **unevaluated**, malformed evidence an **error**, never guessed from response text.
- Every subjective `must`/`must_not` expectation is retained. The default LLM judge is explicitly unavailable and leaves subjective expectations **unevaluated**. No rule is silently promoted to a natural-language judgment. Scenario precedence is infrastructure `error`, evaluated `failed`, then incomplete, and finally passed. Injection of invalid custom judge metadata fails closed; its arbitrary reasons and extra fields cannot enter public reports.
- Reports contain stable schema version 1, scenario/expectation/rule totals and deterministic sorted per-tag expectation statistics. `evaluated = passed + failed`, `passRate = null` when evaluated is zero, and multi-tag category counts are intentionally non-unique. No timestamps, raw model responses/prompts/sources, quality scores or fabricated metrics. The report API consumes trusted typed `ScenarioResult` values, not arbitrary raw unvalidated content.

## Actual command and results

Root command: `corepack pnpm eval`; JSON: ignored `evals/reports/m0-010.json`; concise summary to standard output. Separate test-only negative mode: `corepack pnpm eval --negative-fixture`, JSON: `evals/reports/m0-010-negative.json`. Report publication uses a complete temporary file followed by rename; unsupported arguments and infrastructure failures return nonzero, and stale destination reports are removed before execution.

| Metric | Canonical five | Deliberate negative fixture |
|---|---:|---:|
| Scenarios total | 5 | 5 |
| Scenario passes / fails / incomplete / errors | 0 / 0 / 5 / 0 | 0 / 1 / 4 / 0 |
| Rules evaluated / passed / failed / unevaluated / errors | 4 / 4 / 0 / 0 / 0 | 4 / 2 / 2 / 0 / 0 |
| Expectations evaluated / passed / failed / unevaluated / errors | 0 / 0 / 0 / 17 / 0 | 0 / 0 / 0 / 17 / 0 |
| Exit code | 0 | 1 |
| Tutoring-quality acceptance | INCOMPLETE | INCOMPLETE |

The negative fixed synthetic response to `confident-wrong-001` deliberately contains forbidden praise and explicit `hintLevel: 4`: its canonical `(?i)` forbidden-praise rule and `hint_level_at_most: 2` rule genuinely **fail**. A failing rule is never hidden by unavailable subjective judgment. The four passing rules in the canonical run verify fixture rule-processing only, not actual tutoring behavior. No subjective expectation was evaluated.

## Test-first and independent-review corrections

- Initial schema/loader tests were genuinely RED before the implementation existed, then 35 schema and 16 bounded YAML loader tests passed at schema checkpoint `9292d4a`.
- Initial scripted provider tests were RED before its source existed; 14 passed at committed provider checkpoint `774dd59`. A later distinct-concurrent-completions regression was **RED** (`[A1, A1]` instead of `[A1, A2]`) then GREEN after moving the cancellation checkpoint before atomic cursor selection/consumption. Additional tests cover independent scenario cursors, aborted concurrent operations, defensive cloning and no shared fixture state.
- Rules, judge, runner and reporting tests were RED before modules existed, then GREEN. During implementation, tests separately exposed dropped `null` evidence, gateway type-only import and malformed runner completion issues; fixes preserve safe error/incomplete behavior.
- CLI tests were genuinely RED before the root script existed (`'eval' is not recognized`), then GREEN for actual root invocation, deterministic repeated JSON, nonzero fixed negative fixture and unsupported options. Independent architecture/security review found contradictory natural-language declarations and injected judge result/reason data potentially leaking responses; both were reproduced with RED tests and fixed with strict allowed fields and sanitized reports. A reviewer also found mutable injected judge arguments could rewrite an expectation: genuine RED→GREEN regression now protects the original copy and output order.
- Independent pedagogy review identified a synthetic x=0 derivative probe that did not distinguish the wrong product-rule derivative; a genuine RED→GREEN test replaced it with an explicit correction and discriminating x=1 probe, preserving all canonical scenarios and fixed-fixture independence from rule assertions.
- Security review also identified linked-directory redirection and unbounded reads in the CLI edge: test-first `cli-files.test.ts` was RED before the new internal filesystem helper existed, then GREEN for rejecting linked/non-directory paths, bounding actual reads and complete temporary-file publication. The CLI uses fixed repository paths, checks real directories before deleting/writing, writes temp files exclusively and renames on success. This is still a trusted stable-checkout boundary, not a race-proof sandbox for a hostile concurrently modified filesystem.

## Local verification (Windows PowerShell / Node 22 / pnpm 9)

**Final full verification after all scoped implementation corrections:** frozen `pnpm install --frozen-lockfile`; `pnpm verify` with **40 files, 332 passed / one existing skip** (including **69 M0-006 storage tests**), boundaries, agentcheck, workspace typechecks, real canonical `pnpm eval`, and Biome all returned exit zero. The focused eval package has **118 passing tests across nine test files**. Unrestricted `pnpm audit`: **no known vulnerabilities**. The generated-output Biome exclude `evals/reports` is narrowly scoped and does not exempt any source/test file.

Storybook built successfully, and the **full isolated Chromium UI suite** passed **139 tests + one optional capture skip**, verifying **341 distinct stories / 364 required and executed axe states**, plus eight integrated composition variants. The independent production web build passed. The **full production browser/PWA/Worker suite**, run **sequentially after UI** against its own artifacts, passed **108 tests + three optional capture skips**, including all five original B1 zero-overlap regressions. Existing `axe incomplete` and native/manual gates remain unresolved, not reclassified as passes. All production web/worker/UI source packages and five original scenario YAML files remained untouched.

Fresh actual production build measurement using `zlib.gzipSync` over emitted bytes: initial-route baseline-comparable assets `index.html` **585 B** + eager ICU **12,699 B** + CSS **8,409 B** + eager JS **185,099 B** = **206,792 B**, unchanged from M0-006 and **43,208 B under** the 250,000 B budget. Separately emitted Worker: **24,087 B**, unchanged. The first-party `theme-bootstrap.js` is **560 B gzip** and is reported separately to preserve baseline comparability; counting it additionally gives **207,352 B** initial route, still below the budget. No eval module is imported by the production startup or bundled into these outputs. Existing upstream Vite/Storybook chunk/directive warnings persist; no new eval startup warning is claimed.

Following the synthetic fixture correction and CLI filesystem safety edits, the **final complete sequential local verification** again returned exit zero for frozen install, `pnpm verify`, unrestricted audit, Storybook build, full isolated UI suite, production web build, full isolated production browser suite and `git diff --check`. A separate final unit replay confirmed **40 test files, 332 passes and one historical skip** and repeated `pnpm eval` output. Fresh exact-PR-head hosted evidence is required independently; a passing local or older hosted run is never substituted for that evidence.

### Independent read-only reviews

**Architecture:** no production import or public gateway contract breach. Found contradictory natural-language declarations, injected judge metadata mutation/report leakage, safe report publication and stale-artifact handling; all confirmed issues addressed with dedicated regression tests. The existing canonical scenario/fixture inventory is checked at CLI runtime. Scoped cross-package boundaries remain enforced; no existing CI check was removed.

**Evaluation correctness and pedagogy:** verified all five canonical expectations, rule/expectation denominators and deliberately failing fixture. The synthetic counterexample at x=0 could not distinguish an incorrect product-rule derivative; corrected with a RED/GREEN test and an explicitly non-flattering x=1 prompt. No subjective result or tutor-quality claim was manufactured. Missing required hint metadata remains visible as unevaluated, with exit zero permitted by the recorded skeleton policy unless there is an evaluated failure/error.

**Security/privacy:** found that arbitrary injected judge reasons/fields could reach reports, and that fixed output paths needed linked-directory and bounded-read precautions. Corrections allowlist result fields, sanitize free-form judge feedback, preserve trusted expectation text/order, reject linked directories and use a bounded 64 KiB read plus exclusive temporary report write/rename. No network, secrets, learner record, telemetry, real LLM judge or arbitrary scenario path option is present. Future untrusted scenarios require separate regex sandboxing/redaction design; these reviews are not a production security certification or formal GitHub PR approval.

Existing manual accessibility restrictions remain untouched: M0-003, M0-004 and M0-017 `[~]`; all 20 qualified native/manual cases including READ-01 BLOCKED/NOT RUN; ADR-0009 FocusScope deferral and ADR-0010 Workbox override removal/full-retest requirements unchanged. This infrastructure-only task does not establish native AT, WCAG signoff, model calibration, model-quality thresholds, learner learning gains, persistence, model portability, regex sandboxing or release acceptance.

## Draft PR checkpoint

The branch must remain **OPEN, DRAFT, unmerged and not ready**, even after exact-head hosted Verify, unrestricted Dependency audit and Secret scan succeed. M0-010 remains `[~]` pending separate independent owner acceptance; no downstream task is authorized.
