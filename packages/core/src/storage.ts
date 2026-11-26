import type { LyceumEvent } from "./events";
import type { EventStore } from "./ports";

/**
 * Portable JSON only: no dates, binary blobs, class instances, functions or
 * credentials. The in-memory adapter rejects accessor-backed/prototype values,
 * nonfinite numbers and cycles; a depth of >64 or >1,000,000 JSON nodes is
 * invalid. Future adapters must preserve the same portable representation.
 */
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

/**
 * Disposable derived state, never authoritative learner history. Replacing a
 * projection may move asOfSeq backwards (e.g. rebuilding from zero), but never
 * past the current transaction-local head, and never edits historical events.
 */
export interface ProjectionRecord {
  readonly id: string;
  readonly asOfSeq: number;
  readonly algoVersion: string;
  readonly payload: StorageJson;
}

/**
 * Only valid during the synchronous transaction callback. Methods reject use
 * after commit/rollback. Reads on this handle see staged writes; reads through
 * the enclosing Storage see only committed data sampled at read invocation.
 * Any validation/duplicate conflict or nested write poisons the transaction
 * even if the consumer catches the immediate error.
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
 * A transaction callback MUST be a trusted synchronous function returning
 * undefined: async/generator callbacks, returned promises/thenables and
 * nested/reentrant storage writes are rejected. Reentrant writes throw
 * synchronously; other validation failures reject the returned Promise.
 * No arbitrary JavaScript callback or Proxy sandbox is implied.
 *
 * Standalone append/content/projection writes snapshot and validate at method
 * invocation, before waiting in the serialized writer queue. Transaction-handle
 * writes snapshot immediately at their synchronous handle method invocation.
 * Caller-held objects and returned records cannot mutate committed state.
 *
 * A future native/WASM SQLite adapter must match committed read visibility and
 * provide synchronous transaction-local reads within its bounded callback.
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
