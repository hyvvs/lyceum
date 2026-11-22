# M1 Engine core: task cards

Roadmap reference: M1. Everything here is pure TypeScript in `packages/core`, subject-agnostic, deterministic, fully tested.

### [ ] M1-001 Event store contract and upcasters
Depends on: M0-006 · Context: docs/09 sections 1 to 2, ADR-0005
Requirements: `EventStore` implementation over `Storage`; versioned event registry; upcaster pipeline (v1 to vN on read); `attempt.voided` compensating event; validation on write and read; event catalog extended per docs/09 as needed by later cards.
Acceptance: round-trip property tests; invalid events rejected with typed errors; upcaster test with a synthetic v2.

### [ ] M1-002 Projections framework and rebuild
Depends on: M1-001 · Context: docs/09 section 4
Requirements: projection interface (`fold(state, event)`, `asOfSeq`, `algoVersion`); incremental update; `rebuildProjections()`; snapshotting hooks.
Acceptance: property test: rebuild equals incremental over random event streams; performance benchmark at 100k events.

### [ ] M1-003 Concept graph and skill graph model
Depends on: none (extends existing) · Context: docs/05, docs/08 section 5
Requirements: versioned graph records; skill model linking concepts to item templates and verification; import/export JSON; diff between versions; helpers (descendants, bottleneck impact, depth-level evidence mapping).
Acceptance: unit and property tests; large graph (1,000 concepts) operations under 50 ms.

### [ ] M1-004 Learner model projection (mastery)
Depends on: M1-002, M1-003 · Context: docs/05 section 2
Requirements: per-concept `ConceptState` projection using BKT with evidence weights (hint, item quality, context); prerequisite coupling for priors; uncertainty tracking; per-depth evidence; parameters versioned.
Acceptance: simulation test (M1-012) convergence thresholds; unit tests for each weighting path.

### [ ] M1-005 Calibration and behavior signals
Depends on: M1-004 · Context: docs/05 sections 1 and 7
Requirements: Brier score and ECE per learner and concept; confidence quadrants; behavior signals (hint dependence, response-time z-scores, skip rate, fatigue indicators); independence score.
Acceptance: unit tests with hand-computed expectations; property tests for bounds.

### [ ] M1-006 Scheduler (FSRS)
Depends on: M1-002 · Context: docs/05 section 3
Requirements: wrap `ts-fsrs`; review unit types; due queue; priority function; exam-aware compression; deterministic with injected `Clock`.
Acceptance: property tests (monotonic intervals on success, lapses shorten); simulation shows target retention at a given daily review budget; compression test: all units reviewed N times before deadline.

### [ ] M1-007 Next-best-action scoring
Depends on: M1-004, M1-006 · Context: docs/05 section 4
Requirements: scoring function with exposed weights; prerequisite gate; bottleneck impact; explainability output (top contributing factors in structured form).
Acceptance: unit tests; the explanation structure is stable and typed; weights tuned in M1-012 with recorded rationale.

### [ ] M1-008 Planner v0 (backward planning, feasibility, triage)
Depends on: M1-007 · Context: docs/05 section 8, docs/11 sections 4 and 7
Requirements: hours estimation from gaps; milestone and weekly targets; mock checkpoints; buffer; feasibility options; triage selection by expected gain per hour; replanning on deviation.
Acceptance: scenario tests (comfortable, tight, impossible, no deadline, deadline passed); explanations present; deterministic.

### [ ] M1-009 Session orchestrator state machine
Depends on: M1-007, M1-008 · Context: docs/11 sections 1 to 3
Requirements: states and transitions per spec; time-aware block shrinking; fatigue and break logic; persistence and exact resume via events; no LLM calls inside.
Acceptance: transition table tests; crash-at-every-state resume tests; time-budget property tests.

### [ ] M1-010 Adaptive diagnostic engine
Depends on: M1-004, M1-003 · Context: docs/05 section 5
Requirements: item selection by expected information gain; prerequisite inference; stopping rules; confidence quadrant handling; output mastery map with uncertainty and "probable gaps."
Acceptance: simulation: accuracy at or above target within 25 items on a 60-concept graph across many seeds.

### [ ] M1-011 Weakness detection and root-cause tracing
Depends on: M1-004, M1-005 · Context: docs/05 section 6
Requirements: detection rules; error classification inputs; suspect ranking using prerequisite distance and error-tag affinity; probe selection; repair plan structure; closure checks; escalation; bottleneck ranking.
Acceptance: simulation where a hidden prerequisite gap causes downstream failures: the tracer identifies it with high accuracy.

### [ ] M1-012 Simulated learners and tuning
Package: packages/eval · Depends on: M1-004, M1-006 · Context: docs/05 section 9, docs/12 section 4
Requirements: parametrized simulated learner; harness running planner, scheduler, diagnostic over virtual weeks; metric assertions with fixed seeds; tuning notebook or script recording chosen weights and rationale.
Acceptance: CI runs a fast simulation subset; thresholds documented.

### [ ] M1-013 Readiness estimator v0
Depends on: M1-004, M1-003 · Context: docs/05 section 8
Requirements: Monte Carlo over a blueprint using concept mastery distributions; median and 80 percent interval; top contributors; basis statement; seeded.
Acceptance: synthetic checks (known mastery yields expected range); sensitivity tests.

### [ ] M1-014 Exam blueprint model and assembly logic
Depends on: M1-003 · Context: docs/07 sections 4.1 to 4.2
Requirements: blueprint schema; assembly algorithm over an abstract item pool interface; reproducible with seeds; constraints (type counts, topic weights, difficulty distribution, recent-use avoidance).
Acceptance: property tests on constraint satisfaction; reproducibility test.
