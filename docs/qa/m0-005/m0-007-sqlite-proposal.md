# M0-007 dependency-aware SQLite implementation proposal — NOT STARTED

**Proposal only.** The owner authorized subsequent M0–M9 technical development once the actual preceding interfaces suffice, but M0-007 is **not** implemented or accepted in M0-005. Its canonical card depends on M0-006 (completed), M0-004 (usable development foundation, human acceptance deferred) and M0-005 (native technical foundation under review).

## Actual basis available from M0-005

- Tauri v2 has a real window and app-data-directory IPC, with trusted origin/window validation. The native directory path is *not* a general file API. Windows is locally built and the hosted macOS+Windows matrix is configured. No Tauri SQLite plugin, provider, sidecar or model SDK has been approved/added in this slice.
- `packages/storage` has existing in-memory `Storage` with reusable contracts in `src/contracts/{events,content-projections,transactions,serialization}.contract.ts`. `packages/core` defines the stable append-only event envelope, deterministic replay and user settings events. M0-007 should reuse these, not make subject-aware `core` changes.
- Existing native IPC commands do **not** expose arbitrary file handles and may not be reused for raw SQL. A new reviewed, narrowly typed persistence service contract and capability review are required before any DB/file IPC is introduced.

## Implementation slices, each with red/green tests

1. **Port baseline and data scope.** Inventory current `Storage` methods and exact canonical JSON validation semantics. Design a new stable backend adapter for native and web, with no new fields in historical events or consent changes. Agree explicitly on db name/namespace, Windows/mac native file ACLs, lock policy, error taxonomy, Unicode handling, transaction ordering, and cancellation before touching disk. No DB connection to a live learner yet.
2. **Native SQLite storage behind Rust command boundary or a secure worker-owned adapter.** Choose an audited Rust SQLite crate with reviewed build/runtime licenses and a deterministic lockfile. Open the DB only inside Tauri's app-scoped private data location; deny path traversal, symlinks/reparse points, arbitrary SQL, and any renderer-supplied disk path. Support one-writer transactions, immutable event inserts, unique IDs, canonical duplicate rejection, paging and bounded content/projection reads. Use parameterized statements, explicit WAL/locking and corruption/recovery policy. **No Tauri plugin without separate task-card authorization.**
3. **WASM SQLite + OPFS in the web engine/storage worker.** Test secure origin, worker isolation and availability of OPFS/lock primitives on supported browsers; record actual cross-browser support and fallback design (IndexedDB only if approved based on evidence). Do not block native behind absent OPFS hardware; do not pretend a memory-only fallback provides persistence.
4. **Versioned migration harness.** Deterministic forward-only SQL migrations and snapshot DB fixtures from every *released* schema; test crash/restart/transaction atomicity, old event versions/upcasters, no silent historical mutation, idempotent import, conflicts and derived projection rebuild. Do not place real learner records in test artifacts.
5. **Performance and release evidence.** Replay 100,000 synthetic immutable events on designated reference OS/storage, measure p95 append under **10ms**, report hardware/dataset/sample definition and cold/warm behavior. Run common contract suite against both backends, browser PWA/Worker tests, architecture/security/privacy reviews, whole dependency license audit and native macOS/Windows CI. Any unsupported devices/OPFS paths are stated **NOT RUN**, never PASS/N/A by inference.

## Acceptance/owner decisions before M0-007 PR

- Public or persistent IPC interface, new DB dependencies and license/security review require a separately scoped plan and authorization (this document makes no code or dependency choice).
- Resolve M0-005 native trust/CI and permission issues actually used by the SQLite adapter; do not wait for deferred unrelated human accessibility research to start independent technical spikes.
- Preserve `packages/core` subject-agnostic, no model/provider code in storage, no credentials in DB/export, no automatic sync/telemetry.
- Revisit the genuine OPFS support and R5 risk, persistence/storage migration ADR and the existing documented event-deletion privacy exception before claiming milestone completion.
