# M0-006 — Storage port and in-memory adapter, contract-first DRAFT checkpoint

**Status:** owner-authorized **implementation**, not independently accepted task completion. The branch is `m0/storage-port-in-memory`. The next PR must remain **OPEN, DRAFT and UNMERGED** until a separate owner review. This does not implement SQLite, migrations, native desktop storage, WASM/OPFS, encryption, export/import packaging, cloud sync, material ingestion, pedagogy, or production Today/Settings integration. Every fixture is explicitly synthetic.

## Prerequisites and authorization

- Final B5 source `1ff346cc11df06ebfb8917934497c1264656f19e` independently accepted by owner; documentation-only amended PR #24 head `cf7331e94fc6ebe61dc175a68290f93277a05070` had [three hosted successes at 45753236499](https://github.com/hyvvs/lyceum/actions/runs/45753236499).
- [PR #24](https://github.com/hyvvs/lyceum/pull/24) was **squash-merged without branch-protection bypass** at actual main `9bf4c774e258a62ac6b61d60ab7825ddf5dbfa5c`.
- Exact actual squash-main [run 45754130114](https://github.com/hyvvs/lyceum/actions/runs/45754130114): **Verify SUCCESS, unrestricted Dependency audit SUCCESS, Secret scan SUCCESS**. The fresh storage branch was created only after this result. Owner's full controlling implementation prompt is preserved **verbatim as a local handoff** in `.git/owner-m0-006-controlling-prompt.md` for continued sessions; it is not added to public Git history.
- M0-006 depends only on completed M0-001. M0-003/004/017 remain `[~]`; ADR-0009 and ADR-0010 unchanged.

## Public ports and package boundaries

New public types [`packages/core/src/storage.ts`](../../../packages/core/src/storage.ts), exported from [`packages/core/src/index.ts`](../../../packages/core/src/index.ts):

| Public interface / type | Bounded contract |
| --- | --- |
| `Storage extends EventStore` | Existing `append(events)` and `read({afterSeq,limit})` preserved; adds `readEntries`, `getLastSeq`, content and projection read/writes, and `transaction(callback)` |
| `SequencedEvent`, `StorageEventPage`, `StorageReadOptions` | Stable monotonically increasing local `seq`, explicit exclusive cursor and page end; no timestamp reordering |
| `StorageJson` | Portable finite JSON: null, boolean, string, finite number, dense arrays or plain/null-prototype records; no executable values, special prototypes or credentials as a storage interface |
| `ContentNamespace`, `ContentRecord` | Ten bounded canonical content namespaces; identity `(namespace,id,revision)`, positive `schemaVersion`, immutable positive monotonically consecutive `revision`, JSON payload |
| `ProjectionRecord` | Stable ID, `asOfSeq` from zero through event head, nonempty `algoVersion`, JSON payload; disposable and replaceable |
| `StorageTransaction` | Synchronous transaction-local append, ordered read, local head, content and projection operations; invalid outside active callback |
| `StorageError` and `StorageErrorCode` | Public stable content-free codes; no untrusted IDs, learner text, exception messages, stacks or causes forwarded |

The in-memory implementation is [`packages/storage/src/in-memory.ts`](../../../packages/storage/src/in-memory.ts), exported from its public entry point. `@lyceum/storage` imports **only the public `@lyceum/core` entry**, has no external dependency additions and no implementation-specific runtime in core. Scoped `AGENTS.md`, package manifest, tsconfig and the internal-only workspace lockfile importer are included. The pre-existing boundary checker is now tested fail-first to reject storage imports/dependencies outside `@lyceum/core`; it was **strengthened, not bypassed**.

### Event ordering and canonical equivalence

The adapter allocates contiguous `seq = 1,2,...` in **serialized local append order**, never based on event `occurredAt`. `EventStore.read` returns events plus `lastSeq` unchanged, and `readEntries` exposes the actual assigned sequence. An absent cursor means `afterSeq=0`; it is **exclusive**. Default limit is 1,000, maximum 10,000, both safe integers; `afterSeq` must be a safe integer from zero through the current head. Explicit null, fractional, negative, nonfinite, overlimit, inherited/getter-backed or future cursors are rejected. An empty page returns `entries=[]` and `lastSeq` equal to its supplied cursor (including end-of-log). Both read APIs validate and return **fresh canonically parsed event copies**.

Use only the four existing `LyceumEventSchema` v1 types: `attempt.recorded`, `session.started`, `session.ended`, `goal.created`. Incoming events are defensively cloned, parsed by the existing Zod schema (including its skill/error-tag defaults), then bounded and cloned **again after defaults** before commit. The validated event is compared semantically and recursively, independent of JavaScript object-property insertion order. Identical existing-ID replays within/across batches consume **no extra sequence**; different canonical content with the same ID conflicts and rolls back the **entire** atomic operation. Malformed or unsupported-version events always reject. No new event schema/upcaster, cross-device deterministic merge order, ZIP import/export or learner algorithm is introduced.

### Content, projections and JSON

Content `getContent(namespace,id,revision?)` returns the exact requested immutable version, the latest if revision omitted, or `null` when absent. First revision must be 1, later revisions **consecutive**; identical same-revision replays are idempotent, conflicting payload or metadata at an existing revision rejects; a skipped revision rejects. `schemaVersion` is required and positive; storage enforces only the envelope and safe JSON boundary, not an invented complete subject/graph/material schema. Future domain consumers own content-specific semantic validation.

Projections have explicit `id, asOfSeq, algoVersion, payload`; they never authorize events or alter the append log. An `asOfSeq` ahead of the committed or **transaction-local** event head rejects. Replacement is permitted with a different algorithm, payload or **lower** `asOfSeq` for deterministic rebuilds. Missing projections return `null`. A small synthetic deterministic ID-count fold, with replacement/rebuild equivalence, tests infrastructure only and is **not** a learner-model projection.

Payloads must be plain portable JSON (up to 64 nested levels and 1,000,000 JSON nodes). Invalid finite values (`NaN`, infinity), functions, symbols, bigints, undefined, cycles, accessors, array holes/extra keys, maps, dates, hostile prototypes and too-deep graphs reject. Arrays and objects are cloned via own descriptors, not arbitrary `toJSON` or property access; nested `__proto__`, constructor and unusual IDs stay inert through null-prototype records and Maps. Every public write validates and snapshots at invocation, with transaction-handle writes snapshotting when called. All reads produce detached copies; original or returned nested object mutation cannot modify committed records. On write and read, the canonical event representation is checked against the same bounds, including after Zod defaults. Free-form text cannot be automatically classified as confidential by this generic port: **application credentials belong only in the future approved vault/keychain architecture**.

### Transactions, isolation, errors, concurrency

`transaction((tx) => { ... })` is intentionally a **trusted synchronous function returning `undefined`**, feasible as a bounded transaction interface for later SQLite adapters. Staging is private; `tx` reads its staged events/content/projections, while public `Storage` read methods return the **committed snapshot at call invocation**, even if invoked during a staged callback. An event/content/projection failure or thrown callback rolls back all changes; a failed nested write **poisons** the outer transaction even if caught. Callback errors are converted to fresh typed content-free errors. The synchronous handle is closed after success/rollback, its temporary buffers cleared and store reference released; no writes/reads through retained closed handles. Reentrant writes throw synchronously; future queued writers continue after failure.

Concurrent independent writers are serialized in the order their methods are invoked. The in-memory implementation uses a private Promise queue, local delta overlay and Maps with no historical-log copy or spread-size operation; failed writers never poison the queue. Native async functions are rejected **before execution**, returned non-undefined values and thenables reject; native rejected Promise results are consumed using the intrinsic Promise brand-check, without invoking arbitrary custom `then` methods. No callback is an executable-JS sandbox: consumer callback code and Proxy traps must be **trusted** and obey the synchronous contract. Future native and worker-hosted SQLite adapters must independently reproduce callback-local synchronous access, invocation-time committed reads, atomic rollback and serializer ordering; this is **not** proof that those adapters or their p95 latency are implemented.

### Privacy, security and future erasure

No browser persistence, localStorage, IndexedDB, network, telemetry, global singleton, filesystem writes, encryption, backdoor, evaluated payload, API-key interface, logger or learner data integration exists. Instance state is private and memory-only. Storage errors never interpolate raw identifiers or learner text. Ordinary event operations are append-only; this **does not override** future explicit user-right-to-erasure workflows, which are separately required but intentionally not implemented in M0-006. M9 sync and archive ingestion are separate.

## Genuine test-first chronology

1. Core port committed independently (`4bb9132`), with all original tests passing.
2. Reusable public-interface contracts committed (`5764d6f`) before adapter; binding them to the initial stub produced **49 real failures / 2 passes** (51 tests; local log `.git/m0-006-red-adapter.txt`), then **51/51 GREEN** after adapter implementation (`df54a61`).
3. New storage-only boundary fixture produced **one real failure** before checker correction (`.git/m0-006-red-boundaries.txt`); checker strengthening independently committed (`e0ab33b`).
4. Independent architecture/privacy review exposed real caller-controlled error text, unsafe async callbacks, null/accessor pagination, retained transaction handles; targeted regressions gave **4 RED / 1 passing** with a real unhandled rejection (`.git/m0-006-review-red.txt`). Canonical Zod default expansion exposed a separate real **1 RED** at the exact JSON-node boundary (`.git/m0-006-canonical-red.txt`). A swallowed nested-write error also produced **1 RED** (`.git/m0-006-reentrant-red.txt`). Hardened implementations and extended contracts were committed (`f563baa`), with **61/61 GREEN**.
5. Final independent security hardening tests for custom thenable non-execution, async `Symbol.toStringTag` spoofing, getter-backed `StorageError.code`, and genuine Promise rejection produced **3 RED / 1 passing** (`.git/m0-006-thenable-red.txt`), then **64/64 GREEN** after source correction. Extended projection payload validation and committed-read snapshots led to the next scoped commit (`89fd02d`). **Final focused in-memory suite: 65 passing cases**, consisting of **55 shared factory-driven contract cases and 10 adapter-specific cases**; all original tests preserved.

These RED artifacts are local Git metadata handoff records, **not claimed hosted test outputs**. Future SQLite implementations supply their own fresh factory and resource lifecycle; reuse this contract suite without altering its behavioral assertions. No external property-test dependency added. Large JSON and 3,072 ordered events are representative correctness evidence, **not a persistent SQLite performance or p95 guarantee**.

## Local verification and review

| Gate | Actual observed result |
| --- | --- |
| Frozen `corepack pnpm install --frozen-lockfile` | PASS, no external lockfile changes |
| Core/storage typechecks, boundary checker, scoped AGENTS, Biome | PASS |
| `corepack pnpm verify` after final review correction | PASS: **31 files, 210 Windows unit passes + one historical Windows-only skip**, 65 storage passes |
| Storybook build | PASS |
| Full Chromium `corepack pnpm test:ui` | PASS **139 tests + one optional capture skip**, fail-closed **341 unique primitive stories, 364 required and 364 executed axe states**, eight additional integrated compositions separately scanned |
| `corepack pnpm --filter @lyceum/web build` | PASS; no storage runtime import into actual production app |
| Full production web/Worker/PWA Playwright | PASS **108 tests + three optional capture skips**, B1/B2/B3/B4 preserved, all **five** original B1 obstruction cases recorded **zero** overlap |
| Unrestricted `corepack pnpm audit` | PASS, no known vulnerabilities |
| Actual emitted gzip `zlib.gzipSync` | `index.html` 585 + ICU 12,699 + eager CSS 8,409 + eager JS 185,099 = **206,792 bytes** (**delta 0**, headroom 43,208 under 250,000); separate Worker **24,087** (**delta 0**) |

These full browser/audit numbers were observed during M0-006 development with the unchanged production web artifacts; final post-correction exact-head hosted Verify/audit/secrets must be recorded in the Draft PR body without recursively committing its own CI citation. No storage screenshots requested or created.

**Independent read-only architecture reviewer:** identified async callback unhandled rejection and null pagination; reviewed corrected source and found both resolved, no remaining confirmed architecture blocker. SQLite worker/native synchronous transaction-local reads and committed-visibility semantics remain a future acceptance obligation.

**Independent read-only security/privacy reviewer:** identified forged StorageError message disclosure, thenable effects, accessor reads, retained-stage references; confirmed first correction resolved the material leaks, and suggested final hardening. Subsequent genuine RED/GREEN tests rejected custom thenable execution and async function tag spoofing, and made error-code sanitization descriptor-based; no generic arbitrary-JS callback sandbox is claimed. Fresh exact-final review/hosted security gates still separate from static analysis.

**Independent read-only data correctness reviewer:** found Zod defaults could cause a stored 1,000,000-node event to become unreadable; wrote exact boundary regression before correcting parsed-canonical revalidation. Also identified pagination/revision/rollback and return-copy contract gaps, covered by additional shared tests. No new learner algorithms.

## Remaining risks and explicit stop

**DRAFT / NOT ACCEPTED:** M0-006 remains `[~]` until independent owner acceptance. No SQLite, WASM/OPFS, migrations, persistent p95 benchmark, user erasure flow, import/export packaging, material ingestion, cloud sync or native deployment. Future M0-007 must choose SQLite native/worker adapter mechanics, prove its callback/read isolation contract and transaction recovery, supply fresh adapter-specific factories/lifecycle, test migrations and actual persistent p95, and satisfy its own M0-004/M0-005 dependencies. Cross-device ordering and broader user data retention/deletion/credentials are downstream decisions.

**Manual/visual boundaries unchanged:** M0-003/004/017 `[~]`, all **20** qualified native/manual accessibility cases including `READ-01` **BLOCKED / NOT RUN**, real assistive tech, native Windows Contrast, browser UI zoom and owner matrix approvals outstanding. ADR-0009 FocusScope deferral and ADR-0010 temporary Workbox dependency-override removal/full-retest obligations remain binding. This infrastructure Draft PR is neither V5 fidelity nor WCAG certification, milestone completion or release.
