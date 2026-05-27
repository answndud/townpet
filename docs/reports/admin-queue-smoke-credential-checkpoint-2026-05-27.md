# Admin queue smoke credential checkpoint - 2026-05-27

## 목적

Production `/admin/reports`, `/admin/corrections` authenticated queue smoke를 실제 실행할 수 있는지 확인하고, credential 부재 시 다음 실행 조건을 명확히 남긴다.

## 실행 결과

- production health
  - command: `OPS_BASE_URL=https://townpet.vercel.app COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app ops:check:health`
  - result: PASS
  - url: `https://townpet.vercel.app/api/health`
  - status: `200`
  - payload.status: `ok`
  - payload.timestamp: `2026-05-27T07:49:16.308Z`
- production authenticated admin queue smoke
  - command: `OPS_BASE_URL=https://townpet.vercel.app COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app ops:check:admin-queue-smoke`
  - result: BLOCKED
  - blocker: `ADMIN_QUEUE_SMOKE_EMAIL` is not configured in the local execution environment.

## 변경

- `check-admin-queue-smoke.ts` now distinguishes credential readiness blockers from page/login/render failures.
- Missing smoke credentials still exit non-zero, but print `Admin queue smoke BLOCKED` instead of the generic failure header.
- No production data, admin queue state, schema, or auth policy was changed.

## 검증

- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app test -- scripts/check-admin-queue-smoke.test.ts`
  - `1 file / 4 tests` PASS
- `OPS_BASE_URL=https://townpet.vercel.app COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app ops:check:admin-queue-smoke`
  - BLOCKED as expected: `ADMIN_QUEUE_SMOKE_EMAIL is required for authenticated admin queue smoke.`
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app lint -- scripts/check-admin-queue-smoke.ts scripts/check-admin-queue-smoke.test.ts`
  - PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app typecheck`
  - PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app quality:check`
  - ESLint, TypeScript, Vitest `295 files / 1410 tests`, Next production build PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app docs:refresh:check`
  - PASS

## 다음 실행 조건

Set both credentials in the execution environment, then rerun:

```bash
ADMIN_QUEUE_SMOKE_EMAIL=<ADMIN_EMAIL> \
ADMIN_QUEUE_SMOKE_PASSWORD=<ADMIN_PASSWORD> \
OPS_BASE_URL=https://townpet.vercel.app \
COREPACK_DEFAULT_TO_LATEST=0 \
corepack pnpm@9.12.3 -C app ops:check:admin-queue-smoke
```
