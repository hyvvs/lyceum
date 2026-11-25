import { z } from "zod";

const requestId = z
  .string()
  .regex(/^w[0-9]{1,12}$/)
  .max(13);
export const requestSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    version: z.literal(1),
    requestId,
    kind: z.literal("probe"),
    payload: z.strictObject({ delayMs: z.union([z.literal(0), z.literal(250)]) }),
  }),
  z.strictObject({ version: z.literal(1), requestId, kind: z.literal("cancel") }),
]);
export const responseSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    version: z.literal(1),
    requestId,
    kind: z.literal("ready"),
    payload: z.strictObject({ transport: z.literal("connected") }),
  }),
  z.strictObject({ version: z.literal(1), requestId, kind: z.literal("cancelled") }),
  z.strictObject({
    version: z.literal(1),
    requestId,
    kind: z.literal("error"),
    code: z.enum(["invalid-message", "worker-failed"]),
  }),
]);

export type WorkerRequest = z.infer<typeof requestSchema>;
export type WorkerResponse = z.infer<typeof responseSchema>;
export type ProbeResult = Extract<WorkerResponse, { kind: "ready" | "cancelled" }>;
/** Local abort is distinct from an actual worker cancellation acknowledgement. */
export type ClientProbeResult = ProbeResult | { kind: "aborted" };
