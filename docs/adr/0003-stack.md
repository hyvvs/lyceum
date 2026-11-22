# ADR-0003: Technology stack

- Status: accepted
- Date: 2026-11-21

## Decision
TypeScript strict; pnpm workspaces; Vite + React; TanStack Router/Query; Zustand; Tailwind + Radix primitives in `packages/ui`; Tauri v2 desktop; SQLite (native via Tauri, WASM+OPFS on web) behind a `Storage` port; zod; Vitest; Playwright; Biome; Storybook; KaTeX; MathLive; Pyodide+SymPy; ts-fsrs; fast-check; i18next.

## Rationale
Widely adopted, well-supported, runs in browser and desktop, strong typing and testing story, small desktop footprint with Tauri, permissive licenses.

## Consequences
Changes require a new ADR. M0 spikes validate Pyodide, OPFS SQLite, and the local runtime approach; failing spikes trigger ADR revisions before dependent work proceeds.
