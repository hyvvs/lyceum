import { type WorkerResponse, requestSchema } from "./protocol";

const pending = new Map<string, ReturnType<typeof setTimeout>>();
const completed = new Set<string>();
let highestSeen = 0;

function finish(reply: WorkerResponse) {
  pending.delete(reply.requestId);
  completed.add(reply.requestId);
  if (completed.size > 128) completed.delete(completed.values().next().value ?? "");
  postMessage(reply);
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const result = requestSchema.safeParse(event.data);
  if (!result.success) {
    const raw = event.data;
    if (
      raw &&
      typeof raw === "object" &&
      "requestId" in raw &&
      typeof raw.requestId === "string" &&
      /^w[0-9]{1,12}$/.test(raw.requestId)
    ) {
      const id = Number(raw.requestId.slice(1));
      if (id > highestSeen && !pending.has(raw.requestId)) {
        highestSeen = id;
        finish({ version: 1, requestId: raw.requestId, kind: "error", code: "invalid-message" });
      }
    }
    return;
  }
  const request = result.data;
  if (request.kind === "cancel") {
    const timer = pending.get(request.requestId);
    if (timer === undefined) return;
    clearTimeout(timer);
    finish({ version: 1, requestId: request.requestId, kind: "cancelled" });
    return;
  }
  if (pending.has(request.requestId) || completed.has(request.requestId)) return;
  const numericId = Number(request.requestId.slice(1));
  if (numericId <= highestSeen) return;
  highestSeen = numericId;
  if (pending.size >= 32) {
    postMessage({
      version: 1,
      requestId: request.requestId,
      kind: "error",
      code: "worker-failed",
    } satisfies WorkerResponse);
    return;
  }
  const timer = setTimeout(() => {
    finish({
      version: 1,
      requestId: request.requestId,
      kind: "ready",
      payload: { transport: "connected" },
    });
  }, request.payload.delayMs);
  pending.set(request.requestId, timer);
};
