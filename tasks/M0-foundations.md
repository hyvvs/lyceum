# M0 Foundations: task cards

Roadmap reference: `docs/13-roadmap.md` M0. Spec references per card.

### [x] M0-001 Repo bootstrap and CI
Package: root · Depends on: none · Context: AGENTS.md sections 3 to 5, docs/14 section 8
Requirements: GitHub Actions workflow running install (frozen), boundaries, typecheck, lint, tests; Renovate config; CODEOWNERS; issue templates; pinned action versions; `pnpm audit` and secret scan jobs.
Acceptance: fresh clone to green `pnpm verify` in under 10 minutes; CI green on a sample PR; failing boundary rule fails CI (prove with a deliberate violation in a draft PR).
Tests: boundary script has its own test (violating fixture fails).
Ask first if: changing the required checks list.

### [x] M0-002 Boundary checker hardening
Package: scripts · Depends on: M0-001 · Context: AGENTS.md section 2 invariants 1, 3
Requirements: extend `scripts/check-boundaries.mjs` to also verify: no package imports from `apps/*`; cross-package imports only through `index.ts` (no deep imports); every package has `typecheck`; no `Date.now()`, `new Date()` (zero args), `Math.random()` in `packages/core` non-test source.
Acceptance: each rule has a failing fixture and a passing case in tests; script prints actionable messages.

### [~] M0-003 Design system skeleton (`packages/ui`)
Package: packages/ui · Depends on: M0-001 · Context: docs/01 sections 4 to 5, docs/14 section 3
Requirements: tokens (color, type, spacing, radius, elevation, motion) with light, dark, and high-contrast themes; Radix-based primitives (Button, Dialog, Tooltip, Tabs, Select, Toast, VisuallyHidden); **focus lifecycle via the existing Radix-owned Dialog and Select implementations**; Storybook with a11y addon; text scaling to 200% story; reduced-motion handling.
FocusScope-helper requirement reconciliation (owner-approved **APPROVED DEFERRAL**, **not implemented**): the original card included "FocusScope helpers" with no specified public/internal shape. The deferral covers **both** a public standalone `FocusScope` and any new private `OwnedFocusBoundary`, direct FocusScope dependency or custom focus manager: none may be added without a demonstrated consumer and separate owner approval. Existing Dialog + Select already manage nested, portalled focus; see accepted ADR-0009 and `docs/qa/m0-003-acceptance-audit.md`. Preserve this explicit scope decision rather than silently deleting the original requirement.
Acceptance: axe clean on **all** Storybook stories (enumerated against actual exports); keyboard operation and Dialog + portalled Select focus restoration/inert cleanup verified in Playwright; light/dark/high-contrast themes switchable **while a component remains mounted**, with portal-open states; genuine 200% text and narrow viewport, RTL, reduced motion/transparency and solid fallback checks. Full evidence-based acceptance audit and any corrective tests must pass before the human lead changes **[~]** to **[x]**. An APPROVED DEFERRAL does not count as an implemented feature.
Ask first if: choosing fonts (licensing).

