# Detail visual smoke command throw gap

- Date: 2026-06-06
- Status: fixed
- Surface: `app/scripts/run-detail-visual-smoke.ts`

## Problem

`run-detail-visual-smoke` recorded child process exit-code failures in the markdown run report, but command spawn/runner exceptions rejected the step before report generation. A missing command such as `pnpm` could stop the visual smoke run without preserving the failed step evidence.

## Fix

- Normalize command runner exceptions into a failed step with `code=1`.
- Preserve the error name/message/stack in the step output.
- Keep the existing `continueOnFailure` behavior for both command exit failures and thrown command errors.

## Verification

- `./node_modules/.bin/vitest run scripts/run-detail-visual-smoke.test.ts`
- `./node_modules/.bin/eslint scripts/run-detail-visual-smoke.ts scripts/run-detail-visual-smoke.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `DETAIL_VISUAL_SMOKE_SKIP_AUTH_LOCAL=1 DETAIL_VISUAL_SMOKE_CONTINUE_ON_FAILURE=0 DETAIL_VISUAL_SMOKE_OUT=../docs/reports/detail-visual-smoke-local-command-error-2026-06-06.md ./node_modules/.bin/tsx scripts/run-detail-visual-smoke.ts`
  - Expected local result: non-zero because `pnpm` was unavailable in direct `tsx` execution.
  - Confirmed the generated report recorded `Error: spawn pnpm ENOENT` under the failed health step.
