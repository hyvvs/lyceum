import { StorageError, type StorageJson } from "@lyceum/core";

// Conservative portable JSON boundary, suitable for subsequent SQLite JSON columns.
// Bounds avoid accidental stack exhaustion and unbounded object-graph traversal.
const MAX_DEPTH = 64;
const MAX_NODES = 1_000_000;

interface Traversal {
  readonly active: Set<object>;
  count: number;
}

function invalid(): never {
  throw new StorageError("invalid_json");
}

function copyValue(value: unknown, depth: number, state: Traversal): StorageJson {
  state.count++;
  if (depth > MAX_DEPTH || state.count > MAX_NODES) invalid();
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid();
    return value;
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || state.active.has(value)) invalid();
    // Native arrays have their indexed own keys plus the non-enumerable length.
    // Reject custom properties, symbols and holes rather than silently dropping them.
    if (Reflect.ownKeys(value).length !== value.length + 1) invalid();
    state.active.add(value);
    const out: StorageJson[] = [];
    for (let i = 0; i < value.length; i++) {
      const slot = Object.getOwnPropertyDescriptor(value, String(i));
      if (!slot?.enumerable || !("value" in slot)) invalid();
      out.push(copyValue(slot.value, depth + 1, state));
    }
    state.active.delete(value);
    return out;
  }
  if (typeof value !== "object") invalid();
  const prototype = Object.getPrototypeOf(value);
  if ((prototype !== null && prototype !== Object.prototype) || state.active.has(value)) invalid();
  state.active.add(value);
  // A null prototype prevents "__proto__" or "constructor" keys from gaining
  // special semantics in the cloned payload.
  const out: Record<string, StorageJson> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") invalid();
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (!field?.enumerable || !("value" in field)) invalid();
    Object.defineProperty(out, key, {
      value: copyValue(field.value, depth + 1, state),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  state.active.delete(value);
  return out;
}

/** Clone defensively; never execute accessors, toJSON methods, or arbitrary prototypes. */
export function cloneJson(value: unknown): StorageJson {
  try {
    return copyValue(value, 0, { active: new Set(), count: 0 });
  } catch {
    // Do not propagate untrusted getter/proxy exceptions containing raw payloads.
    return invalid();
  }
}

/** Structural equality of canonical JSON, independent of object key insertion order. */
export function equalJson(a: StorageJson, b: StorageJson): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!equalJson(a[i] as StorageJson, b[i] as StorageJson)) return false;
    }
    return true;
  }
  if (typeof a !== "object" || typeof b !== "object") return false;
  const left = a as Record<string, StorageJson>;
  const right = b as Record<string, StorageJson>;
  const aKeys = Object.keys(left).sort();
  const bKeys = Object.keys(right).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    const key = aKeys[i];
    if (
      key === undefined ||
      key !== bKeys[i] ||
      !equalJson(left[key] as StorageJson, right[key] as StorageJson)
    ) {
      return false;
    }
  }
  return true;
}
