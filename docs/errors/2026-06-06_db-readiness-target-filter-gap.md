# DB readiness target filter gap

- Date: 2026-06-06
- Surface: `app/scripts/measure-db-readiness.ts`, `business/operations/성능_budget.md`
- Priority: P2
- Status: Fixed

## Symptom

`perf:db-readiness` always collected every default header target: `home`, `guest_feed_page`, `guest_feed_api`, and `health`.

## Impact

When only one route header or runtime-region signal needed a quick recheck, the script still contacted unrelated pages/APIs. This made the DB readiness tool inconsistent with the other focused performance measurement scripts.

## Root Cause

Header targets were hard-coded inside `main()` and there was no `PERF_DB_TARGETS` equivalent to the other performance target filters.

## Fix

- Added `PERF_DB_TARGETS`.
- Added import-safe header target parsing/filtering helpers.
- Made unknown target labels fail before `fetch`.
- Updated the performance budget command and consistency test to keep the focused DB readiness example documented.

## Verification

- `./node_modules/.bin/vitest run scripts/measure-db-readiness.test.ts scripts/ops-doc-scripts-consistency.test.ts`
- `./node_modules/.bin/eslint scripts/measure-db-readiness.ts scripts/measure-db-readiness.test.ts scripts/ops-doc-scripts-consistency.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `PERF_DB_TARGETS=missing ./node_modules/.bin/tsx scripts/measure-db-readiness.ts`
