# 09. Data Model

Source of truth: the **append-only event log**. Everything else is a projection or content. Implemented behind a `Storage` port with SQLite (native desktop, WASM+OPFS web). Types shown in TypeScript-like notation; authoritative schemas are zod schemas in `packages/core`.

## 1. Event envelope (exists in `packages/core/src/events.ts`)

```
{ id, deviceId, userId, goalId?, occurredAt (ISO UTC), type, version, payload }
```

Rules: immutable; ids unique; payload validated by zod on write and read; schema changes add a new `version` plus an upcaster that converts old to new on read; never delete events (use compensating events such as `attempt.voided`). Store: `events(seq INTEGER PRIMARY KEY AUTOINCREMENT, id UNIQUE, device_id, user_id, goal_id, occurred_at, type, version, payload JSON)` with indexes on `(type, seq)`, `(goal_id, seq)`.

## 2. Event catalog (grow deliberately)

Implemented now: `attempt.recorded`, `session.started`, `session.ended`, `goal.created`, `preferences.changed` (initial version 1), `privacy.changed` (initial version 1). The four historical event schemas and their Zod defaults remain unchanged; these two new v1 types are additions, not schema revisions requiring upcasters.

`preferences.changed` v1 is a **user-level** event whose strict payload is exactly `{ setting: "mockExamExtendedTime", value: null | 1.25 | 1.5 }`. `null` explicitly resets the optional extended-time preference to ordinary mock-exam timing. No medical/accommodation justification or exam timer is stored or implemented.

`privacy.changed` v1 is a **user-level** event whose strict payload is exactly `{ setting: "localModelsOnly", value: boolean | null }` or `{ setting: "telemetryConsent", value: "granted" | "denied" | null }`. Local-models-only resets to the conservative `true` default. Telemetry defaults to `unset` and is disabled without explicit stored `granted`; `denied` is explicit opt-out/revocation, `null` resets to `unset` (also disabled). These are future policy inputs only: no telemetry or provider routing behavior is enabled. Commands require application-boundary learner confirmation, not an authorization performed by core.

For both new types, the canonical envelope still requires nonempty `id`, `deviceId`, `userId`, ISO `occurredAt`, exact `type` and `version`; their local identifiers additionally match a bounded safe-character contract, and `goalId` is **prohibited**, as the settings are user-scoped and not goal-specific. Their envelope and payload schemas are strict: unknown settings, arbitrary nested bags, credentials, URLs, learner text and extra fields fail validation. For every new event `occurredAt` remains audit metadata; **local append `seq`** determines state reconstruction order. A settings read captures its initial committed sequence head and folds exclusive-cursor pages only up to that head, independently of concurrent appends. No cache or durable adapter exists. The existing `apps/web` device-local appearance store (`lyceum.web.preferences.v1`) remains separate, unchanged and authoritative for theme, locale and transparency. Developer-owned temporary feature flags live in code only, not in the event log or user settings; they are neither consent nor provider authorization.

Planned (add with schemas and tests when needed):

| Group | Events |
|---|---|
| Goals and plans | `goal.updated`, `goal.archived`, `plan.generated`, `plan.adjusted`, `contract.feasibility_checked` |
| Diagnostic | `diagnostic.started`, `diagnostic.completed` |
| Learning | `hint.requested`, `explanation.shown`, `teachback.completed`, `confidence.recorded`, `answer.revealed` |
| Attempts | `attempt.voided`, `attempt.challenged` |
| Review | `review.scheduled`, `review.completed` |
| Exams | `exam.assembled`, `exam.started`, `exam.submitted`, `exam.graded`, `exam.wrapper_completed` |
| Weakness | `weakness.detected`, `repair.started`, `repair.closed`, `repair.escalated` |
| Content | `material.added`, `material.processed`, `concept_graph.versioned`, `item.created`, `item.validated`, `item.rejected`, `item.reported` |
| Models | `provider.configured`, `model.readiness_tested`, `routing.changed` (no secrets, no content) |
| Settings | `source_mode.changed` (planned only; neither new user-level event changes `goal.created` sourceMode) |
| Tutor | `tutor.turn` (message, labels, intent; stored locally; not sent anywhere) |

## 3. Core entities (content stores)

```
Subject        { id, profileId, profileVersion, name, createdAt }
Goal           { id, subjectId, outcome, definitionOfDone, deadline?, weeklyHours, sourceMode, status }
ConceptGraph   { id, subjectId, version, provenance, concepts: Concept[] }      // versioned, immutable per version
Concept        { id, name, description, prerequisites[], targetDepth, weight, misconceptions[] }
Skill          { id, conceptIds[], name, itemTemplateIds[], verification }
Blueprint      { id, subjectId, sections[], timing, scoring, passThreshold, provenance }
Material       { id, subjectId, fileHash, name, mime, storedPath, status, addedAt }
Chunk          { id, materialId, anchor{page,section}, text, role, embeddingId, conceptIds[] }
Item           { id, profileId, profileVersion, type, prompt, key, rubricId?, conceptIds[], skillIds[],
                 depth, difficulty{estimate, calibrated?, n}, sourceLabel, generator?, validation, status }
Rubric         { id, criteria[{name, levels[{points, descriptor, anchor?}]}] }
ExamDefinition { id, blueprintId, itemRefs[{itemId, seed?}], createdAt }
```

## 4. Projections (derived, rebuildable)

```
ConceptState   { goalId, conceptId, pKnown, effectiveN, varianceProxy, depthEvidence{...},
                 errorCounts{tag:n}, lastSeen, calibration{brier,n}, algoVersion }
ReviewState    { goalId, unitId, unitKind, fsrs{stability,difficulty,due,lastReview,state,reps,lapses} }
Plan           { goalId, version, milestones[], weeklyTargets[], mockSchedule[], generatedFrom{eventSeq} }
SessionSummary { sessionId, goalId, plannedMinutes, actualMinutes, itemsAttempted, conceptsTouched, notes }
Weakness       { goalId, conceptId, type, status, rootCauseConceptId?, evidence[], repairPlan, openedAt, closedAt? }
Readiness      { goalId, asOfSeq, distribution{median, p10, p90}, contributors[], basis }
Insights       { goalId, calibration, retention, hintDependence, errorPatterns, adherence }
UsageLedger    { providerId, tier, tokensIn, tokensOut, day }
```

Each projection stores `asOfSeq` (last event folded) and `algoVersion` so staleness and recomputation are explicit. `rebuildProjections()` must reproduce the same output from events; a test enforces this.

## 5. Migrations and versioning

- Schema migrations are forward-only SQL files with a test that migrates snapshot databases from every released version.
- Event versions upcast on read; content records carry `schemaVersion`.
- Export bundles carry `formatVersion`; the importer supports all prior versions.

## 6. Export and import format ("you own your data")

A zip: `manifest.json` (format version, app version, counts, hashes), `events.jsonl`, `content/` (graphs, items, rubrics, blueprints as JSON), `materials/` (originals, optional), `settings.json`. **Never includes keys or secrets.** Import is idempotent (deduplicates by id and hash) and validates every record. Provide a round-trip test: export, wipe, import, rebuild projections, compare.

## 7. Encryption and retention

Optional database encryption with a passphrase-derived key (SQLCipher for native; an equivalent or file-level encryption on web). Retention controls: delete a subject, delete all data, delete materials only, or export first. Deleting a subject emits a local tombstone and removes content and derived data; events are removed from the local store on explicit user deletion (the append-only rule applies to normal operation, not user-requested erasure).

## 8. Identity

Local-first: a `userId` is a locally generated id; no account is required. Optional accounts (M9) only add sync and backup.
