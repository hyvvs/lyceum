# 11. Session Orchestration and Learning Flows

The **session orchestrator** is a deterministic state machine in `packages/core` that decides what happens next. The tutor (LLM) fills in language for each step; it does not choose the flow.

## 1. Session shape

```
Warm-up retrieval (3-5 min)
   → Core learning (new concept: explain → worked example → guided practice)
   → Interleaved practice (mixed concepts, method selection)
   → Error review (why each mistake happened)
   → Exit ticket (2-3 items) + preview of next session
```

Adapts to available time (10, 25, 60 minutes): shorter sessions drop or compress blocks in this priority order: keep warm-up retrieval and exit ticket; shrink core learning; shrink interleaved practice; shrink error review. A session never starts new material if time left is under a minimum teaching block (default 8 minutes); it uses review instead.

## 2. State machine (summary)

States: `Idle → Planning → WarmUp → Teach → GuidedPractice → InterleavedPractice → ErrorReview → ExitTicket → Summary → Idle`, with side states `Hinting`, `Repair`, `TeachBack`, `Break`, `Paused`, `Abandoned`.

Transitions are driven by events and rules, for example:
- `GuidedPractice → Hinting` on hint request or detected stuckness (two failed attempts or long idle).
- `GuidedPractice → Repair` when a failure pattern triggers weakness detection.
- Any state `→ Break` on fatigue signals (rapid wrong answers, declining accuracy) with a short suggestion and an option to continue.
- `Teach → TeachBack` after a concept is practiced successfully (for `understand` depth).
- Any state `→ Paused/Abandoned` on app close; resume restores exact position (everything is event-sourced).

Every transition appends events and is unit-tested, including interruption and resume.

## 3. Planning a session

Inputs: goal, plan, learner state, time available, due reviews, current weaknesses, last session summary. Output: ordered blocks with target concepts, item counts, difficulty targets, and the mode for each block. Uses next-best-action scoring (docs/05 section 4). The plan is explainable: "Today: review 6 due items, learn *chain rule*, practice mixed derivatives, fix *sign errors* in integration."

## 4. Goal contract flow

1. Ask the goal in plain language; classify type (exam, level, fix a subject, project, curiosity).
2. Capture: outcome, **definition of done** (measurable), deadline, weekly hours, current level, reason, constraints (accessibility, device), preferences, interests (for examples).
3. Choose source mode; upload materials or skip.
4. **Feasibility check:** estimate hours needed from graph and (later) diagnostic; compare to available; present honest options.
5. Confirm contract; generate plan after diagnostic.

The contract is editable later; changes emit events and trigger re-planning.

## 5. Diagnostic flow

Adaptive diagnostic (docs/05 section 5) with confidence capture, a clear promise ("about 15 minutes; no grades; this just tells me where to start"), pause/resume, and a first mastery map reveal. Offer to skip parts the learner knows they have mastered (with verification probes).

## 6. Repair flow

Triggered by weakness detection. Steps: explain what was noticed ("sign errors in 4 of the last 6 integration problems"), probe suspected prerequisites, re-teach differently, scaffolded practice, retest, schedule a delayed closure check. The learner sees the repair as a short, named mission with a clear finish, not an open-ended slog.

## 7. Exam triage flow

Deadline under a threshold (default 7 days) or learner request: show "Triage plan" with highest-yield topics, the target score range, explicit omissions, and a daily schedule including mock exams. Ask the learner to confirm trade-offs.

## 8. "What should I do now?"

A single entry that returns the next best action with a one-line reason and an estimated duration. Always available; always honest about uncertainty ("I don't have enough data yet; let's do a 5-minute probe").

## 9. Pace, fatigue, and wellbeing

Detect fatigue and frustration from behavior (accuracy drop, response slowdowns, skips) and propose breaks or easier work. Streaks include grace days. Never shame a missed day; the weekly summary reframes plans. If distress language appears, the tutor follows the constitution (care, suggest support).

## 10. Independence

Track an **independence score** (share of recent successes with no hints). As it rises, the orchestrator reduces scaffolding (longer gaps before offering hints, fewer worked examples, more transfer tasks). The learner sees this trend.

## 11. Edge cases to test

Resume after crash mid-item; clock changes and time zones; empty concept graph; all concepts mastered; deadline in the past; goals with no deadline; provider failure mid-session (fall back to banked items and review); learner switches source mode mid-session; changing model mid-session; two devices (later); extremely long sessions; zero due reviews; huge backlog of due reviews (cap and prioritize).
