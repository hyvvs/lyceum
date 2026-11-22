import { z } from "zod";

export const DepthLevel = z.enum(["remember", "understand", "apply", "analyze", "create"]);
export type DepthLevel = z.infer<typeof DepthLevel>;

export const MisconceptionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  /** How to detect it: a diagnostic question, or an error pattern tag. */
  signal: z.string().optional(),
});

export const ConceptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  prerequisites: z.array(z.string()).default([]),
  /** Highest depth level the goal requires for this concept. */
  targetDepth: DepthLevel.default("apply"),
  /** Weight of this concept in the target exam or goal, 0..1. */
  weight: z.number().min(0).max(1).default(0.5),
  misconceptions: z.array(MisconceptionSchema).default([]),
});
export type Concept = z.infer<typeof ConceptSchema>;

export type GraphValidation = { ok: true; order: string[] } | { ok: false; errors: string[] };

/**
 * Validates a concept graph and returns a topological order (prerequisites first).
 * Detects duplicate ids, missing prerequisites, self-references, and cycles.
 */
export function validateConceptGraph(concepts: readonly Concept[]): GraphValidation {
  const errors: string[] = [];
  const byId = new Map<string, Concept>();

  for (const c of concepts) {
    if (byId.has(c.id)) errors.push(`Duplicate concept id: ${c.id}`);
    byId.set(c.id, c);
  }
  for (const c of concepts) {
    for (const p of c.prerequisites) {
      if (p === c.id) errors.push(`Concept ${c.id} lists itself as a prerequisite`);
      else if (!byId.has(p)) errors.push(`Concept ${c.id} has unknown prerequisite: ${p}`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  // Kahn's algorithm
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const c of concepts) {
    indegree.set(c.id, c.prerequisites.length);
    for (const p of c.prerequisites) {
      const list = dependents.get(p) ?? [];
      list.push(c.id);
      dependents.set(p, list);
    }
  }
  const queue = concepts.filter((c) => c.prerequisites.length === 0).map((c) => c.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const d of dependents.get(id) ?? []) {
      const next = (indegree.get(d) ?? 0) - 1;
      indegree.set(d, next);
      if (next === 0) queue.push(d);
    }
  }
  if (order.length !== concepts.length) {
    const stuck = concepts.filter((c) => !order.includes(c.id)).map((c) => c.id);
    return { ok: false, errors: [`Cycle detected among: ${stuck.join(", ")}`] };
  }
  return { ok: true, order };
}

/** All transitive prerequisites of a concept (nearest first). Used for root-cause tracing. */
export function transitivePrerequisites(concepts: readonly Concept[], conceptId: string): string[] {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const result: string[] = [];
  let frontier = [...(byId.get(conceptId)?.prerequisites ?? [])];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(id);
      next.push(...(byId.get(id)?.prerequisites ?? []));
    }
    frontier = next;
  }
  return result;
}
