import {
  type ContentNamespace,
  type ContentRecord,
  type LyceumEvent,
  type ProjectionRecord,
  type SequencedEvent,
  StorageError,
  type StorageEventPage,
  type StorageJson,
  type StorageReadOptions,
  type StorageTransaction,
} from "@lyceum/core";
import { safeStorageError } from "./errors";
import { equalJson } from "./json";
import {
  sameEvent,
  validContent,
  validContentLookup,
  validEvent,
  validEvents,
  validId,
  validPagination,
  validProjection,
} from "./validation";

type RevisionMap = Map<number, ContentRecord>;
type IdMap = Map<string, RevisionMap>;
type ContentMap = Map<ContentNamespace, IdMap>;

/** All state is instance-owned. Never export the maps to a Storage consumer. */
export interface MemoryState {
  readonly entries: SequencedEvent[];
  readonly eventIds: Map<string, LyceumEvent>;
  readonly content: ContentMap;
  readonly projections: Map<string, ProjectionRecord>;
}

export function emptyState(): MemoryState {
  return {
    entries: [],
    eventIds: new Map(),
    content: new Map(),
    projections: new Map(),
  };
}

export function eventPage(
  state: MemoryState,
  staged: readonly SequencedEvent[],
  options?: StorageReadOptions,
): StorageEventPage {
  const committedHead = state.entries.length;
  const head = committedHead + staged.length;
  const { afterSeq, limit } = validPagination(options, head);
  const entries: SequencedEvent[] = [];
  const through = Math.min(head, afterSeq + limit);
  for (let seq = afterSeq + 1; seq <= through; seq++) {
    const record = seq <= committedHead ? state.entries[seq - 1] : staged[seq - committedHead - 1];
    if (record?.seq !== seq) throw new StorageError("transaction_aborted");
    // Parse on read as well as write, producing a fresh canonical defensive copy.
    entries.push({ seq, event: validEvent(record.event) });
  }
  return { entries, lastSeq: entries[entries.length - 1]?.seq ?? afterSeq };
}

export function committedContent(
  state: MemoryState,
  namespace: ContentNamespace,
  id: string,
  revision?: number,
): ContentRecord | null {
  validContentLookup(namespace, id, revision);
  const revisions = state.content.get(namespace)?.get(id);
  const desired = revision ?? revisions?.size;
  const record = desired === undefined ? undefined : revisions?.get(desired);
  return record ? validContent(record) : null;
}

export function committedProjection(state: MemoryState, id: string): ProjectionRecord | null {
  validId(id);
  const record = state.projections.get(id);
  return record ? validProjection(record) : null;
}

/**
 * A transaction is a private overlay, not a copy of the entire historical log.
 * The sole writer builds and validates the overlay before any committed mutation.
 */
export class MemoryStage {
  readonly handle: StorageTransaction;
  private open = true;
  private poison: StorageError | null = null;
  private readonly stagedEvents: SequencedEvent[] = [];
  private readonly stagedIds = new Map<string, LyceumEvent>();
  private readonly stagedContent: ContentMap = new Map();
  private readonly stagedProjections = new Map<string, ProjectionRecord>();

  constructor(private state: MemoryState | null) {
    this.handle = Object.freeze({
      append: (events: readonly LyceumEvent[]) => this.append(events),
      readEntries: (options?: StorageReadOptions) => this.readEntries(options),
      getLastSeq: () => this.getLastSeq(),
      getContent: (namespace: ContentNamespace, id: string, revision?: number) =>
        this.getContent(namespace, id, revision),
      putContent: (record: ContentRecord) => this.putContent(record),
      getProjection: (id: string) => this.getProjection(id),
      putProjection: (record: ProjectionRecord) => this.putProjection(record),
    });
  }

  private assertOpen(): void {
    if (!this.open) throw new StorageError("closed_transaction");
    if (this.poison) throw this.poison;
  }

  private get current(): MemoryState {
    this.assertOpen();
    if (!this.state) throw new StorageError("closed_transaction");
    return this.state;
  }

  private run<T>(action: () => T): T {
    this.assertOpen();
    try {
      return action();
    } catch (error) {
      // Even if the callback swallows a validation/conflict error, rollback wins.
      this.poison = safeStorageError(error, "transaction_aborted");
      throw this.poison;
    }
  }

  /** Reentrant writes poison the enclosing transaction even if caller catches. */
  invalidate(error: StorageError): void {
    if (this.open && !this.poison) this.poison = safeStorageError(error, "nested_transaction");
  }

