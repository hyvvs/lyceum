import {
  type Capabilities,
  type CompletionRequest,
  type CompletionResult,
  GatewayError,
  type HealthResult,
  type ModelInfo,
  type ProviderAdapter,
  type StreamEvent,
} from "../types";

export interface OpenAICompatibleConfig {
  /** Unique id within the app, e.g. "openrouter" or "my-home-server". */
  id: string;
  /** Base URL including the version path, e.g. https://openrouter.ai/api/v1 or http://localhost:11434/v1 */
  baseUrl: string;
  apiKey?: string;
  /** Extra headers (e.g. OpenRouter attribution headers, custom gateways). */
  headers?: Record<string, string>;
  capabilities?: Partial<Capabilities>;
  /** Injected for tests and for platform-specific transports (e.g. Tauri HTTP). */
  fetch?: typeof fetch;
}

const DEFAULT_CAPS: Capabilities = {
  streaming: true,
  jsonSchema: false,
  jsonMode: true,
  toolCalling: false,
  vision: false,
  reasoning: false,
  local: false,
};

/**
 * Works with any server that speaks the OpenAI Chat Completions wire format:
 * OpenAI, OpenRouter, Ollama (/v1), LM Studio, llama.cpp server, vLLM, LocalAI,
 * Groq, Together, Mistral, and personal endpoints.
 */
export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly kind = "openai-compatible";
  readonly id: string;
  private readonly baseUrl: string;
  private readonly caps: Capabilities;
  private readonly doFetch: typeof fetch;

  constructor(private readonly config: OpenAICompatibleConfig) {
    this.id = config.id;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.caps = { ...DEFAULT_CAPS, ...config.capabilities };
    this.doFetch = config.fetch ?? ((...args) => fetch(...args));
  }

  capabilities(): Capabilities {
    return this.caps;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      ...this.config.headers,
    };
  }

  private body(request: CompletionRequest, stream: boolean): string {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      stream,
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (stream) body.stream_options = { include_usage: true };
    const rf = request.responseFormat;
    if (rf?.type === "json") body.response_format = { type: "json_object" };
    if (rf?.type === "json_schema") {
      body.response_format = {
        type: "json_schema",
        json_schema: { name: rf.name, schema: rf.schema, strict: true },
      };
    }
    return JSON.stringify(body);
  }

  private async post(path: string, body: string, signal?: AbortSignal): Promise<Response> {
    let response: Response;
    try {
      response = await this.doFetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: this.headers(),
        body,
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      if (signal?.aborted) throw new GatewayError("aborted", "Request aborted");
      throw new GatewayError("network", error instanceof Error ? error.message : "Network error");
    }
    if (!response.ok) throw await toGatewayError(response);
    return response;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const response = await this.post(
      "/chat/completions",
      this.body(request, false),
      request.signal,
    );
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const choice = data.choices?.[0];
    return {
      text: choice?.message?.content ?? "",
      finishReason: choice?.finish_reason ?? "unknown",
      ...(data.usage
        ? {
            usage: {
              inputTokens: data.usage.prompt_tokens ?? 0,
              outputTokens: data.usage.completion_tokens ?? 0,
            },
          }
        : {}),
    };
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamEvent> {
    const response = await this.post("/chat/completions", this.body(request, true), request.signal);
    if (!response.body) throw new GatewayError("provider", "Streaming response had no body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finishReason = "stop";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            yield { type: "done", finishReason };
            return;
          }
          let chunk: {
            choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
          };
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue; // tolerate keep-alives and partial garbage
          }
          const choice = chunk.choices?.[0];
          if (choice?.delta?.content) yield { type: "text", delta: choice.delta.content };
          if (choice?.finish_reason) finishReason = choice.finish_reason;
          if (chunk.usage) {
            yield {
              type: "usage",
              usage: {
                inputTokens: chunk.usage.prompt_tokens ?? 0,
                outputTokens: chunk.usage.completion_tokens ?? 0,
              },
            };
          }
        }
      }
      yield { type: "done", finishReason };
    } finally {
      reader.releaseLock();
    }
  }

  async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    let response: Response;
    try {
      response = await this.doFetch(`${this.baseUrl}/models`, {
        headers: this.headers(),
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      throw new GatewayError("network", error instanceof Error ? error.message : "Network error");
    }
    if (!response.ok) throw await toGatewayError(response);
    const data = (await response.json()) as { data?: Array<{ id: string }> };
    return (data.data ?? []).map((m) => ({ id: m.id }));
  }

  async healthCheck(signal?: AbortSignal): Promise<HealthResult> {
    const started = Date.now();
    try {
      await this.listModels(signal);
      return { ok: true, latencyMs: Date.now() - started };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : "Unknown error" };
    }
  }
}

async function toGatewayError(response: Response): Promise<GatewayError> {
  let detail = "";
  try {
    detail = (await response.text()).slice(0, 500);
  } catch {
    // ignore
  }
  const status = response.status;
  const retryAfter = Number(response.headers.get("retry-after"));
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
  if (status === 401 || status === 403)
    return new GatewayError("auth", `Authentication failed: ${detail}`, status);
  if (status === 429)
    return new GatewayError("rate_limit", `Rate limited: ${detail}`, status, retryAfterSeconds);
  if (status === 413 || /context.?length|maximum context|too many tokens/i.test(detail)) {
    return new GatewayError("context_length", `Context too long: ${detail}`, status);
  }
  if (status >= 400 && status < 500) return new GatewayError("invalid_request", detail, status);
  return new GatewayError(
    "provider",
    `Provider error ${status}: ${detail}`,
    status,
    retryAfterSeconds,
  );
}
