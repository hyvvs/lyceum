# 13. Roadmap

Milestones are ordered by dependency and by risk reduction, not by calendar. Each milestone has a goal, deliverables, acceptance criteria, and exit gates. **A milestone is done only when every acceptance criterion and gate passes.** Sizes are relative (S, M, L, XL) to help planning; calendar estimates depend on team size and are deliberately omitted.

**Owner-approved development/acceptance sequencing (2026-11-27):** Manual accessibility acceptance (20 original cases) and actual M0-012 human pedagogy research are **OWNER-APPROVED DEFERRED / NOT RUN** for a dedicated pre-release validation phase; they are **not** PASS, N/A, waived release criteria or blockers for otherwise authorized technical development through M0–M9. The existing automated-verified M0-003 design, M0-004 web and M0-017 glass implementations are accepted **as development foundations**, not as completed task cards. M0-005 Tauri desktop implementation is explicitly authorized next. Apply dependency-aware sequencing based on *real technical interfaces, automated checks, security and architecture* while keeping these human requirements open in the [single consolidated deferred-acceptance register](qa/deferred-acceptance-register-2026-11-27.md) and their original evidence matrices. Never mark a task or milestone done or release the product on the strength of this deferral.

```
M0 Foundations ─► M1 Engine core ─► M2 Model gateway ─► M3 Math profile ─► M4 Learning loop (ALPHA)
                                                                   │
        M5 Sources & curriculum ─► M6 Assessment, repair, retention (BETA) ─► M7 Excellence & launch (v1.0)
                                                                                      │
                                                         M8 Generality ─► M9 Expansion
```

Some work parallelizes: M2 and M3 can run in parallel after M1 (separate packages). M5 can start once M4's contracts are stable.

---

## M0. Foundations (size M)

**Goal:** a clean, enforceable repo and the riskiest assumptions tested early.

**Deliverables**
- Monorepo, CI (verify, boundaries, tests, lint), release scaffolding, PR template, agent rules (done in this kit).
- `packages/ui` with the glass design language (docs/18): tokens and recipes, motion presets and primitives, backdrop pipeline, base components, Storybook with theme/backdrop/transparency/motion/contrast controls, theming (light, dark, high contrast), a11y and contrast-sampler test harness.
- `packages/eval` with scenario runner skeleton, scripted fake provider, first 30 tutoring scenarios.
- App shells: `apps/web` (Vite + React + routing + PWA manifest) and `apps/desktop` (Tauri v2 hello-world with keychain and SQLite proof).
- `Storage` port with an in-memory implementation plus SQLite implementations (native and WASM/OPFS) passing a shared contract suite.
- **Pedagogy prototype study:** run the tutoring flow (diagnostic, hint ladder, practice, mini-mock) on an existing chat model with 5 to 10 real students; collect what worked and what confused them. Output: a findings note that adjusts docs 06 and 11.
- ADRs 0001 to 0006 accepted; `docs/STATUS.md` active.

**Acceptance criteria**
- Fresh clone to green `pnpm verify` in under 10 minutes.
- Web shell and desktop shell both render a themed hello screen and persist an event across restart.
- Storage contract suite passes on all three implementations.
- Study findings documented.

**Exit gates:** CI green; ADRs merged; the four riskiest questions (local model viability, Pyodide SymPy load time and correctness, OPFS SQLite performance, glass/backdrop-filter performance on each webview) each have a written spike result.

---

## M1. Engine core (size L)

**Goal:** the deterministic brain, fully tested, with no UI and no model.

**Deliverables**
- Event store with upcasters, projections framework, `rebuildProjections()`.
- Concept graph and skill graph: schemas, validation (exists), import/export, versioning.
- Learner model: BKT with evidence weighting (exists), prerequisite coupling, uncertainty, calibration (Brier/ECE), behavior signals.
- Scheduler: `ts-fsrs` integration, exam-aware compression, due queue and prioritization.
- Planner v0: backward planning, feasibility estimate, next-best-action scoring, triage selection.
- Session orchestrator state machine (docs/11) with persistence and resume.
- Weakness detection and root-cause tracing (docs/05 section 6).
- Readiness estimator (Monte Carlo) v0.
- Simulated learners in `packages/eval` and convergence tests.

**Acceptance criteria**
- Property tests: mastery bounds, topological order, rebuild equals incremental, scheduler invariants.
- Simulation: mastery MAE under agreed threshold within 40 attempts per concept on synthetic learners; diagnostic reaches target accuracy within 25 items on a 60-concept graph.
- Orchestrator resumes correctly after simulated crashes at every state.
- Core remains subject-agnostic (`pnpm boundaries` green).

