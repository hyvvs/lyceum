/**
 * Provider-agnostic types for talking to any language model.
 * Engine code uses ONLY these types. Provider SDKs and wire formats live inside adapters.
 */

export type Role = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: Role;
  content: string;
  name?: string;
}

export type ResponseFormat =
  | { type: "text" }
  | { type: "json" }
  | { type: "json_schema"; name: string; schema: Record<string, unknown> };

export interface CompletionRequest {
  /** Provider-specific model id, e.g. "llama3.1:8b" or "anthropic/claude-sonnet". */
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: ResponseFormat;
  signal?: AbortSignal;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface CompletionResult {
  text: string;
  finishReason: string;
  usage?: Usage;
}

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "usage"; usage: Usage }
  | { type: "done"; finishReason: string };

export interface Capabilities {
  streaming: boolean;
  /** Strict schema-constrained output. */
  jsonSchema: boolean;
  /** "Return valid JSON" mode without a schema. */
  jsonMode: boolean;
  toolCalling: boolean;
  vision: boolean;
  reasoning: boolean;
  /** True if inference happens on the user's own machine or network. */
  local: boolean;
  maxContextTokens?: number;
}

export interface ModelInfo {
  id: string;
  displayName?: string;
  contextTokens?: number;
}

export interface HealthResult {
  ok: boolean;
  latencyMs?: number;
  detail?: string;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly kind: string;
  capabilities(model?: string): Capabilities;
  listModels(signal?: AbortSignal): Promise<ModelInfo[]>;
  complete(request: CompletionRequest): Promise<CompletionResult>;
  stream(request: CompletionRequest): AsyncIterable<StreamEvent>;
  healthCheck(signal?: AbortSignal): Promise<HealthResult>;
}

export type GatewayErrorCode =
  | "auth"
  | "rate_limit"
  | "context_length"
  | "network"
  | "invalid_request"
  | "unsupported"
  | "provider"
  | "aborted";

export class GatewayError extends Error {
  constructor(
    public readonly code: GatewayErrorCode,
    message: string,
    public readonly status?: number,
    /** Seconds to wait before retrying, if the provider said so. */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GatewayError";
  }

  get retryable(): boolean {
    return this.code === "rate_limit" || this.code === "network" || this.code === "provider";
  }
}
