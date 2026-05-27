# Correction Flow Admin Ops Rollup

- Date: `2026-05-27`
- Status: `PASS`
- Scope: `/admin/ops`, `AcquisitionEventStat` read-only aggregation

## Summary

`/admin/ops` now includes a compact correction request acquisition rollup for the `CORRECTION_FLOW` surface.

- Aggregates the last 7 days of:
  - `CORRECTION_FLOW_VIEWED`
  - `CORRECTION_REQUEST_SUBMITTED`
  - `CORRECTION_RECEIPT_CTA_CLICKED`
- Shows correction page views, correction request submissions, receipt CTA clicks, submit/view conversion, and receipt CTA/submission conversion.
- Lists event composition and source summaries for quick operator diagnosis.
- If `AcquisitionEventStat` is unavailable or schema sync is incomplete, the rollup degrades to zero values and marks schema sync required instead of breaking `/admin/ops`.

## Boundaries

- Read-only query only.
- No Prisma schema change.
- No production data change.
- No correction request mutation, validation, rate limit, or admin queue policy change.

## Verification

- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app test -- src/server/queries/acquisition-ops.queries.test.ts src/server/queries/ops-overview.queries.test.ts src/app/admin/ops/page.test.tsx`
  - PASS, `3 files / 5 tests`
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app lint -- src/server/queries/acquisition-ops.queries.ts src/server/queries/acquisition-ops.queries.test.ts src/server/queries/ops-overview.queries.ts src/server/queries/ops-overview.queries.test.ts src/app/admin/ops/page.tsx src/app/admin/ops/page.test.tsx`
  - PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app typecheck`
  - PASS

## Follow-up

- After deploy, run authenticated admin smoke with production admin credentials when available.
- If correction traffic grows, add trend lines or per-target drilldown for operator content correction sources.
