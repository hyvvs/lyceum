# 05. Learner Model and Algorithms

All algorithms here are **deterministic, unit-tested code** in `packages/core`. Models (LLMs) supply language and judgment; they never own state. Every parameter has a default, is versioned, and can be re-fit later because state is derived from events.

## 1. What the learner model tracks

| Dimension | Representation |
|---|---|
| Knowledge | Per concept: `pKnown` (mastery probability) with an uncertainty estimate |
| Memory | Per concept and card: FSRS state (stability, difficulty, retrievability, due date) |
| Skills and errors | Counts and recency of error tags per concept and skill |
| Metacognition | Calibration: confidence versus correctness (Brier score, expected calibration error) |
| Behavior | Hint use, response time, skip rate, session regularity, signs of fatigue or frustration |
| Context | Goal, deadline, weekly hours, preferences, accessibility needs |
| Independence | Share of recent successes achieved with no hints |

## 2. Mastery estimation

**MVP model:** Bayesian Knowledge Tracing with forgetting and evidence weighting (implemented in `learner/bkt.ts`).

For each concept (or skill) with current `pKnown`:

```
likelihood_known   = correct ? (1 - slip) : slip
likelihood_unknown = correct ? guess      : (1 - guess)
weight w in [0,1]: tempered likelihood  L^w   (w = 0 means no evidence)
posterior = pKnown * Lk^w / ( pKnown * Lk^w + (1 - pKnown) * Lu^w )
pKnown'   = posterior * (1 - forget) + (1 - posterior) * learn
```

**Evidence weight `w`** is the product of: hint weight (`hintWeight(level)`: 1, 0.8, 0.55, 0.3, 0.1, 0), item-quality weight (lower for uncalibrated or near-duplicate items), and context weight (diagnostic and exam attempts count fully; review attempts count normally; teach-back counts as strong evidence for `understand` depth).

**Prerequisite coupling:** when a concept has no evidence yet, its prior is `pInit` scaled by the mean mastery of its prerequisites. Repeated failure on a concept lowers the posterior mastery of its most likely failing prerequisites (small, bounded nudge) so root-cause tracing has signal.

**Uncertainty:** track the number of effective observations and a recency-weighted variance proxy; report mastery as a range (for example 0.62 ± 0.15) and never as a bare number in the UI.

**Parameters:** defaults in `DEFAULT_BKT`; per-skill overrides stored in profile content; after enough real data (M6+), fit with expectation-maximization or logistic models and compare against held-out data. Upgrade path: Performance Factors Analysis or deep knowledge tracing behind the same interface, only via ADR with offline evaluation.

**Depth levels:** mastery is tracked per concept and per depth (remember, understand, apply, analyze, create) for the goal's target depth; item metadata states which depth it evidences.

## 3. Spaced repetition

- Use **FSRS** (via `ts-fsrs`) for each reviewable unit: concept retrieval cards, formula/definition cards, and application items.
- **Exam-aware compression:** if the deadline is `D` days away, cap target intervals so each unit receives its planned number of reviews before `D`, concentrating review in the final window; after the exam, intervals return to normal.
- **Interleaved review queues:** due items are mixed across concepts, with new and old balanced.
- **Priority** of reviews when time is short: `priority = forgettingRisk * examWeight * (1 + weaknessBoost)`.
- Reviews use **application items**, not only definitions, whenever the profile can generate them.
- Review outcomes feed both FSRS state and BKT mastery (weighted).

## 4. Next-best-action selection

For each candidate concept `c`, compute:

```
score(c) = wPrereq   * prereqReadiness(c)
         + wGap      * (targetMastery(c) - pKnown(c))+
         + wForget   * forgettingRisk(c)
         + wExam     * examWeight(c)
         + wBottleneck * bottleneckImpact(c)      // how many weak dependents it blocks
         - wFatigue  * recentExposurePenalty(c)
```

Hard constraints: do not start a concept whose prerequisites are below the mastery gate (default 0.7) unless the learner overrides or the concept is being used as a diagnostic probe. Weights are tuned by simulation (section 9) and exposed as constants with tests. The orchestrator turns top candidates into a **session plan** that fits the time available and follows the session shape (retrieval, learn, interleave, review, exit ticket).

## 5. Adaptive diagnostic

Computerized adaptive testing over the concept graph:

