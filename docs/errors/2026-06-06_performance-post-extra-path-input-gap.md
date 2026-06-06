# Performance post and extra path input gap

- Date: 2026-06-06
- Surface: `measure-production-performance`, `measure-browser-performance`, `measure-route-assets`
- Priority: P2
- Status: Fixed

## Symptom

`PERF_POST_ID` and extra path inputs were not fully protected by tests. `PERF_POST_PATH` was tested, but `PERF_POST_ID` could build a non-canonical detail route, and `*_EXTRA_PATHS` normalization/filter combinations could drift silently.

## Impact

Public post detail measurements could include an authenticated route redirect instead of directly measuring `/posts/<id>/guest`. Ad-hoc route measurements could also break without an adjacent regression test.

## Root Cause

The target builder tests focused on `PERF_POST_PATH` and target filters, but did not cover the alternate `PERF_POST_ID` input or extra path labels.

## Fix

- Updated `PERF_POST_ID` target generation to use `/posts/<id>/guest`.
- Added regression tests for `PERF_POST_ID` in server fetch, browser, and route asset scripts.
- Added regression tests for `PERF_EXTRA_PATHS`, `PERF_BROWSER_EXTRA_PATHS`, and `PERF_ASSET_EXTRA_PATHS`.
- Updated the performance budget document and consistency test with the supported input examples.

## Verification

- `./node_modules/.bin/vitest run scripts/measure-production-performance.test.ts scripts/measure-browser-performance.test.ts scripts/measure-route-assets.test.ts scripts/ops-doc-scripts-consistency.test.ts`
- `./node_modules/.bin/eslint scripts/measure-production-performance.ts scripts/measure-production-performance.test.ts scripts/measure-browser-performance.ts scripts/measure-browser-performance.test.ts scripts/measure-route-assets.ts scripts/measure-route-assets.test.ts scripts/ops-doc-scripts-consistency.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
