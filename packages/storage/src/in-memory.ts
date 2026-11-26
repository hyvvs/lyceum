import {
  type ContentRecord,
  type LyceumEvent,
  type ProjectionRecord,
  type Storage,
  StorageError,
  type StorageTransaction,
} from "@lyceum/core";
import { safeStorageError } from "./errors";
import { MemoryStage, committedContent, committedProjection, emptyState, eventPage } from "./stage";
import { validContent, validEvents, validProjection } from "./validation";

const asyncFunctionPrototype = Object.getPrototypeOf(async () => undefined);
const generatorFunctionPrototype = Object.getPrototypeOf(function* () {});
const asyncGeneratorFunctionPrototype = Object.getPrototypeOf(async function* () {});

function requiresAsynchronousCallback(operation: unknown): boolean {
  if (typeof operation !== "function") return true;
  // Function kind prototypes distinguish genuine async/generator functions from
  // perfectly synchronous methods named `async` and arrows with an `async`
  // parameter. A source fallback also rejects functions whose prototype was
  // explicitly reassigned, without trusting a forged Symbol.toStringTag.
  const prototype = Object.getPrototypeOf(operation);
  if (
    prototype === asyncFunctionPrototype ||
    prototype === generatorFunctionPrototype ||
    prototype === asyncGeneratorFunctionPrototype
  ) {
    return true;
  }
  const source = Function.prototype.toString.call(operation);
  return (
    /^\s*(?:async\s+function\b|async\s*\*|function\s*\*|\*)/.test(source) ||
    /^\s*async\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(source)
  );
}

/**
 * Per-instance, memory-only Storage adapter. No global registry, I/O, persistence,
 * browser API, clock, telemetry, or learner-specific behavior.
 */
export function createInMemoryStorage(): Storage {
  const state = emptyState();
  let writerTail: Promise<void> = Promise.resolve();
  let inSynchronousCallback = false;
  let activeStage: MemoryStage | null = null;

  function forbidReentrantWrite(): void {
    // A synchronous transaction callback runs uninterrupted on the JS thread.
    // Independent concurrent callers are queued between callbacks. This guard
    // therefore rejects nested writes without rejecting concurrent writers.
    if (inSynchronousCallback) {
      const error = new StorageError("nested_transaction");
      activeStage?.invalidate(error);
      throw error;
    }
  }

  function queue(operation: (tx: StorageTransaction) => void): Promise<void> {
    forbidReentrantWrite();
    const run = writerTail.then(() => {
      const stage = new MemoryStage(state);
      activeStage = stage;
      inSynchronousCallback = true;
      try {
        // Native async functions must be rejected before running their body:
        // otherwise their continuation could run after the transaction closes.
        // Arbitrary caller JS cannot be sandboxed: callback code must still be
        // trusted to obey the documented synchronous transaction contract.
        // Recognize actual function kinds, not identifier text. Executable
        // custom JS remains a trusted callback boundary, never a sandbox.
        if (requiresAsynchronousCallback(operation)) {
          throw new StorageError("async_transaction");
        }
        const returned: unknown = operation(stage.handle);
        if (returned !== undefined) {
          // An awaited callback would hold a write lock across external code;
          // staging/SQLite adapters deliberately forbid this.
          // Observe only genuine native promises using the intrinsic internal
          // slot brand-check. Do NOT execute arbitrary user-supplied .then
          // methods or invoke getters on untrusted thenables after rollback.
          try {
            void Promise.prototype.then.call(returned, undefined, () => undefined);
          } catch {
            // Non-Promise thenables are rejected without executing their code.
          }
          throw new StorageError("async_transaction");
        }
        stage.commit();
      } catch (error) {
        throw safeStorageError(error, "transaction_aborted");
      } finally {
        stage.close();
        inSynchronousCallback = false;
        activeStage = null;
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
        return Promise.reject(safeStorageError(error, "invalid_event"));
      }
    },

    readEntries(options) {
      try {
        // Read-committed at invocation, even during another staged callback.
        return Promise.resolve(eventPage(state, [], options));
      } catch (error) {
        return Promise.reject(safeStorageError(error, "transaction_aborted"));
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
        return Promise.reject(safeStorageError(error, "transaction_aborted"));
      }
    },

    putContent(record: ContentRecord) {
      forbidReentrantWrite();
      try {
        const captured = validContent(record);
        return queue((tx) => tx.putContent(captured));
      } catch (error) {
        return Promise.reject(safeStorageError(error, "invalid_input"));
      }
    },

    getProjection(id) {
      try {
        return Promise.resolve(committedProjection(state, id));
      } catch (error) {
        return Promise.reject(safeStorageError(error, "transaction_aborted"));
      }
    },

    putProjection(record: ProjectionRecord) {
      forbidReentrantWrite();
      try {
        const captured = validProjection(record);
        return queue((tx) => tx.putProjection(captured));
      } catch (error) {
        return Promise.reject(safeStorageError(error, "invalid_input"));
      }
    },

    transaction(operation) {
      return queue(operation);
    },
  };
  return Object.freeze(storage);
}
