# Production Demo Content Cleanup

- date: 2026-05-24
- target: `https://townpet.vercel.app`
- workflow: `production-demo-content`
- run: `https://github.com/answndud/townpet/actions/runs/26354563190`
- mode: `cleanup`
- email_domain: `demo.townpet.co.kr`
- include_lost_found: `false`
- direct SQL cleanup: not used

## Pre-cleanup Audit

| Candidate | Count |
| --- | ---: |
| Users | 7 |
| Posts | 17 |
| Comments | 68 |

Pre-cleanup audit matched [production-demo-e2e-audit-2026-05-24.md](./production-demo-e2e-audit-2026-05-24.md).

## Workflow Result

- conclusion: `success`
- deletedPosts: 17
- deletedUsers: 7
- Node 20 deprecation warning appeared in GitHub Actions annotations, but the cleanup job completed successfully.

## Post-cleanup Audit

| Candidate | Count |
| --- | ---: |
| Users | 0 |
| Posts | 0 |
| Comments | 0 |

## Public Smoke

- `OPS_BASE_URL=https://townpet.vercel.app pnpm -C app ops:check:health`: passed
- `GET https://townpet.vercel.app/api/home/feed`: `ok=true`, `best=0`, `latest=0`
- Blocked public preview signals: none

## Decision

Cleanup is complete for the legacy production demo content set that used the owned demo domain `demo.townpet.co.kr`.

Do not run additional cleanup without a fresh read-only audit and a new approval step.
