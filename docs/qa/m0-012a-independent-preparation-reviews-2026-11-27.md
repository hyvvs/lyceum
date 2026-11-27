# M0-012A independent preparation review evidence — 2026-11-27

**Scope:** Read-only reviews of the actual `docs/research/m0-012a/` human-study preparation artifacts, not source code and **not** human-subjects approval, model-provider certification, an executed pilot, participant consent, a pedagogy efficacy result or PR merge approval. All reviewers were independent Chat On Steroids worker chats; their actual messages were reported to the prime chat, which owns the edits and verification. The original 11 research Markdown documents and **five header-only CSV files** remain documentation-only. No reviewer modified any file, ran a model, contacted participants or generated findings.

The [research README](../research/m0-012a/README.md#independent-read-only-preparation-audit--original-findings-and-corrections) contains the **13 stable finding IDs**, all affected files and correction-to-spec links. This document preserves the reported verdicts, the distinct issue lists and their subsequent read-only checks. **Initial conditional approval is not treated as unconditional until the later rechecks.** These review reports are from real read-only worker tool responses; the structured finding descriptions below preserve their substance, not a fabricated GitHub review or a purported verbatim full chat transcript.

## Source reports as delivered — initial reviews

### P: worker-24 — pedagogy and mathematics

**Direct initial verdict:** **“Mathematical correctness: PASS.”** Its report independently confirmed all original 13 derivative results, optional C1 false claim, T1 rate units, source-mode task, pre/post pairing and private key, with **six SHOULD-FIX** issues:

1. **P1** — `05-prototype-prompts.md` original lines 34–35: level 5 “reflection/parallel” / fast-path override ambiguous relative to canonical `docs/06-tutor-behavior-spec.md` lines 44–50; demand **level 4 completed OR explicit request after short reflection**, human-controlled, fresh similar follow-up.
2. **P2** — original `05` lines 187–189: fast-path worked parallel example seemed to silently skip levels 1–3; record an explicit learner-selected human-approved fast jump, distinct from default one-level escalation.
3. **P3** — original `05` line 59: recorded confidence mismatch calibration was optional; canonical `docs/06` line 59 requires a short remark after verified correctness mismatch.
4. **P4** — original `05` lines 164–168: C1 false peer claim card supplied the expected product-rule correction to the model, invalidating an **uncued** anti-sycophancy observation.
5. **P5** — original `05` lines 174–179: S1 source probe prompted the model with the expected “not covered” behavior, invalidating an **uncued** source-policy observation.
6. **P6** — original `01-protocol.md` line 37: W1/W2 source label said packet §2, but actual worked examples were in `03-math-packet.md` **§4**.

**Initial report limitation:** observations on prepared stimuli and mathematically checked synthetic content are *not* observed learner interactions or approval of an existing model.

### M: worker-25 — study methodology and measurement

**Direct initial verdict:** **“Conditional PASS after correction of five SHOULD-FIX findings. No fundamental study-design blocker.”** Its five findings:

1. **M1** — original `08-analysis-plan.md:31`, `templates/observations.csv:1`: no distinct model-turn denominator or deduplicated human intervention ID; one action could otherwise be counted repeatedly across several behavior rows.
2. **M2** — original `08-analysis-plan.md:15–28`, `06-observation-sheet.md:18–29`: unoffered, missing, explicitly skipped and *contaminated* independent attempts lacked fully consistent offered/scoring/paired-denominator policy.
3. **M3** — original `01-protocol.md:24` vs `05-prototype-prompts.md:103–125,196–204`: protocol restricted actual model to guided segment but planning D1, warm-up D3 and debrief D10 were model-enabled or ambiguous.
4. **M4** — original `05` lines 31–35,211 and `06` line 48: level 5 “reflection/parallel” logic conflated the two canonical alternatives and omitted required *new, separate, similar* retry after the active full solution. **Overlaps independent P1; both reports retained.**
5. **M5** — original `01-protocol.md:38–42` and `09-human-runbook.md:33–36`: 43-minute schedule had no hard omission/cutoff priorities; a **human-controlled synthetic-only rehearsal prior to recruitment** should be mandatory, not merely optional.

**Initial PASS boundaries:** adult criteria, A/B schedule, neutral interview, CSV header/dictionary relationship and no causal inference or invented results. This conditional review was **not** represented as unconditional before correction.

### V: worker-33 — privacy, consent and wellbeing

**Direct initial verdict:** **“PASS for preparation scope, with two recommended privacy clarifications before human execution.”** The owner subsequently made both **REQUIRED**:

1. **V1 LOW / owner REQUIRED** — `01-protocol.md:67`, `08-analysis-plan.md:27,48`, `09-human-runbook.md:59`: with n=5–10, pseudonymized individual profiles/evidence may reidentify a person. Restrict all individual records and evidence refs to **authorized private reviewers**, and use only non-identifying public aggregates with suppression/omission of revealing small cells/quotes.
2. **V2 LOW / owner REQUIRED** — `02-information-consent.md:15–19`, `05-prototype-prompts.md:127–155`: clarify exactly whether confidence ratings, error codes and moderator verdicts go to a provider; keep these and all observation metadata **local by default**, unless field-specific reviewed, disclosed and separately affirmatively consented.

The original report explicitly confirmed separate affirmative external-model/recording choices, recording OFF by default, unfilled ethics/privacy/storage/retention/deletion human gates, adult voluntariness, no deliberate distress, no actual data, **five empty CSV schemas**, and **all 20 canonical accessibility cases BLOCKED / NOT RUN** including READ-01. It said no participant or ethics approval was obtained and no files were edited. Its first attempt to message the prime returned `OWNER_TRANSITION_IN_PROGRESS`; the report was subsequently delivered through the connector and independently inspected.

## Rechecks on corrected actual materials

- **worker-24 recheck #1:** **four of six** original findings resolved (P1/P2/P3/P6). P4 required clarification allowing the model to *provisionally reason about fictional C1* without claiming it human-verifies a participant; P5 required removal of an explicit trigonometry cue from the always-on instruction. Both were corrected. Reviewer independently reconfirmed the original 13 math results, C1 and newly added **F1/F2** checked derivative/point values.
- **worker-24 final targeted recheck:** reported **PASS** of C1 exception, S1 uncued source context, F1/F2 reserve availability and level-5 fresh-retry prerequisite. It found one final **minor cross-reference SHOULD-FIX**: `05` model-facing `TASK_TEXT` said “from 03” even for F1/F2 kept in private `04`. **Corrected** to explicitly allow *only the selected reserve question* from `04` after authorization; the model never receives that key. The D4 level-5 wording now also repeats the preverified reserve prerequisite. No unresolved substantive mathematics/pedagogy blocker.
- **worker-25 recheck #1:** four of five substantive groups passed; requested a complete stage-timing register, independent-only score column semantics and a guided-only intervention numerator. These were corrected in the existing **five** templates (no additional CSV): `sessions.csv` now has **seven stage statuses and seven active minutes**, pause, total duration, timing-deviation, turn-log completeness; `attempts.csv` scores only validly independent B/E/T (witnessed offered skip is 0, contaminated/missing blank); `observations.csv` distinguishes MODEL_TURN, GUIDED MODERATOR_INTERVENTION and TECHNICAL_FAILURE. Non-guided human actions are not intervention-rate numerator.
- **worker-25 final targeted recheck:** reported **“PASS — all three prior residual methodology SHOULD-FIX findings resolved in actual current files. No remaining BLOCKER/SHOULD-FIX.”** Verified five CSVs header-only and dictionary-aligned, distinct guided response/actions, incomplete/zero-turn undefined rate, inclusion/exclusion, independent B/E/T scores, timing/rehearsal and correct OR level-5 rule. Optional clarity suggestions were implemented: stage minutes **exclude separately logged pauses**, and pooled intervention ratios use only COMPLETE positive-turn sessions, reporting excluded counts.
- **worker-33 privacy recheck:** reported **“PASS closure of both owner-required privacy findings in substance; no material remaining blocker.”** Confirmed private small-n individual profiles, public aggregate/suppression, non-anonymity, field-specific allowlist, human provider-terms/deletion review and five empty templates. Editorial LOW terminology cleanups were adopted: `05` says **minimum redacted** rather than “anonymized” math and prohibits even pseudonyms by default; `09` says **pseudonymized (not anonymous)** rather than “deidentified”.

**Recheck boundary:** all rechecks were *read-only* on actual files by independent workers. A conditional methodology report became a **preparation-scope PASS only after its concerns were addressed and final recheck returned PASS**. No reviewer has approved actual participant research, provider terms or a live tutor. No mock/model session was executed in order to “make” a probe pass.

## Local validation evidence on final preparation branch

- Read-only independent mathematics: original **13** derivative tasks and C1 claim; plus **F1** `(5x+1)^2` at 1 → derivative `10(5x+1)`, **60** and **F2** `x(x+2)^3` at 1 → derivative `(x+2)^2(4x+2)`, **54**. Local SymPy symbolic derivative/evaluation crosscheck **15/15**; T1 rate **42 m²/s** versus area **49 m²**.
- Python audit: **11 research Markdown**, **five CSVs**, every CSV exactly **one header and zero participant/result rows**, no broken relative Markdown links, unique CSV columns present in the analysis dictionary, unique model-turn/intervention fields and explicit contaminated independent scoring.
- Windows PowerShell `corepack pnpm install --frozen-lockfile` **PASS**, `corepack pnpm agentcheck` **PASS** (10 skills / 10 AGENTS files), complete `corepack pnpm verify` **PASS**: boundaries, typechecks, **50 test files / 475 passed / 1 historical skip**, 30 canonical scenarios **INCOMPLETE**, **29/29 deterministic rules passing**, 123 subjective expectations unevaluated, and Biome 242 files checked/no fixes. `git diff --check` **PASS**. Software CI and deterministic fixtures do **not** establish tutor quality, research validity, consent or release acceptance.
- Existing accepted software baseline and prior visual/production tests are historical M0-014 evidence, **not rerun here**. No new screenshot, real device, model or participant testing in M0-012A.

## Human decisions still unfulfilled

Human research/ethics/privacy authority and named responsible contacts; noncoercive adult recruitment and informed consent; **required human-controlled synthetic rehearsal before recruitment**; exact provider/model/terms/region/data fields/training/retention and affirmative external processing choice; recording opt-in separately (**OFF** by default); separate identity/contact/consent store, secured pseudonymized observations, deletion/withdrawal policy with provider limits; safeguarding and actual moderator/analyst. No real records, signatures or prefilled findings should ever be committed. M0-012 remains `[~]` until actual eligible 5–10-adult sessions, approved findings and specification changes reviewed and separately owner-accepted. The owner's canonical 20 human accessibility cases remain **BLOCKED/NOT RUN**, and M0-003/M0-004/M0-017 remain `[~]`.