  private getLastSeq(): number {
    return this.run(() => this.current.entries.length + this.stagedEvents.length);
  }

  private append(events: readonly LyceumEvent[]): void {
    this.run(() => {
      const canonical = validEvents(events);
      for (const candidate of canonical) {
        const previous =
          this.stagedIds.get(candidate.id) ?? this.current.eventIds.get(candidate.id);
        if (previous) {
          if (!sameEvent(previous, candidate)) throw new StorageError("conflict");
          continue;
        }
        const seq = this.current.entries.length + this.stagedEvents.length + 1;
        this.stagedEvents.push({ seq, event: candidate });
        this.stagedIds.set(candidate.id, candidate);
      }
    });
  }

  private readEntries(options?: StorageReadOptions): StorageEventPage {
    return this.run(() => eventPage(this.current, this.stagedEvents, options));
  }

  private getContent(
    namespace: ContentNamespace,
    id: string,
    revision?: number,
  ): ContentRecord | null {
    return this.run(() => {
      validContentLookup(namespace, id, revision);
      const stored = this.current.content.get(namespace)?.get(id);
      const staged = this.stagedContent.get(namespace)?.get(id);
      const desired = revision ?? (stored?.size ?? 0) + (staged?.size ?? 0);
      const item = staged?.get(desired) ?? stored?.get(desired);
      return item ? validContent(item) : null;
    });
  }

  private putContent(input: ContentRecord): void {
    this.run(() => {
      const candidate = validContent(input);
      const stored = this.current.content.get(candidate.namespace)?.get(candidate.id);
      const staged = this.stagedContent.get(candidate.namespace)?.get(candidate.id);
      const head = (stored?.size ?? 0) + (staged?.size ?? 0);
      if (candidate.revision <= head) {
        const previous = staged?.get(candidate.revision) ?? stored?.get(candidate.revision);
        if (
          !previous ||
          !equalJson(previous as unknown as StorageJson, candidate as unknown as StorageJson)
        ) {
          throw new StorageError("conflict");
        }
        return; // identical immutable revision replay
      }
      if (candidate.revision !== head + 1) throw new StorageError("invalid_input");
      let ids = this.stagedContent.get(candidate.namespace);
      if (!ids) {
        ids = new Map();
        this.stagedContent.set(candidate.namespace, ids);
      }
      let revisions = ids.get(candidate.id);
      if (!revisions) {
        revisions = new Map();
        ids.set(candidate.id, revisions);
      }
      revisions.set(candidate.revision, candidate);
    });
  }

  private getProjection(id: string): ProjectionRecord | null {
    return this.run(() => {
      validId(id);
      const record = this.stagedProjections.get(id) ?? this.current.projections.get(id);
      return record ? validProjection(record) : null;
    });
  }

  private putProjection(input: ProjectionRecord): void {
    this.run(() => {
      const candidate = validProjection(input);
      const head = this.current.entries.length + this.stagedEvents.length;
      if (candidate.asOfSeq > head) throw new StorageError("invalid_input");
      this.stagedProjections.set(candidate.id, candidate);
    });
  }

  /** Called only after the synchronous user callback returns successfully. */
  commit(): void {
    this.assertOpen();
    // All possible validation and callback failures happened while staging.
    // No O(history) log copy or spread-call limit: work is proportional to delta.
    const committed = this.current;
    for (const entry of this.stagedEvents) {
      committed.entries.push(entry);
      committed.eventIds.set(entry.event.id, entry.event);
    }
    for (const [namespace, ids] of this.stagedContent) {
      let committedIds = committed.content.get(namespace);
      if (!committedIds) {
        committedIds = new Map();
        committed.content.set(namespace, committedIds);
      }
      for (const [id, versions] of ids) {
        let committedVersions = committedIds.get(id);
        if (!committedVersions) {
          committedVersions = new Map();
          committedIds.set(id, committedVersions);
        }
        for (const [revision, item] of versions) committedVersions.set(revision, item);
      }
    }
    for (const [id, record] of this.stagedProjections) committed.projections.set(id, record);
  }

  close(): void {
    this.open = false;
    // Retained closed transaction handles must not retain the active store or
    // raw staged learner payloads indefinitely through their closures.
    this.stagedEvents.length = 0;
    this.stagedIds.clear();
    this.stagedContent.clear();
    this.stagedProjections.clear();
    this.state = null;
  }
}
