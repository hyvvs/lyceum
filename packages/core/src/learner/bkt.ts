/**
 * Bayesian Knowledge Tracing with forgetting and evidence weighting.
 * See docs/05-learner-model-and-algorithms.md for the rationale and the upgrade path.
 *
 * pKnown is the probability the learner currently knows the skill.
 */
export interface BktParams {
  pInit: number;
  pLearn: number;
  pSlip: number;
  pGuess: number;
  pForget: number;
}

export const DEFAULT_BKT: BktParams = {
  pInit: 0.2,
  pLearn: 0.15,
  pSlip: 0.1,
  pGuess: 0.2,
  pForget: 0.02,
};

export interface Evidence {
  correct: boolean;
  /**
   * 0..1. How strongly this observation counts as evidence of independent skill.
   * Use lower values when hints were used or the item was a near-duplicate.
   */
  weight?: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function bktUpdate(
  pKnown: number,
  evidence: Evidence,
  params: BktParams = DEFAULT_BKT,
): number {
  const w = clamp(evidence.weight ?? 1, 0, 1);
  const { pSlip, pGuess, pLearn, pForget } = params;

  const likelihoodIfKnown = evidence.correct ? 1 - pSlip : pSlip;
  const likelihoodIfUnknown = evidence.correct ? pGuess : 1 - pGuess;

  // Tempered likelihood: weight 0 means the observation says nothing.
  const lk = likelihoodIfKnown ** w;
  const lu = likelihoodIfUnknown ** w;

  const posterior = (pKnown * lk) / (pKnown * lk + (1 - pKnown) * lu);
  const next = posterior * (1 - pForget) + (1 - posterior) * pLearn;
  return clamp(next, 0.001, 0.999);
}

/** Map the hint ladder level (0..5) to an evidence weight. */
export function hintWeight(hintLevel: number): number {
  const table = [1, 0.8, 0.55, 0.3, 0.1, 0];
  return table[clamp(Math.round(hintLevel), 0, 5)] ?? 0;
}
