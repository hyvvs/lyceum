import {
  type ContentNamespace,
  type ContentRecord,
  type LyceumEvent,
  LyceumEventSchema,
  type ProjectionRecord,
  StorageError,
  type StorageJson,
  type StorageReadOptions,
} from "@lyceum/core";
import { cloneJson, equalJson } from "./json";

const NAMESPACES: ReadonlySet<string> = new Set([
  "subject",
  "goal",
  "concept-graph",
  "skill",
  "blueprint",
  "material",
  "chunk",
  "item",
  "rubric",
  "exam-definition",
]);

function badInput(): never {
  throw new StorageError("invalid_input");
}

export function validId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) badInput();
  return value;
}

export function validNamespace(value: unknown): ContentNamespace {
  if (typeof value !== "string" || !NAMESPACES.has(value)) badInput();
  return value as ContentNamespace;
}

function safeInt(value: unknown, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) badInput();
  return value;
}

function fields(value: unknown, names: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) badInput();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) badInput();
  const actual = Reflect.ownKeys(value);
  if (
    actual.length !== names.length ||
    actual.some((key) => typeof key !== "string" || !names.includes(key))
  ) {
    badInput();
  }
  const data: Record<string, unknown> = Object.create(null);
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor?.enumerable || !("value" in descriptor)) badInput();
    Object.defineProperty(data, name, {
      value: descriptor.value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return data;
}

/** Zod supplies canonical defaults before any equality check or stored snapshot. */
export function validEvent(value: unknown): LyceumEvent {
  try {
    const safe = cloneJson(value);
    const parsed = LyceumEventSchema.safeParse(safe);
    if (!parsed.success) throw new StorageError("invalid_event");
    // Zod may add default arrays or normalize optional fields. Verify the
    // *canonical* representation against the same portable JSON bounds before
    // committing it, or a successful write could become unreadable on replay.
    return cloneJson(parsed.data) as unknown as LyceumEvent;
  } catch {
    throw new StorageError("invalid_event");
  }
}

export function validEvents(value: readonly LyceumEvent[]): LyceumEvent[] {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw new StorageError("invalid_event");
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    const length = lengthDescriptor?.value;
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length > 100_000) {
      throw new StorageError("invalid_event");
    }
    if (Reflect.ownKeys(value).length !== length + 1) {
      throw new StorageError("invalid_event");
    }
    const canonical: LyceumEvent[] = [];
    for (let i = 0; i < length; i++) {
      const slot = Object.getOwnPropertyDescriptor(value, String(i));
      if (!slot?.enumerable || !("value" in slot)) throw new StorageError("invalid_event");
      canonical.push(validEvent(slot.value));
    }
    return canonical;
  } catch {
    throw new StorageError("invalid_event");
  }
}

export function sameEvent(a: LyceumEvent, b: LyceumEvent): boolean {
  // Both values have already passed LyceumEventSchema parsing and JSON checks.
  return equalJson(a as unknown as StorageJson, b as unknown as StorageJson);
}

export function validContent(value: ContentRecord): ContentRecord {
  const data = fields(value, ["namespace", "id", "schemaVersion", "revision", "payload"]);
  return {
    namespace: validNamespace(data.namespace),
    id: validId(data.id),
    schemaVersion: safeInt(data.schemaVersion, 1),
    revision: safeInt(data.revision, 1),
    payload: cloneJson(data.payload),
  };
}

export function validProjection(value: ProjectionRecord): ProjectionRecord {
  const data = fields(value, ["id", "asOfSeq", "algoVersion", "payload"]);
  const algoVersion = validId(data.algoVersion);
  return {
    id: validId(data.id),
    asOfSeq: safeInt(data.asOfSeq, 0),
    algoVersion,
    payload: cloneJson(data.payload),
  };
}

export function validContentLookup(
  namespace: ContentNamespace,
  id: string,
  revision?: number,
): { namespace: ContentNamespace; id: string; revision?: number } {
  const valid = { namespace: validNamespace(namespace), id: validId(id) };
  return revision === undefined ? valid : { ...valid, revision: safeInt(revision, 1) };
}

export function validPagination(
  options: StorageReadOptions | undefined,
  currentHead: number,
): { afterSeq: number; limit: number } {
  try {
    const snapshot: { afterSeq?: unknown; limit?: unknown } = Object.create(null);
    if (options !== undefined) {
      if (options === null || typeof options !== "object" || Array.isArray(options)) badInput();
      const prototype = Object.getPrototypeOf(options);
      if (prototype !== Object.prototype && prototype !== null) badInput();
      for (const key of Reflect.ownKeys(options)) {
        if (key !== "afterSeq" && key !== "limit") badInput();
        const descriptor = Object.getOwnPropertyDescriptor(options, key);
        if (!descriptor?.enumerable || !("value" in descriptor)) badInput();
        Object.defineProperty(snapshot, key, {
          value: descriptor.value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
    }
    // Undefined is omission. Explicit null is always invalid.
    const afterSeq = safeInt(snapshot.afterSeq === undefined ? 0 : snapshot.afterSeq, 0);
    const limit = safeInt(snapshot.limit === undefined ? 1000 : snapshot.limit, 1);
    if (afterSeq > currentHead || limit > 10_000) badInput();
    return { afterSeq, limit };
  } catch {
    throw new StorageError("invalid_input");
  }
}
