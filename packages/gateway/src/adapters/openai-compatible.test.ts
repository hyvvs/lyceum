import { describe, expect, it } from "vitest";
import { GatewayError } from "../types";
import { OpenAICompatibleAdapter } from "./openai-compatible";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function sseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(`${line}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

const make = (fetchImpl: typeof fetch) =>
  new OpenAICompatibleAdapter({
    id: "test",
    baseUrl: "http://localhost:11434/v1/",
    apiKey: "secret",
    fetch: fetchImpl,
  });

describe("OpenAICompatibleAdapter", () => {
  it("completes and maps usage, sending auth and trimmed base url", async () => {
    let seenUrl = "";
    let seenAuth = "";
    const adapter = make(async (url, init) => {
      seenUrl = String(url);
      seenAuth = (init?.headers as Record<string, string>).Authorization ?? "";
      return jsonResponse({
        choices: [{ message: { content: "hello" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 3, completion_tokens: 2 },
      });
    });
    const result = await adapter.complete({
      model: "m",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.text).toBe("hello");
    expect(result.usage).toEqual({ inputTokens: 3, outputTokens: 2 });
    expect(seenUrl).toBe("http://localhost:11434/v1/chat/completions");
    expect(seenAuth).toBe("Bearer secret");
  });

  it("streams text deltas, usage, and done", async () => {
    const adapter = make(async () =>
      sseResponse([
        `data: ${JSON.stringify({ choices: [{ delta: { content: "Hel" } }] })}`,
        `data: ${JSON.stringify({ choices: [{ delta: { content: "lo" }, finish_reason: "stop" }] })}`,
        `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 2 } })}`,
        "data: [DONE]",
      ]),
    );
    const events = [];
    for await (const e of adapter.stream({ model: "m", messages: [] })) events.push(e);
    const text = events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
    expect(text).toBe("Hello");
    expect(events.some((e) => e.type === "usage")).toBe(true);
    expect(events.at(-1)).toEqual({ type: "done", finishReason: "stop" });
  });

  it("maps HTTP errors to typed gateway errors", async () => {
    const auth = make(async () => new Response("nope", { status: 401 }));
    await expect(auth.complete({ model: "m", messages: [] })).rejects.toMatchObject({
      code: "auth",
    });

    const limited = make(
      async () => new Response("slow down", { status: 429, headers: { "retry-after": "7" } }),
    );
    const err = await limited.complete({ model: "m", messages: [] }).catch((e) => e);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err.code).toBe("rate_limit");
    expect(err.retryAfterSeconds).toBe(7);
    expect(err.retryable).toBe(true);
  });

  it("reports unhealthy instead of throwing", async () => {
    const adapter = make(async () => {
      throw new Error("ECONNREFUSED");
    });
    const health = await adapter.healthCheck();
    expect(health.ok).toBe(false);
  });
});
