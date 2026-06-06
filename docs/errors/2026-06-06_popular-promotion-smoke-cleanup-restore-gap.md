# Popular promotion smoke cleanup restore gap

- Date: 2026-06-06
- Status: fixed
- Surface: `app/scripts/check-popular-promotion-smoke.ts`

## Problem

The popular promotion smoke created temporary users/posts and temporarily changed the popular post policy. Its `finally` block ran cleanup, policy restore, and feed cache bump sequentially. If temporary data cleanup failed, policy restore and cache bump could be skipped.

## Fix

- Added `runPopularPromotionSmokeCleanup` to attempt every cleanup step independently.
- The helper reports all failed step labels after all possible cleanup/restore/cache steps have run.
- Added regression coverage for early cleanup failure and multiple cleanup failures.

## Verification

- `./node_modules/.bin/vitest run scripts/check-popular-promotion-smoke.test.ts`
- `./node_modules/.bin/eslint scripts/check-popular-promotion-smoke.ts scripts/check-popular-promotion-smoke.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `./node_modules/.bin/tsx scripts/check-popular-promotion-smoke.ts`
- Local DB residue check for the smoke run returned `{"posts":0,"users":0}`.
