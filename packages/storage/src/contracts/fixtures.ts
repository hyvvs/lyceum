import { LyceumEventSchema } from "@lyceum/core";
import type { ContentRecord, LyceumEvent, Storage, StorageJson } from "@lyceum/core";

/** Every datum in the shared suite is synthetic; no learner records are used. */
export function event(
  type: LyceumEvent["type"],
  id: string,
  occurredAt = "2026-01-02T12:00:00.000Z",
): LyceumEvent {
  const envelope = {
    id,
    deviceId: "synthetic-device",
    userId: "synthetic-user",
    occurredAt,
    version: 1,
  };
  switch (type) {
    case "attempt.recorded":
      return LyceumEventSchema.parse({
        ...envelope,
        type,
        payload: {
          itemId: "synthetic-item",
          conceptIds: ["synthetic-concept"],
          score: 0.75,
          responseMs: 1200,
          hintLevel: 0,
          context: "practice",
        },
      });
    case "session.started":
      return LyceumEventSchema.parse({
        ...envelope,
        type,
        payload: { sessionId: "synthetic-session", plannedMinutes: 20 },
      });
    case "session.ended":
      return LyceumEventSchema.parse({
        ...envelope,
        type,
        payload: { sessionId: "synthetic-session", actualMinutes: 15, completed: true },
      });
    case "goal.created":
      return LyceumEventSchema.parse({
        ...envelope,
        type,
        payload: {
          subjectId: "synthetic-subject",
          outcome: "synthetic outcome",
          definitionOfDone: "synthetic completion",
          weeklyHours: 2,
          sourceMode: "open",
        },
      });
  }
}

export function attempt(id: string): LyceumEvent & { type: "attempt.recorded" } {
  return event("attempt.recorded", id) as LyceumEvent & { type: "attempt.recorded" };
}

export function content(
  id: string,
  payload: StorageJson = { synthetic: true, nodes: [1, 2] },
  revision = 1,
): ContentRecord {
  return {
    namespace: "concept-graph",
    id,
    schemaVersion: 1,
    revision,
    payload,
  };
}

export type StorageFactory = () => Storage | Promise<Storage>;

export function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
