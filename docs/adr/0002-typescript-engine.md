# ADR-0002: TypeScript engine

- Status: accepted
- Date: 2026-11-21

## Context
The engine must run in browser workers, Tauri, and Node tests. An earlier draft proposed a Python backend for SymPy and ML libraries.

## Options considered
1. Python engine behind an API: great scientific ecosystem; requires a server or a bundled Python runtime; splits languages.
2. TypeScript engine with SymPy via Pyodide in a worker: one language; runs everywhere; Pyodide adds load time.
3. Rust core: fast, portable; higher build cost and slower iteration for a product still finding its shape.

## Decision
TypeScript engine; SymPy accessed through Pyodide in a dedicated worker (desktop may add a native Python sidecar later if needed).

## Consequences
+ One language, shared types, easy testing, runs in all shells.
- Pyodide payload and cold start need lazy loading and an M0 spike (docs/17 R4).
- ML-heavy features (knowledge tracing fits) use TS or WASM implementations; heavy offline fitting can be done in Python scripts outside the app.
Revisit if: Pyodide performance or correctness fails the M0 spike.