**Exit gates:** coverage on core logic above 90 percent; algorithms documented with versions; sample 3-month simulated study produces sensible, explainable plans.

---

## M2. Model gateway (size L)

**Goal:** connect to any model, safely, with honest capability handling.

**Deliverables**
- Adapters: Anthropic, OpenAI, Gemini/Vertex, Azure OpenAI, Bedrock, OpenRouter helpers, Ollama native helpers, generic OpenAI-compatible (exists), generic Anthropic-compatible.
- `generateObject` structured-output ladder with repair loop and parse fuzzing.
- Key vault: desktop OS keychain; web encrypted vault; per-provider base-URL binding; panic wipe.
- Provider management UI: add/test/remove, capability display, tier routing, data-destination badges, local-only mode, usage ledger.
- Local: server auto-detection, Ollama model management, **embedded llama.cpp runtime** on desktop with model manager, hardware detection, checksum verification, grammar-constrained decoding.
- Embedding adapter with local default.
- Model readiness test (certification) and per-feature availability table.
- Adapter contract suite with recorded fixtures plus live mode.

**Acceptance criteria**
- All adapters pass the same contract suite (completion, streaming, abort, errors, usage, structured output).
- A learner can run the full readiness test on (a) a cloud key, (b) a local Ollama model, (c) an embedded GGUF model, with sensible results.
- Keys never appear in logs, exports, or events (automated scan test).
- Switching providers mid-session works without data loss.

**Exit gates:** security review of key handling; fault-injection tests green; official-flow status for account-based providers documented in ADR-0006 (adapter only if an official flow exists and terms confirmed by a human).

---

## M3. Math profile and verification (size L)

**Goal:** trustworthy math checking and item generation.

**Deliverables**
- Pyodide + SymPy verification worker (lazy-loaded, cancellable, memory-guarded).
- Parser for LaTeX/plain input; symbolic equivalence; numeric spot-checks; form constraints; step checking; error tagging.
- Item template engine with seeded generation and difficulty parameters; LLM item generation with the validation pipeline.
- MathLive input and KaTeX rendering with accessible output.
- Calculus I seed graph with 100+ validated items, misconception library, rubrics.
- Profile conformance test suite implemented in `packages/eval` and passing.

**Acceptance criteria**
- Verification accuracy at least 99 percent on a curated set of 1,000 labeled answers (equivalent forms, near-misses, malformed input) with zero crashes.
- Verification warm latency under 300 ms (p95) on reference device; cold load honest and under budget.
- Generated item validation rejects planted-bad items in tests at a high rate; none ship with ambiguous keys in the seed bank.

**Exit gates:** conformance suite green; accessibility of math input and output verified with screen readers.

---

## M4. Learning loop: ALPHA (size XL)

**Goal:** a learner can go from signup to a daily loop for one real course.

**Deliverables**
- `packages/app` use cases wiring engine, gateway, profile, storage.
- Screens: Onboarding and goal contract, Diagnostic, Today, Study session, Mastery map, Plan, Models (from M2), Settings.
- Tutor: constitution, modes, hint ladder, feedback format, structured outputs, source labels, prompt assembler with token budgets.
- Practice engine: interleaving, difficulty targeting, banked and generated items.
- Session loop end to end with spaced review, warm-up, exit ticket, "What should I do now?"
- Autosave and crash-safe resume; offline behavior with local models.
- Internal alpha with 10 to 20 learners.

**Acceptance criteria**
- A new user reaches a first diagnostic question in under 5 minutes and a first mastery map in under 15.
- Tutoring eval suite passes thresholds on at least two reference models (one strong cloud, one capable local).
- Zero lost work in kill-and-resume chaos tests.
- Performance budgets and WCAG 2.2 AA met on all alpha screens.
- Alpha learners complete at least 3 sessions/week for 3 weeks on average; qualitative feedback collected.

**Exit gates:** alpha findings triaged into M5 to M7; no open BLOCKER-level UX or correctness issues.

---

## M5. Sources and curriculum (size L)

**Goal:** make it theirs: course-aligned learning from the learner's own materials.

**Deliverables**
- Ingestion pipeline (docs/08): PDFs, slides, docs, images (OCR), web pages, past papers.
- Local embeddings and hybrid retrieval; anchors and click-through citations.
- Concept-graph builder with validation, audit, provenance, and the review/edit screen.
- Source modes (materials only, materials first, open), gap-fill labeling, conflict handling, coverage report.
- Exam blueprint extraction from past papers.
- Prompt-injection defenses and eval scenarios.

