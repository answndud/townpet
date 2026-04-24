---
name: plan-progress-sync
description: Keep PLAN.md and PROGRESS.md consistent across sessions and handoffs.
compatibility: opencode
metadata:
  workflow: coordination
  audience: multi-agent
---

## What I do
- Normalize execution state between `PLAN.md` and `PROGRESS.md`.
- Ensure one active `in_progress` task unless explicitly parallelized.
- Record blockers and handoff notes in a repeatable format.

## When to use me
- At session start.
- Before handoff.
- After completing a major task batch.

## Required inputs
- Current `PLAN.md`
- Current `PROGRESS.md`
- Optional prior findings from `docs/agent-memory/research-index.md`
- Optional cycle or task scope

## Output
- Updated task statuses in `PLAN.md`
- Updated execution log in `PROGRESS.md`
- Short list of unresolved blockers

## Rules
- Do not mark a task complete without evidence.
- Keep edits minimal and traceable.
- Preserve historical notes; append instead of rewriting history.
