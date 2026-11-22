# 10. Verification and Trust

A confident but wrong tutor is the single biggest threat to Lyceum. Trust is built in layers; no single layer is sufficient.

## 1. The layers

1. **Tool-first checking.** Anything computable is computed: symbolic and numeric math, unit checks, code execution against tests, schema validation, citation presence. Tool results are authoritative over model opinion.
2. **Source grounding.** Factual claims in course-aligned work cite materials (anchors) or retrieved sources. Ungrounded factual claims are labeled `general` and carry an uncertainty flag when appropriate.
3. **Independent verifier pass.** A separate prompt (ideally a different model) reviews tutor explanations and generated items for errors before they are shown or banked. It returns structured findings (`ok`, `issues[]`, `severity`). Severe issues block display; minor issues add an uncertainty note.
4. **Item validation pipeline.** See `docs/07-assessment-and-mock-exams.md` section 1.1.
5. **Uncertainty flags.** The tutor can and must say "I'm not sure." The UI displays an unobtrusive "verify this" cue and offers to check with a tool or a source.
6. **Learner error reports.** A "Report an error" action on every explanation and item. Each report is stored locally, downgrades the item or explanation, and is exportable as a regression test case (`evals/scenarios`) so fixes stick.
7. **Automated evaluation.** The tutoring eval suite gates changes (`docs/12-testing-and-evaluation.md`).
8. **Red-teaming.** Scheduled adversarial testing for premature answers, flattery, hallucinated citations, false mastery claims, prompt injection, and jailbreaks.

## 2. Verification results are structured

`VerificationResult { status, score, errorTags, explanation, method }` (see `packages/core/src/domain-profile.ts`). `method` is shown to the learner as a source label (`tool: symbolic equivalence`, `rubric: deep-model, 2 passes`). Statuses:

- `correct`, `incorrect`, `partial`: the tool or rubric reached a conclusion.
- `unverifiable`: the system could not check. The UI says so plainly; mastery evidence for unverifiable results is down-weighted and never counted as success without learner self-check.

## 3. Disagreement handling

- **Tool vs model:** tool wins; the model must acknowledge. If the tool may be wrong (parse ambiguity), ask the learner to confirm the interpretation.
- **Pass 1 vs pass 2 grading:** large disagreement triggers a third pass or `low_confidence` with a visible note.
- **Learner vs tutor:** the tutor re-checks with tools; it concedes only when the learner is right.

## 4. Claims the product may make (honesty rules)

- Mastery and readiness are always shown with ranges and their evidence base.
- "Mastered" requires delayed and transfer evidence (docs 05 and 07).
- Never state that content is "verified" unless a tool actually verified it; say which method.
- Never fabricate citations. If retrieval returns nothing, say so.
- When running on a weak model, show reduced-quality notices for affected features.

## 5. Failure modes and responses

| Failure | Response |
|---|---|
| Model returns invalid JSON | Repair loop, then typed failure; never show raw output |
| Verifier unavailable (Pyodide not loaded) | Show "verifying…" with progress; allow continue with `unverifiable` status flagged |
| Parse ambiguity in a math answer | Ask the learner to confirm interpretation |
| Hallucinated reference | Block citations not present in retrieved sources |
| Provider outage | Retry, fallback route (announced), or offline-capable work (review, banked items) |
| Tutor contradicts earlier statement | Detect via verifier or learner report; acknowledge and correct |

## 6. Metrics

Verifier disagreement rate, reported-error rate per 1,000 interactions, item rejection rate, tool-vs-model disagreement rate, false-mastery incidents (mastered concept fails delayed check), and eval pass rate by scenario category.
