# API route contract strict gap

- Date: 2026-06-06
- Status: fixed
- Surface: `app/scripts/check-api-route-contracts.ts`, `app/src/app/api/posts/[id]/share/route.ts`

## Problem

The API route contract check only failed stale reports and missing HTTP method exports. Routes with detectable input but no validation heuristic, or mutating routes without error monitoring, were listed in the generated report but did not fail any optional stricter gate.

The new strict check immediately found `POST /api/posts/[id]/share` had no exception monitoring heuristic.

## Fix

- Added optional `--strict` gap detection for `validation=none` and mutating routes with `monitoring=none`.
- Added `try/catch`, `ServiceError` preservation, and `monitorUnhandledError` to the lost-found share route.
- Added an adjacent route test for normal share recording, invalid action, policy error preservation, and unexpected error monitoring.

## Verification

- `./node_modules/.bin/vitest run scripts/check-api-route-contracts.test.ts 'src/app/api/posts/[id]/share/route.test.ts'`
- `./node_modules/.bin/eslint scripts/check-api-route-contracts.ts scripts/check-api-route-contracts.test.ts 'src/app/api/posts/[id]/share/route.ts' 'src/app/api/posts/[id]/share/route.test.ts'`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `./node_modules/.bin/tsx scripts/check-api-route-contracts.ts --check`
- `./node_modules/.bin/tsx scripts/check-api-route-contracts.ts --check --strict`
