import { describe, expect, it, vi } from "vitest";
import { WorkerClient, type WorkerPort } from "./client";
import type { WorkerRequest, WorkerResponse } from "./protocol";

class FakeWorker implements WorkerPort {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  messages: WorkerRequest[] = [];
  terminated = false;
  postMessage(message: WorkerRequest) {
    this.messages.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  respond(message: WorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<unknown>);
  }
}

describe("validated and cancellable worker client", () => {
  it("correlates real handshake and discards stale/duplicate messages", async () => {
    const worker = new FakeWorker();
    const client = new WorkerClient(worker);
    const task = client.probe();
    const id = worker.messages[0]?.requestId ?? "";
    worker.respond({
      version: 1,
      requestId: "w999",
      kind: "ready",
      payload: { transport: "connected" },
    });
    worker.respond({
      version: 1,
      requestId: id,
      kind: "ready",
      payload: { transport: "connected" },
    });
    expect((await task).kind).toBe("ready");
    worker.respond({
      version: 1,
      requestId: id,
      kind: "ready",
      payload: { transport: "connected" },
    });
    expect(client.pendingCount).toBe(0);
    client.close();
    expect(worker.terminated).toBe(true);
  });

  it("acknowledges real worker cancellation, without falsely treating local abort as an ack", async () => {
    const worker = new FakeWorker();
    const acks: string[] = [];
    const client = new WorkerClient(worker, { onCancellationAck: (id) => acks.push(id) });
    const controller = new AbortController();
    const task = client.probe(250, controller.signal);
    const id = worker.messages[0]?.requestId ?? "";
    controller.abort();
    expect(worker.messages.at(-1)).toEqual({ version: 1, requestId: id, kind: "cancel" });
    expect((await task).kind).toBe("aborted");
    worker.respond({ version: 1, requestId: id, kind: "cancelled" });
    expect(acks).toEqual([id]);
    client.close();
  });

  it("settles abort locally if a ready response races cancel and no ack ever arrives", async () => {
    const worker = new FakeWorker();
    const acks: string[] = [];
    const client = new WorkerClient(worker, { onCancellationAck: (id) => acks.push(id) });
    const controller = new AbortController();
    const task = client.probe(250, controller.signal);
    const id = worker.messages[0]?.requestId ?? "";
    controller.abort();
    worker.respond({
      version: 1,
      requestId: id,
      kind: "ready",
      payload: { transport: "connected" },
    });
    expect((await task).kind).toBe("aborted");
    expect(acks).toEqual([]);
    expect(client.pendingCount).toBe(0);
    client.close();
  });

  it("ignores abort after the worker already completed, and fails all concurrent work on error", async () => {
    const worker = new FakeWorker();
    const client = new WorkerClient(worker);
    const controller = new AbortController();
    const alreadyDone = client.probe(0, controller.signal);
    const id = worker.messages[0]?.requestId ?? "";
    worker.respond({
      version: 1,
      requestId: id,
      kind: "ready",
      payload: { transport: "connected" },
    });
    await alreadyDone;
    controller.abort();
    expect(worker.messages).toHaveLength(1);
    const first = client.probe(250);
    const second = client.probe(250);
    const assertions = [
      expect(first).rejects.toThrow(/worker failed/i),
      expect(second).rejects.toThrow(/worker failed/i),
    ];
    worker.onerror?.({} as ErrorEvent);
    await Promise.all(assertions);
    expect(worker.terminated).toBe(true);
    expect(client.pendingCount).toBe(0);
  });

  it("pre-abort, invalid response, timeout, and termination settle without leaks", async () => {
    vi.useFakeTimers();
    try {
      const worker = new FakeWorker();
      const client = new WorkerClient(worker, { timeoutMs: 50 });
      const signal = AbortSignal.abort();
      await expect(client.probe(0, signal)).rejects.toThrow(/abort/i);
      expect(worker.messages).toHaveLength(0);
      const pending = client.probe();
      worker.onmessage?.({ data: { kind: "ready", requestId: "bad" } } as MessageEvent<unknown>);
      const assertion = expect(pending).rejects.toThrow(/timed out/i);
      await vi.advanceTimersByTimeAsync(51);
      await assertion;
      const leftover = client.probe();
      const closeAssertion = expect(leftover).rejects.toThrow(/closed/i);
      client.close();
      await closeAssertion;
      expect(client.pendingCount).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
