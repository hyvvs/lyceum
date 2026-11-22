# Lyceum

**Master anything.** A local-first, model-agnostic mastery tutor for any subject.

Lyceum wraps any language model (cloud keys, OpenAI-compatible endpoints, OpenRouter, Ollama and other local servers, personal endpoints, or models loaded directly in the app) in a curriculum map, a persistent learner model, a practice-and-assessment engine, and a verification layer. The learner states a goal; Lyceum diagnoses, plans, teaches, drills, runs mock exams, finds the root cause of repeated mistakes, and schedules review so knowledge sticks.

First subject: university mathematics. First users: university students and adult learners. The engine is built to be subject-agnostic from day one.

> "Lyceum" is a working name. Check trademark and domain availability before launch. Alternatives: Noetic, Telos, Praxis, Meridian.

## This repository is a starter kit

It contains the full product and technical definition, the rules agents must follow, a milestone roadmap with task cards, and a small working scaffold (tested) to build on.

### Start here

| If you are... | Read |
|---|---|
| An AI agent (Codex or any AGENTS.md-aware tool) or developer about to write code | `AGENTS.md` (plus the nested `AGENTS.md` in the folder you work in), then `docs/STATUS.md`, then your task card in `tasks/`. Use the skills in `.agents/skills/` |
| The human lead starting the project | `docs/13-roadmap.md`, then `docs/15-agent-workflow.md` (kickoff prompts) |
| Reviewing the product | `docs/00-vision-and-product.md`, `docs/01-experience-and-quality-bar.md`, `docs/18-design-language-glass.md` |

### Document map

| Doc | Topic |
|---|---|
| `AGENTS.md` | Canonical rules: invariants, architecture boundaries, workflow, Definition of Done |
| `docs/00` | Vision, users, pillars, feature inventory |
| `docs/01` | Experience principles, accessibility, performance budgets, UX checklist |
| `docs/02` | Architecture (local-first, ports and adapters) |
| `docs/03` | Model gateway: every provider, local models, keys, readiness tests |
| `docs/04` | Domain profiles and the Math profile |
| `docs/05` | Learner model and algorithms |
| `docs/06` | Tutor behavior spec, hint ladder, prompts, example dialogues |
| `docs/07` | Items, grading, mock exams |
| `docs/08` | Sources, ingestion, curriculum building |
| `docs/09` | Data model and events |
| `docs/10` | Verification and trust |
| `docs/11` | Session orchestration and learning flows |
| `docs/12` | Testing and tutoring evaluation |
| `docs/13` | **Roadmap (M0 to M9)** |
| `docs/14` | Engineering standards |
| `docs/15` | Agent workflow, roles, kickoff prompts |
| `docs/16` | Security and privacy |
| `docs/17` | Risks and open questions |
| `docs/18` | **Design language: glass UI and Framer Motion** (from the reference video) |
| `docs/19` | Working with ChatGPT/Codex and restarting long sessions (skills, start prompt, handoff block) |
| `docs/design-reference/` | Frames from the reference video (internal reference only) |
| `docs/adr/` | Architecture decision records |
| `tasks/` | Task cards for M0 to M2, backlog for M3 to M9 |
| `evals/` | Tutoring eval scenarios |

### Quick start

```bash
corepack enable          # or: npm i -g pnpm@9
pnpm install
pnpm verify              # boundaries + agent files + typecheck + tests + lint
```

### What already exists in code

- `packages/core`: event schemas (zod), concept-graph validation and prerequisite tracing, Bayesian knowledge tracing with evidence weighting, ports (`Clock`, `Rng`, `EventStore`), the `DomainProfile` contract.
- `packages/gateway`: provider-agnostic types, task-tier routing, provider registry, and a working OpenAI-compatible adapter (OpenRouter, Ollama, LM Studio, vLLM, llama.cpp server, custom endpoints) with streaming and typed errors.
- `packages/profile-math`: stub profile and error taxonomy.
- `packages/ui`: glass design tokens and recipes with accessibility fallbacks (`glass.css`) and tested Framer Motion presets (`motion.ts`).
- `scripts/check-boundaries.mjs`: enforces architectural invariants in CI.
- `.agents/skills/` (10 Codex skills) and nested `AGENTS.md` files; `scripts/check-agent-files.mjs` keeps them valid.

Everything else (UI, storage, remaining adapters, verification, tutor, ingestion, exams) is specified and sequenced in the roadmap and task cards.

### First week suggested plan

1. Run the architect kickoff prompt (`docs/15` section 8) and review its findings.
2. Start M0-001 (CI), M0-003 (design system), M0-006 (storage port), M0-010 (eval harness).
3. Run the three spikes (Pyodide+SymPy, local models, OPFS SQLite): M0-007, M0-008, M0-009.
4. Run the pedagogy prototype study (M0-012) with a handful of real students in parallel.

### License

Not yet chosen (see `docs/17` open question 8). Do not publish before deciding.
