# API route timing target filter gap

- Date: 2026-06-06
- Surface: `app/scripts/measure-api-route-timings.ts`
- Priority: P2
- Status: Fixed

## Symptom

`perf:api-timings` always measured every default endpoint: `health`, `home_feed`, and `guest_feed`. When only one route needed a repeat check, the script still collected unrelated endpoint samples.

## Impact

Focused performance rechecks were slower and noisier than necessary. This was inconsistent with server fetch, browser paint, and route asset scripts, which now support target-specific measurement.

## Root Cause

The script iterated over a fixed `DEFAULT_TARGETS` array inside `main()` and executed `main()` immediately on import, so target selection helpers could not be unit tested without running network measurements.

## Fix

- Added `PERF_API_TIMING_TARGETS`.
- Added import-safe `buildApiTimingTargets`, `filterApiTimingTargets`, and `parseApiTimingTargetFilter` helpers.
- Made unknown target labels fail before any network request.
- Updated the performance budget command to show focused API timing checks.

## Verification

- `./node_modules/.bin/vitest run scripts/measure-api-route-timings.test.ts`
- `./node_modules/.bin/eslint scripts/measure-api-route-timings.ts scripts/measure-api-route-timings.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `PERF_API_TIMING_TARGETS=missing ./node_modules/.bin/tsx scripts/measure-api-route-timings.ts`
