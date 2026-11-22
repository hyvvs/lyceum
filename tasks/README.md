# Task cards

One file per milestone. Agents pick up **Ready** cards only (dependencies done, specs exist, acceptance criteria testable). See `docs/15-agent-workflow.md` section 3 for the template and rules.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done. Mark progress here and in `docs/STATUS.md`.

Files:
- `M0-foundations.md`
- `M1-engine-core.md`
- `M2-model-gateway.md`
- `BACKLOG.md`: epics for M3 to M9, to be broken into cards when each milestone becomes next.

Already done by the kit scaffold (do not redo, extend): core events (4 event types), concept graph validation, BKT, ports (`Clock`, `Rng`, `EventStore`), `DomainProfile` contract, gateway types, `ProviderRegistry`, OpenAI-compatible adapter, math profile stub, boundary checker.
