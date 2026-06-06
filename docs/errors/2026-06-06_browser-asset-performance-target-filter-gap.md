# Browser and asset performance target filter gap

- Date: 2026-06-06
- Status: fixed
- Surface: `app/scripts/measure-browser-performance.ts`, `app/scripts/measure-route-assets.ts`

## Problem

Server fetch performance measurement supported `PERF_TARGETS`, but browser performance and route asset measurement always ran every default target. Rechecking one route such as `post_detail` required running unrelated pages too, making focused before/after checks slower and noisier.

The browser and asset scripts also executed on import, which made pure helper regression tests impractical.

## Fix

- Added `PERF_BROWSER_TARGETS` for browser navigation/FCP/LCP measurement.
- Added `PERF_ASSET_TARGETS` for route asset snapshots.
- Both filters deduplicate labels, preserve order, and fail fast on unknown target labels before launching Chromium.
- Made both scripts import-safe and added target-selection tests.

## Verification

- `./node_modules/.bin/vitest run scripts/measure-browser-performance.test.ts scripts/measure-route-assets.test.ts`
- `./node_modules/.bin/eslint scripts/measure-browser-performance.ts scripts/measure-browser-performance.test.ts scripts/measure-route-assets.ts scripts/measure-route-assets.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `PERF_BROWSER_TARGETS=missing ./node_modules/.bin/tsx scripts/measure-browser-performance.ts`
- `PERF_ASSET_TARGETS=missing ./node_modules/.bin/tsx scripts/measure-route-assets.ts`
