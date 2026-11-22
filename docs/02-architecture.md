# 02. Architecture

## 1. Shape of the system

Lyceum is **local-first** and **hexagonal** (ports and adapters). The learning engine is a pure TypeScript library that runs anywhere: in a browser Web Worker, in the Tauri desktop shell, or in Node for tests and tooling. Everything environment-specific (storage, network, keychain, model runtime, clock, randomness) sits behind a port.

```
┌──────────────────────────── Apps (shells) ─────────────────────────────┐
│  apps/web (React, PWA)                apps/desktop (Tauri v2 + web UI)  │
└───────────────┬──────────────────────────────────────┬─────────────────┘
                │ UI state, commands/queries           │ native bridges
┌───────────────▼──────────────────────────────────────▼─────────────────┐
│                         Application layer (use cases)                   │
│  StartSession · SubmitAttempt · RunDiagnostic · BuildPlan · RunExam …   │
└───────────────┬─────────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────── Engine (packages/core) ────────────────┐
│ Events · Concept/Skill graph · Learner model · Scheduler · Planner ·    │
│ Session orchestrator · Assessor · Readiness · Weakness loop             │
│ (pure, deterministic, subject-agnostic)                                 │
└───────┬──────────────┬──────────────────┬───────────────┬──────────────┘
        │ ports        │                  │               │
 ┌──────▼─────┐ ┌──────▼───────┐  ┌───────▼───────┐ ┌─────▼──────────────┐
 │ Storage    │ │ Model Gateway│  │ Domain Profile │ │ Platform ports     │
 │ (SQLite)   │ │ (providers,  │  │ (profile-math, │ │ Clock, Rng, Files, │
 │            │ │  local, keys)│  │  profile-*)    │ │ Keychain, Network  │
 └────────────┘ └──────────────┘  └────────────────┘ └────────────────────┘
```

**Why local-first:** the learner wants to bring any model (including local ones loaded directly into the app), keeps full privacy, and gets offline use. A server is optional (sync, backups, community library) and never required for the core loop. See ADR-0001.

**Why a TypeScript engine:** one language across web, desktop, and tests; SymPy is reachable through Pyodide in a worker, so the engine need not be Python. See ADR-0002 and ADR-0003.

## 2. Packages and responsibilities

| Package | Responsibility |
|---|---|
| `core` | Events, concept and skill graph, learner model (knowledge tracing), scheduler (FSRS), planner, session orchestrator, assessor logic, readiness, weakness loop, ports. No I/O. |
| `gateway` | `ProviderAdapter` interface, adapters, routing by task tier, structured-output ladder, retries, usage accounting, key-vault interface, capability probing, model readiness check. |
| `profile-*` | Subject plug-ins implementing `DomainProfile`. |
| `ui` | Design system and accessible components. |
| `eval` | Scenario runner, simulated learners, judges, reports. |
| `apps/web` | The React app: routes, screens, stores, platform adapters for the browser (OPFS SQLite, WebCrypto vault, Web Workers). |
| `apps/desktop` | Tauri shell: native keychain, native SQLite, llama.cpp sidecar, file system, auto-update. |

Application-layer code (use cases that wire engine, gateway, profile, and storage) lives in `packages/app` (created in M4) so web and desktop share it.

## 3. Runtime topology

- **UI thread:** rendering and input only.
- **Engine worker:** runs engine logic, storage access, and orchestration, so heavy computation never blocks typing.
- **Verification worker:** Pyodide with SymPy (lazy loaded) for symbolic checks.
- **Ingestion worker:** parsing and chunking uploaded files; local embeddings.
- **Local inference:** desktop runs llama.cpp as a managed sidecar process; web may use WebGPU runtimes (experimental) or connect to a local server.
- Workers communicate by typed messages (Comlink or equivalent), with cancellation.

## 4. Data flow: a learner answers a practice item

