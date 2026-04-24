# TownPet AGENTS.md

이 파일은 TownPet 저장소의 단일 작업 하네스입니다.
Codex가 저장소에 처음 들어왔을 때 이 파일 하나만 읽어도 현재 구조, 실행 명령, 테스트 흐름, 작업 규칙을 파악할 수 있게 유지합니다.

## 1. 저장소 개요

- 실제 앱 코드는 `app/` 아래에 있습니다.
- 계획과 실행 로그는 `docs/PLAN.md`, `docs/PROGRESS.md`에 있고, 완료 이력 archive는 `docs/COMPLETED.md`에 있습니다.
- 운영/제품/보안 기준 문서는 `business/`에 있습니다.
- `blog/`는 코드 해설용 시리즈이며, 현재 동작의 소스 오브 트루스는 아닙니다.

핵심 목적:

- TownPet는 단순 게시판이 아니라 `LOCAL / GLOBAL`을 분리한 반려 커뮤니티입니다.
- 검색, 작성, 신고, 제재, 관리자 운영까지 제품 기본값으로 포함합니다.
- 기능보다 정책, 운영 가능성, 품질 게이트를 먼저 맞추는 저장소입니다.

## 2. 먼저 볼 파일

### 구조를 먼저 파악할 때

- `README.md`
- `business/제품_기술_개요.md`
- `app/package.json`
- `app/prisma/schema.prisma`

### 현재 진행 중인 작업을 이어받을 때

- `docs/PLAN.md`
- `docs/PROGRESS.md`
- 현재 맡은 사이클에 직접 연결된 파일만 추가로 읽습니다.
- 완료된 과거 사이클 전체는 기본값으로 읽지 않고, 필요할 때만 `docs/COMPLETED.md`를 엽니다.

### 보안/정책 변경 시

- `business/security/보안_계획.md`
- `business/security/보안_진행상황.md`
- `business/security/보안_위험_등록부.md`
- `business/policies/*`

### 운영/배포 변경 시

- `business/operations/운영_문서_안내.md`
- `business/operations/manual-checks/배포_보안_체크리스트.md`
- `business/operations/장애 대응 런북.md`
- `.github/workflows/*`
- `app/scripts/*`

## 3. 디렉터리 지도

### 루트

- `README.md`
  - 프로젝트 소개와 빠른 실행
- `AGENTS.md`
  - 현재 하네스 단일 진입점
- `docs/`
  - app 상태 문서 active/archive
- `business/`
  - 제품/운영/보안 기준 문서
- `blog/`
  - 코드 해설용 시리즈와 원고

### `app/`

- `package.json`
  - 실행/테스트/운영 스크립트 소스 오브 트루스
- `src/app`
  - App Router 페이지와 route handler
- `src/components`
  - UI 컴포넌트
- `src/lib`
  - validation, helper, presenter, policy 보조 로직
- `src/server`
  - services, queries, auth, rate limit, ops 로직
- `prisma`
  - schema와 migrations
- `scripts`
  - 시드, 운영 점검, 리페어, 리포트 스크립트
- `e2e`
  - Playwright 시나리오

### `docs/`

- `PLAN.md`, `PROGRESS.md`
  - active 작업 계획과 실행 로그
- `COMPLETED.md`
  - 완료된 app 작업 상세와 과거 검증 archive

### `business/`

- `제품_기술_개요.md`
  - 제품/정책/기술 기준
- `operations/`
  - 런북, 수동 점검, OAuth, 운영 문서
- `security/`
  - 보안 계획/진행/위험 등록부
- `analytics/`, `product/`, `policies/`, `archive/`, `reports/`
  - 사업, 제품 구조, 운영 정책, 보관 문서, 리포트

## 4. 문서 역할 구분

- `README.md`
  - 프로젝트 목적, 저장소 지도, 대표 도메인 묶음
- `AGENTS.md`
  - 저장소 작업 하네스, 읽기 순서, 계층 경계, 공용 개발 루틴
- `app/README.md`
  - `app/` 워크스페이스 로컬 실행/검증용 빠른 참조
