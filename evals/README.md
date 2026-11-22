# Tutoring evals

Scenario files (`scenarios/*.yaml`) describe a tutoring situation and what the tutor must and must not do. Format and categories: `docs/12-testing-and-evaluation.md` section 3. The runner is built in task M0-010; scenarios are authored from M0-011 onward, and **every reported tutoring bug adds a scenario**.

Rules: scenarios are original (no copyrighted course text); rule-based checks come first, LLM judges only for what rules cannot express; judges are validated against human-labeled examples.
