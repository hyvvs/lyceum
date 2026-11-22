import type { DomainProfile, ItemRef, VerificationResult } from "@lyceum/core";

/**
 * Math Domain Profile (profile #1). STUB.
 * Real implementation: see docs/04-domain-profiles.md and tasks/M3-*.md.
 * Verification will run SymPy inside Pyodide in a Web Worker (see ADR-0003).
 */
export const mathProfile: DomainProfile = {
  manifest: {
    id: "math",
    name: "Mathematics",
    version: "0.0.1",
    verification: "hybrid",
    itemTypes: ["computation", "multi_step", "proof", "find_the_mistake", "conceptual"],
    rendering: ["text", "latex", "diagram"],
  },

  async verify(_item: ItemRef, _response: string): Promise<VerificationResult> {
    return {
      status: "unverifiable",
      score: 0,
      errorTags: [],
      explanation: "Math verification is not implemented yet.",
      method: "none",
    };
  },

  errorTaxonomy: [
    { tag: "sign_error", description: "Dropped or flipped a sign." },
    { tag: "wrong_rule", description: "Applied a rule that does not fit the situation." },
    { tag: "algebra_slip", description: "Correct method, incorrect algebraic manipulation." },
    { tag: "domain_error", description: "Ignored a domain restriction or special case." },
    { tag: "notation_confusion", description: "Misread or misused notation." },
  ],
};
