import { z } from "zod";

/**
 * Every change to learner-visible state is an immutable, versioned event.
 * Derived state (mastery, schedules, plans) is recomputed from events.
 * Rules: never edit an existing event schema in place; add a new version and an upcaster.
 */

const envelope = {
  id: z.string().min(1),
  /** Originating device, used when merging events from several devices. */
  deviceId: z.string().min(1),
  occurredAt: z.string().datetime(),
  userId: z.string().min(1),
  goalId: z.string().min(1).optional(),
};

export const AttemptRecorded = z.object({
  ...envelope,
  type: z.literal("attempt.recorded"),
  version: z.literal(1),
  payload: z.object({
    itemId: z.string().min(1),
    conceptIds: z.array(z.string().min(1)).min(1),
    skillIds: z.array(z.string()).default([]),
    /** 0..1. Partial credit allowed. */
    score: z.number().min(0).max(1),
    responseMs: z.number().int().nonnegative(),
    /** Highest rung of the hint ladder used (0 = none). */
    hintLevel: z.number().int().min(0).max(5),
    /** Learner's self-rated confidence before feedback, 1..5. */
    confidence: z.number().int().min(1).max(5).optional(),
    errorTags: z.array(z.string()).default([]),
    context: z.enum(["diagnostic", "practice", "review", "exam", "teachback"]),
  }),
});

export const SessionStarted = z.object({
  ...envelope,
  type: z.literal("session.started"),
  version: z.literal(1),
  payload: z.object({
    sessionId: z.string().min(1),
    plannedMinutes: z.number().int().positive(),
  }),
});

export const SessionEnded = z.object({
  ...envelope,
  type: z.literal("session.ended"),
  version: z.literal(1),
  payload: z.object({
    sessionId: z.string().min(1),
    actualMinutes: z.number().nonnegative(),
    completed: z.boolean(),
  }),
});

export const GoalCreated = z.object({
  ...envelope,
  type: z.literal("goal.created"),
  version: z.literal(1),
  payload: z.object({
    subjectId: z.string().min(1),
    outcome: z.string().min(1),
    definitionOfDone: z.string().min(1),
    deadline: z.string().datetime().optional(),
    weeklyHours: z.number().positive(),
    sourceMode: z.enum(["materials_only", "materials_first", "open"]),
  }),
});

/** Initial v1 user-level setting: no goalId, arbitrary patches or appearance fields. */
export const PreferencesChanged = z.strictObject({
  ...envelope,
  goalId: z.never().optional(),
  type: z.literal("preferences.changed"),
  version: z.literal(1),
  payload: z.strictObject({
    setting: z.literal("mockExamExtendedTime"),
    value: z.union([z.null(), z.literal(1.25), z.literal(1.5)]),
  }),
});

/** Initial v1 user-level privacy input; consent is never inferred from absence. */
export const PrivacyChanged = z.strictObject({
  ...envelope,
  goalId: z.never().optional(),
  type: z.literal("privacy.changed"),
  version: z.literal(1),
  payload: z.discriminatedUnion("setting", [
    z.strictObject({
      setting: z.literal("localModelsOnly"),
      value: z.union([z.boolean(), z.null()]),
    }),
    z.strictObject({
      setting: z.literal("telemetryConsent"),
      value: z.union([z.enum(["granted", "denied"]), z.null()]),
    }),
  ]),
});

export const LyceumEventSchema = z.discriminatedUnion("type", [
  AttemptRecorded,
  SessionStarted,
  SessionEnded,
  GoalCreated,
  PreferencesChanged,
  PrivacyChanged,
]);

export type LyceumEvent = z.infer<typeof LyceumEventSchema>;
export type AttemptRecordedEvent = z.infer<typeof AttemptRecorded>;
export type PreferencesChangedEvent = z.infer<typeof PreferencesChanged>;
export type PrivacyChangedEvent = z.infer<typeof PrivacyChanged>;
