---
name: lyceum-handoff
description: Use before the context window runs out (around 60-70 percent used), when pausing, or when finishing a task on the Lyceum repo. Commits work and appends a handoff block to docs/STATUS.md so a fresh chat can continue.
---

# Lyceum handoff

1. Run `pnpm verify` and record the real result. Run the eval suite too if the change touched prompts, tutor, planner, grading, or the gateway.
2. Commit all work on the branch (work-in-progress commits are fine). Never end a chat with uncommitted work.
3. Append this block to the top of the entries in `docs/STATUS.md` (newest first):

```
## <date> · <task ID> · HANDOFF
Branch / last commit: <name> @ <hash>
State per acceptance criterion: <done | in progress | not started>, one line each
Verified: <real verify result; eval results if relevant>
Decisions made: <ADR links or "none">
Next 3 steps: 1) ... 2) ... 3) ...
Gotchas / surprises: ...
Open questions for the human: ...
```

4. Decisions belong in ADRs (use `lyceum-adr`), requirements in task cards, never only in chat.
5. Put no secrets or learner data in STATUS or in any summary.
6. In your final message, cite task IDs and file paths instead of restating specs.
