import type { LyceumEvent } from "./events";
import type { EventStore } from "./ports";

/** Portable JSON only: no dates, binary blobs, class instances, functions, or credentials. */
export type StorageJson =
  | null
  | boolean
  | number
  | string
  | readonly StorageJson[]
  | { readonly [key: string]: StorageJson };

/**
 * Bounded canonical content-store namespaces. Entity-specific schema validation
 * remains the responsibility of its future owning domain/content consumer.
 * In particular, this is NOT a file/blob or credential store.
 */
export type ContentNamespace =
  | "subject"
  | "goal"
  | "concept-graph"
  | "skill"
  | "blueprint"
  | "material"
  | "chunk"
  | "item"
  | "rubric"
  | "exam-definition";

/** Local append order, independent of occurrence timestamps or future sync order. */
export interface SequencedEvent {
  readonly seq: number;
  readonly event: LyceumEvent;
}

export interface StorageReadOptions {
  /** Exclusive cursor. Defaults to zero; must be a safe integer in [0, current head]. */
  afterSeq?: number;
  /** Defaults to 1,000; must be a positive safe integer at most 10,000. */
  limit?: number;
}

export interface StorageEventPage {
  readonly entries: readonly SequencedEvent[];
  /** Last returned sequence, or the requested cursor when the page is empty. */
  readonly lastSeq: number;
}

/** Immutable per (namespace, id, revision); revisions start at one and never skip. */
export interface ContentRecord {
  readonly namespace: ContentNamespace;
  readonly id: string;
  readonly schemaVersion: number;
  readonly revision: number;
  readonly payload: StorageJson;
}

/** Disposable derived state, always bounded by the locally committed event head. */
export interface ProjectionRecord {
  readonly id: string;
  readonly asOfSeq: number;
  readonly algoVersion: string;
  readonly payload: StorageJson;
}

/**
 * Only valid during the synchronous transaction callback. Methods reject use
 * after commit/rollback. Reads on this handle see staged writes; reads through
 * the enclosing Storage see only committed data.
 */
export interface StorageTransaction {
  append(events: readonly LyceumEvent[]): void;
  readEntries(options?: StorageReadOptions): StorageEventPage;
  getLastSeq(): number;
  getContent(namespace: ContentNamespace, id: string, revision?: number): ContentRecord | null;
  putContent(record: ContentRecord): void;
  getProjection(id: string): ProjectionRecord | null;
  putProjection(record: ProjectionRecord): void;
}

/**
 * Subject-agnostic storage port. A single serialized writer owns local sequence
 * assignment. Reads see committed state at invocation, not pending writes.
 * Transactions stage all writes and atomically commit or roll back.
 *
 * A transaction callback MUST be synchronous: thenables and nested/reentrant
 * storage writes are rejected so neither SQLite adapter needs an async lock
 * held across arbitrary awaited user code.
 */
export interface Storage extends EventStore {
  readEntries(options?: StorageReadOptions): Promise<StorageEventPage>;
  getLastSeq(): Promise<number>;
  getContent(
    namespace: ContentNamespace,
    id: string,
    revision?: number,
  ): Promise<ContentRecord | null>;
  putContent(record: ContentRecord): Promise<void>;
  getProjection(id: string): Promise<ProjectionRecord | null>;
  putProjection(record: ProjectionRecord): Promise<void>;
  transaction(operation: (tx: StorageTransaction) => void): Promise<void>;
}

/** Stable content-free errors: never interpolate IDs or learner payloads. */
export type StorageErrorCode =
  | "invalid_input"
  | "invalid_event"
  | "invalid_json"
  | "conflict"
  | "closed_transaction"
  | "nested_transaction"
  | "async_transaction"
  | "transaction_aborted";

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode) {
    super(code);
    this.name = "StorageError";
    this.code = code;
  }
}
