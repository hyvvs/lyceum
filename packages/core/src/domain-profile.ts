import { z } from "zod";
import type { Concept } from "./concept-graph";

/**
 * The contract every subject plug-in must satisfy.
 * The core only ever talks to subjects through this interface.
 * See docs/04-domain-profiles.md.
 */

export const ProfileManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  /** How answers are checked: by tools, by rubric, or both. */
  verification: z.enum(["tool", "rubric", "hybrid"]),
  itemTypes: z.array(z.string().min(1)).min(1),
  rendering: z.array(z.enum(["text", "latex", "diagram", "code", "audio", "map", "timeline"])),
});
export type ProfileManifest = z.infer<typeof ProfileManifestSchema>;

export interface ItemRef {
  id: string;
  type: string;
  prompt: string;
  /** Opaque, profile-defined answer key or rubric reference. */
  key?: unknown;
  conceptIds: string[];
}

export type VerificationStatus = "correct" | "incorrect" | "partial" | "unverifiable";

export interface VerificationResult {
  status: VerificationStatus;
  /** 0..1 */
  score: number;
  /** Error tags drawn from the profile's error taxonomy. */
  errorTags: string[];
  /** Human-readable, learner-safe explanation of what was checked. */
  explanation?: string;
  /** Which method produced this result, for source labels and audits. */
  method: "symbolic" | "numeric" | "execution" | "rubric" | "model" | "none";
}

export interface ItemDraft {
  type: string;
  prompt: string;
  key?: unknown;
  conceptIds: string[];
  estimatedDifficulty: number;
  /** Template id and seed if the item was produced from a parameterized template. */
  generator?: { templateId: string; seed: number };
}

export interface DomainProfile {
  manifest: ProfileManifest;
  /** Check a learner response. Must never throw on bad input; return "unverifiable". */
  verify(item: ItemRef, response: string): Promise<VerificationResult>;
  /** Produce validated candidate items for given concepts. Optional. */
  generateItems?(request: {
    concepts: Concept[];
    count: number;
    difficulty: number;
    seed: number;
  }): Promise<ItemDraft[]>;
  /** Common error tags and their remediation hints. */
  errorTaxonomy: ReadonlyArray<{
    tag: string;
    description: string;
    likelyPrerequisiteIds?: string[];
  }>;
}
