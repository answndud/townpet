# Web Vitals report env parsing gap

- Date: 2026-06-06
- Surface: `app/scripts/report-web-vitals.ts`, `business/operations/성능_budget.md`
- Priority: P2
- Status: Fixed

## Symptom

`perf:web-vitals` parsed `WEB_VITALS_REPORT_DAYS` and `WEB_VITALS_REPORT_LIMIT` with `Number(...)` only. Invalid values such as `0`, negative numbers, decimals, or text could reach the query layer.

## Impact

The report could run with nonsensical windows or limits, producing misleading evidence or query behavior. The script also executed `main()` on import, making helper-level regression tests impractical.

## Root Cause

The script had no positive integer parser and no import-safe main guard.

## Fix

- Added positive integer parsing for `WEB_VITALS_REPORT_DAYS` and `WEB_VITALS_REPORT_LIMIT`.
- Added import-safe `resolveWebVitalsReportOptions` helper tests.
- Documented the Web Vitals report window envs in the performance budget.

## Verification

- `./node_modules/.bin/vitest run scripts/report-web-vitals.test.ts scripts/ops-doc-scripts-consistency.test.ts`
- `./node_modules/.bin/eslint scripts/report-web-vitals.ts scripts/report-web-vitals.test.ts scripts/ops-doc-scripts-consistency.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `WEB_VITALS_REPORT_DAYS=0 ./node_modules/.bin/tsx scripts/report-web-vitals.ts`
