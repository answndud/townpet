# Admin queue smoke readiness surface - 2026-05-29

## 목적

Production authenticated admin queue smoke가 `ADMIN_QUEUE_SMOKE_EMAIL/PASSWORD` 부재로 반복 BLOCKED되는 상태를 `/admin/ops`에서 운영자가 바로 확인할 수 있게 한다.

## 변경

- `getAdminQueueSmokeReadiness` read-only query를 추가했다.
- readiness는 `ADMIN_QUEUE_SMOKE_EMAIL`, `ADMIN_QUEUE_SMOKE_PASSWORD`의 존재 여부만 확인하고 값은 반환하지 않는다.
- `getAdminOpsOverview`가 admin queue smoke readiness를 포함한다.
- `/admin/ops` 운영 큐 요약에 `관리자 큐 smoke 준비` surface를 추가했다.
- surface는 `PASS` 또는 `BLOCKED`, 설정된 key 수, 누락 key, production 재실행 명령을 표시한다.

## 유지

- production 데이터는 변경하지 않았다.
- 관리자 큐 상태, auth policy, smoke credential 값은 변경하거나 노출하지 않았다.
- admin queue smoke 실행 자체는 credential 확보 전까지 계속 BLOCKED 상태다.

## 검증

- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app test -- src/server/queries/admin-queue-smoke-readiness.queries.test.ts src/server/queries/ops-overview.queries.test.ts src/app/admin/ops/page.test.tsx`
  - `3 files / 5 tests` PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app lint -- src/server/queries/admin-queue-smoke-readiness.queries.ts src/server/queries/admin-queue-smoke-readiness.queries.test.ts src/server/queries/ops-overview.queries.ts src/server/queries/ops-overview.queries.test.ts src/app/admin/ops/page.tsx src/app/admin/ops/page.test.tsx`
  - PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app typecheck`
  - PASS
- `PUPPETEER_SKIP_DOWNLOAD=1 COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 dlx impeccable detect app/src/app/admin/ops/page.tsx --fast`
  - PASS
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app quality:check`
  - ESLint, TypeScript, Vitest `296 files / 1413 tests`, Next production build PASS

## 운영 관찰

- `OPS_BASE_URL=https://townpet.vercel.app COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app ops:check:health`
  - first run: HTTP 503, `status: degraded`, `timestamp: 2026-05-29T03:35:17.962Z`
  - immediate retry via `curl -i https://townpet.vercel.app/api/health`: HTTP 200, `status: ok`, `timestamp: 2026-05-29T03:35:30.412Z`
- GitHub Actions latest `main` runs before this change were green.
- Broader `impeccable detect app/src/app/admin/ops/page.tsx app/src/components --fast` surfaced an existing unrelated `broken-image` pattern in `app/src/components/posts/post-detail-primary-card.tsx:90`. The admin ops page-only check passed, so that component issue remains a separate cleanup candidate.

## 다음 실행 조건

Set both credentials and rerun:

```bash
ADMIN_QUEUE_SMOKE_EMAIL=<ADMIN_EMAIL> \
ADMIN_QUEUE_SMOKE_PASSWORD=<ADMIN_PASSWORD> \
OPS_BASE_URL=https://townpet.vercel.app \
COREPACK_DEFAULT_TO_LATEST=0 \
corepack pnpm@9.12.3 -C app ops:check:admin-queue-smoke
```
