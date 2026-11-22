# 01. Experience and Quality Bar

This document defines what "highest quality" means. Items marked **GATE** block release.

## 1. Experience principles

1. **One clear next step.** Every screen has an obvious primary action. The home screen answers "What should I do now?" with a single button. The learner never has to plan their own study.
2. **Momentum.** Sessions start in under 5 seconds and give a first question quickly. Feedback is immediate. Progress is visible within minutes of first use.
3. **Honesty.** Mastery, readiness, and sources are shown with their uncertainty and provenance. The tutor admits ignorance and mistakes. No inflated praise.
4. **Respect.** Treat the learner as a capable adult. No condescension, no cheerleading filler, no guilt.
5. **Agency.** Offer choices (mode, hint, pace, source policy, model) with good defaults; never trap the learner.
6. **Calm and focus.** Quiet visual design, generous spacing, no notification spam, no dark patterns. Distraction-free exam and focus modes.
7. **Clarity over cleverness.** Plain language; math rendered beautifully; diagrams where they help; no jargon without explanation.
8. **Mastery made visible.** The mastery map filling in is the core reward. Celebrate real gains (a repaired weakness, a retention milestone), not time spent.
9. **Resilience.** Works offline, survives provider failures, never loses the learner's work.

## 2. Core screens: required behavior

### Today (home)
Shows: the primary "Start" button with the planned session length and topic, days to deadline, what is due for review, one insight (for example "Series convergence is your biggest lever"). Offers 10, 25, and 60 minute options. Streak with grace days, never shaming. Empty state for new users leads straight into the goal contract.

### Study session
Two-pane layout: tutor conversation and a workspace (problem, math editor, scratchpad, graph). Always visible: hint button with a clear ladder, confidence selector before answer reveal, source label on content, session timer (optional), "I'm stuck" and "Explain differently" actions. Streaming responses with stop and regenerate. Autosave every interaction as events.

### Mastery map
Interactive concept graph colored by mastery, forgetting risk, and exam weight, with filters. Tap a concept to see history, error patterns, prerequisites, and a "Fix this" action. Must remain legible at 500+ nodes (clustering, zoom levels, search).

### Mock exam
Full-screen exam mode with timer, flagging, navigation, no hints, real conditions. After: score, per-topic breakdown, exam wrapper classification of each miss, readiness range with reasons, and a repair plan. Never lose answers if the app closes (continuous autosave).

### Sources
Upload status, coverage report, per-concept source mapping, source mode toggle, conflict flags.

### Models
Add/test/remove providers, see capabilities and the "tutoring readiness" result, choose tier routing (`fast`, `standard`, `deep`), manage local models, see what data goes where. See `docs/03-model-gateway.md`.

### Insights
Calibration (confidence versus correctness), retention, hint dependence, error patterns, plan adherence.

## 3. Interaction details that make it great

- **Math input** is first-class: MathLive editor with keyboard shortcuts, LaTeX paste, natural typing (`x^2`, `sqrt`), handwriting photo upload, and clear rendered preview. Equation rendering uses KaTeX with accessible MathML output.
- **Keyboard-first.** Every action reachable by keyboard. Command palette (Cmd/Ctrl-K). Visible, customizable shortcuts.
- **Undo everywhere** for learner edits; confirm only for destructive, irreversible actions.
- **Motion is meaning.** Smooth, springy, purposeful animation (page blur-in, staggered cards, shared-element dock indicator, map nodes filling in) from the shared presets in `packages/ui/src/motion.ts`. Respect `prefers-reduced-motion`. No decorative motion, and none during active problem-solving (docs/18 section 6).
- **Streaming UX.** Show tokens as they arrive; show a stable layout (no jumping); handle slow local models gracefully with progress and an honest "this model is slow" hint.
- **Empty, loading, and error states** are designed, not defaults. Errors say what happened, why, and what to do next, in plain language ("Your Ollama server isn't responding at localhost:11434. Is it running? [Test again] [Choose another model]").
- **Onboarding** gets a first diagnostic question within 5 minutes and a first mastery map within 15 minutes.
- **Tone of voice** is defined in `docs/06-tutor-behavior-spec.md` and used across all copy.
- **Dark and light themes**, plus high-contrast. System default respected.
- **Localization-ready** from day one (ICU messages, RTL support in layout, locale-aware numbers and dates). English first.