1. Start at mid-depth concepts spanning the graph.
2. After each answer, update mastery with BKT (including confidence information).
3. Choose the next item to maximize expected information gain about the highest-uncertainty, highest-weight concepts, using prerequisite structure to infer (a failed advanced concept lowers its prerequisites' priors; a passed one raises them).
4. Stop when the uncertainty-weighted coverage target is reached or the time cap (default 15 minutes) is hit.
5. Output the initial mastery map with uncertainty and a list of "probable but unconfirmed" gaps.

**Confidence handling:** responses are recorded as (correct, confidence). Quadrants: *confident-correct* (knows it), *unsure-correct* (fragile), *guess-correct* (little evidence), *confident-wrong* (dangerous misconception, highest priority for repair), *unsure-wrong* (known gap).

## 6. Weakness detection and root-cause tracing

**Detect** (per concept, rolling window): repeated errors, slow responses, heavy hint use, low-confidence correct answers, confident-wrong answers, or declining retrievability.

**Classify** error type from the profile taxonomy plus behavior: knowledge gap, procedure error, careless slip, misread question, time pressure, misconception, prerequisite gap.

**Trace** upstream:
1. Take the failing concept `c` and its transitive prerequisites (`transitivePrerequisites`).
2. Rank suspects by `(1 - pKnown) * proximity * errorTagAffinity` where `errorTagAffinity` uses the profile's `likelyPrerequisiteIds`.
3. Probe the top suspects with short targeted diagnostic items.
4. Confirm the weakest confirmed prerequisite as the root cause; if none, treat as a misconception or procedure issue on `c`.

**Repair plan:** re-teach from a different angle (new representation or analogy), scaffolded practice (worked example, completion problem, independent problem), retest, then a **delayed closure check** after 2 to 5 days. If it fails again, **escalate strategy** (change modality, smaller steps, new prerequisite probe) instead of repeating the same explanation.

**Bottleneck detection:** compute for each weak concept the number and total weight of downstream concepts it blocks; surface the top few as "highest-leverage fixes."

## 7. Calibration and metacognition

Track Brier score and expected calibration error per learner and per concept. Surface insights: overconfident on topic X; underconfident on Y; re-reading illusions (high familiarity but low retrieval). Teach the *why* of techniques (retrieval, spacing, interleaving) in context, not as lectures.

## 8. Readiness estimation and planning

**Readiness:** simulate the exam blueprint. For each blueprint section, sample item difficulty and per-concept success probability from the learner model (including uncertainty), account for timing, and run Monte Carlo (seeded) to produce a score distribution. Report the median and an 80% interval with the top contributors ("raise readiness by fixing X, Y"). Validate against real mock-exam results (M6) and real outcomes; recalibrate. Never present readiness without its range and basis.

**Backward planning:** from the deadline, allocate hours to concepts proportional to `weight * gap * difficulty`, schedule prerequisites first, place mock exams at planned checkpoints (for example 4 weeks, 2 weeks, 1 week), reserve 10 to 15 percent buffer, and place review. Re-plan weekly and after any large deviation.

**Feasibility check:** estimate total required hours from the gap map; compare with available hours; propose cuts (lower target, drop low-weight topics) or extension honestly.

**Triage mode** (deadline very close): choose concepts to maximize expected score gain per hour: `gain(c) = examWeight(c) * (P(success | after study) - P(success | now)) / hoursNeeded(c)`, greedy selection under the hour budget, plus one full mock if time allows. State explicitly what will not be covered.

## 9. Simulation and tuning

Build a **simulated learner** in `packages/eval`: hidden true mastery per concept, slip, guess, forgetting, learning rate, fatigue, and noisy confidence. Run the planner, scheduler, and diagnostic against simulated learners over weeks of virtual time to:
- Tune weights and gates.
- Test that mastery estimates converge to hidden truth.
- Test that diagnostics are accurate with few questions.
- Compare strategies (for example interleaved vs blocked) as sanity checks.
- Guard against regressions with fixed seeds and metric thresholds in CI.

## 10. Determinism and versioning

All functions take a `Clock` and `Rng` where time or randomness is involved. Each algorithm has a version string recorded in derived records, so recomputation under a new version is explicit and comparable. Provide `rebuildProjections()` and a regression test that rebuilding from events yields identical projections.
