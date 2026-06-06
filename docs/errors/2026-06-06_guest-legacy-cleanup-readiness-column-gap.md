# Guest legacy cleanup readiness column gap

- Date: 2026-06-06
- Status: fixed
- Surface: `app/scripts/check-guest-legacy-cleanup-readiness.ts`

## Problem

The guest legacy cleanup readiness script decided whether legacy guest columns still existed by checking only `guestPasswordHash`. If `guestPasswordHash` had been dropped while other legacy guest columns remained, the script could report `LEGACY_COLUMNS_ALREADY_DROPPED` and skip validation.

## Fix

- Detect all known legacy guest columns instead of checking only `guestPasswordHash`.
- Build count queries from the columns that still exist, so partially dropped schemas remain checkable.
- Make the script import-safe and add helper tests for the partial-drop case.

## Verification

- `./node_modules/.bin/vitest run scripts/check-guest-legacy-cleanup-readiness.test.ts`
- `./node_modules/.bin/eslint scripts/check-guest-legacy-cleanup-readiness.ts scripts/check-guest-legacy-cleanup-readiness.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `./node_modules/.bin/tsx scripts/check-guest-legacy-cleanup-readiness.ts`
