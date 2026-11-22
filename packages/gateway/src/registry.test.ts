import { describe, expect, it } from "vitest";
import { OpenAICompatibleAdapter } from "./adapters/openai-compatible";
import { ProviderRegistry, type Routing } from "./registry";

describe("ProviderRegistry", () => {
  const registry = new ProviderRegistry();
  registry.register(
    new OpenAICompatibleAdapter({ id: "local", baseUrl: "http://localhost:11434/v1" }),
  );
  registry.register(
    new OpenAICompatibleAdapter({ id: "cloud", baseUrl: "https://example.com/v1" }),
  );

  const routing: Routing = {
    fast: { providerId: "local", model: "small" },
    standard: { providerId: "cloud", model: "medium" },
    deep: { providerId: "cloud", model: "large" },
  };

  it("resolves tiers to adapters and models", () => {
    const { adapter, model } = registry.resolve(routing, "fast");
    expect(adapter.id).toBe("local");
    expect(model).toBe("small");
  });

  it("rejects duplicate ids and unknown providers", () => {
    expect(() =>
      registry.register(new OpenAICompatibleAdapter({ id: "local", baseUrl: "x" })),
    ).toThrow();
    expect(() => registry.get("nope")).toThrow();
  });
});