- `docs/PLAN.md`, `docs/PROGRESS.md`
  - 현재 작업 상태 기록
- `docs/COMPLETED.md`
  - 완료된 app 작업 상세 archive
- `blog/00_series_plan.md`, `blog/README.md`
  - 블로그 시리즈 개요와 읽기 순서

`app/README.md`는 로컬 실행 참고만 다루고, 구조/규칙의 소스 오브 트루스는 `AGENTS.md`를 우선합니다.

## 5. 빠른 구조 파악 코스

15분 안에 구조를 파악하려면 이 순서가 가장 빠릅니다.

1. `README.md`에서 제품 목적과 저장소 지도를 확인합니다.
2. `business/제품_기술_개요.md`에서 `LOCAL / GLOBAL`, 정책 우선 원칙, 구현 경계를 확인합니다.
3. `app/package.json`에서 실제 실행/검증 명령을 확인합니다.
4. `app/prisma/schema.prisma`에서 핵심 모델을 봅니다.
5. `app/src/lib/validations`, `app/src/server/services`, `app/src/server/queries`를 순서대로 봅니다.
6. 마지막에 `app/src/app`, `app/src/components`에서 실제 page/API/UI 조합을 봅니다.

## 6. 도메인별 읽기 지도

### 게시글/피드

- `app/prisma/schema.prisma`
- `app/src/lib/validations/posts/post.ts`
- `app/src/server/services/posts/post.service.ts`
- `app/src/server/services/posts/post-read-access.service.ts`
- `app/src/server/queries/posts/post.queries.ts`
- `app/src/server/actions/post.ts`
- `app/src/app/feed/page.tsx`
- `app/src/components/posts/feed-infinite-list.tsx`
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-detail-client.tsx`

### 인증/세션

 - `app/src/lib/validations/auth/index.ts`
 - `app/src/server/services/auth/auth.service.ts`
- `app/src/server/auth.ts`
- `app/src/server/admin-page-access.ts`
- `app/src/lib/auth.ts`
- `app/src/lib/social-auth.ts`
- `app/src/app/login`
- `app/src/app/register`
- `app/src/app/onboarding`
- `app/src/app/password`

### 검색

- `app/src/server/queries/search.queries.ts`
- `app/src/app/search/page.tsx`
- `app/src/app/api/search`
- `app/src/app/api/feed`
- `app/src/lib/feed-personalization-policy.ts`

### 알림

- `app/src/lib/notifications/notification-unread-sync.ts`
- `app/src/server/services/notifications/notification.service.ts`
- `app/src/server/queries/notifications/notification.queries.ts`
- `app/src/server/actions/notifications/notification.ts`
- `app/src/components/notifications/notification-bell.tsx`
- `app/src/components/notifications/notification-center.tsx`
- `app/src/app/notifications`

### 모더레이션/운영

- `app/src/lib/validations/moderation/report.ts`
- `app/src/lib/validations/moderation/policy.ts`
- `app/src/lib/validations/moderation/direct-moderation.ts`
- `app/src/server/services/moderation/report.service.ts`
- `app/src/server/services/moderation/sanction.service.ts`
- `app/src/server/services/moderation/policy.service.ts`
- `app/src/server/services/moderation/direct-moderation.service.ts`
- `app/src/server/services/moderation/guest-safety.service.ts`
- `app/src/server/queries/moderation/report.queries.ts`
- `app/src/server/queries/moderation/policy.queries.ts`
- `app/src/server/queries/moderation/sanction.queries.ts`
- `app/src/server/queries/ops-overview.queries.ts`
- `app/src/app/admin/reports`
- `app/src/app/admin/ops/page.tsx`

## 7. 계층 책임 경계

### validation

- `app/src/lib/validations/**`는 외부 입력 계약만 다룹니다.
- 도메인별 canonical path는 `app/src/lib/validations/posts/*`, `app/src/lib/validations/moderation/*`, `app/src/lib/validations/auth/*`를 우선합니다.
- request body, form data, query param, action input의 shape 검증만 둡니다.
- DB 조회, 권한 판정, 트랜잭션, side effect는 넣지 않습니다.

### query

- `app/src/server/queries/**`는 read-only 접근만 다룹니다.
- 도메인별 canonical path는 `app/src/server/queries/posts/*`, `app/src/server/queries/moderation/*`, `app/src/server/queries/notifications/*`를 우선합니다.
- list/detail/search/admin overview 같은 조회와 집계만 둡니다.
- write, mutation, 부수효과, 알림 발송, moderation action log 기록은 넣지 않습니다.
- 정책 집행은 query가 아니라 service에서 결정하고, query는 필요한 read model만 제공합니다.

### service

- `app/src/server/services/**`는 정책과 write orchestration을 다룹니다.
- 도메인별 canonical path는 `app/src/server/services/posts/*`, `app/src/server/services/moderation/*`, `app/src/server/services/auth/*`, `app/src/server/services/notifications/*`를 우선합니다.
- 권한 검사, rate-limit, sanction, transaction, audit/log, notification trigger는 여기서 집행합니다.
- 조회 helper를 쓸 수는 있지만, list page read model 자체를 service로 끌어오지 않습니다.

### action / route / UI

- `app/src/server/actions/**`, `app/src/app/api/**`, `app/src/app/**`, `app/src/components/**`는 orchestration 경계입니다.
- validation 호출, service/query 연결, response shaping, UI 상태 관리만 두고 정책 로직 자체는 넣지 않습니다.

## 8. 제품 기준과 구현 원칙

절대 깨지면 안 되는 기준:

- `LOCAL / GLOBAL` 경계는 필터가 아니라 운영 규칙입니다.
- 고위험 흐름은 기능보다 정책이 먼저입니다.
  - 예: market, lost-found, report, sanction, abuse-prone write path
- 입력은 검증과 템플릿 구조를 우선합니다.
- 정책은 UI가 아니라 서비스 레이어에서 집행합니다.
- 운영 자동화(신고/제재/레이트리밋/로그)가 없는 기능은 완료로 보지 않습니다.

권장 의존 순서:

- DB 스키마, 입력 계약, 정책 집행이 함께 바뀌는 기능은 보통 `Prisma -> Zod -> Service -> Action/Route -> UI -> Tests` 순서가 가장 안전합니다.
- 다만 solo + AI agent 작업에서는 모든 변경에 이 순서를 강제하지 않습니다.
- read-only 화면은 `Query -> UI -> Tests`, UI 탐색은 `UI -> Service/Validation -> Tests`, 단순 UI/문구 수정은 필요한 레이어만 바로 수정합니다.
- 중요한 기준은 순서보다 계층 책임입니다. 정책은 `service`, 입력 계약은 `validation`, 조회는 `query`에 둡니다.

주요 경계:

- `app/prisma/schema.prisma`
- `app/src/lib/validations/**`
- `app/src/server/services/**`
- `app/src/server/actions/**`
- `app/src/app/api/**`
- `app/src/components/**`

## 9. 공용 개발 루틴

팀 공용 기본 루틴은 아래만 사용합니다.

- `pnpm -C app dev`
- `pnpm -C app lint`
- `pnpm -C app typecheck`
- `pnpm -C app test`
- `pnpm -C app test:e2e`
- `pnpm -C app quality:check`

아래는 유지보수/운영 전용으로 분리해서 봅니다.

- `pnpm -C app db:*`
- `pnpm -C app ops:*`
- `pnpm -C app quality:gate`
- 시드/리페어/백필 스크립트

## 10. 최소 운영 표면

혼자 개발하거나 짧은 점검 루틴만 돌릴 때는 아래만 기억합니다.

- 일상 명령 3개:
  - `pnpm -C app quality:check`
  - `pnpm -C app ops:check:health`
  - `pnpm -C app db:restore:local`
- 먼저 볼 워크플로우 2개:
  - `.github/workflows/quality-gate.yml`
  - `.github/workflows/ops-smoke-checks.yml`

브라우저 smoke는 hot path에서 분리됐습니다.

- 필요할 때만:
  - `.github/workflows/browser-smoke.yml`
  - `pnpm -C app test:e2e:smoke`

나머지 `db:*`, `ops:*`, `test:e2e:*`, cleanup/backfill 스크립트와 주기 워크플로우는 필요할 때만 여는 on-demand 유지보수 도구로 취급합니다.

## 11. 명령의 소스 오브 트루스

- 명령은 `app/package.json`을 기준으로만 판단합니다.
- 앱 명령은 `app/`에서 실행하거나 `pnpm -C app ...` 형식을 사용합니다.
- 테스트 동작은 아래 설정을 기준으로 봅니다.
  - `app/vitest.config.ts`
  - `app/playwright.config.ts`

자주 쓰는 기본 명령:

- `pnpm -C app install`
- `pnpm -C app dev`
- `pnpm -C app build`
- `pnpm -C app lint`
- `pnpm -C app typecheck`
- `pnpm -C app test`
- `pnpm -C app test:coverage`
- `pnpm -C app test:e2e`
- `pnpm -C app quality:check`
- `pnpm -C app quality:gate`
- `pnpm -C app db:migrate`
- `pnpm -C app db:seed`
- `pnpm -C app db:restore:local`

운영 체크에 자주 쓰는 명령:

- `pnpm -C app ops:check:health`
- `pnpm -C app ops:check:security-env`
- `pnpm -C app ops:check:security-env:strict`
- `pnpm -C app ops:check:auth-email-readiness`
- `pnpm -C app ops:perf:snapshot`

## 12. 로컬 실행과 기본 복구

가장 빠른 로컬 복구:

```bash
pnpm -C app db:restore:local
```

기본 개발 서버:

```bash
pnpm -C app dev
```

주의:

- 현재 `dev` 스크립트는 webpack 모드 기준입니다.
- Prisma client 누락/스키마 반영 문제를 줄이기 위해 `dev` 스크립트에 `prisma generate`가 포함됩니다.

로컬에서 자주 보는 주소:

- `http://localhost:3000`
- `http://localhost:3000/api/health`

## 13. 테스트 흐름

### Vitest

- 설정 파일:
  - `app/vitest.config.ts`
- 포함 패턴:
  - `src/**/*.test.ts`
  - `src/**/*.test.tsx`
  - `scripts/**/*.test.ts`

자주 쓰는 방식:

- 특정 파일:
  - `pnpm -C app test -- src/server/services/post.service.test.ts`
- 이름 필터:
  - `pnpm -C app test -- -t "partial test name"`

### Playwright

- 설정 파일:
  - `app/playwright.config.ts`
- 기본 base URL:
  - `http://localhost:3000`
