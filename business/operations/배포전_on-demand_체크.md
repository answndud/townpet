# 배포 전 On-demand 체크

기준일: 2026-05-14

## 목적

1인 운영 기준에서 배포 전 확인을 “항상 느린 전수검사”가 아니라 변경 범위에 맞는 on-demand 체크로 유지한다.
기본 순서는 아래다.

```text
quality:check -> 필요한 e2e -> 배포 -> ops health
```

## 기본 판정

- `PASS`: `quality:check` 통과, 변경 범위에 맞는 e2e 통과, 배포 후 health 통과
- `CONDITIONAL`: `quality:check` 통과, e2e는 변경 범위상 생략 가능, 배포 후 health 통과
- `NO-GO`: `quality:check` 실패, 관련 e2e 실패, 또는 배포 후 health 실패

## 1. 배포 전 기본 품질

모든 배포 후보에서 실행한다.

```bash
corepack pnpm@9.12.3 -C app quality:check
```

포함 범위:

- ESLint
- TypeScript
- Vitest
- Next production build

실패 시:

- e2e나 배포를 진행하지 않는다.
- lint/typecheck/unit/build 중 어느 단계인지 먼저 분류한다.
- 가능한 경우 가장 작은 단일 테스트/파일로 재현한 뒤 수정한다.

## 2. 변경 범위별 e2e 선택

`quality:check`가 통과한 뒤, 변경 범위에 따라 하나만 고르거나 여러 개를 조합한다.

| 변경 범위 | 실행 명령 | 기준 |
| --- | --- | --- |
| feed/search/write/comment/report/admin policy | `corepack pnpm@9.12.3 -C app test:e2e:hotpath` | 기능 hotpath |
| auth/session/social link/profile account | `ENABLE_SOCIAL_DEV_LOGIN=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app test:e2e:auth` | 인증 hardening |
| UI/touch target/layout | 아래 visual smoke 직접 실행 | 모바일/overflow |
| care request/care feedback 상태 흐름 | `PLAYWRIGHT_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app exec playwright test e2e/care-request-flow.spec.ts --project=chromium --workers=1` | 돌봄 hotpath |
| OAuth provider/redirect/env | GitHub Actions `oauth-real-e2e` 수동 실행 | 실제 공급자/secrets 필요 |
| 단순 문서 변경 | e2e 생략 가능 | `quality:check`와 docs check만 확인 |

UI/touch target/layout 변경 시 visual smoke:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app exec playwright test \
  e2e/feed-search-detail-visual-smoke.spec.ts \
  e2e/post-create-editor-visual-smoke.spec.ts \
  e2e/comment-report-visual-smoke.spec.ts \
  e2e/care-feedback-mobile.spec.ts \
  --project=chromium
```

자세한 e2e 범위 판단은 [hotpath-e2e-scope-2026-05-14.md](../../docs/reports/hotpath-e2e-scope-2026-05-14.md)를 따른다.

## 3. 배포 전 보안/env 확인

env, auth, email, OAuth, Redis, Blob, CSP를 바꿨다면 배포 전 보안 체크리스트를 먼저 본다.

- [manual-checks/배포_보안_체크리스트.md](./manual-checks/배포_보안_체크리스트.md)

Production/staging Vercel 배포는 `build:vercel` 시작 시 build-profile security env preflight를 자동 실행한다.
그래도 아래 변경은 수동 확인 대상이다.

- Vercel Environment Variables 변경
- OAuth redirect/callback 변경
- auth/email 정규화 또는 email sending 변경
- `DATABASE_URL`, Redis, Blob, health token 변경

필요 시:

```bash
corepack pnpm@9.12.3 -C app ops:check:security-env:build
```

auth/email 데이터 정규화 변경 시:

```bash
corepack pnpm@9.12.3 -C app ops:check:auth-email-readiness
```

## 4. 배포

main push 또는 Vercel redeploy로 배포한다.

배포 실패 시:

- Vercel build log의 첫 실패 단계만 확인한다.
- `build:vercel` preflight 실패면 env/security checklist로 돌아간다.
- `prisma migrate deploy` 실패면 migration 상태를 먼저 확인하고 앱 build/e2e로 넘어가지 않는다.
- `next build` 실패면 로컬 `quality:check` 재현부터 확인한다.

## 5. 배포 후 health

배포가 Ready가 된 뒤 실행한다.

Public health:

```bash
OPS_BASE_URL=https://townpet.vercel.app corepack pnpm@9.12.3 -C app ops:check:health
```

Internal diagnostics까지 확인해야 할 때:

```bash
OPS_BASE_URL=https://townpet.vercel.app OPS_HEALTH_INTERNAL_TOKEN=<HEALTH_INTERNAL_TOKEN> corepack pnpm@9.12.3 -C app ops:check:health
```

`pg_trgm`까지 강제 확인할 때:

```bash
OPS_BASE_URL=https://townpet.vercel.app OPS_HEALTH_INTERNAL_TOKEN=<HEALTH_INTERNAL_TOKEN> OPS_HEALTH_REQUIRE_PG_TRGM=1 corepack pnpm@9.12.3 -C app ops:check:health
```

실패 시:

- 배포를 성공으로 보지 않는다.
- `/api/health` 응답, DB 연결, Redis/cache/rate-limit 상태를 먼저 확인한다.
- 필요하면 [장애 대응 런북.md](./장애%20대응%20런북.md)으로 넘어간다.

## 6. 완료 기록

배포 전후 체크를 완료하면 아래만 기록한다.

- 실행한 명령
- PASS/FAIL/CONDITIONAL 판정
- 생략한 e2e와 생략 사유
- 배포 URL 또는 Vercel deployment id
- 배포 후 health 결과

세부 로그 전체를 `docs/PLAN.md`나 `docs/PROGRESS.md`에 붙이지 않는다.
현재 작업 완료 상세는 `docs/COMPLETED.md`에만 남긴다.
