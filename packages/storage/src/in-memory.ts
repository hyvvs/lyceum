import {
  type ContentRecord,
  type LyceumEvent,
  type ProjectionRecord,
  type Storage,
  StorageError,
  type StorageTransaction,
} from "@lyceum/core";
import { MemoryStage, committedContent, committedProjection, emptyState, eventPage } from "./stage";
import { validContent, validEvents, validProjection } from "./validation";

/**
 * Per-instance, memory-only Storage adapter. No global registry, I/O, persistence,
 * browser API, clock, telemetry, or learner-specific behavior.
 */
export function createInMemoryStorage(): Storage {
  const state = emptyState();
  let writerTail: Promise<void> = Promise.resolve();
  let inSynchronousCallback = false;

  function forbidReentrantWrite(): void {
    // A synchronous transaction callback runs uninterrupted on the JS thread.
    // Independent concurrent callers are queued between callbacks. This guard
    // therefore rejects nested writes without rejecting concurrent writers.
    if (inSynchronousCallback) throw new StorageError("nested_transaction");
  }

  function queue(operation: (tx: StorageTransaction) => void): Promise<void> {
    forbidReentrantWrite();
    const run = writerTail.then(() => {
      const stage = new MemoryStage(state);
      inSynchronousCallback = true;
      try {
        const returned: unknown = operation(stage.handle);
        if (
          returned !== null &&
          (typeof returned === "object" || typeof returned === "function") &&
          "then" in returned
        ) {
          // An awaited callback would hold a write lock across external code;
          // staging/SQLite adapters deliberately forbid this.
          throw new StorageError("async_transaction");
        }
        stage.commit();
      } catch (error) {
        throw error instanceof StorageError ? error : new StorageError("transaction_aborted");
      } finally {
        stage.close();
        inSynchronousCallback = false;
      }
    });
    // A rejected writer never poisons the serialization queue.
    writerTail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  const storage: Storage = {
    append(events: readonly LyceumEvent[]): Promise<void> {
      forbidReentrantWrite();
      // Snapshot and validate at invocation, not when the queued writer runs.
      try {
        const captured = validEvents(events);
        return queue((tx) => tx.append(captured));
      } catch (error) {
        return Promise.reject(
          error instanceof StorageError ? error : new StorageError("invalid_event"),
        );
      }
    },

    readEntries(options) {
      try {
        // Read-committed at invocation, even during another staged callback.
        return Promise.resolve(eventPage(state, [], options));
      } catch (error) {
        return Promise.reject(
          error instanceof StorageError ? error : new StorageError("transaction_aborted"),
        );
      }
    },

    read(options) {
      return storage.readEntries(options).then((page) => ({
        events: page.entries.map((row) => row.event),
        lastSeq: page.lastSeq,
      }));
    },

    getLastSeq() {
      return Promise.resolve(state.entries.length);
    },

    getContent(namespace, id, revision) {
      try {
        return Promise.resolve(committedContent(state, namespace, id, revision));
      } catch (error) {
        return Promise.reject(
          error instanceof StorageError ? error : new StorageError("transaction_aborted"),
        );
      }
    },

    putContent(record: ContentRecord) {
      forbidReentrantWrite();
      try {
        const captured = validContent(record);
        return queue((tx) => tx.putContent(captured));
      } catch (error) {
        return Promise.reject(
          error instanceof StorageError ? error : new StorageError("invalid_input"),
        );
      }
    },

    getProjection(id) {
      try {
        return Promise.resolve(committedProjection(state, id));
      } catch (error) {
        return Promise.reject(
          error instanceof StorageError ? error : new StorageError("transaction_aborted"),
        );
      }
    },

    putProjection(record: ProjectionRecord) {
      forbidReentrantWrite();
      try {
        const captured = validProjection(record);
        return queue((tx) => tx.putProjection(captured));
      } catch (error) {
        return Promise.reject(
          error instanceof StorageError ? error : new StorageError("invalid_input"),
        );
      }
    },

    transaction(operation) {
      return queue(operation);
    },
  };
  return Object.freeze(storage);
}
