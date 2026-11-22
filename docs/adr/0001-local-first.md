# ADR-0001: Local-first architecture

- Status: accepted
- Date: 2026-11-21

## Context
Learners want to bring any model (including local models loaded in the app and personal endpoints), keep data private, and study offline. A mandatory backend adds cost, privacy risk, and friction, and conflicts with bring-your-own-model.

## Options considered
1. **Cloud backend with accounts (FastAPI + Postgres):** simple sync, central control; but forces data off-device, complicates BYO keys and local models, requires hosting.
2. **Local-first app with optional sync:** privacy, offline, BYO models natural; more client complexity; sync later via event-log merge.
3. **Thin client over local server only:** limits web reach.

## Decision
Local-first. The engine runs on-device (browser worker or Tauri). Storage is local SQLite behind a port. A server is optional and never required for the core loop. Sync, if built, merges append-only event logs.

## Consequences
+ Privacy, offline use, no hosting dependence, natural fit for local models and BYO keys.
- Client-side engineering burden (workers, storage, migrations); web CORS constraints for direct provider calls (see docs/03, docs/17 R7).
- Cross-device sync deferred to M9.
Revisit if: web storage proves unreliable at scale, or institutional customers require central control.
