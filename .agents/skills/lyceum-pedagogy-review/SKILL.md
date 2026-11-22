---
name: lyceum-pedagogy-review
description: Use for any change to tutor prompts, planner, scheduler, grading, hint ladder, feedback, or mastery logic on the Lyceum repo, or when asked to check learning-science soundness and honesty. Read-only review.
---

# Lyceum pedagogy review

Review only: do not edit files. Review the diff of the current branch against main (`git diff main...HEAD`). Output a prioritized list of BLOCKER, SHOULD-FIX, and NOTE items; each cites file and line and the rule it breaks. If everything is clean, say so and list what you checked. This works best in a fresh chat, separate from the one that wrote the code.

Read `docs/06-tutor-behavior-spec.md`, `docs/05-learner-model-and-algorithms.md`, and `docs/07-assessment-and-mock-exams.md` first.

Check against: retrieval practice, spacing, interleaving, mastery gating, desirable difficulty, worked-example fading, hint-ladder escalation, diagnose-before-correct, no flattery, calibration and metacognition, performance-versus-learning (delayed and transfer evidence), source labeling, honest uncertainty. Look for ways the change could give answers too early, praise wrong work, declare false mastery, create illusions of knowing, or obey instructions embedded in sources.

Run the eval suite if available and report per-scenario results. Include example failing dialogues for each finding.