**Acceptance criteria**
- Coverage report matches a human-labeled gold set within agreed tolerance on three real courses.
- In materials-only mode, the tutor never uses outside content (eval-verified); gap-fill is always labeled.
- Ingestion survives corrupt, huge, and password-protected files gracefully.

**Exit gates:** privacy review (materials never leave the device unless sent to a configured provider, and the UI says so); a11y of the review screen.

---

## M6. Assessment, repair, and retention: BETA (size XL)

**Goal:** the features that make Lyceum a mastery system rather than a chat.

**Deliverables**
- Mock exams: blueprint, assembly, exam mode, rubric grading with multi-pass, exam wrapper, readiness range, repair plans.
- Weakness loop UI and flows (docs/11 section 6), delayed closure checks, strategy escalation.
- Spaced review across the full subject with exam-aware compression.
- Item calibration (IRT) on accumulated data; item quality dashboards.
- Insights screen (calibration, retention, hint dependence, error patterns).
- Closed beta with 100 to 300 university students over a real exam period.

**Acceptance criteria**
- Readiness predictions compared to real or high-fidelity mock outcomes: mean absolute error within agreed tolerance, intervals well-calibrated (about 80 percent coverage).
- Rubric-grading agreement with human graders on anchor sets meets threshold; low-confidence flagged correctly.
- Repair loop closes at least an agreed share of detected weaknesses within two weeks in beta data.
- No critical correctness incidents; all reported errors triaged and regression-tested.

**Exit gates:** beta learning-gain signal positive versus baseline survey or control; stability and performance budgets met under real use.

---

## M7. Excellence and launch: v1.0 (size XL)

**Goal:** a product learners love and recommend; outcome evidence.

**Deliverables**
- Handwriting photo feedback (line-by-line), calibration dashboard and coaching, visuals and interactive widgets, cheat sheets and decks export.
- Experimental in-browser local runtime; any officially available account-based providers (gated).
- Desktop packaging for macOS, Windows, Linux with signed, auto-updating builds; web PWA hardening.
- Full accessibility audit (including assistive-tech testing with real users), localization scaffolding, high-contrast and dyslexia options.
- Performance tuning to budgets; startup and memory optimization.
- Security review, dependency audit, SBOM, penetration test of the sandbox and vault.
- Onboarding and empty-state polish; in-app help; documentation site.
- **Controlled learning study** (pre/post versus plain chat assistant control; 30-day retention).

**Acceptance criteria**
- All release gates in docs/12 section 7 green.
- Study shows statistically and practically meaningful learning gain and retention versus control (or an honest report with a plan if not).
- System Usability Scale and satisfaction at or above target among beta users; accessibility audit has no blockers.

**Exit gates:** go/no-go review covering correctness incidents, privacy posture, accessibility, and outcome evidence.

---

## M8. Generality (size L)

**Goal:** prove it is subject-agnostic.

**Deliverables:** a second Domain Profile in a structurally different domain; "math leak" fixes in core; the profile authoring guide, template repo, and conformance CLI; ADR documenting lessons; updated docs/04.

**Acceptance criteria:** the second profile ships using only the profile contract plus small general core improvements; conformance suite green; the same session loop, planner, mock exam, and repair flows work without special-casing.

---

## M9. Expansion (ongoing)

Optional sync (file/folder-based first, server optional); mobile apps; voice and conversation practice; simulations; teacher and parent views (consent-based); community library of concept graphs and item banks (rights-checked); opening the profile spec and schemas; more profiles; multilingual tutoring improvements.

---

## Cross-cutting tracks (every milestone)

| Track | Standing work |
|---|---|
| **Quality** | Eval scenarios, regression tests for every bug, performance and a11y gates |
| **Security and privacy** | Threat model upkeep, dependency audits, key-handling reviews |
| **Docs** | Specs and ADRs kept in sync with code; `docs/STATUS.md` updated per task |
| **Research** | Learner studies, think-alouds, metric reviews feeding spec changes |
| **Design** | Design system evolution, UX reviews, copy/tone review |

## Release train and versioning

Semantic versioning. Pre-1.0 milestones ship as `0.M.x` (for example M4 = 0.4 alpha, M6 = 0.6 beta). Each release has notes, migration tests, and a rollback plan (data export prompt before major migrations).

## Risk-driven ordering notes

Riskiest unknowns are tested earliest: local model viability and Pyodide in M0 spikes; structured output on weak models in M2; math verification accuracy in M3; pedagogy in the M0 study and M4 alpha; readiness calibration in M6; learning outcomes in M7. If a spike fails, revisit the relevant ADR before building on it.
