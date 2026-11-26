import type { CompletionRequest } from "@lyceum/gateway";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type ScriptedOutcome,
  ScriptedProvider,
  ScriptedProviderError,
} from "../src/scripted-provider.ts";

const request = (signal?: AbortSignal): CompletionRequest => ({
  model: "scripted-fixture",
  messages: [{ role: "user", content: "A synthetic request." }],
  ...(signal ? { signal } : {}),
});

const response = (text: string, evidence?: { hintLevel?: number }): ScriptedOutcome => ({
  kind: "response",
  response: {
    text,
    finishReason: "stop",
    ...(evidence ? { evidence } : {}),
  },
});

describe("ScriptedProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns an explicit synthetic response and its separate structured evidence", async () => {
    const provider = new ScriptedProvider({
      "scenario-a": [response("Ask the learner to compare the two rules.", { hintLevel: 2 })],
    });
    const completion = await provider.completeForScenario("scenario-a", request());
    expect(completion).toEqual({
      result: {
        text: "Ask the learner to compare the two rules.",
        finishReason: "stop",
      },
      evidence: { hintLevel: 2 },
    });
    expect(completion.result).not.toHaveProperty("usage");
  });

  it("preserves malformed fixture metadata so the runner can fail closed", async () => {
    const provider = new ScriptedProvider({
      "scenario-a": [
        {
          kind: "response",
          response: {
            text: "A synthetic response.",
            finishReason: "stop",
            evidence: null as unknown as { hintLevel?: number },
          },
        },
      ],
    });
    const completion = await provider.completeForScenario("scenario-a", request());
    expect(completion.evidence).toBeNull();
  });

  it("selects scenario scripts deterministically and preserves response order", async () => {
    const scripts = {
      "scenario-a": [response("A1"), response("A2")],
      "scenario-b": [response("B1")],
    } satisfies Record<string, readonly ScriptedOutcome[]>;
    const provider = new ScriptedProvider(scripts);
    const firstA = await provider.completeForScenario("scenario-a", request());
    const firstB = await provider.completeForScenario("scenario-b", request());
    const secondA = await provider.completeForScenario("scenario-a", request());
    const repeated = await new ScriptedProvider(scripts).completeForScenario(
      "scenario-a",
      request(),
    );
    expect([
      firstA.result.text,
      firstB.result.text,
      secondA.result.text,
      repeated.result.text,
    ]).toEqual(["A1", "B1", "A2", "A1"]);
  });

  it("fails explicitly when a scenario has no script", async () => {
    const provider = new ScriptedProvider({});
    await expect(provider.completeForScenario("missing", request())).rejects.toMatchObject({
      code: "provider",
    });
  });

  it("consumes distinct outcomes for concurrent completions of the same scenario", async () => {
    const provider = new ScriptedProvider({ "scenario-a": [response("A1"), response("A2")] });
    const results = await Promise.all([
      provider.completeForScenario("scenario-a", request()),
      provider.completeForScenario("scenario-a", request()),
    ]);
    expect(results.map((result) => result.result.text)).toEqual(["A1", "A2"]);
  });

  it("keeps independent scenario cursors when calls overlap", async () => {
    const provider = new ScriptedProvider({
      "scenario-a": [response("A1"), response("A2")],
      "scenario-b": [response("B1"), response("B2")],
    });
    const results = await Promise.all([
      provider.completeForScenario("scenario-a", request()),
      provider.completeForScenario("scenario-b", request()),
      provider.completeForScenario("scenario-b", request()),
      provider.completeForScenario("scenario-a", request()),
    ]);
    expect(results.map((item) => item.result.text)).toEqual(["A1", "B1", "B2", "A2"]);
  });

  it("does not consume an aborted concurrent reservation", async () => {
    const provider = new ScriptedProvider({ "scenario-a": [response("A1"), response("A2")] });
    const abort = new AbortController();
    const cancelled = provider.completeForScenario("scenario-a", request(abort.signal));
    const active = provider.completeForScenario("scenario-a", request());
    abort.abort();
    await expect(cancelled).rejects.toMatchObject({ code: "aborted" });
    await expect(active).resolves.toMatchObject({ result: { text: "A1" } });
    await expect(provider.completeForScenario("scenario-a", request())).resolves.toMatchObject({
      result: { text: "A2" },
    });
  });

  it("clones fixtures and results instead of leaking mutable state across runs", async () => {
    const evidence = { hintLevel: 2 };
    const fixtures = { "scenario-a": [response("Stable", evidence)] };
    const first = new ScriptedProvider(fixtures);
    evidence.hintLevel = 4;
    const completion = await first.completeForScenario("scenario-a", request());
    expect(completion.evidence?.hintLevel).toBe(2);
    if (completion.evidence) (completion.evidence as { hintLevel: number }).hintLevel = 5;
    const fresh = new ScriptedProvider({ "scenario-a": [response("Stable", { hintLevel: 2 })] });
    const repeated = await fresh.completeForScenario("scenario-a", request());
    expect(repeated).toMatchObject({ result: { text: "Stable" }, evidence: { hintLevel: 2 } });
  });

  it("fails explicitly when a scenario script is exhausted", async () => {
    const provider = new ScriptedProvider({ "scenario-a": [response("Only response")] });
    await provider.completeForScenario("scenario-a", request());
    await expect(provider.completeForScenario("scenario-a", request())).rejects.toMatchObject({
      code: "provider",
    });
  });

  it("surfaces a scripted provider failure as GatewayError", async () => {
    const provider = new ScriptedProvider({
      "scenario-a": [{ kind: "error", code: "provider" }],
    });
    const error = await provider
      .completeForScenario("scenario-a", request())
      .catch((value) => value);
    expect(error).toBeInstanceOf(ScriptedProviderError);
    expect(error.name).toBe("GatewayError");
    expect(error.code).toBe("provider");
  });

  it("honors cancellation before and during completion without consuming an aborted script", async () => {
    const provider = new ScriptedProvider({ "scenario-a": [response("Still available")] });
    const alreadyAborted = new AbortController();
    alreadyAborted.abort();
    await expect(
      provider.completeForScenario("scenario-a", request(alreadyAborted.signal)),
    ).rejects.toMatchObject({ code: "aborted" });

    const controller = new AbortController();
    const pending = provider.completeForScenario("scenario-a", request(controller.signal));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
    await expect(provider.completeForScenario("scenario-a", request())).resolves.toMatchObject({
      result: { text: "Still available" },
    });
  });

  it("streams only fixed response text and the completion event, never invented usage", async () => {
    const provider = new ScriptedProvider({
      "scenario-a": [response("A fixed stream response.")],
    });
    const events = [];
    for await (const event of provider.streamForScenario("scenario-a", request()))
      events.push(event);
    expect(events).toEqual([
      { type: "text", delta: "A fixed stream response." },
      { type: "done", finishReason: "stop" },
    ]);
    expect(events.some((event) => event.type === "usage")).toBe(false);
  });

  it("emits a done event for an empty scripted response", async () => {
    const provider = new ScriptedProvider({ "scenario-a": [response("")] });
    const events = [];
    for await (const event of provider.streamForScenario("scenario-a", request()))
      events.push(event);
    expect(events).toEqual([{ type: "done", finishReason: "stop" }]);
  });

  it("honors cancellation between streamed events", async () => {
    const provider = new ScriptedProvider({ "scenario-a": [response("A response")] });
    const controller = new AbortController();
    const iterator = provider
      .streamForScenario("scenario-a", request(controller.signal))
      [Symbol.asyncIterator]();
    await expect(iterator.next()).resolves.toMatchObject({
      value: { type: "text", delta: "A response" },
      done: false,
    });
    controller.abort();
    await expect(iterator.next()).rejects.toMatchObject({ code: "aborted" });
  });

  it("returns no live models and honors list-model cancellation", async () => {
    const provider = new ScriptedProvider({});
    await expect(provider.listModels()).resolves.toEqual([]);
    const controller = new AbortController();
    const pending = provider.listModels(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
  });

  it("reports fixture-adapter health without inventing latency", async () => {
    const provider = new ScriptedProvider({});
    await expect(provider.healthCheck()).resolves.toEqual({ ok: true });
    const controller = new AbortController();
    controller.abort();
    await expect(provider.healthCheck(controller.signal)).resolves.toEqual({
      ok: false,
      detail: "Scripted adapter check aborted",
    });
  });

  it("does not access fetch or any network transport", async () => {
    const fetch = vi.fn(() => {
      throw new Error("Network access is forbidden in this test");
    });
    vi.stubGlobal("fetch", fetch);
    const provider = new ScriptedProvider({ "scenario-a": [response("Local fixture only")] });
    await provider.listModels();
    await provider.completeForScenario("scenario-a", request());
    await provider.healthCheck();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("declares only deterministic in-process adapter operations, not model measurements", () => {
    const provider = new ScriptedProvider({});
    expect(provider.capabilities()).toEqual({
      streaming: true,
      jsonSchema: false,
      jsonMode: false,
      toolCalling: false,
      vision: false,
      reasoning: false,
      local: true,
    });
  });

  it("implements the gateway default completion and stream contracts", async () => {
    const provider = new ScriptedProvider({ default: [response("Default contract response")] });
    await expect(provider.complete(request())).resolves.toEqual({
      text: "Default contract response",
      finishReason: "stop",
    });
    const streamProvider = new ScriptedProvider({ default: [response("Default stream")] });
    const events = [];
    for await (const event of streamProvider.stream(request())) events.push(event);
    expect(events).toEqual([
      { type: "text", delta: "Default stream" },
      { type: "done", finishReason: "stop" },
    ]);
  });
});
