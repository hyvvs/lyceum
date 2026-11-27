# M0-012A · Formative tutor-prototype study preparation (v0.1)

**Status: prepared materials only / NOT EXECUTED.** Canonical task **M0-012 remains `[~]`**. No participant has been contacted, enrolled, consented, studied or observed. This is not ethics approval, a model endorsement, tutoring-quality acceptance or evidence of educational efficacy. Human study execution and M0-012 completion require independent authorization and actual findings.

**Controlling owner authorization:** verbatim at local Git metadata `.git/owner-m0-012a-controlling-prompt.md`, pre-edit file/design plan at `.git/m0-012a-study-plan.md`; owner accepted M0-014 for controlled merge, with actual [PR #29](https://github.com/hyvvs/lyceum/pull/29) squash SHA `a6695a0ea906c3985e5f197175c337ae30f40d5f` and [exact merged-main run 45948700447](https://github.com/hyvvs/lyceum/actions/runs/45948700447) all three mandatory checks SUCCESS. The M0-014 `[x]` documentation marker is recorded in **this study branch only** pending a future authorized merge.

## Purpose and ownership

Prepare a small **43-minute, one-to-one, moderated, formative** prototype study for **5–10 consenting adult university-level calculus learners**. It asks whether an *existing human-approved chat model*, controlled by a human moderator, supports understandable, honest, appropriately scaffolded reasoning on a **small original synthetic** polynomial differentiation exercise. It is **not** the Lyceum deterministic production orchestrator, a qualified product or a subject-general assessment.

The human organizer must **first** appoint a responsible investigator and reviewer, obtain applicable institutional/ethics/privacy review, approve adult recruitment and consent, confirm an approved model/provider and data-handling terms, provision secure local storage with retention/deletion responsibilities, and decide independently about any recording. **No real model calls, uploads, recruitment or data capture by this implementation.** Participants can skip, pause or withdraw without penalty.

## Versioned package inventory and reading order

| File | Intended use |
|---|---|
| [01-protocol.md](01-protocol.md) | Human study protocol: questions, inclusion, two counterbalanced forms, timing, measures, stopping and limitations |
| [02-information-consent.md](02-information-consent.md) | **Draft**, plain-language information/consent; organizer/provider/privacy signoff placeholders deliberately unfilled |
| [03-math-packet.md](03-math-packet.md) | Original synthetic learner-facing reference, baseline A/B, worked/guided/independent problems, paired exit forms, transfer, source probe; **no solutions to assessment tasks** |
| [04-answer-key.md](04-answer-key.md) | Human moderator **only**: original 13 checked math items, two checked optional F1/F2 *fresh similar retry* reserves, scoring anchors, error codes; never paste key into model or learner's pre/post |
| [05-prototype-prompts.md](05-prototype-prompts.md) | Copy-ready *human-supervised* v0.1 prompts and stage cards for an approved existing model; no live model use |
| [06-observation-sheet.md](06-observation-sheet.md) | Blank reusable session/attempt/behavior log, operational definitions, fact-versus-interpretation split |
| [07-interview-guide.md](07-interview-guide.md) | Voluntary neutral interview and optional anchored clarity/control responses |
| [08-analysis-plan.md](08-analysis-plan.md) | Data dictionary for blank CSVs, scoring and denominators, coding, descriptive results, findings-to-specification trace |
| [09-human-runbook.md](09-human-runbook.md) | Gate-by-gate checklist for an **authorized human** organizer, moderator and independent reviewer |
| [10-dependencies-accessibility.md](10-dependencies-accessibility.md) | Read-only remaining-M0 dependency and owner checklist, **links to existing 20-case manual QA sheet** rather than creating competing outcomes |
| [templates/sessions.csv](templates/sessions.csv) | Header-only session/arm/model and stage completion register |
| [templates/attempts.csv](templates/attempts.csv) | Header-only item scores, independent/assisted, confidence/hint register |
| [templates/observations.csv](templates/observations.csv) | Header-only guided model-turn, unique human intervention and behavior-opportunity rows with restricted evidence references |
| [templates/interviews.csv](templates/interviews.csv) | Header-only pseudonymized neutral interview codes; **no quotes invented** |
| [templates/change-trace.csv](templates/change-trace.csv) | Header-only findings-to-future-docs-06/11 proposals and human decisions |

**Do not commit actual participant data** to these files/repository. The CSVs are schemas/examples of *headers only*, not a participant database, consent record or pre-populated findings.

## Independent read-only preparation audit — original findings and corrections

All **three distinct independent reviewers** inspected the **actual 11 Markdown documents and five empty CSV templates**, not just titles: **worker-24** pedagogy/mathematics (**math PASS**, six SHOULD-FIX); **worker-25** methodology (**conditional PASS after five SHOULD-FIX**); **worker-33** privacy/consent/wellbeing (**preparation-scope PASS**, two LOW clarifications). The owner explicitly required the two privacy clarifications. **Thirteen reviewer findings** are tracked separately below even where they identify the same underlying level-5 or model-stage issue. These reports are preparation QA, **not human ethics approval, model execution or tutoring results**.

**Review evidence and read-only correction rechecks:** [M0-012A independent preparation reviews](../../qa/m0-012a-independent-preparation-reviews-2026-11-27.md). All three later confirmed their substantive preparation findings closed. None of these reviews constitutes research ethics approval.

| Finding | Original concern and affected file | Correction and direct validation target |
|---|---|---|
| **P1** worker-24 SHOULD | Level 5 alternatives ambiguous; [05 prompt B/D8](05-prototype-prompts.md) | Explicit completed **level 4 OR explicit learner request after brief reflection**, human permission, distinct checked non-held-out fresh similar F1/F2 retry; compare [canonical 06 §3](../../06-tutor-behavior-spec.md), [04 key](04-answer-key.md) |
| **P2** worker-24 SHOULD | Fast jump to level 4 silently skips ladder; [05 D8](05-prototype-prompts.md) | Deliberate learner-selected, reflected, human-approved **and recorded** level-4 fast jump, not ordinary escalation; inspect [05 D8](05-prototype-prompts.md) and [09 runbook](09-human-runbook.md) |
| **P3** worker-24 SHOULD | Mismatched recorded confidence calibration optional; [05 constitution/D5](05-prototype-prompts.md) | **Mandatory** short non-shaming calibration after checked mismatch; moderator performs it **locally** when rating/verdict transmission unconsented; compare [06 canonical §4](../../06-tutor-behavior-spec.md) |
| **P4** worker-24 SHOULD | C1 test prompts contained expected false-claim correction; [05 D6](05-prototype-prompts.md) | Model sees only fictional claim/question; checked product-term answer remains [private 04 key](04-answer-key.md); inspect actual model-facing fenced card and [03 packet](03-math-packet.md) |
| **P5** worker-24 SHOULD | S1 test prompts contained expected source-policy response; [05 D7 and source context](05-prototype-prompts.md) | Model sees only source-bounded request, with no expected reply/cued negative sine sentence in initial source block; source truth remains [private 04 key](04-answer-key.md) |
| **P6** worker-24 SHOULD | W1/W2 source label incorrectly said packet §2; [01 schedule](01-protocol.md) | Correct source to actual **§4** worked examples; compare [03 §4](03-math-packet.md) |
| **M1** worker-25 SHOULD | No deduplicated intervention IDs or counted guided-turn denominator; [06 sheet](06-observation-sheet.md), [08 analysis](08-analysis-plan.md), [observations header](templates/observations.csv) | Exactly **one MODEL_TURN row/unique turn ID** per visible guided response and one **guided-stage MODERATOR_INTERVENTION row/unique action ID**; behavior rows may share turn but never intervention ID; rate = distinct guided interventions / observed guided turns, undefined with zero/incomplete turn log |
| **M2** worker-25 SHOULD | Unoffered, skipped, missing and contaminated independent tasks conflated; [01](01-protocol.md), [06](06-observation-sheet.md), [08](08-analysis-plan.md) | **Six scheduled B/E/T slots** per consented private session; unoffered NO/not_observed blank score, offered explicit skip 0, absent evidence blank, assisted/leaked **contaminated** blank and excluded from paired outcome |
| **M3** worker-25 SHOULD | D1/D3/D10 allowed model outside guided phase; [01 protocol](01-protocol.md), [05](05-prototype-prompts.md) | **Human only** planning, baseline, warm-up, exit/transfer and debrief; start model at guided minute 15, stop at 27; [09 runbook](09-human-runbook.md) mirrors stage boundary |
| **M4** worker-25 SHOULD | Level-5 exception and new retry conflated; [05](05-prototype-prompts.md), [06](06-observation-sheet.md) | Exact **completed 4 OR requested after reflection**, human permission and **fresh verified F1/F2**, never held-out assessment; overlaps P1 but independently tracked |
| **M5** worker-25 SHOULD | Timing crowded and rehearsal optional; [01](01-protocol.md), [09](09-human-runbook.md) | Cutoffs 15/23/27/32/36/43 (voluntary buffer 45), omit optional I2 then S1 then C1 before protected exit; seven stage status/duration slots plus pause and deviation fields; **human synthetic-only rehearsal REQUIRED before recruitment**, not performed by coding agent |
| **V1** worker-33 LOW / owner REQUIRED | Small-n pseudonymized individual profiles re-identifiable; [01](01-protocol.md), [02 consent](02-information-consent.md), [08](08-analysis-plan.md), [09](09-human-runbook.md) | Individual profiles and evidence refs **restricted to authorized private reviewers**, explicitly not anonymous; public **non-identifying aggregates only**, suppress/omit disclosive small cells and quotes |
| **V2** worker-33 LOW / owner REQUIRED | Unclear whether confidence, error categories and human verdicts sent externally; [02](02-information-consent.md), [05 D4/D5](05-prototype-prompts.md) | **Local-only by default** confidence, checked verdicts, error categories and observation metadata; external allowlist of synthetic source/task and separately approved redacted math attempt only; extra fields need human field-specific review, disclosure and affirmative permission |

**Cross-cutting execution gates retained:** adult-only consent, research-ethics/privacy authority and contact, actual provider/data-handling terms/locality/training/retention, separate affirmative external-data and optional recording permissions, separately secured identity/contact/consent mapping, local versus provider-held withdrawal/deletion limitations and human safeguarding. No real participant or approved provider has been engaged. The canonical 20 manual accessibility cases remain **BLOCKED / NOT RUN**, including READ-01.

## Source hierarchy and human review boundaries

- Governing tutor/flow specifications: [docs/06](../../06-tutor-behavior-spec.md), [docs/11](../../11-session-orchestration-and-flows.md), [docs/05](../../05-learner-model-and-algorithms.md), [docs/12](../../12-testing-and-evaluation.md), [docs/16](../../16-security-privacy.md), [docs/07](../../07-assessment-and-mock-exams.md). All remain unmodified. The actual [30 scripted evaluation scenarios](../../../evals/scenarios) remain **incomplete for real quality**: 29 deterministic rules green, 123 subjective expectations unevaluated; this does not predict the human study result.
- No raw participant history, identity, diagnosis, student grade, confidential source, provider credential, telemetry, or content transcript goes to Git. Approved provider use and recording require distinct **positive participant consent** and a reviewed provider/data policy; nonconsent means **do not send** to that service.
- Moderator verifies mathematical answers using the **separate answer key**, not model confidence. Only observed facts may be recorded as facts. Qualitative judgments must be flagged as interpretations and be reviewable by a second human.
- **STOP at Draft PR after full verification and independent preparation reviews.** This package authorizes *preparation only*. Human execution, findings, docs/06/11 changes and final M0-012 completion remain pending.
