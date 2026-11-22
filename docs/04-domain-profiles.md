# 04. Domain Profiles (and the Math Profile)

A **Domain Profile** is a plug-in that teaches the engine how a subject works. The core never contains subject logic (AGENTS.md invariant 1). Math is profile #1; a structurally different second profile (M8) proves the architecture is truly subject-agnostic.

The TypeScript contract is in `packages/core/src/domain-profile.ts`. This document defines what a complete profile must provide.

## 1. What a profile provides

| Part | Purpose |
|---|---|
| **Manifest** | id, name, version, verification kind (`tool`, `rubric`, `hybrid`), item types, rendering needs |
| **Skill taxonomy** | What learners must be able to *do* in this subject, linked to concepts |
| **Item types and templates** | Formats, parameterized templates, and LLM-generation guidance |
| **Verifier** | `verify(item, response)` returning status, score, error tags, explanation, method |
| **Error taxonomy** | Common errors with tags, descriptions, and likely upstream prerequisites |
| **Misconception library** | Known misconceptions with diagnostic probes |
| **Rubrics** | For open-ended work (proofs, essays, case analysis) with anchor examples |
| **Feedback style** | How to explain errors in this subject; vocabulary; conventions |
| **Tutor guidance** | Subject-specific prompt additions (notation conventions, typical pitfalls, ways of showing work) |
| **Exam conventions** | Typical formats, timing, marking schemes for mock exams |
| **Tools and rendering** | Calculators, graphers, code runners, maps, timelines; how content is displayed |
| **Seed content** | Starter concept graphs for common courses (optional but recommended) |

## 2. Profile lifecycle

`install` (validate manifest, load assets) → `activate` (lazy-load heavy tools like Pyodide) → `verify`/`generateItems` calls → `deactivate`. Profiles declare permissions (worker use, network access, file access); the host enforces them. Profiles are versioned; the learner's data stores the profile version used for items so changes do not corrupt history.

## 3. Conformance test suite (required for every profile)

`packages/eval` provides `runProfileConformance(profile)`, which checks:

1. Manifest validates.
2. `verify` never throws on garbage, empty, huge, or adversarial input; returns `unverifiable` when it cannot check.
3. Verification is deterministic for the same input.
4. Every generated item passes validation (solvable, one correct answer or a rubric, aligned to its concept).
5. Error tags returned exist in the taxonomy.
6. Item generation is reproducible from its seed.
7. Rendering outputs are accessible (text alternatives present).

A profile that fails conformance cannot ship.

## 4. The Math profile (profile #1)

### 4.1 Scope for v1
Single-variable calculus, linear algebra, probability and statistics, discrete mathematics. Polish **one course deeply first** (recommend Calculus I/II), then widen.

### 4.2 Item types
Computation (final answer), multi-step problem (steps checked), proof (rubric), find-the-mistake, conceptual explanation, graph interpretation, fill-in-the-step, true/false with justification, multiple choice (diagnostics and fast review).

### 4.3 Verification pipeline (tool first)

1. **Parse** the learner's answer from MathLive/LaTeX or plain text into an expression tree (robust to notation variants such as `2x`, `2*x`, `\frac{...}{...}`).
2. **Symbolic equivalence** with SymPy in a Pyodide worker: simplify the difference, handle domains, assumptions, and equivalent forms.
3. **Numeric spot checks** at random points (seeded) for functions, with tolerance, to catch parser/simplifier gaps.
4. **Form constraints** where the item requires a specific form (factored, simplified, decimal to N places).
5. **Units and dimensions** checks where relevant.
6. **Step checking** for multi-step work: verify that each step follows from the previous (equivalence preserved, rule applicable), flag the first invalid step, and tag the error type.
7. **Proofs and explanations:** rubric-graded by a `deep` model with a second independent pass; result flagged `method: "rubric"` and shown with uncertainty; the learner can challenge a grade.
8. **Result:** `correct | incorrect | partial | unverifiable` plus tags such as `sign_error`, `wrong_rule`, `algebra_slip`, `domain_error`, `notation_confusion`, `arithmetic_error`, `incomplete`, `wrong_form`.

If parsing fails, the tool says so and asks the learner to rewrite or confirm the interpretation. It never guesses silently.

### 4.4 Item generation

- **Parameterized templates** for computational skills (for example derivative of `a x^n + b sin(cx)` with constraints on coefficients), generated from a seed, with the answer computed by SymPy. Guarantees correctness and controllable difficulty.
- **LLM-generated items** for conceptual, applied, and word problems, always passed through: solvability check by SymPy or a solver prompt, ambiguity check, single-answer check, alignment check, difficulty estimate.
- **Difficulty control** by template parameters (number of steps, coefficient complexity, need for a trick) and item-response calibration over time.
- **Variants:** each template yields unlimited fresh variants for retrieval and interleaving without repetition.

### 4.5 Misconceptions and error taxonomy (seed examples)
Treating `(a+b)^2` as `a^2+b^2`; confusing derivative and antiderivative rules; ignoring domain of logs and square roots; cancelling across sums; sign errors on negative exponents; mistaking independence for mutual exclusivity; confusing correlation with causation; assuming a limit equals the function value; chain-rule omission. Each links to likely prerequisite concepts so the weakness loop can trace causes.

### 4.6 Tutor guidance for math
Show work in clean LaTeX; prefer concrete numeric examples before abstraction; ask the learner to predict before revealing; use contrasting cases (two similar problems needing different methods); encourage estimating and sanity-checking answers; align notation with the learner's course materials when provided.

### 4.7 Tools
KaTeX rendering with accessible MathML/speech; MathLive input; function and geometry grapher (JSXGraph or Desmos API if licensing permits, otherwise open-source); interactive sliders for parameter exploration; handwriting photo to LaTeX (math OCR or a vision-capable model) with a confirmation step before checking.

### 4.8 Seed concept graph
Create `profile-math/content/calculus-1.json` as the first graph: concepts, prerequisites, target depth, weights, misconceptions, and at least 100 validated items. It must validate with `validateConceptGraph`.

## 5. Second domain (M8): the generality test

Pick one structurally different domain, ideally one where answers are not machine-verifiable (law case analysis, a history period, or a language). Build it using only the profile contract. Record every place the core needed to change as a **"math leak"** issue. Success is: only a new profile plus small, general core improvements. Document lessons in an ADR and update this contract.

Sketch of how other domains map:

| Domain | Verification | Distinctive pieces |
|---|---|---|
| Law | Rubric (issue, rule, application, conclusion), citations check | Case briefs, IRAC rubrics, hypotheticals, counterargument drills |
| History | Rubric plus source checks | Timelines, source analysis, cause-and-effect essays, maps |
| Language | Hybrid (exact match, rubric, speech scoring) | Vocabulary SRS, four skills, conversation roleplay, listening items |
| Programming | Tool (tests as graders) | Sandboxed code execution, debugging drills, code review rubrics |
| Medicine | Rubric plus guideline checks | Case vignettes, differential diagnosis, board-style questions |

## 6. Authoring guide (to be written in M8)
A "How to write a profile" guide with a template repository, a conformance CLI, and examples will be produced after the second profile exists, so it is grounded in two real cases.