- 기본 web server command:
  - `./node_modules/.bin/next dev --webpack --port 3000`

자주 쓰는 방식:

- 전체:
  - `pnpm -C app test:e2e`
- 특정 파일:
  - `pnpm -C app test:e2e -- e2e/profile-social-account-linking.spec.ts`
- 프로젝트 지정:
  - `pnpm -C app test:e2e -- --project=chromium`

## 14. lint/typecheck/품질 게이트

- lint:
  - `pnpm -C app lint`
- typecheck:
  - `pnpm -C app typecheck`
- 기본 품질 체크:
  - `pnpm -C app quality:check`
  - 현재 흐름은 `lint -> typecheck -> vitest run`
- 확장 게이트:
  - `pnpm -C app quality:gate`
  - 현재 흐름은 `quality:check -> e2e smoke`

## 15. 자주 헷갈리는 포인트

- 앱 명령은 `app/` 기준이고, 앱 상태 문서는 `docs/` 기준입니다.
- `docs/PLAN.md`, `docs/PROGRESS.md`는 구조 설명 문서가 아니라 현재 작업 상태만 남기는 active 문서입니다.
- 완료된 작업 상세는 `docs/COMPLETED.md`에서 확인합니다.
- `app/README.md`는 워크스페이스 quick reference이고, 저장소 규칙/읽기 순서는 `AGENTS.md`를 우선합니다.
- `blog/` 문서는 설명 자료이지 구현 기준 문서가 아닙니다.
- OpenCode 관련 문서 `business/operations/에이전트_*`는 Codex 전용 하네스가 아닙니다.
- 제품 기준 충돌이 나면 `business/제품_기술_개요.md`, `business/policies/*`, `business/security/*`를 우선합니다.
- 명령 충돌이 나면 `app/package.json`을 우선합니다.
- 테스트 동작 충돌이 나면 `app/vitest.config.ts`, `app/playwright.config.ts`를 우선합니다.
- 과거 초안/기록은 `business/archive/`를 참고하되 현재 기준으로 직접 사용하지 않습니다.

