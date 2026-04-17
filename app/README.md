# TownPet app workspace

이 디렉터리는 TownPet의 실제 실행 워크스페이스입니다.
앱 코드, Prisma 스키마, 시드/운영 스크립트, 테스트 설정이 모두 여기 있습니다.

이 문서는 `app/` 워크스페이스 빠른 참조만 다룹니다.
구조/규칙/도메인 읽기 순서는 루트 [`AGENTS.md`](/Users/alex/project/townpet/AGENTS.md)를 우선합니다.

루트 문서 역할:

- 프로젝트 소개/빠른 실행:
  - `../README.md`
- Codex 진입점:
  - `../AGENTS.md`
- 현재 작업 상태:
  - `../docs/PLAN.md`
  - `../docs/PROGRESS.md`
- 완료 이력 archive:
  - `../docs/COMPLETED.md`

## 디렉터리 구조

- `src/app`
  - App Router 페이지와 route handler
- `src/components`
  - UI 컴포넌트
- `src/lib`
  - validation, helper, policy 보조 로직
- `src/server`
  - services, queries, auth, rate limit, ops 로직
- `prisma`
  - schema와 migrations
- `scripts`
  - 시드, 운영 점검, 리페어, 보고서 스크립트
- `e2e`
  - Playwright 시나리오

## 도메인 묶음 빠른 참조

- `posts/feed`
  - `src/lib/validations/posts/post.ts`
  - `src/server/services/posts/post.service.ts`
  - `src/server/services/posts/post-read-access.service.ts`
  - `src/server/queries/posts/post.queries.ts`
  - `src/app/feed`
  - `src/components/posts`
- `auth/session`
  - `src/lib/validations/auth/index.ts`
  - `src/server/services/auth/auth.service.ts`
  - `src/server/auth.ts`
  - `src/server/admin-page-access.ts`
  - `src/lib/auth.ts`
  - `src/lib/social-auth.ts`
  - `src/app/login`, `src/app/register`, `src/app/onboarding`
- `notifications`
  - `src/lib/notifications/notification-unread-sync.ts`
  - `src/server/services/notifications/notification.service.ts`
  - `src/server/queries/notifications/notification.queries.ts`
  - `src/server/actions/notifications/notification.ts`
  - `src/components/notifications`
  - `src/app/notifications`
- `moderation/ops`
  - `src/lib/validations/moderation/report.ts`
  - `src/lib/validations/moderation/policy.ts`
  - `src/server/services/moderation/report.service.ts`
  - `src/server/services/moderation/sanction.service.ts`
  - `src/server/services/moderation/policy.service.ts`
  - `src/server/services/moderation/direct-moderation.service.ts`
  - `src/server/services/moderation/guest-safety.service.ts`
  - `src/server/queries/moderation/report.queries.ts`
  - `src/server/queries/moderation/policy.queries.ts`
  - `src/server/queries/ops-overview.queries.ts`
  - `src/app/admin`

## 계층 책임 요약

- `src/lib/validations`
  - 외부 입력 계약만 다룹니다.
  - canonical path는 `src/lib/validations/posts/*`, `src/lib/validations/moderation/*`, `src/lib/validations/auth/*`를 우선합니다.
- `src/server/queries`
  - read-only 조회와 집계만 다룹니다.
  - canonical path는 `src/server/queries/posts/*`, `src/server/queries/moderation/*`, `src/server/queries/notifications/*`를 우선합니다.
- `src/server/services`
  - 정책, 권한, transaction, write orchestration을 다룹니다.
  - canonical path는 `src/server/services/posts/*`, `src/server/services/moderation/*`, `src/server/services/auth/*`, `src/server/services/notifications/*`를 우선합니다.
- `src/server/actions`, `src/app/api`, `src/app`, `src/components`
  - validation/service/query 연결과 UI orchestration을 다룹니다.

## 공용 개발 루틴

팀 공용 기본 루틴:

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm quality:check
```

## 최소 운영 루틴

- 매일 기억할 명령은 `pnpm quality:check`, `pnpm ops:check:health`, `pnpm db:restore:local` 세 개면 충분합니다.
- 먼저 볼 워크플로우는 `../.github/workflows/quality-gate.yml` 과 `../.github/workflows/ops-smoke-checks.yml` 두 개입니다.
- 브라우저 smoke는 hot path에서 뺐고, 필요할 때 `../.github/workflows/browser-smoke.yml` 또는 `pnpm test:e2e:smoke`로만 확인합니다. 현재 smoke 범위는 로그인 진입, 소셜 온보딩, 에디터 툴바 regression까지 포함합니다.
- 나머지 `db:*`, `ops:*`, `test:e2e:*`, cleanup/backfill 스크립트는 on-demand 유지보수 도구로 봅니다.

## 유지보수/운영 루틴

아래는 필요할 때만 쓰는 명령입니다.

```bash
pnpm build
pnpm test:coverage
pnpm quality:gate
pnpm db:migrate
pnpm db:seed
pnpm db:restore:local
pnpm ops:check:health
pnpm ops:check:security-env
pnpm ops:check:security-env:strict
pnpm ops:check:auth-email-readiness
pnpm ops:perf:snapshot
```

## 특정 테스트만 돌릴 때

```bash
pnpm test -- src/server/services/post.service.test.ts
pnpm test -- -t "partial test name"
pnpm test:e2e -- e2e/profile-social-account-linking.spec.ts
pnpm test:e2e -- --project=chromium
```

## 테스트 설정 참고 파일

- `vitest.config.ts`
- `playwright.config.ts`

현재 Playwright 기본값:

- base URL: `http://localhost:3000`
- 기본 web server command: `./node_modules/.bin/next dev --webpack --port 3000`

## 작업 순서 기준

정책/서버 동작을 바꿀 때는 아래 의존 순서를 기본으로 봅니다.

- DB 스키마, 입력 계약, 정책 집행이 함께 바뀌는 기능은 `Prisma -> Zod -> Service -> Action/Route -> UI -> Tests` 순서가 안전합니다.
- read-only 화면은 `Query -> UI -> Tests`, 단순 UI 수정은 필요한 레이어만 바로 수정합니다.

## 메모

- 실제 명령은 `package.json`, 테스트 동작은 `vitest.config.ts`와 `playwright.config.ts`를 기준으로 봅니다.
- OpenCode 관련 운영 문서는 `../business/operations/에이전트_*`에 있지만, Codex 기준 하네스는 `../AGENTS.md`를 먼저 봅니다.
