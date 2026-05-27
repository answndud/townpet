# Correction Acquisition Event Wiring

- Date: `2026-05-27`
- Status: `PASS`
- Scope: `/corrections/new`, `/api/corrections`, acquisition event dictionary

## Summary

Correction request loop now records the acquisition path across view, submit, and receipt next actions.

- `/corrections/new` emits `CORRECTION_FLOW_VIEWED` on the `CORRECTION_FLOW` surface.
- `/api/corrections` records `CORRECTION_REQUEST_SUBMITTED` after a successful correction request creation.
- Submission event failures are monitored but do not block JSON success responses or browser form redirects.
- Receipt CTAs emit `CORRECTION_RECEIPT_CTA_CLICKED` with target dimensions for linked post, write-after-correction, and feed-after-correction.
- `business/analytics/핵심_지표.md` now documents the correction flow event sequence.

## Boundaries

- No Prisma schema change.
- No production data change.
- Existing correction request validation, rate limit, admin queue, and moderation action behavior are unchanged.
- Client-side view/CTA telemetry still follows the existing `NEXT_PUBLIC_ENABLE_CLIENT_TELEMETRY=1` opt-in.

## Verification

- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app test -- src/app/api/corrections/route.test.ts src/app/corrections/new/page.test.tsx src/server/services/acquisition-events.service.test.ts`
  - PASS, `3 files / 12 tests`
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app lint -- src/app/api/corrections/route.ts src/app/api/corrections/route.test.ts src/app/corrections/new/page.tsx src/app/corrections/new/page.test.tsx src/lib/acquisition-events.ts`
  - PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app typecheck`
  - PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app quality:check`
  - PASS
  - Vitest: `293 files / 1405 tests`
  - Next production build: PASS

## Follow-up

- Run production post-deploy smoke after commit/deploy.
- If needed, add admin ops rollup for `CORRECTION_FLOW` conversion from view to submission.
