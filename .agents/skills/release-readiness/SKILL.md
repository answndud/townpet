---
name: release-readiness
description: Validate deployment readiness with health, safety, rollback, and runbook checks.
compatibility: opencode
metadata:
  workflow: release
  risk: high
---

## What I do
- Evaluate whether current changes are safe to deploy.
- Check migration safety and rollback clarity.
- Verify monitoring, health checks, and operational readiness.

## When to use me
- Before merge to release branches.
- Before production deployment.

## Required inputs
- Current diff or target branch
- Environment readiness assumptions
- Known incidents or blockers
- Relevant past release findings from `docs/agent-memory/research-index.md`

## Output
- PASS/FAIL checklist
- Deployment blockers with severity
- Go/no-go recommendation

## Rules
- No implicit assumptions about secrets or infra availability.
- If any critical signal is missing, return no-go.
- Report unknowns explicitly.
