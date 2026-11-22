# 00. Vision and Product

## 1. One-sentence definition

Lyceum is a local-first, model-agnostic app that wraps any language model in a curriculum map, a persistent learner model, a practice-and-assessment engine, and a verification layer, so a person can **master** any complex subject through personalized, evidence-based tutoring.

**Tagline candidates:** "Master anything." · "Learn it. Keep it." · "The tutor that knows you."

**Name note:** "Lyceum" (Aristotle's school) was chosen as a sleek working name. Before public launch, check trademark and domain availability. Alternatives: Noetic, Telos, Praxis, Meridian.

## 2. The problem

Raw chat models explain well but teach poorly. They answer instead of making the learner retrieve, they forget the learner between sessions, they flatter wrong work, they cannot reliably say what you actually know, and they cannot run a real exam or schedule review. Intelligent tutoring systems got the pedagogy right but only for narrow subjects. Spaced repetition tools preserve memory but do not teach or diagnose.

Bloom's "2 sigma" result (1984) showed one-on-one mastery tutoring lifts students about two standard deviations over classroom instruction. Lyceum's goal is to approximate that for any learner, in any subject, at software scale.

## 3. Users

| Segment | Description | Typical goal |
|---|---|---|
| **Primary: university students** | Have a syllabus, notes, and exams | Pass or ace a course; keep up during term |
| **Primary: adult learners** | Self-taught, career changers, returning learners | Reach a competence level; pass a certification |
| **Later** | School students, professionals, institutions | Out of scope for v1 (adults only at launch) |

**First wedge:** first-year university mathematics (calculus, linear algebra, probability and statistics, discrete math), because it is high-demand, exam-driven, and machine-verifiable. The architecture must never depend on math (AGENTS.md invariant 1).

## 3.1 What "best learning experience ever" means

Lyceum should feel like a brilliant, patient, honest tutor who knows you, plus a calm, beautiful workspace. Concretely, every learner should be able to say:

1. "It always knows what I should do next."
2. "It can tell what I actually know, and it is honest when I am not ready."
3. "It found why I keep getting this wrong and fixed it."
4. "What I learned stays learned."
5. "It never wastes my time, never talks down to me, never flatters me."
6. "It is fast, beautiful, accessible, and works with whatever AI I want to use, even offline."

The full bar is in `docs/01-experience-and-quality-bar.md`.

## 4. Product pillars

1. **Goal-driven.** A goal contract with a definition of done, deadline, and feasibility check. Backward planning. Triage mode.
2. **Diagnostic and personal.** Adaptive diagnostic with confidence ratings, producing a live mastery map. A learner model tracking knowledge, errors, memory, calibration, and behavior.
3. **Evidence-based teaching.** Retrieval practice, spacing, interleaving, mastery gating, desirable difficulty, worked examples that fade, hint ladders, teach-back.
4. **Real assessment.** Item bank, mock exams that mirror real formats, rubric grading, exam wrapper, honest readiness estimate.
5. **Root-cause repair.** Weakness detection that traces failures up the prerequisite graph and confirms repair with delayed checks.
6. **Trustworthy.** Tool verification, source labels, uncertainty flags, user-controlled source policy.
7. **Model freedom.** Any provider, any key, any local model. The learner chooses what powers the tutor and sees what leaves their device.
8. **Private and local-first.** Works offline with local models; data stays on device by default.
9. **Subject-agnostic.** Domain profiles make the same engine teach math, law, languages, history, or anything else.

## 5. Product surfaces

Web app (installable PWA) and desktop app (Tauri) share one codebase. Desktop adds native keychain, local model runtime (embedded llama.cpp), faster local storage, and file-system access. Mobile apps come later from the same engine.

## 6. Feature inventory (with release targets)

Milestone names refer to `docs/13-roadmap.md`.

| Area | Capabilities | Milestone |
|---|---|---|
| Goal engine | Goal contract, feasibility check, backward plan, triage | M4 |
| Diagnostic | Adaptive, confidence-rated, first mastery map | M4 |
| Subject map | Concept graph, skill graph, exam blueprint, misconception library | M1, M5 |
| Sources | Upload and parse materials, coverage report, three source modes, labels | M5 |
| Session loop | Warm-up retrieval, learn, interleaved practice, error review, exit ticket, "What should I do now?" | M4 |
| Tutor | Explain, hint ladder, Socratic, teach-back, worked-example fading, anti-sycophancy | M4 |
| Practice engine | Item templates and LLM items, validation, bank, interleaving, difficulty targeting | M3, M4 |
| Verification | Symbolic and numeric checks, step checks, independent verifier pass | M3 |
| Model gateway | All providers, key vault, local models, routing, capability checks, readiness test | M2 |
| Spaced review | FSRS per concept and card, exam-aware compression | M1, M6 |
| Mock exams | Blueprint-based, timed, rubric grading, wrapper, readiness range | M6 |
| Weakness loop | Error classification, root-cause tracing, repair plans, closure checks | M6 |
| Handwriting feedback | Photo to line-by-line error finding | M7 |
| Metacognition coach | Calibration dashboard, illusion-of-knowing alerts, study-skills, exam strategy | M7 |
| Visuals and widgets | Graphs, diagrams, concept maps, interactive sliders | M7 |
| Revision outputs | Cheat sheets, flashcard decks, exportable summaries | M7 |
| Second domain | Structurally different profile (law, history, or language) | M8 |
| Sync, mobile, voice, teacher views, community library | Optional, after core is proven | M9 |

## 7. Non-goals for v1

Child accounts; teacher/parent dashboards; voice tutoring; a hosted backend required for core use; a public content marketplace; monetization features; social features beyond export/share of decks. All are planned as extensions, none may be required by the core loop.

## 8. Product rules that shape everything

- **The learner is in control.** Source mode, model choice, hint level, tutor tone, privacy, and data export are the learner's decisions.
- **Support fades.** Track independence; reduce scaffolding as competence grows.
- **Performance is not learning.** Success this session is not mastery; require delayed and transfer evidence before declaring it.
- **Honest numbers.** Readiness and mastery are shown with uncertainty ranges and reasons, never as false precision.
- **Calm by default.** Minimal chrome, no dark patterns, no guilt-driven streaks. Streaks have grace days.

## 9. Success definition

Learners demonstrably learn more and retain more than with a plain chat assistant, and report that Lyceum is the best study tool they have used. Measured by pre/post gain, 30 and 90 day retention, transfer tasks, calibration error, and real exam outcomes (`docs/12-testing-and-evaluation.md`).
