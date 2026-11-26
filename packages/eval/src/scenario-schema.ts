import { z } from "zod";

const MAX_TEXT_LENGTH = 16_384;
const MAX_RULE_LENGTH = 256;

const meaningfulText = z.string().trim().min(1).max(MAX_TEXT_LENGTH);
const uniqueTextList = (limit: number) =>
  z
    .array(meaningfulText)
    .min(1)
    .max(limit)
    .refine((values) => new Set(values).size === values.length, "Values must be unique");

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

const jsonRecord = z
  .record(z.string(), JsonValueSchema)
  .refine((record) => Object.keys(record).length > 0, "Record must not be empty");

const normalizedPattern = (pattern: string): { source: string; flags: string } => {
  if (pattern.startsWith("(?i)")) return { source: pattern.slice(4), flags: "i" };
  return { source: pattern, flags: "" };
};

const regexPattern = z
  .string()
  .trim()
  .min(1)
  .max(MAX_RULE_LENGTH)
  .superRefine((pattern, ctx) => {
    if (pattern.includes("(?i)") && !pattern.startsWith("(?i)")) {
      ctx.addIssue({ code: "custom", message: "(?i) is supported only as a leading marker" });
      return;
    }
    const { source, flags } = normalizedPattern(pattern);
    if (source.length === 0) {
      ctx.addIssue({ code: "custom", message: "Regex pattern must not be empty" });
      return;
    }
    try {
      new RegExp(source, flags);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid JavaScript regular expression" });
    }
  });

const phrase = z.string().trim().min(1).max(MAX_RULE_LENGTH);

const RegexPresentRuleSchema = z
  .object({ type: z.literal("regex_present"), pattern: regexPattern })
  .strict();
const RegexAbsentRuleSchema = z
  .object({ type: z.literal("regex_absent"), pattern: regexPattern })
  .strict();
const PhrasePresentRuleSchema = z.object({ type: z.literal("phrase_present"), phrase }).strict();
const PhraseAbsentRuleSchema = z.object({ type: z.literal("phrase_absent"), phrase }).strict();
const HintLevelAtMostRuleSchema = z
  .object({ type: z.literal("hint_level_at_most"), value: z.number().int().min(0).max(5) })
  .strict();

export const RuleSchema = z.discriminatedUnion("type", [
  RegexPresentRuleSchema,
  RegexAbsentRuleSchema,
  PhrasePresentRuleSchema,
  PhraseAbsentRuleSchema,
  HintLevelAtMostRuleSchema,
]);

export type Rule = z.infer<typeof RuleSchema>;

const ruleIdentity = (rule: Rule): string => {
  switch (rule.type) {
    case "regex_present":
    case "regex_absent": {
      const normalized = normalizedPattern(rule.pattern);
      return `regex:${normalized.flags}:${normalized.source}`;
    }
    case "phrase_present":
    case "phrase_absent":
      return `phrase:${rule.phrase.normalize("NFC").toLowerCase()}`;
    case "hint_level_at_most":
      return `hint-level:${rule.value}`;
    default: {
      const exhaustive: never = rule;
      return exhaustive;
    }
  }
};

const expectSchema = z
  .object({
    must: uniqueTextList(100).optional(),
    must_not: uniqueTextList(100).optional(),
    rules: z.array(RuleSchema).min(1).max(100).optional(),
  })
  .strict()
  .superRefine((expectations, ctx) => {
    if (!expectations.must && !expectations.must_not && !expectations.rules) {
      ctx.addIssue({ code: "custom", message: "At least one expectation or rule is required" });
    }

    const seen = new Map<string, Rule["type"]>();
    for (const [index, rule] of (expectations.rules ?? []).entries()) {
      const identity = ruleIdentity(rule);
      const prior = seen.get(identity);
      if (prior === rule.type) {
        ctx.addIssue({
          code: "custom",
          path: ["rules", index],
          message: "Duplicate deterministic rule",
        });
      }
      const opposite =
        rule.type === "regex_present"
          ? "regex_absent"
          : rule.type === "regex_absent"
            ? "regex_present"
            : rule.type === "phrase_present"
              ? "phrase_absent"
              : rule.type === "phrase_absent"
                ? "phrase_present"
                : undefined;
      if (opposite && prior === opposite) {
        ctx.addIssue({
          code: "custom",
          path: ["rules", index],
          message: "Conflicting presence and absence rules",
        });
      }
      if (!prior) seen.set(identity, rule.type);
    }
  });

const verificationSchema = z
  .object({
    status: z.enum(["correct", "incorrect", "partial", "unverifiable"]).optional(),
    errorTags: uniqueTextList(100).optional(),
  })
  .strict()
  .refine(
    (verification) => verification.status !== undefined || verification.errorTags !== undefined,
    {
      message: "Verification must include status or errorTags",
    },
  );

const sourceSchema = jsonRecord.superRefine((source, ctx) => {
  for (const field of ["anchor", "text"] as const) {
    const value = source[field];
    if (value !== undefined && (typeof value !== "string" || value.trim().length === 0)) {
      ctx.addIssue({ code: "custom", path: [field], message: `${field} must be meaningful text` });
    }
  }
});

export const ScenarioSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: meaningfulText,
    tags: uniqueTextList(32),
    profile: z.string().trim().min(1).max(128),
    mode: z.enum([
      "teach",
      "socratic",
      "practice",
      "review",
      "repair",
      "teach_back",
      "exam",
      "homework_help",
    ]),
    learnerState: jsonRecord,
    turns: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: meaningfulText,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    sources: z.array(sourceSchema).min(1).max(100).optional(),
    verification: verificationSchema.optional(),
    expect: expectSchema,
    judges: z
      .array(z.enum(["rule", "llm"]))
      .min(1)
      .max(2)
      .refine((judges) => new Set(judges).size === judges.length, "Judges must be unique"),
  })
  .strict();

export type Scenario = z.infer<typeof ScenarioSchema>;
