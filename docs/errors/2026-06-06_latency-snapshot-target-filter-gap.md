# Latency snapshot target filter gap

- Date: 2026-06-06
- Surface: `app/scripts/collect-latency-snapshot.ts`, `app/scripts/run-ops-evidence.ts`
- Priority: P2
- Status: Fixed

## Symptom

`ops:perf:snapshot` always measured the full endpoint bundle. Focused rechecks for one endpoint such as `api_feed_guest` required running unrelated page/API endpoints too.

## Impact

Solo operation latency checks were slower and noisier than necessary, especially when the operator only needed to confirm one endpoint after a small performance fix.

## Root Cause

`collect-latency-snapshot` built a fixed endpoint list and did not expose target selection. `run-ops-evidence` already forwarded the base environment, but there was no regression test proving that a latency target filter reaches the perf step.

## Fix

- Added `OPS_PERF_TARGETS`.
- Added import-safe target parsing/filtering helpers.
- Made unknown target labels fail before curl execution.
- Added regression coverage for `run-ops-evidence` target filter pass-through.
- Updated the performance budget command for focused ops latency snapshots.

## Verification

- `./node_modules/.bin/vitest run scripts/collect-latency-snapshot.test.ts scripts/run-ops-evidence.test.ts`
- `./node_modules/.bin/eslint scripts/collect-latency-snapshot.ts scripts/collect-latency-snapshot.test.ts scripts/run-ops-evidence.ts scripts/run-ops-evidence.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `OPS_BASE_URL=https://townpet.vercel.app OPS_PERF_TARGETS=missing ./node_modules/.bin/tsx scripts/collect-latency-snapshot.ts`
