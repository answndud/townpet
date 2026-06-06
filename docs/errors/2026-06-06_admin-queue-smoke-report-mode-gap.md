# Admin queue smoke report mode gap

- Date: 2026-06-06
- Surface: `app/scripts/check-admin-queue-smoke.ts`
- Priority: P2
- Status: Fixed

## Symptom

Admin queue smoke reports did not clearly distinguish production credential smoke from local fixture fallback smoke.

## Impact

Local fixture PASS evidence could be mistaken for production authenticated admin smoke completion, even though local fixtures only validate local UI/queue rendering.

## Root Cause

The markdown report only recorded base URL, auth, scope, and per-page checks. It did not include an overall status, execution mode, or follow-up guidance for local fixture and NO-GO states.

## Fix

- Added report-level `PASS` / `NO-GO` status.
- Added `production_credentials` / `local_fixtures` mode.
- Added local fixture follow-up guidance.
- Added NO-GO next action guidance.

## Verification

- `./node_modules/.bin/vitest run scripts/check-admin-queue-smoke.test.ts`
- `./node_modules/.bin/eslint scripts/check-admin-queue-smoke.ts scripts/check-admin-queue-smoke.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
