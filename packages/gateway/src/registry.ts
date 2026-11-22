import type { ProviderAdapter } from "./types";

export type TaskTier = "fast" | "standard" | "deep";

export interface Route {
  providerId: string;
  model: string;
}

export type Routing = Record<TaskTier, Route> & {
  /** Used if a tier's route fails with a retryable error. */
  fallback?: Route;
};

/** Holds the learner's configured providers and resolves a task tier to a concrete model. */
export class ProviderRegistry {
  private readonly adapters = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Provider already registered: ${adapter.id}`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): ProviderAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`Unknown provider: ${id}`);
    return adapter;
  }

  list(): ProviderAdapter[] {
    return [...this.adapters.values()];
  }

  resolve(routing: Routing, tier: TaskTier): { adapter: ProviderAdapter; model: string } {
    const route = routing[tier];
    return { adapter: this.get(route.providerId), model: route.model };
  }
}
