# Detail Visual Smoke Run

- generatedAt: 2026-05-27T02:21:58.457Z
- baseUrl: https://townpet.vercel.app
- status: PASS
- includeAuthLocal: true
- continueOnFailure: true

## Summary
- health: PASS (code=0, durationMs=1647)
- public-detail-visual: PASS (code=0, durationMs=18902)
- auth-local-detail-visual: PASS (code=0, durationMs=18424)

## Production health endpoint
- id: health
- command: `/usr/local/bin/node /Users/alex/.cache/node/corepack/v1/pnpm/9.12.3/bin/pnpm.cjs ops:check:health`
- status: PASS
- startedAt: 2026-05-27T02:21:19.484Z
- finishedAt: 2026-05-27T02:21:21.131Z

```text
> app@0.1.0 ops:check:health /Users/alex/project/townpet/app
> tsx scripts/check-health-endpoint.ts
Health check passed
- url: https://townpet.vercel.app/api/health
- status: 200
- payload.status: ok
- payload.timestamp: 2026-05-27T02:21:21.040Z
- elapsedMs: 1100
- controlPlane.state: ok
- controlPlane.sanction: ok (sanction ready)
- controlPlane.policy: ok (policy ready)
- controlPlane.userRelation: ok (user relation ready)
- controlPlane.notification: ok (notification ready)
- controlPlane.guestSafety: ok (guest safety ready)
- search.pgTrgm.state: ok
- search.pgTrgm.enabled: true
- search.pgTrgm.message: pg_trgm extension enabled
```

## Public guest detail visual smoke
- id: public-detail-visual
- command: `/usr/local/bin/node /Users/alex/.cache/node/corepack/v1/pnpm/9.12.3/bin/pnpm.cjs ops:check:public-detail-visual`
- status: PASS
- startedAt: 2026-05-27T02:21:21.131Z
- finishedAt: 2026-05-27T02:21:40.033Z

```text
> app@0.1.0 ops:check:public-detail-visual /Users/alex/project/townpet/app
> PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers tsx scripts/check-public-detail-visual-smoke.ts
Public detail visual smoke written: docs/reports/public-detail-visual-smoke-2026-05-27T02-21-22-115Z
HOSPITAL_REVIEW: blocked=no-public-feed-item
CARE_REQUEST: blocked=no-public-feed-item
FREE_BOARD/desktop: title=true comments=true report=true operator=true overflow=true
FREE_BOARD/mobile: title=true comments=true report=true operator=true overflow=true
WALK_ROUTE/desktop: title=true comments=true report=true operator=true overflow=true
WALK_ROUTE/mobile: title=true comments=true report=true operator=true overflow=true
LOST_FOUND/desktop: title=true comments=true report=true operator=true overflow=true
LOST_FOUND/mobile: title=true comments=true report=true operator=true overflow=true
MARKET_LISTING/desktop: title=true comments=true report=true operator=true overflow=true
MARKET_LISTING/mobile: title=true comments=true report=true operator=true overflow=true
```

## Authenticated/local detail visual smoke
- id: auth-local-detail-visual
- command: `/usr/local/bin/node /Users/alex/.cache/node/corepack/v1/pnpm/9.12.3/bin/pnpm.cjs ops:check:auth-local-detail-visual`
- status: PASS
- startedAt: 2026-05-27T02:21:40.033Z
- finishedAt: 2026-05-27T02:21:58.457Z

```text
> app@0.1.0 ops:check:auth-local-detail-visual /Users/alex/project/townpet/app
> PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers tsx scripts/check-auth-local-detail-visual-smoke.ts
Auth/local detail visual smoke written: docs/reports/auth-local-detail-visual-smoke-2026-05-27T02-21-41-078Z
HOSPITAL_REVIEW/desktop: title=true comments=true report=true expected=true localGate=true overflow=true
HOSPITAL_REVIEW/mobile: title=true comments=true report=true expected=true localGate=true overflow=true
CARE_REQUEST/desktop: title=true comments=true report=true expected=true localGate=true overflow=true
CARE_REQUEST/mobile: title=true comments=true report=true expected=true localGate=true overflow=true
```
