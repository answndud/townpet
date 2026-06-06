# Web Vitals report empty state guidance gap

- Date: 2026-06-06
- Surface: `app/scripts/report-web-vitals.ts`
- Priority: P2
- Status: Fixed

## Symptom

`perf:web-vitals` reports for schema-sync-required or empty sample states only printed a short message. They did not expose a machine-scannable status or a clear next action.

## Impact

Operators could mistake an empty report for a performance pass/fail result instead of a data readiness state.

## Root Cause

The report renderer handled empty states, but did not distinguish interpretation guidance from actual metric rows.

## Fix

- Added explicit `SCHEMA_SYNC_REQUIRED` and `NO_SAMPLES` status lines.
- Added next-action guidance for schema sync and empty collection states.
- Added interpretation guidance before populated metric rows.
- Added renderer tests for all three states.

## Verification

- `./node_modules/.bin/vitest run scripts/report-web-vitals.test.ts`
- `./node_modules/.bin/eslint scripts/report-web-vitals.ts scripts/report-web-vitals.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
