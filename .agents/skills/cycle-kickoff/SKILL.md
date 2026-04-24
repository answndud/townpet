---
name: cycle-kickoff
description: Start a new cycle with scoped tasks, owners, order, and done criteria.
compatibility: opencode
metadata:
  workflow: planning
  audience: maintainers
---

## What I do
- Convert roadmap items into actionable cycle tasks.
- Attach owner, priority, dependencies, and DoD to each task.
- Choose a realistic first task for immediate execution.

## When to use me
- At the beginning of a sprint or cycle.
- When priorities changed due to blockers or incidents.

## Required inputs
- Current roadmap section (or cycle target)
- Existing blockers
- Team or agent availability
- Related prior notes in `docs/agent-memory/research-index.md`

## Output
- Updated cycle plan in `PLAN.md`
- Starter execution note in `PROGRESS.md`
- Top risks for the cycle

## Rules
- Keep active cycle scope small and verifiable.
- Put high-risk, high-dependency work first.
- Avoid mixing planning with implementation details.