## 16. 작업 중 흔한 문제와 확인 순서

### 개발 서버가 안 뜰 때

1. `pnpm -C app install`
2. `pnpm -C app db:migrate`
3. `pnpm -C app dev`

### Prisma schema/client mismatch 의심 시

증상 예:

- Prisma include/select 관련 런타임 오류
- 새 모델 필드가 undefined로 보이는 오류

우선 실행:

```bash
pnpm -C app db:migrate
```

그 다음 개발 서버를 재시작합니다.

### 포트 3000 충돌 시

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

### DB 연결 문제 시

```bash
docker compose ps
docker compose logs --no-color postgres | tail -n 80
```

## 17. 운영 확인 기준

public health 확인:

```bash
curl -sS -i http://localhost:3000/api/health
```

원격/운영 health check:

```bash
pnpm -C app ops:check:health
```

`pg_trgm`까지 강제 확인할 때:

```bash
OPS_BASE_URL=https://townpet.vercel.app OPS_HEALTH_INTERNAL_TOKEN=<HEALTH_INTERNAL_TOKEN> OPS_HEALTH_REQUIRE_PG_TRGM=1 pnpm -C app ops:check:health
```

배포 보안 env strict preflight:

```bash
pnpm -C app ops:check:security-env:strict
```

## 18. PLAN / PROGRESS 운영 규칙

