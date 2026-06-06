# Ops evidence command throw gap

- Date: 2026-06-06
- Status: fixed
- Surface: `app/scripts/run-ops-evidence.ts`

## Problem

`run-ops-evidence` recorded child process exit-code failures in the markdown evidence report, but command spawn/runner exceptions rejected the step before report generation. That meant failures such as a missing `pnpm` binary could stop the evidence run without preserving the failed step in the evidence file.

## Fix

- Normalize command runner exceptions into a failed step with `code=1`.
- Preserve the error name/message/stack in the step output.
- Keep the existing `continueOnFailure` behavior: continue after the failed step when enabled, stop after the failed step when disabled.

## Verification

- `./node_modules/.bin/vitest run scripts/run-ops-evidence.test.ts`
- `./node_modules/.bin/eslint scripts/run-ops-evidence.ts scripts/run-ops-evidence.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `OPS_EVIDENCE_PROFILE=solo OPS_EVIDENCE_CONTINUE_ON_FAILURE=0 OPS_EVIDENCE_OUT=../docs/reports/ops-evidence-local-smoke-2026-06-06.md ./node_modules/.bin/tsx scripts/run-ops-evidence.ts`
  - Expected local result: non-zero because `pnpm` was unavailable in direct `tsx` execution.
  - Confirmed the generated report recorded `Error: spawn pnpm ENOENT` under the failed health step.
