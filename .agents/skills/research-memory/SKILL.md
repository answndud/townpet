---
name: research-memory
description: Save and retrieve reusable investigation findings in docs/agent-memory.
compatibility: opencode
metadata:
  workflow: knowledge-management
  audience: multi-agent
---

## What I do
- Keep durable research notes for future sessions.
- Standardize write/read behavior across agents.

## Where I read and write
- `docs/agent-memory/README.md`
- `docs/agent-memory/research-index.md`
- `docs/agent-memory/research-log.md`
- `docs/agent-memory/templates/research-entry.md`

## When to use me
- After finishing analysis that should be reused later.
- At session start when similar work was done before.

## Write steps
1) Generate next `R-YYYYMMDD-XX` entry ID.
2) Append a full entry to `research-log.md`.
3) Append a one-line summary to `research-index.md`.
4) Keep old entries immutable; add corrections as new entries.

## Read steps
1) Search index by topic and tags.
2) Open matching entry IDs in log.
3) Extract findings with confidence and limitations.

## Rules
- Always cite concrete sources (paths or URLs).
- Mark confidence explicitly.
- Prefer concise, factual notes over narrative.
