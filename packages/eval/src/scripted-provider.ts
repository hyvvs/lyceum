import {
  type Capabilities,
  type CompletionRequest,
  type CompletionResult,
  GatewayError,
  type GatewayErrorCode,
  type HealthResult,
  type ModelInfo,
  type ProviderAdapter,
  type StreamEvent,
} from "@lyceum/gateway";

export interface ResponseEvidence {
  /** Explicit fixture metadata; never inferred from the learner-facing text. */
  readonly hintLevel?: number;
}

export interface ScriptedResponse {
  readonly text: string;
  readonly finishReason: string;
  readonly evidence?: ResponseEvidence;
}

export type ScriptedOutcome =
  | { readonly kind: "response"; readonly response: ScriptedResponse }
  | { readonly kind: "error"; readonly code: GatewayErrorCode };

export interface ScriptedCompletion {
  readonly result: CompletionResult;
  readonly evidence?: ResponseEvidence;
}

const cloneResponse = (response: ScriptedResponse): ScriptedResponse => ({
  text: response.text,
  finishReason: response.finishReason,
  ...(response.evidence ? { evidence: { ...response.evidence } } : {}),
});

const cloneOutcome = (outcome: ScriptedOutcome): ScriptedOutcome =>
  outcome.kind === "error"
    ? { kind: "error", code: outcome.code }
    : { kind: "response", response: cloneResponse(outcome.response) };

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new GatewayError("aborted", "Scripted operation aborted");
};

/**
 * Deterministic in-process fake for evaluation only. `local` and `streaming`
 * describe this adapter's implementation, not model inference or provider
 * capability measurements. It never reports model inventory, usage or latency.
 */
export class ScriptedProvider implements ProviderAdapter {
  readonly id = "scripted-fixtures";
  readonly kind = "scripted";

  private readonly scripts: ReadonlyMap<string, readonly ScriptedOutcome[]>;
  private readonly cursors = new Map<string, number>();

  constructor(scripts: Readonly<Record<string, readonly ScriptedOutcome[]>>) {
    this.scripts = new Map(
      Object.entries(scripts).map(([scenarioId, outcomes]) => [
        scenarioId,
        outcomes.map(cloneOutcome),
      ]),
    );
  }

  capabilities(_model?: string): Capabilities {
    return {
      streaming: true,
      jsonSchema: false,
      jsonMode: false,
      toolCalling: false,
      vision: false,
      reasoning: false,
      local: true,
    };
  }

  async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    throwIfAborted(signal);
    await Promise.resolve();
    throwIfAborted(signal);
    return [];
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const completion = await this.completeForScenario("default", request);
    return completion.result;
  }

  async completeForScenario(
    scenarioId: string,
    request: CompletionRequest,
  ): Promise<ScriptedCompletion> {
    throwIfAborted(request.signal);
    const outcomes = this.scripts.get(scenarioId);
    if (!outcomes) {
      throw new GatewayError("provider", "No scripted response is configured");
    }
    const cursor = this.cursors.get(scenarioId) ?? 0;
    const outcome = outcomes[cursor];
    if (!outcome) {
      throw new GatewayError("provider", "Scripted response sequence exhausted");
    }

    // Yield once so a caller can abort an in-flight deterministic operation.
    // The cursor advances only after the cancellation check succeeds.
    await Promise.resolve();
    throwIfAborted(request.signal);
    this.cursors.set(scenarioId, cursor + 1);

    if (outcome.kind === "error") {
      throw new GatewayError(outcome.code, "Scripted provider fixture failed");
    }

    const response = cloneResponse(outcome.response);
    return {
      result: {
        text: response.text,
        finishReason: response.finishReason,
      },
      ...(response.evidence ? { evidence: response.evidence } : {}),
    };
  }

  stream(request: CompletionRequest): AsyncIterable<StreamEvent> {
    return this.streamForScenario("default", request);
  }

  async *streamForScenario(
    scenarioId: string,
    request: CompletionRequest,
  ): AsyncIterable<StreamEvent> {
    const completion = await this.completeForScenario(scenarioId, request);
    throwIfAborted(request.signal);
    if (completion.result.text.length > 0) {
      yield { type: "text", delta: completion.result.text };
    }
    throwIfAborted(request.signal);
    yield { type: "done", finishReason: completion.result.finishReason };
  }

  async healthCheck(signal?: AbortSignal): Promise<HealthResult> {
    await Promise.resolve();
    if (signal?.aborted) {
      return { ok: false, detail: "Scripted adapter check aborted" };
    }
    return { ok: true };
  }
}
