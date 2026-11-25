import { type ClientProbeResult, type WorkerRequest, responseSchema } from "./protocol";

/** App-private native worker adapter; deliberately not part of @lyceum/core or @lyceum/ui. */
export interface WorkerPort {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: WorkerRequest): void;
  terminate(): void;
}

interface Pending {
  resolve: (value: ClientProbeResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  signal?: AbortSignal;
  abort: () => void;
}

export class WorkerClient {
  private readonly pending = new Map<string, Pending>();
  private id = 0;
  private closed = false;
  private readonly timeoutMs: number;
  private readonly awaitingAck = new Set<string>();
  private readonly onCancellationAck: ((requestId: string) => void) | undefined;

  constructor(
    private readonly worker: WorkerPort,
    options: {
      timeoutMs?: number;
      onCancellationAck?: (requestId: string) => void;
    } = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.onCancellationAck = options.onCancellationAck;
    worker.onmessage = (event) => this.receive(event.data);
    worker.onerror = () => this.closeWithError(new Error("Worker failed"));
    worker.onmessageerror = () => this.closeWithError(new Error("Invalid worker message"));
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  probe(
    delayMs: 0 | 250 = 0,
    signal?: AbortSignal,
    onDispatched?: (requestId: string) => void,
  ): Promise<ClientProbeResult> {
    if (this.closed) return Promise.reject(new Error("Worker client closed"));
    if (signal?.aborted) return Promise.reject(new Error("Probe aborted before it started"));
    if (this.pending.size >= 32)
      return Promise.reject(new Error("Too many pending worker requests"));
    this.id += 1;
    if (this.id > 999_999_999_999)
      return Promise.reject(new Error("Worker request ID limit reached"));
    const requestId = `w${this.id}`;
    onDispatched?.(requestId);
    return new Promise<ClientProbeResult>((resolve, reject) => {
      const abort = () => {
        if (!this.pending.has(requestId)) return;
        this.settle(requestId, { kind: "aborted" }); // Never wait for an ack that may race a ready.
        if (this.awaitingAck.size >= 32) {
          this.awaitingAck.delete(this.awaitingAck.values().next().value ?? "");
        }
        this.awaitingAck.add(requestId);
        try {
          this.worker.postMessage({ version: 1, requestId, kind: "cancel" });
        } catch {
          this.awaitingAck.delete(requestId);
        }
      };
      const timeout = setTimeout(
        () => this.closeWithError(new Error("Worker request timed out")),
        this.timeoutMs,
      );
      const current: Pending = { resolve, reject, timeout, abort };
      if (signal) current.signal = signal;
      this.pending.set(requestId, current);
      signal?.addEventListener("abort", abort, { once: true });
      try {
        this.worker.postMessage({ version: 1, requestId, kind: "probe", payload: { delayMs } });
        if (signal?.aborted) abort();
      } catch {
        this.settle(requestId, new Error("Unable to contact worker"));
      }
    });
  }

  private receive(raw: unknown): void {
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) return;
    const reply = parsed.data;
    if (reply.kind === "cancelled" && this.awaitingAck.delete(reply.requestId)) {
      this.onCancellationAck?.(reply.requestId);
      return;
    }
    const entry = this.pending.get(reply.requestId);
    if (!entry) return; // Duplicate, late, malformed, or unrelated responses are inert.
    this.settle(reply.requestId, reply);
  }

  private settle(
    id: string,
    result: ClientProbeResult | Error | { kind: "error"; code: string },
  ): void {
    const entry = this.pending.get(id);
    if (!entry) return;
    this.pending.delete(id);
    clearTimeout(entry.timeout);
    entry.signal?.removeEventListener("abort", entry.abort);
    if (result instanceof Error || result.kind === "error") {
      entry.reject(result instanceof Error ? result : new Error(`Worker: ${result.code}`));
    } else {
      entry.resolve(result);
    }
  }

  private failAll(error: Error): void {
    for (const id of [...this.pending.keys()]) this.settle(id, error);
  }

  private closeWithError(error: Error): void {
    if (this.closed) return;
    this.failAll(error);
    this.close();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.failAll(new Error("Worker client closed"));
    this.awaitingAck.clear();
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.onmessageerror = null;
    this.worker.terminate();
  }
}
