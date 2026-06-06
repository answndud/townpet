# Performance docs consistency gap

- Date: 2026-06-06
- Surface: `app/scripts/ops-doc-scripts-consistency.test.ts`, `business/operations/성능_budget.md`
- Priority: P2
- Status: Fixed

## Symptom

The operational documentation consistency test checked core operation docs, but did not include the performance budget document. Performance measurement commands could drift from `app/package.json` without a test failure.

## Impact

Focused performance recheck commands such as `PERF_BROWSER_TARGETS`, `PERF_ASSET_TARGETS`, `PERF_API_TIMING_TARGETS`, and `OPS_PERF_TARGETS` could be removed or renamed in docs without automated feedback.

## Root Cause

`business/operations/성능_budget.md` was not part of `checkedDocs`, and the test did not assert that focused target filter examples remain documented.

## Fix

- Added the performance budget document to package script reference checks.
- Added a regression test for all focused performance target env examples.

## Verification

- `./node_modules/.bin/vitest run scripts/ops-doc-scripts-consistency.test.ts`
- `./node_modules/.bin/eslint scripts/ops-doc-scripts-consistency.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
