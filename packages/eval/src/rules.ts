import { type Rule, RuleSchema } from "./scenario-schema.ts";

export type EvaluationStatus = "passed" | "failed" | "unevaluated" | "error";
export type RuleEvidenceValue = string | number | boolean;

export interface RuleResult {
  readonly id: string;
  readonly type: string;
  readonly status: EvaluationStatus;
  readonly expected: Readonly<Record<string, RuleEvidenceValue>>;
  readonly observed?: Readonly<Record<string, RuleEvidenceValue>>;
  readonly reason: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export type ResponseEvidenceValidation =
  | { readonly valid: true; readonly hintLevel?: number }
  | { readonly valid: false; readonly reason: string };

/** Validates the narrow eval-owned evidence envelope without reading accessors. */
export function validateResponseEvidence(evidence: unknown): ResponseEvidenceValidation {
  if (evidence === undefined) return { valid: true };
  try {
    if (!isRecord(evidence)) {
      return { valid: false, reason: "Hint-level evidence must be a plain structured object" };
    }
    const prototype = Object.getPrototypeOf(evidence);
    if (prototype !== Object.prototype && prototype !== null) {
      return { valid: false, reason: "Hint-level evidence must be a plain structured object" };
    }

    const descriptors = Object.getOwnPropertyDescriptors(evidence);
    const keys = Object.keys(descriptors);
    if (keys.some((key) => key !== "hintLevel")) {
      return { valid: false, reason: "Hint-level evidence contains unsupported fields" };
    }
    const descriptor = descriptors.hintLevel;
    if (!descriptor) return { valid: true };
    if (!("value" in descriptor)) {
      return { valid: false, reason: "Hint-level evidence must be a data value" };
    }
    const hintLevel = descriptor.value;
    if (
      typeof hintLevel !== "number" ||
      !Number.isInteger(hintLevel) ||
      hintLevel < 0 ||
      hintLevel > 5
    ) {
      return { valid: false, reason: "Hint-level metadata must be an integer from 0 through 5" };
    }
    return { valid: true, hintLevel };
  } catch {
    return { valid: false, reason: "Hint-level evidence could not be safely inspected" };
  }
}

const result = (
  id: string,
  type: string,
  status: EvaluationStatus,
  expected: Readonly<Record<string, RuleEvidenceValue>>,
  reason: string,
  observed?: Readonly<Record<string, RuleEvidenceValue>>,
): RuleResult => ({
  id,
  type,
  status,
  expected,
  ...(observed ? { observed } : {}),
  reason,
});

const ruleType = (value: unknown): string =>
  isRecord(value) && typeof value.type === "string" ? value.type : "unknown";

const expectedEvidence = (rule: Rule): Readonly<Record<string, RuleEvidenceValue>> => {
  switch (rule.type) {
    case "regex_present":
    case "regex_absent":
      return { pattern: rule.pattern };
    case "phrase_present":
    case "phrase_absent":
      return { phrase: rule.phrase };
    case "hint_level_at_most":
      return { maximum: rule.value };
    default: {
      const exhaustive: never = rule;
      return exhaustive;
    }
  }
};

const regexMatch = (pattern: string, responseText: string): boolean => {
  const caseInsensitive = pattern.startsWith("(?i)");
  const source = caseInsensitive ? pattern.slice(4) : pattern;
  // A fresh non-global/non-sticky RegExp makes repeated evaluations stateless.
  return new RegExp(source, caseInsensitive ? "i" : "").test(responseText);
};

const phraseMatch = (phrase: string, responseText: string): boolean =>
  responseText.normalize("NFC").toLowerCase().includes(phrase.normalize("NFC").toLowerCase());

const evaluateHintLevel = (
  rule: Extract<Rule, { type: "hint_level_at_most" }>,
  evidence: unknown,
  id: string,
): RuleResult => {
  const expected = expectedEvidence(rule);
  const validation = validateResponseEvidence(evidence);
  if (!validation.valid) return result(id, rule.type, "error", expected, validation.reason);
  if (validation.hintLevel === undefined) {
    return result(
      id,
      rule.type,
      "unevaluated",
      expected,
      "Structured hint-level evidence was not provided",
    );
  }

  const passed = validation.hintLevel <= rule.value;
  return result(
    id,
    rule.type,
    passed ? "passed" : "failed",
    expected,
    passed
      ? "Observed hint level is within the declared maximum"
      : "Observed hint level exceeds the declared maximum",
    { hintLevel: validation.hintLevel },
  );
};

/** Evaluate one trusted repository-authored rule against a response and structured evidence. */
export function evaluateRule(
  ruleInput: unknown,
  responseText: unknown,
  evidence?: unknown,
  id = "rule-1",
): RuleResult {
  const type = ruleType(ruleInput);
  const parsed = RuleSchema.safeParse(ruleInput);
  if (!parsed.success) {
    return result(id, type, "error", {}, "Rule declaration is invalid or unsupported");
  }
  if (typeof responseText !== "string") {
    return result(
      id,
      parsed.data.type,
      "error",
      expectedEvidence(parsed.data),
      "Response text is unavailable",
    );
  }

  const rule = parsed.data;
  if (rule.type === "hint_level_at_most") return evaluateHintLevel(rule, evidence, id);

  const expected = expectedEvidence(rule);
  try {
    const matched =
      rule.type === "regex_present" || rule.type === "regex_absent"
        ? regexMatch(rule.pattern, responseText)
        : phraseMatch(rule.phrase, responseText);
    const positive = rule.type === "regex_present" || rule.type === "phrase_present";
    const passed = positive ? matched : !matched;
    return result(
      id,
      rule.type,
      passed ? "passed" : "failed",
      expected,
      passed
        ? positive
          ? "Required expression or phrase was present"
          : "Forbidden expression or phrase was absent"
        : positive
          ? "Required expression or phrase was absent"
          : "Forbidden expression or phrase was present",
      { matched },
    );
  } catch {
    return result(id, rule.type, "error", expected, "Rule evaluation failed");
  }
}