## 4. Visual design direction

Lyceum uses a **glass design language with smooth Framer Motion animation**, modeled on the supplied "Glassy Dashboard V5" reference: a soft atmospheric backdrop, frosted floating panels, a floating pill nav and left icon dock, tinted category cards, one saturated focal accent per view, and springy, calm transitions. The full specification (tokens, components, motion, accessibility guardrails, backdrop system) is `docs/18-design-language-glass.md`, implemented in `packages/ui`.

Standing rules from this document that the glass style must never compromise: legibility of reading and math surfaces, WCAG 2.2 AA, performance budgets, and graceful fallbacks (reduced transparency, reduced motion, high contrast). Dense information still uses progressive disclosure; typography remains highly readable with learner-adjustable size.

## 5. Accessibility (GATE)

- WCAG 2.2 AA minimum for all screens, tested with axe in CI plus manual checks.
- Full keyboard operation, visible focus, logical focus order, focus restored after dialogs.
- Screen reader support: semantic HTML, ARIA only where needed, live regions for streamed tutor text (polite, throttled), accessible math (MathML or speech text), alt text for generated diagrams (the tutor must provide it).
- Color is never the only signal (mastery map uses shape/pattern in addition to color).
- Support dyslexia-friendly options (font choice, spacing, line focus), reduced motion, text scaling to 200%, and high contrast.
- Time pressure is never mandatory except in explicit mock-exam mode; provide extended-time accommodations setting for exams.

## 6. Performance budgets (GATE)

Measured on a mid-range laptop (4 cores, 8 GB RAM) and a mid-range phone for web.

| Metric | Budget |
|---|---|
| Cold start to interactive (web, cached) | under 2 s |
| Desktop cold start to Today screen | under 2.5 s |
| Navigation between screens | under 150 ms perceived |
| Local verification of a math answer (warm) | under 300 ms |
| First streamed token (cloud model, normal network) | under 1.5 s from submit, excluding provider latency |
| UI thread long tasks | none over 50 ms during typing and streaming |
| Mastery map interaction at 500 nodes | 60 fps pan and zoom |
| Main bundle (initial route, gzipped) | under 250 KB; heavy modules (Pyodide, local runtime, map) lazy-loaded |
| Memory (web, steady state) | under 500 MB excluding local model weights |
| Event append | under 10 ms p95 |

Pyodide and local model runtimes load lazily and show honest progress; verification falls back gracefully while loading.

## 7. Reliability and trust (GATE)

- **No lost work.** Every answer, draft, and exam response is persisted as events before the UI acknowledges it.
- **Offline.** Everything not requiring a remote model works offline (review, mastery map, plans, banked items, local models).
- **Graceful provider failure.** Typed errors, retry with backoff for retryable errors, clear fallback prompts, never silent quality downgrades.
- **Correctness.** A reported error becomes a regression test within the same sprint. The verifier disagreement rate and reported-error rate are tracked metrics.

## 8. Learning-experience acceptance criteria

Every learning flow must satisfy:

1. Starts with retrieval where prior material exists.
2. Never presents a full worked solution before the hint ladder or an explicit learner request (and logs it as such).
3. Asks for confidence on diagnostic and exam-style items.
4. Gives specific, concept-linked feedback explaining why, not just right/wrong.
5. Interleaves related concepts in practice blocks once a concept passes first mastery.
6. Schedules review automatically and shows what is due.
7. Distinguishes performance from learning in all progress displays (immediate vs delayed evidence).
8. Offers an honest "I'm not sure" path from the tutor, with a suggestion to check a source.

## 9. UX review checklist (used by the `lyceum-ux-review` skill)

- [ ] The primary next action is obvious within 2 seconds.
- [ ] Keyboard-only run-through of the full flow succeeds.
- [ ] Screen reader run-through reads sensible labels and live updates.
- [ ] Empty, loading, partial, and error states exist and are helpful.
- [ ] Contrast, text scaling, and reduced-motion verified.
- [ ] Source labels and privacy/provider indicators visible where content appears.
- [ ] Copy follows the tutor tone guide; no filler praise; no jargon.
- [ ] Layout stable during streaming; no jank.
- [ ] Works at small and large viewport sizes.
- [ ] Performance budgets met on the reference devices.
