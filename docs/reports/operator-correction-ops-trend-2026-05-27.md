# Operator correction ops trend - 2026-05-27

## 목적

`/admin/ops`의 정정 요청 전환 영역이 최근 7일 합계만 보여주고 있어, 운영자가 특정 날짜의 조회 대비 접수율 하락이나 receipt CTA 반응 변화를 빠르게 확인하기 어려웠다.

## 변경

- `getCorrectionFlowOpsOverview`가 `CORRECTION_FLOW` acquisition event를 기존 합계와 별도로 `day`별로 합산한다.
- 일자별 summary는 조회, 접수, receipt CTA, 접수 전환율, 접수 대비 receipt CTA rate를 포함한다.
- `/admin/ops`의 `정정 요청 전환` section에 `일자별 추세` row를 추가했다.

## 유지

- production 데이터는 변경하지 않았다.
- Prisma schema와 acquisition event write path는 변경하지 않았다.
- 정정 요청 접수, 처리, rate limit, admin queue policy는 변경하지 않았다.

## 검증

- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app test -- src/server/queries/acquisition-ops.queries.test.ts src/server/queries/ops-overview.queries.test.ts src/app/admin/ops/page.test.tsx`
  - `3 files / 5 tests` PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app lint -- src/server/queries/acquisition-ops.queries.ts src/server/queries/acquisition-ops.queries.test.ts src/server/queries/ops-overview.queries.test.ts src/app/admin/ops/page.tsx src/app/admin/ops/page.test.tsx`
  - PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app typecheck`
  - PASS
- `PUPPETEER_SKIP_DOWNLOAD=1 COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 dlx impeccable detect app/src/app/admin/ops/page.tsx app/src/components --fast`
  - PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app quality:check`
  - ESLint, TypeScript, Vitest `295 files / 1410 tests`, Next production build PASS

## 남은 확인

- production admin credential이 준비되면 authenticated admin smoke에서 `/admin/ops`의 실제 trend surface를 확인한다.
