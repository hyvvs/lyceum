# 07. Assessment, Items, and Mock Exams

## 1. Item lifecycle

```
draft → validated → active → (calibrated over time) → retired
            ↘ rejected (with reasons, kept for learning from failures)
```

An **item** has: id, profile and version, type, prompt, answer key or rubric, linked concepts and skills, depth level evidenced, estimated and calibrated difficulty, source label (materials / general / generated), generator info (template id and seed or model/prompt version), validation record, usage history, and quality flags (reported errors, ambiguity reports).

### 1.1 Validation checks (all required before `active`)

1. **Solvable:** a tool or independent solver reproduces the key (symbolic check, code execution, or a second-model solve for non-tool domains).
2. **Unambiguous:** an independent reader-model pass lists possible interpretations; more than one valid reading rejects the item.
3. **Single correct answer** (or a complete rubric for open-ended).
4. **Aligned:** the item truly evidences the stated concept and depth.
5. **Difficulty estimate** assigned (template parameters or model estimate).
6. **Safe and clean:** no leaked answers in the prompt, no offensive or biased content, no copyrighted text copied from sources beyond brief quotation.
7. **Format:** renders correctly; has an accessible text alternative for any image or diagram.

Items failing validation are stored as `rejected` with reasons. Reported errors from learners downgrade an item immediately and queue it for review.

### 1.2 Item bank behavior
- Prefer banked, validated items; generate on demand only when coverage is thin, and generate during idle time where possible.
- Track usage per learner to avoid repeats; template items provide unlimited variants.
- Calibrate difficulty with accumulated attempts (item response theory, 1PL/2PL) once enough data exists; until then use estimates flagged `uncalibrated` (lower evidence weight).
- Never mix learners' private materials into any shared bank without explicit consent.

## 2. Item types and formats

Multiple choice (with plausible distractors derived from misconceptions), short answer, multi-step problem, proof, find-the-mistake, fill-in-the-step, case analysis, essay, code challenge (tests as graders), diagram labeling, explain-why, oral or conversation tasks (later). Each item type is provided by a profile; the core treats them uniformly (prompt, response, verification result).

## 3. Grading

**Tool-verifiable:** profile verifier returns status and tags directly.

**Rubric-graded (open-ended):**
1. Rubric defined per item or per item type: criteria, levels, points, anchor examples at each level.
2. Grading by a `deep` model with the rubric and anchors, producing per-criterion scores with quoted evidence from the learner's answer.
3. **Second independent pass** (different prompt, ideally a different model); if scores differ by more than a threshold, run a third pass or mark as `low_confidence`.
4. Output includes confidence, per-criterion feedback, and a "challenge this grade" action that triggers a re-grade with the learner's argument as additional (untrusted) input.
5. Calibration: periodically grade anchor answers to measure drift; model readiness test includes anchor grading (see gateway doc).
6. When the available model cannot meet the minimum grading quality, the app says so and offers self-assessment against the rubric instead.

## 4. Mock exams

### 4.1 Blueprint
An **exam blueprint** defines: sections, item types and counts, topic weights, difficulty distribution, time limits, permitted aids, scoring and partial-credit rules, and pass thresholds. Sources: uploaded past papers (parsed), the syllabus, a profile's standard blueprint, or the learner's own description. Mirror the real exam's format as closely as the sources allow, and state clearly how close the match is.

### 4.2 Assembly algorithm
1. Take blueprint topic weights and the learner's coverage so far.
2. Select items that match type, topic, and difficulty distribution; avoid items seen recently or in the same mock series.
3. Ensure balance across concepts and no item leaks another's answer.
4. Prefer items from the learner's materials in materials modes; label any generated gap-fill items.
5. Record exam definition with item ids and seeds so it is reproducible.

### 4.3 Running an exam
Exam mode: timer, section navigation, flag for review, autosave every change, no hints, no tutor chat, optional extended-time accommodation, resume after interruption, and a final confirmation step. Responses are events (`attempt.recorded` with `context: "exam"`).

### 4.4 After the exam: the wrapper
Every missed or partial question is classified:

| Class | Meaning | Typical fix |
|---|---|---|
| Knowledge gap | Did not know the concept | Teach and practice |
| Procedure error | Knew the idea, executed wrongly | Targeted drills, worked examples |
| Careless slip | Right understanding, small error | Checking strategies, slow-down cue |
| Misread question | Misinterpreted the prompt | Reading protocol practice |
| Time pressure | Ran out of time or rushed | Timing strategy and speed practice |
| Anxiety or blank | Froze | Calming routine, low-stakes retrieval, human support if severe |

Classification combines tool tags, answer content, response timing, confidence, and a short learner self-report ("What happened here?"). Outputs: score with per-topic breakdown, time analysis, wrapper classification, readiness estimate (range and reasons), and a **repair plan** that feeds the planner.

### 4.5 Readiness honesty
Mock exam results update the learner model and the readiness distribution. The report states the evidence base ("based on 2 mocks and 140 attempts") and uncertainty. If the mock format does not match the real exam well, say so.

## 5. Real-learning checks

- **Delayed retests:** scheduled days to weeks after a concept is first marked "mastered"; failures reopen the concept.
- **Transfer tasks:** new contexts or problem types for the same concept; required for depth levels `apply` and above.
- **Spaced exam sampling:** short mixed quizzes over time rather than only end-of-unit tests.
- Mastery badges and progress claims require delayed and transfer evidence, not just in-session success.

## 6. Integrity modes

Homework help follows the hint ladder; an institutional "no direct answers on graded work" setting can be enabled by the learner (or later by an instructor). Lyceum never claims to detect cheating and does not surveil the learner.

## 7. Metrics

Item quality (reported-error rate, ambiguity rate, discrimination), grading reliability (agreement between passes, drift on anchors), readiness accuracy (predicted versus actual), exam completion rate, wrapper usefulness (learner ratings).
