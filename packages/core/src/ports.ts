/**
 * Ports: the only way the engine touches the outside world.
 * Engine code receives these by injection. It never calls Date.now(), Math.random(),
 * fetch(), or touches storage directly. This keeps everything deterministic and testable.
 */
import type { LyceumEvent } from "./events";

export interface Clock {
  now(): Date;
}

/** Seedable random source returning floats in [0, 1). */
export interface Rng {
  next(): number;
}

export interface EventStore {
  /** Append events atomically. Events are immutable once stored. */
  append(events: readonly LyceumEvent[]): Promise<void>;
  /** Read events in append order, optionally after a sequence number. */
  read(options?: { afterSeq?: number; limit?: number }): Promise<{
    events: LyceumEvent[];
    lastSeq: number;
  }>;
}

export const systemClock: Clock = { now: () => new Date() };

/** Small, fast, seedable PRNG (mulberry32). Good enough for sampling and tests. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
