# 2026-04-24 local test account seed mismatch

## Symptom

`corepack pnpm -C app db:restore:local` failed during `db:seed:local-test-accounts` with:

```text
Local account seed mismatch: expected 87/70/17, got 88/71/17
```

## Cause

`app/scripts/seed-local-test-accounts.ts` validated hard-coded global `User` totals after upserting the accounts it manages. Local restore does not truncate the database, so an old local/e2e account can remain and change the global totals even when the managed seed accounts are correct.

## Fix

The local test account seed now validates only the managed email set created by the script. It still logs global totals for diagnostics, but unrelated local users no longer fail restore.

## Regression Coverage

- Added `app/scripts/seed-local-test-accounts.test.ts`.
- The test covers deriving expected counts from managed seed accounts and summarizing only managed records.

## Verification

- `corepack pnpm -C app test -- scripts/seed-local-test-accounts.test.ts` passed.
- `corepack pnpm -C app db:seed:local-test-accounts` passed with managed counts `52/49/3` and global counts `88/71/17`.
- `corepack pnpm -C app db:restore:local` passed.