### [~] M0-004 Web shell
Package: apps/web · Depends on: M0-003 · Context: docs/02 sections 1 and 3
Requirements: Vite + React + TanStack Router; PWA manifest and service worker (offline shell); engine worker bootstrap (Comlink or equivalent) with typed messages and cancellation; global error boundary using tutor-tone messages; theme switch.
Acceptance: installable PWA; offline reload works; engine worker round-trip test; Lighthouse performance and a11y scores recorded.
**Owner-approved limited sequencing exception (2026-11-24; project owner, Independent Audit #19):** Although M0-003 remains `[~]` and is still the dependency, **M0-004 development and draft-PR verification only** may begin **after** the amended [M0-003 exit decision](../docs/qa/m0-003-exit-decision-2026-11-24.md) is merged and its post-merge `main` Verify, Dependency audit and Secret scan pass. **Implementation began under owner Audit #20 approval on 2026-11-25; M0-004 is now `[~]` (NOT complete), DRAFT PR verification only.** **Not authorized:** M0-003 `[x]`, M0-004 acceptance/merge without a further decision, public release, WCAG certification claims, weaker accessibility/release gates, or M0-005/later dependent milestones. **Residual risks:** actual supported assistive-technology and native Windows forced-colors signoff, applicable axe `incomplete` manual triage, and unsupported arbitrary unbounded complex Dialogs. A complex Dialog consumer must use and independently test a bounded reading-and-controls composition or seek separate approval for an accessible alternative; ADR-0009 remains an approved FocusScope deferral. **Revisit at M0-004 acceptance/merge AND before public release or M0-003 completion.** WCAG 2.2 AA and manual accessibility requirements in `docs/01-experience-and-quality-bar.md` remain mandatory; any confirmed supported-consumer accessibility failure requires a focused fix and regression tests. Any new dependency, package, public interface or architecture contract requires separate prior approval under `AGENTS.md` §11; **Audit #20 approved exactly the initial M0-004 A–D package/contracts (corrected `intl-messageformat@12.1.4`), not later extensions.**

**Current owner authorization (Independent Audit #22, 2026-11-25; supersedes the above *draft-only* limit for PR #18 specifically):** The owner **ACCEPTED ADR-0010**, approved the exact **temporary scoped** `workbox-build@7.4.1>glob: 14.0.3` override (with mandatory compatible-upstream removal/retest trigger), and authorized a **controlled squash merge of PR #18 as a pre-release application foundation only** after a documentation-only acceptance amendment and successful new exact-head Verify, unrestricted Dependency audit and Secret scan. The merge is **not** M0-004 milestone completion: **M0-003 `[~]`, M0-004 `[~]`**, manual actual AT/native Windows forced-colors/axe-incomplete signoffs, bounded Dialog composition restriction and accepted ADR-0009 FocusScope deferral remain. This does not authorize public release, WCAG certification, starting M0-005/other dependent milestones or claiming M0-017–M0-020 visual/motion/imagery/WebView gates. The bottom mobile capsule's possible obstruction of **unfocused** reading text requires visible-text, natural keyboard focus and bottom-safe-area testing on the **first real reading-intensive consumer**; current shell automation does not certify arbitrary reading content. See the [Audit #22 accepted ADR](../docs/adr/0010-m0-004-web-shell-bootstrap.md) and [manual tester handoff](../docs/qa/m0-004-manual-accessibility-handoff-2026-11-25.md). The prior Audit #19/#20 paragraph is historical scope evidence, not the latest merge restriction.

### [ ] M0-005 Desktop shell
Package: apps/desktop · Depends on: M0-004 · Context: docs/02, docs/03 section 7
Requirements: Tauri v2 wrapping apps/web; Rust commands for keychain set/get/delete (never return secrets to logs), native HTTP request passthrough with allowlist, app data directory; capability/permission config minimal.
Acceptance: builds on macOS and one other OS in CI; keychain round-trip test; app starts to themed hello screen under 2.5 s on reference device.
Ask first if: adding Tauri plugins.

### [x] M0-006 Storage port and in-memory implementation
Package: packages/core (port), new packages/storage · Depends on: M0-001 · Context: docs/09, docs/02 section 5
Requirements: define `Storage` port (events, content stores, projections, transactions); in-memory implementation; shared contract test suite (append/read ordering, atomic batches, idempotent import, concurrent writers, large payloads).
Acceptance: contract suite passes for in-memory; suite is reusable by other implementations.
**Owner acceptance and completion (Independent Audit, 2026-11-26):** the owner independently **ACCEPTED M0-006** after review of [PR #25](https://github.com/hyvvs/lyceum/pull/25) at `a5ebaf03d643b8d1d4f83ac25d135d6806676825`. Final exact-amendment-head [run 45762511510](https://github.com/hyvvs/lyceum/actions/runs/45762511510) passed Verify, unrestricted Dependency audit and Secret scan. PR #25 was marked ready and normally squash-merged without bypass at actual `main=2307a5fbe92b4961b5fa0116fce8ffe2bd334962`. Fresh exact-merged-main [run 45763339003](https://github.com/hyvvs/lyceum/actions/runs/45763339003) on that exact SHA passed **Verify, unrestricted Dependency audit and Secret scan**; Verify included frozen install, `pnpm verify`, Storybook build, full Chromium UI/accessibility, production web build and production browser/PWA/Worker suite. M0-006 is therefore **complete `[x]`**. The `[x]` marker is recorded in this M0-010 branch's documentation amendment; protected `main` at the accepted squash SHA still contains the historical `[~]` marker until this documentation amendment is merged. See [M0-006 QA/acceptance record](../docs/qa/m0-006/README.md). Accepted limitations remain: trusted synchronous transaction-callback contract only; no persistent adapter portability/performance claim. No SQLite, native/WASM/OPFS, migrations, archive packaging, credential vault, subject algorithms, or production web integration implemented. M0-003/004/017 remain `[~]`, all 20 native/manual accessibility cases BLOCKED/NOT RUN, ADR-0009 and ADR-0010 remain binding.

### [ ] M0-007 SQLite implementations (native + WASM/OPFS) — NOT AUTHORIZED
Package: packages/storage · Depends on: M0-006, M0-004, M0-005 · Context: docs/09, docs/17 R5
Requirements: SQLite storage for Tauri (native) and web (WASM + OPFS in a worker); forward-only migrations framework; snapshot-DB migration test harness; optional IndexedDB fallback adapter decision recorded.
Acceptance: contract suite green on all implementations; event append p95 under 10 ms at 100k events; migration test passes.
Spike output: written note on OPFS support and performance (feeds ADR update).

### [ ] M0-008 Spike: Pyodide + SymPy
Package: spikes (throwaway) · Depends on: M0-004 · Context: docs/04 section 4.3, docs/17 R4
Requirements: load Pyodide in a worker; measure cold load, memory, SymPy import time; test symbolic equivalence on 200 curated expressions (equivalent forms, near-misses, malformed); test cancellation and timeouts.
Acceptance: written report with numbers vs budgets (docs/01 section 6), correctness rate, recommendations (lazy-load strategy, prebuilt package set, desktop native fallback).
Output: update ADR-0002/0003 if needed.

### [ ] M0-009 Spike: local model viability
Package: spikes · Depends on: M0-005 · Context: docs/03 section 8, docs/17 R3
Requirements: run Ollama and an embedded llama.cpp sidecar from the desktop shell; measure tokens/sec on reference hardware tiers; test JSON-schema constrained decoding; run a mini tutoring battery on 3 small models; evaluate structured-output validity and instruction following.
Acceptance: report comparing sidecar vs bindings vs external Ollama; recommended default models per hardware tier; failure modes.
Output: decision recorded as ADR-0007.

### [~] M0-010 Eval harness skeleton (`packages/eval`)
Package: packages/eval · Depends on: M0-001 · Context: docs/12 section 3
Requirements: scenario schema (zod) matching docs/12 section 3.1; loader for `evals/scenarios/*.yaml`; scripted fake provider; rule-based checks (regex, hint level, phrase absence/presence); LLM-judge interface (stub); report generator (per scenario, per category); `pnpm eval` command.
Acceptance: the sample scenarios in `evals/scenarios/` run and report pass/fail; deterministic with the fake provider.
**Owner-authorized scope (Independent Audit, 2026-11-26):** development began on fresh branch `m0/eval-harness-skeleton` from verified M0-006 squash main `2307a5fbe92b4961b5fa0116fce8ffe2bd334962`; exact merged-main [CI run 45763339003](https://github.com/hyvvs/lyceum/actions/runs/45763339003) passed all three mandatory jobs. This card is `[~]` because development has started, not accepted. Implement only the deterministic evaluation harness skeleton described in the verbatim owner authorization at `.git/owner-m0-010-controlling-prompt.md`. Scope includes Zod scenario schema and bounded safe YAML loader for the five existing unchanged scenarios; eval-owned scripted `ProviderAdapter` fake and explicit response/evidence envelope; deterministic typed regex/phrase/hint rules; unavailable LLM judge stub; honest per-scenario/category report; real root `pnpm eval`; fast deterministic CI integration; tests, QA/STATUS and independent reviews. Preserve every existing expectation. Do not add M0-011 scenarios, tutor engine, real model/judge/network, gateway changes, production learner-data wiring or any downstream milestone. Full proposed public contracts, exact file scope, YAML dependency justification, result semantics and RED-first plan were posted before source edits and are preserved in `.git/m0-010-implementation-plan.md`. M0-010 may become `[x]` only after independent acceptance; stop at an OPEN DRAFT PR.

### [ ] M0-011 First 30 tutoring scenarios
Package: evals/scenarios · Depends on: M0-010 · Context: docs/06 section 9, docs/12 section 3.2
Requirements: author 30 scenarios across categories (anti-sycophancy, hint ladder, diagnose-first, tool authority, injection, distress, materials-only, uncertainty); each with must/must_not and rule checks.
Acceptance: reviewed with the `lyceum-pedagogy-review` skill; each category has at least 3 scenarios.

### [ ] M0-012 Pedagogy prototype study protocol
Package: docs · Depends on: none · Context: docs/06, docs/11
Requirements: write the study protocol (participants, tasks, materials, consent, data handling, success measures), a prompt pack to run the flow on an existing chat model, observation sheet, and interview guide. Human recruits 5 to 10 students and runs it; findings are written up.
Acceptance: findings note committed; docs 06 and 11 updated with changes it motivates.
Ask first if: collecting any personal data beyond what the protocol states.

### [ ] M0-013 Logger, diagnostics, error mapping
Package: packages/core (ports), packages/app (later) · Depends on: M0-001 · Context: docs/14 sections 4 and 5
Requirements: `Logger` port with levels and redaction helpers; central error-to-message mapper; local diagnostics buffer; unit tests asserting secrets and content never reach logs above `debug`.
Acceptance: tests include key-pattern scan of captured logs.

### [ ] M0-014 Feature flags and settings
Package: packages/core · Depends on: M0-006 · Context: docs/14 section 11
Requirements: typed flag registry with owner and removal date metadata; settings store through events; flags for gated integrations.
Acceptance: unit tests; CI check that every flag has an owner and removal date.

### [ ] M0-015 i18n scaffolding
Package: packages/ui, apps/web · Depends on: M0-004 · Context: docs/14 section 13
Requirements: i18next with ICU; lint rule or test that flags hard-coded user-facing strings in components; RTL layout smoke test; locale-aware number formatting helper.
Acceptance: sample screens render in `en` and a pseudo-locale; RTL story passes visual check.

### [ ] M0-016 ADR acceptance and STATUS ritual
Package: docs · Depends on: M0-008, M0-009 · Requirements: review ADRs 0001 to 0006 with spike results; write ADR-0007 (local runtime) and any updates; ensure `docs/STATUS.md` reflects M0 outcomes.
Acceptance: all ADRs accepted by the human lead.

### [~] M0-017 Glass design system (extends M0-003)
Package: packages/ui · Depends on: M0-003 · Context: docs/18 sections 3, 4, 8
Requirements: productionize `glass.css` (tokens, five glass levels, tints, light/dark/high-contrast, three fallbacks); components: GlassPanel, GlassCard, TintCard, PillNav, Dock (with tooltip), RoundIconButton (with badge), StatCard (icon chip, value, delta pill, sparkline), BarChart (frosted bars with one highlighted), ChatBubble, MasteryRing, SegmentedControl; Storybook controls for theme, backdrop, transparency, motion, contrast, text scale.
Acceptance: every component has stories for all states; axe clean; reading surfaces pass contrast on every bundled backdrop; transparency/motion/contrast settings produce finished-looking fallbacks. **Visual-fidelity checkpoint (mandatory, distinct from axe and computed blur):** compare real rendered M0-017 screenshots with the supplied Glassy Dashboard V5 reference for layout, layering, proportions, refined typography and overall visual atmosphere. Show genuine translucent frosted panels, deliberate depth, subtle rim lighting/shadows, floating pill navigation, left icon dock, tinted cards, a single focal accent and coherent hierarchy against original/licensed atmospheric imagery (or a **clearly marked temporary demonstration backdrop** until M0-019). Review **side-by-side** full-glass and polished solid accessibility fallbacks; a CSS `backdrop-filter` check or a generic opaque dark dashboard is not sufficient. Reference-video assets may never be copied; any shipped imagery must meet the M0-019 licensing rules. Preserve the downstream M0-018 spring-motion, M0-019 rendered-pixel contrast/backdrop and M0-020 supported-WebView performance gates and their dependencies.
Ask first if: changing token names or glass level semantics.

**Owner-approved limited sequencing exception (Independent Audit #26, 2026-11-25):** M0-003 and M0-004 remain `[~]`; their genuine supported-AT, native Windows Contrast themes and axe-incomplete manual acceptance stays BLOCKED / NOT RUN. The dependency of M0-017 on M0-003 is **not satisfied or removed**. The owner authorized **only M0-017 Slice A development and DRAFT PR verification**, comprising GlassPanel (standard/raised/floating/reading), GlassCard (standard/raised), TintCard (five existing controlled hues), a clearly labeled visual-only original CSS-atmosphere integrated Storybook composition, exhaustive new-family axe/story checks and actual desktop/mobile/full/reduced/opaque visual comparison. Native HTML attributes, refs and tightly bounded exported APIs are approved; no arbitrary-color API, new focus owner, extra motion/dependency/font/asset, web Today/router/navigation change, M0-018/019/020 implementation or invented learner data. Do not mark M0-017 `[x]`, merge Slice A, certify WCAG, release, or implement PillNav/Dock/public Stage B components without a **separate owner decision**. The V5 rendered-fidelity checkpoint and every original M0-017 acceptance gate remain mandatory, not waived by a draft prototype.

**Superseding owner decision for PR #20 only (Independent Audit #28, 2026-11-25):** The owner independently accepted the exact `f845826b1e1f3552be625a73d8d871df9a8572e2` Slice A scope and mobile dock correction, and explicitly authorizes a **controlled squash merge of PR #20 as an incomplete pre-release foundation**, superseding Audit #26's draft-only/no-merge rule **only for that PR**. Its conditions: accurate PR description; documentation-only Audit #28 record; fresh full exact-amended-head hosted Verify, **unrestricted** Dependency audit and Secret scan green; no bypass of repository protections, implementation change or force-push; stop if `main` or PR head unexpectedly changes or any gate fails. Zero submitted GitHub reviews are acceptable **for PR #20 only**, not an exemption from protected checks. Verify the actual squash SHA and fresh merged-main CI afterward. Stage B may be **proposed read-only after successful post-merge verification**, but no implementation, new PR or dependency is authorized. M0-003, M0-004 and M0-017 remain `[~]`; all 20 native AT/Windows Contrast manual cases remain BLOCKED / NOT RUN, axe `incomplete` and native browser UI zoom unverified; no WCAG 2.2 AA or final V5 acceptance, release, M0-005, M0-018–020 work, ADR-0009 FocusScope change or ADR-0010 override change is approved.

### [ ] M0-018 Motion primitives
Package: packages/ui · Depends on: M0-017 · Context: docs/18 section 6
Requirements: `MotionProvider` (`LazyMotion` + `MotionConfig reducedMotion="user"`); `PageTransition` (AnimatePresence, blur-in), `Stagger`, `HoverLift`, `SharedIndicator` (layoutId), `CountUp`, `StreamingText` (no reflow jumps); all use presets from `motion.ts`; Settings override for motion level.
Acceptance: tests for reduced-motion paths; no animated property outside transform/opacity/filter (lint or test); animated element count cap documented; frame time within budget on reference device.

### [ ] M0-019 Backdrop pipeline and contrast sampler
Package: packages/ui, scripts · Depends on: M0-017 · Context: docs/18 sections 8 to 9
Requirements: build step producing light/dark/responsive/pre-blurred variants and luminance maps from source images (WebP/AVIF, under 400 KB per variant); 5 original or licensed backdrops with license notes; user-image import with automatic scrim; Playwright contrast sampler that renders each glass level over each backdrop and asserts WCAG AA on text.
Acceptance: sampler fails a deliberately bad backdrop and passes all shipped ones; license file present for every asset.
Ask first if: adding any imagery (licensing).

### [ ] M0-020 Spike: glass performance per webview
Package: spikes · Depends on: M0-017, M0-005 · Context: docs/18 section 8, docs/17 R22
Requirements: benchmark the Today layout (shell, 6 glass panels, stagger entrance, chart animation, streaming chat) on WebView2, WKWebView, Chromium/Safari browsers, and WebKitGTK across reference hardware; record frame times, GPU/CPU use, and memory; find the blur radius and layer-count thresholds; define Tier A/B/C auto-detection.
Acceptance: report with numbers and recommended thresholds; ADR-0008 updated if budgets cannot be met.