- 항상 `docs/PLAN.md`, `docs/PROGRESS.md`를 사용합니다.
- 완료된 app 작업 상세는 `docs/COMPLETED.md`로 이동합니다.
- `docs/COMPLETED.md` 항목 형식은 `완료일 -> 배경 -> 변경내용 -> 코드문서 -> 검증 -> 결과`를 사용하고, heading은 `완료일 | 작업명`만 남깁니다.
- 하위 디렉터리에 중복 계획 문서를 만들지 않습니다.
- 작업 시작 전에는 `pending`, `in_progress`, `blocked` 상태와 현재 맡은 사이클만 읽습니다.
- 작업 종료 후에는 `docs/PROGRESS.md`에 실행 결과를 먼저 정리하고, 완료 상세와 긴 검증 로그는 `docs/COMPLETED.md` 맨 아래에 시간 오름차순으로 append한 뒤 `docs/PLAN.md` 상태를 맞춥니다.
- 블로커가 생기면 두 파일을 즉시 함께 업데이트합니다.
- active 문서 목표 길이:
  - `docs/PLAN.md` 60줄 이하
  - `docs/PROGRESS.md` 70줄 이하

## 19. 완료 기준

최소 완료 기준:

- lint/typecheck/tests가 통과
- 변경한 동작에 failure-path test가 최소 1개 존재
- 관련 문서가 동기화됨
  - 최소: `docs/PLAN.md`, `docs/PROGRESS.md`
  - 필요 시: `docs/COMPLETED.md`, `business/security/*`, `business/policies/*`, 운영 문서

## 20. 파일 우선순위 규칙

- 명령:
  - `app/package.json`
- 테스트 설정:
  - `app/vitest.config.ts`, `app/playwright.config.ts`
- 제품/정책 기준:
  - `business/제품_기술_개요.md`, `business/policies/*`, `business/security/*`
- 작업 계획:
  - `docs/PLAN.md`, `docs/PROGRESS.md`
- 설명/홍보/해설:
  - `README.md`, `blog/*`
