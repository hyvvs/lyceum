# Applying the UI fidelity pack

1. Copy the files in this pack into the repo root, keeping paths (`docs/20-ui-fidelity-brief.md`, `docs/design-reference/*.png`, `.agents/skills/lyceum-ui-fidelity/SKILL.md`).
2. In `AGENTS.md` section 14 add a row to the skills table:
   `| \`lyceum-ui-fidelity\` | Building or changing any visible screen or component; runs the screenshot-versus-reference loop |`
3. In `AGENTS.md` invariant 13 add: "UI work must follow `docs/20-ui-fidelity-brief.md` (it overrides `docs/18` where they differ) and the `lyceum-ui-fidelity` skill."
4. At the top of `docs/18-design-language-glass.md` add: "Where this document and `docs/20-ui-fidelity-brief.md` disagree, docs/20 wins."
5. In `packages/ui/AGENTS.md` add: "Dashboards use true glass (dark, mostly transparent). `glass-reading` is only for tutor text, math, and exam items."
6. Run `pnpm verify` (agentcheck validates the new skill).
