# ADR-0005: Event-sourced learner state

- Status: accepted
- Date: 2026-11-21

## Decision
Learner-visible state changes are immutable, versioned events in an append-only log. Mastery, schedules, plans, and insights are projections that can be rebuilt. Algorithms are versioned so recomputation is explicit.

## Rationale
Auditability, re-fitting algorithms on real data, resume after crashes, simple sync by log merge, trustworthy "why does it think this?" explanations.

## Consequences
+ Rebuildable and explainable state; natural sync path.
- Requires disciplined schema evolution (upcasters), projection tests, and storage design for growth (snapshots/compaction later).
- User-requested erasure is an explicit exception to immutability (docs/09 section 7).
