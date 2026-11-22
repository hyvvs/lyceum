# M0 Foundations: task cards

Roadmap reference: `docs/13-roadmap.md` M0. Spec references per card.

### [ ] M0-001 Repo bootstrap and CI
Package: root · Depends on: none · Context: AGENTS.md sections 3 to 5, docs/14 section 8
Requirements: GitHub Actions workflow running install (frozen), boundaries, typecheck, lint, tests; Renovate config; CODEOWNERS; issue templates; pinned action versions; `pnpm audit` and secret scan jobs.
Acceptance: fresh clone to green `pnpm verify` in under 10 minutes; CI green on a sample PR; failing boundary rule fails CI (prove with a deliberate violation in a draft PR).
Tests: boundary script has its own test (violating fixture fails).
Ask first if: changing the required checks list.

### [ ] M0-002 Boundary checker hardening
Package: scripts · Depends on: M0-001 · Context: AGENTS.md section 2 invariants 1, 3
Requirements: extend `scripts/check-boundaries.mjs` to also verify: no package imports from `apps/*`; cross-package imports only through `index.ts` (no deep imports); every package has `typecheck`; no `Date.now()`, `new Date()` (zero args), `Math.random()` in `packages/core` non-test source.
Acceptance: each rule has a failing fixture and a passing case in tests; script prints actionable messages.

### [ ] M0-003 Design system skeleton (`packages/ui`)
Package: packages/ui · Depends on: M0-001 · Context: docs/01 sections 4 to 5, docs/14 section 3
Requirements: tokens (color, type, spacing, radius, elevation, motion) with light, dark, and high-contrast themes; Radix-based primitives (Button, Dialog, Tooltip, Tabs, Select, Toast, VisuallyHidden, FocusScope helpers); Storybook with a11y addon; text scaling to 200% story; reduced-motion handling.
Acceptance: axe clean on all stories; keyboard operation verified in Playwright component tests; themes switchable at runtime.
Ask first if: choosing fonts (licensing).

### [ ] M0-004 Web shell
Package: apps/web · Depends on: M0-003 · Context: docs/02 sections 1 and 3
Requirements: Vite + React + TanStack Router; PWA manifest and service worker (offline shell); engine worker bootstrap (Comlink or equivalent) with typed messages and cancellation; global error boundary using tutor-tone messages; theme switch.
Acceptance: installable PWA; offline reload works; engine worker round-trip test; Lighthouse performance and a11y scores recorded.

### [ ] M0-005 Desktop shell
Package: apps/desktop · Depends on: M0-004 · Context: docs/02, docs/03 section 7
Requirements: Tauri v2 wrapping apps/web; Rust commands for keychain set/get/delete (never return secrets to logs), native HTTP request passthrough with allowlist, app data directory; capability/permission config minimal.
Acceptance: builds on macOS and one other OS in CI; keychain round-trip test; app starts to themed hello screen under 2.5 s on reference device.
Ask first if: adding Tauri plugins.

### [ ] M0-006 Storage port and in-memory implementation
Package: packages/core (port), new packages/storage · Depends on: M0-001 · Context: docs/09, docs/02 section 5
Requirements: define `Storage` port (events, content stores, projections, transactions); in-memory implementation; shared contract test suite (append/read ordering, atomic batches, idempotent import, concurrent writers, large payloads).
Acceptance: contract suite passes for in-memory; suite is reusable by other implementations.

### [ ] M0-007 SQLite implementations (native + WASM/OPFS)
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

### [ ] M0-010 Eval harness skeleton (`packages/eval`)
Package: packages/eval · Depends on: M0-001 · Context: docs/12 section 3
Requirements: scenario schema (zod) matching docs/12 section 3.1; loader for `evals/scenarios/*.yaml`; scripted fake provider; rule-based checks (regex, hint level, phrase absence/presence); LLM-judge interface (stub); report generator (per scenario, per category); `pnpm eval` command.
Acceptance: the sample scenarios in `evals/scenarios/` run and report pass/fail; deterministic with the fake provider.

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

### [ ] M0-017 Glass design system (extends M0-003)
Package: packages/ui · Depends on: M0-003 · Context: docs/18 sections 3, 4, 8
Requirements: productionize `glass.css` (tokens, five glass levels, tints, light/dark/high-contrast, three fallbacks); components: GlassPanel, GlassCard, TintCard, PillNav, Dock (with tooltip), RoundIconButton (with badge), StatCard (icon chip, value, delta pill, sparkline), BarChart (frosted bars with one highlighted), ChatBubble, MasteryRing, SegmentedControl; Storybook controls for theme, backdrop, transparency, motion, contrast, text scale.
Acceptance: every component has stories for all states; axe clean; reading surfaces pass contrast on every bundled backdrop; transparency/motion/contrast settings produce finished-looking fallbacks.
Ask first if: changing token names or glass level semantics.

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
