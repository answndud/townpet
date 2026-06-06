# Performance report output env documentation gap

- Date: 2026-06-06
- Surface: `business/operations/성능_budget.md`, `app/scripts/ops-doc-scripts-consistency.test.ts`
- Priority: P2
- Status: Fixed

## Symptom

Performance measurement scripts supported custom report output envs, but the performance budget document did not list them in one place.

## Impact

Before/after performance evidence could be written to inconsistent paths, and operators had to inspect script source to remember the correct env names.

## Root Cause

Output path envs were added per script over time without a shared documentation guard. The consistency test protected script names and focused target filters, but not report output envs.

## Fix

- Added a report output path table to the performance budget document.
- Added a consistency test that protects baseline, browser, asset, API timing, ops latency, DB readiness, and Web Vitals output env examples.

## Verification

- `./node_modules/.bin/vitest run scripts/ops-doc-scripts-consistency.test.ts`
- `./node_modules/.bin/eslint scripts/ops-doc-scripts-consistency.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