1. UI sends `SubmitAttempt(itemId, response, confidence)` to the application layer.
2. Application layer asks the **profile** to verify (`profile.verify`). Math: SymPy equivalence in the verification worker.
3. A `attempt.recorded` event is appended to the event store (before the UI acknowledges).
4. The **learner model** folds the event: BKT mastery update (evidence weighted by hint level), error tags counted, FSRS schedule updated, calibration updated.
5. The **orchestrator** decides the next move (feedback, hint, next item, mode change) from structured state.
6. The **tutor** step calls the gateway with a prompt assembled from constitution + profile guidance + learner summary + source context + task contract, expecting a zod-validated structured result.
7. The result streams to the UI with source labels; the tutor turn is also stored as an event.

At no point does the model decide mastery, schedule, or correctness of verifiable answers.

## 5. State and storage

- **Event store** is the source of truth (append-only table with a monotonic sequence, device id, schema version).
- **Projections** (mastery, schedules, plans, progress aggregates) are derived tables updated incrementally and rebuildable from events at any time (`rebuildProjections()` must be tested).
- **Content stores**: concept graphs, items, materials (original files plus parsed chunks), embeddings, exam definitions.
- **SQLite** behind a `Storage` port: native on desktop, WASM with OPFS on web. Migrations are forward-only, tested against snapshot databases from every previous release.
- **Export format:** an open, documented zip (JSON Lines events plus content and materials) so learners own their data. Import must round-trip.
- Optional **encryption at rest** (passphrase-derived key) for learner data; keys never leave the device.

## 6. Sync (optional, M9)

Because state is an append-only event log, multi-device sync is a merge of logs: events carry `deviceId` and a unique id; merge is a set union ordered by timestamp plus device tie-breaker; projections are recomputed. No central authority is required, so sync can be file-based, folder-based (user's own cloud drive), or via an optional server. Conflicts only arise in editable content (concept graph edits), handled with versioned content records and last-writer-wins plus a visible review.

## 7. Extension points

- **Domain profiles** (`packages/profile-*`): see `docs/04-domain-profiles.md`.
- **Provider adapters**: see `docs/03-model-gateway.md`.
- **Item generators and graders** registered through the profile.
- **Ingestion parsers** registered per file type.
- **Widgets** (interactive explainers) registered by id and sandboxed (see `docs/16-security-privacy.md`).

Extensions declare capabilities and permissions in a manifest; the host enforces them.

## 8. Cross-cutting concerns

- **Error model:** typed errors; user-facing messages mapped in one place; never throw strings.
- **Cancellation:** every long operation takes an `AbortSignal` and cleans up.
- **Observability:** structured local logs with levels; a local diagnostics panel; opt-in anonymized telemetry only (`docs/16-security-privacy.md`). Prompts, answers, and content are never logged above `debug` and never leave the device in telemetry.
- **Feature flags:** a local flag registry for staged rollouts and experiments; no remote config required.
- **Localization:** all strings via i18next with ICU; tutor output language is an explicit parameter in prompts.
- **Time:** all time via `Clock`; all randomness via `Rng`; persisted ISO 8601 UTC.
- **Concurrency:** single writer to the event store per device (the engine worker), serialized by a queue.
- **Resilience:** provider calls have timeouts, retries with jitter for retryable errors, circuit-breaking per provider, and a visible degraded state.

## 9. Security boundaries

Four trust zones: (1) the engine and UI (trusted), (2) the learner's chosen providers (trusted with whatever content the learner sent), (3) uploaded materials, web content, and model output (untrusted data), (4) extensions and widgets (sandboxed). Details in `docs/16-security-privacy.md`.

## 10. Testability

Because ports abstract all I/O, the whole engine runs in Vitest with in-memory storage, a fake clock, a seeded RNG, and a scripted fake provider. The eval suite uses the same wiring plus real or recorded providers. A **simulated learner** (parametrized knowledge, slips, guesses, forgetting) lets us test planners and schedulers over months of simulated time in seconds.

## 11. Performance strategy

Lazy-load heavy modules (Pyodide, local runtimes, map). Keep projections incremental. Use virtualization for long lists and the mastery map. Pre-generate and bank items and explanations during idle time. Cache embeddings and parsed materials. Prefer streaming everywhere. Budgets in `docs/01-experience-and-quality-bar.md`.

## 12. Decisions log

See `docs/adr/`. Key ones: 0001 local-first, 0002 TypeScript engine, 0003 stack, 0004 gateway ports and tiers, 0005 event sourcing, 0006 provider account policy.
