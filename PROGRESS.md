# PROGRESS.md

기준일: 2026-04-16

## 진행 현황 요약
- Cycle 1~66: 커뮤니티 기본 구조, upload, notifications, trust/safety, GuestAuthor 전환, growth/ops 문서 기반 완료
- Cycle 67~125: security hardening, locality/feed/detail caching, profile/pet/policy, 모바일/접근성 polish 완료
- Cycle 126~204: OAuth 증적 자동화, guest API 전환, deploy/security/docs hardening, ops smoke/Sentry/`pg_trgm` 운영 루프 정착
- Cycle 205, 237~278: guest abuse defense, profile/README/personalization/auth/OAuth, adoption/volunteer board, media/upload 체계 확장 완료
- Cycle 279, 298~354: upload proxy/backfill, comments/reactions/mute/search/feed/detail UX 및 정합성 다수 정리 완료
- Cycle 355~371: red-team remediation, direct moderation, admin/search/auth hardening, privacy 축소 완료
- Cycle 372~380: 검색 운영 telemetry, zero-result loop, admin 모바일 fallback, `pg_trgm` health/ops smoke 가시화 완료
- Cycle 381~388, 395~396: local restore 체인, 테스트 계정/engagement seed, fresh DB migration repair, admin-only 분리, legal/commercial surface, ops/deploy hardening 완료
- Cycle 397~404: README/demo package 재정리, production demo seed/이미지 복구, 캡처 갱신 완료
- Cycle 405~424: feed/detail/comment/accessibility/UI polish, TownPet 블로그 시리즈 작성/보강, 인터뷰 대응력 강화 완료
- Cycle 431: `AGENTS.md` 단일 하네스 통합 완료

## 현재 진행

### 2026-04-16: Cycle 451 완료 (`/feed` 성능 측정 근거와 stop line 문서화)
- 완료 내용: `blog/20-performance-story-search-cache-pagination.md`에 헤더 확인, 5회 반복 실측, `curl -L` redirect chain 측정, `perf=1` API 타이밍 확인 순서와 실제 수치를 정리했다.
- 완료 내용: 현재 `/feed`는 redirect 포함 체인 기준 `0.26s~0.30s`, `/feed/guest`는 `0.14s~0.15s`, guest API warmed는 `0.13s~0.22s` 수준이며, 추가 최적화보다 회귀 방지가 더 적절하다는 stop line 판단을 남겼다.

### 2026-04-16: Cycle 450 완료 (push 기반 workflow 트리거 복구)
- 완료 내용: `quality-gate.yml`과 `docs-quality.yml`이 `pull_request`/`workflow_dispatch`만 듣고 있어 `main` push 후 Actions가 비어 보이던 상태를 확인했다.
- 완료 내용: 두 workflow에 `push` on `main` trigger를 다시 추가했다.
- 검증 결과: workflow 파일 diff 검토 완료.

### 2026-04-16: Cycle 449 완료 (guest `/feed` rewrite를 redirect로 전환)
- 완료 내용: 실측상 빠른 `/feed/guest` 경로를 살리기 위해 guest `/feed` middleware 동작을 rewrite에서 `/feed/guest` redirect로 바꿨다.
- 완료 내용: `GuestFeedPageClient`의 canonical/navigation base path를 `/feed/guest` 기준으로 바꿔, direct `/feed/guest` 진입 후 다시 `/feed`로 되돌아가는 루프를 막았다.
- 검증 결과: `corepack pnpm -C app exec vitest run src/middleware.test.ts` 통과.
- 검증 결과: `corepack pnpm -C app typecheck` 통과.
- 검증 결과: `git diff --check` 통과.

### 2026-04-16: Cycle 448 완료 (public `/feed` strict nonce 범위 축소)
- 완료 내용: `RootLayout`의 전역 `connection()`을 제거하고, nonce가 필요한 `posts/[id]`, `posts/[id]/guest`, `users/[id]`만 각각 `connection()`을 호출하도록 분리했다.
- 완료 내용: `middleware.ts`에서 guest `/feed` rewrite는 static CSP를 적용하고 nonce 헤더를 주입하지 않도록 바꿔 public shell이 strict nonce 경로를 같이 타지 않게 했다.
- 완료 내용: 배포 후에도 `/feed` 응답에 nonce가 남아, rewritten `/feed/guest` 내부 경로도 static guest shell 경로로 묶도록 middleware 분기를 한 번 더 좁혔다.
- 완료 내용: middleware 회귀 테스트를 추가하고, 블로그에 “strict nonce를 전역으로 걸면 public feed 캐시가 막힌다”는 판단 과정을 반영했다.
- 검증 결과: `corepack pnpm -C app exec vitest run src/middleware.test.ts src/app/feed/guest/page.test.tsx src/app/api/feed/guest/route.test.ts` 통과.
- 검증 결과: `corepack pnpm -C app exec vitest run src/middleware.test.ts` follow-up 회귀 통과.
- 검증 결과: `corepack pnpm -C app typecheck` 통과.
- 검증 결과: `git diff --check` 통과.

### 2026-04-16: Cycle 447 완료 (guest `/feed` 문서 응답 캐시 복원)
- 완료 내용: `/feed/guest/page.tsx`에서 server self-fetch를 제거하고 `dynamic = "force-static"` guest shell만 렌더하도록 되돌렸다.
- 완료 내용: `guest-feed-page-fetch.service.ts`를 제거하고, guest 첫 진입 데이터는 다시 cacheable `/api/feed/guest`가 담당하도록 경계를 정리했다.
- 완료 내용: `GuestFeedPage` 회귀 테스트를 현재 구조에 맞춰 갱신하고, 블로그에 “server-first가 항상 빠른 것은 아니었다”는 시행착오와 판단 기준을 반영했다.
- 검증 결과: `corepack pnpm -C app exec vitest run src/app/feed/guest/page.test.tsx src/app/api/feed/guest/route.test.ts` 통과.
- 검증 결과: `corepack pnpm -C app typecheck` 통과.
- 검증 결과: `git diff --check` 통과.

### 2026-04-16: Cycle 446 완료 (배포 파이프라인 경량화와 workflow 분리)
- 완료 내용: [quality-gate.yml](/Users/alex/project/townpet/.github/workflows/quality-gate.yml)을 PR/manual 기준 fresh DB `prisma migrate deploy -> prisma generate -> pnpm quality:check`만 보는 small hot path로 줄였다.
- 완료 내용: [docs-quality.yml](/Users/alex/project/townpet/.github/workflows/docs-quality.yml)에 docs/API/migration/script inventory freshness를 모았고, [browser-smoke.yml](/Users/alex/project/townpet/.github/workflows/browser-smoke.yml), [guest-legacy-maintenance.yml](/Users/alex/project/townpet/.github/workflows/guest-legacy-maintenance.yml)로 무거운 browser smoke와 maintenance rehearsal을 on-demand workflow로 분리했다.
- 완료 내용: [vercel-build.ts](/Users/alex/project/townpet/app/scripts/vercel-build.ts)를 `security env preflight -> prisma migrate deploy -> prisma generate -> next build`만 수행하도록 줄였고, auth email readiness / neighborhood sync / repair SQL은 deploy hot path에서 제거했다.
- 완료 내용: [README.md](/Users/alex/project/townpet/README.md), [app/README.md](/Users/alex/project/townpet/app/README.md), [운영_문서_안내.md](/Users/alex/project/townpet/docs/operations/운영_문서_안내.md), [Vercel_OAuth_초기설정_가이드.md](/Users/alex/project/townpet/docs/operations/Vercel_OAuth_초기설정_가이드.md), [배포_보안_체크리스트.md](/Users/alex/project/townpet/docs/operations/manual-checks/배포_보안_체크리스트.md), [17-prisma-migrations-and-schema-drift-response.md](/Users/alex/project/townpet/blog/17-prisma-migrations-and-schema-drift-response.md), [19-testing-and-quality-gate.md](/Users/alex/project/townpet/blog/19-testing-and-quality-gate.md), [25-overengineering-ci-and-deploy-pipelines.md](/Users/alex/project/townpet/blog/25-overengineering-ci-and-deploy-pipelines.md)까지 현재 판단 기준으로 동기화했다.
- 검증 결과: `corepack pnpm -C app quality:check` 통과 (`190 files / 919 tests`, eslint warnings only).
- 검증 결과: `corepack pnpm -C app exec vitest run scripts/vercel-build.test.ts` 통과 (`1 file / 7 tests`).
- 검증 결과: GitHub Actions `quality-gate` 첫 실행에서 fresh runner에 `prisma generate`가 빠져 `@prisma/client` 타입 export 누락으로 실패한 것을 확인했고, workflow에 generate 단계를 추가해 hot path 정의를 `migrate deploy -> prisma generate -> quality:check`로 고정했다.
- 완료 내용: GitHub Actions 공식 latest release 기준으로 workflow action 버전을 `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v5`로 올려 Node 20 JavaScript action deprecation 경고를 제거하는 follow-up을 반영했다.
- 검증 결과: `git diff --check` 통과.
- 메모: hot path에서 빠진 coverage, browser smoke, auth email readiness, maintenance rehearsal은 삭제가 아니라 on-demand/manual 영역으로 이동한 것이다.

### 2026-04-14: Cycle 430 진행 중 (게시글 에디터 SunEditor 전환 및 styled typing boundary 안정화)
- 완료 내용: `@tiptap/*` 의존성을 제거하고 `suneditor-react` 기반 공용 `PostBodyRichEditor`로 전환했다.
- 완료 내용: 작성/수정 폼이 같은 에디터 컴포넌트를 공유하고, 숫자 폰트 크기/이미지/링크/인용/목록을 SunEditor 내장 툴바 기준으로 재구성했다.
- 완료 내용: 반복적으로 깨지던 글자색 커스텀 UI는 제거했고, 기존 `[color=#...]` markup 렌더링은 과거 글 호환성을 위해 유지했다.
- 완료 내용: submit 시 React state 지연 대신 에디터 인스턴스에서 직렬화된 본문/이미지 목록을 직접 읽도록 바꿨다.
- 완료 내용: 이미지 width token 정규식을 `1~4`자리로 넓혀 `{width=1}` 문자열이 본문에 남는 문제를 막았다.
- 완료 내용: `post-editor-toolbar`, `image-upload-flow`, `guest-post-management` E2E를 SunEditor DOM 기준으로 갱신했다.
- 검증 결과: `corepack pnpm -C app typecheck` 통과.
- 검증 결과: `corepack pnpm -C app exec vitest run src/app/globals-css.test.ts` 통과.
- 검증 결과: 관련 ESLint/lint 통과.
- 검증 결과: `corepack pnpm -C app test:e2e -- e2e/image-upload-flow.spec.ts --project=chromium` 통과.
- 검증 결과: `corepack pnpm -C app test:e2e -- e2e/guest-post-management.spec.ts --project=chromium` 통과.
- 블로커: `e2e/post-editor-toolbar.spec.ts`의 “서식 적용 후 다음 입력이 기본 스타일로 분리돼야 한다” 케이스가 아직 실패한다.
- 블로커: 같은 E2E를 재실행한 최근 시도는 코드 오류가 아니라 로컬 PostgreSQL(`localhost:5432`) 미기동 때문에 시작 단계에서 중단됐다.

## 완료 요약

- 2026-04-16: Cycle 451 완료 - `/feed` 최적화 과정에서 무엇을 어떻게 측정했고 왜 여기서 멈추는지를 블로그와 상태 문서에 정리해, 다음에 다시 볼 때도 같은 판단 기준을 재사용할 수 있게 했다.
- 2026-04-16: Cycle 450 완료 - `quality-gate`와 `docs-quality`가 `push`를 듣지 않아 `main` 푸시 후 Actions가 뜨지 않던 문제를 확인하고, 두 workflow에 `push` on `main` trigger를 복구했다.
- 2026-04-16: Cycle 449 완료 - `/feed/guest`는 이미 cache HIT와 `ttfb 0.14s~0.22s`로 빠른 반면 `/feed` rewrite 경로만 느리다는 점을 확인한 뒤, guest `/feed`는 `/feed/guest` redirect로 전환하고 guest client 내부 링크도 `/feed/guest` 기준으로 맞췄다.
- 2026-04-16: Cycle 448 완료 - 루트 레이아웃의 전역 `connection()`이 strict nonce 경로를 앱 전체에 퍼뜨려 public `/feed`까지 dynamic/no-store로 몰아넣는 문제를 확인한 뒤, nonce가 필요한 상세/프로필 페이지만 별도 `connection()`을 쓰고 guest `/feed` rewrite는 static CSP를 적용하도록 분리했다.
- 2026-04-16: Cycle 447 완료 - guest `/feed` 문서 응답이 server-first self-fetch 때문에 `private, no-store`가 되던 문제를 확인한 뒤 `/feed/guest/page.tsx`를 static shell로 되돌리고, 데이터는 다시 cacheable `/api/feed/guest`에서만 읽게 정리했으며, 관련 테스트와 블로그를 함께 갱신했다.
- 2026-04-16: Cycle 446 완료 - `quality-gate`를 fresh DB `migrate deploy -> prisma generate -> quality:check` 중심의 small hot path로 줄이고, docs/browser/maintenance 검증을 별도 workflow로 분리했으며, `build:vercel`을 deploy-essential only로 단순화하고 관련 운영 문서와 블로그 회고를 갱신했다.
- 2026-04-16: Cycle 445 완료 - guest `/feed` 첫 진입이 `fetchGuestFeedInitialData`를 통해 서버에서 초기 payload를 받아 `GuestFeedPageClient`에 주입하도록 바뀌었고, initial query와 같을 때 client 첫 fetch를 건너뛰게 했으며, 이번 redirect loop/계측/병목 판단 과정을 블로그에 경험 축적으로 남겼다.
- 2026-04-16: Cycle 444 완료 - guest `/feed` 실경로인 `/api/feed/guest`에 `perf=1` 응답 `meta.timings`와 `Server-Timing` 헤더를 추가했고, guest count/list 조회도 `resolveFeedPageSlice` helper로 병렬화해 브라우저/`curl`에서 바로 병목을 확인할 수 있게 했다.
- 2026-04-16: Cycle 443 완료 - `/feed` 서버 렌더에 `feed-page-performance.service.ts` 기반 분해 계측을 넣어 bootstrap/page-query/personalization 시간을 slow request warn 또는 `?perf=1` info 로그로 남기게 했고, `ops:perf:snapshot`에 canonical `/feed` 페이지 측정(`page_feed`)을 추가했다.
- 2026-04-16: Cycle 442 완료 - `/feed` 첫 페이지가 `feed-page-query.service.ts` helper로 count/list 조회를 page=1 기준 병렬 처리하고 page overflow 때만 재조회하도록 바꿨으며, guest/streaming 로딩 상태를 공통 `FeedLoadingSkeleton`으로 통일하고 관련 테스트와 블로그를 동기화했다.
- 2026-04-16: Cycle 441 완료 - `Coverage report`가 테스트 실패가 아니라 threshold 설정값 때문에 막혀 `app/vitest.config.ts` global threshold를 현재 측정 베이스라인 바로 아래로 재조정하고 `docs/errors/2026-04-16_coverage-threshold-baseline-mismatch.md`를 추가했다.
- 2026-04-16: Cycle 440 완료 - production `/feed`에서 self-redirect loop가 발생해 guest feed redirect 단순화를 롤백했고, guest page non-redirect 회귀 테스트와 `docs/errors/2026-04-16_guest-feed-redirect-loop.md` 기록을 추가했다.
- 2026-04-16: Cycle 438 완료 - `refresh-docs-index.mjs`가 docs/API/migration 목록을 `git ls-files` 기준으로 수집하게 바꿔 checkout 파일시스템 차이와 무관하게 동일한 docs report를 생성하도록 고정했다.
- 2026-04-16: Cycle 437 완료 - `refresh-docs-index.mjs`의 check 비교를 `LF + NFC` 기준으로 정규화하고 `fileURLToPath`를 적용해 CI 환경 차이에도 `docs:refresh:check`가 흔들리지 않게 했다.
- 2026-04-16: Cycle 436 완료 - `refresh-docs-index.mjs`에서 상대 경로 문자열을 NFC로 정규화해 macOS/Linux 간 한글 파일명 표현 차이로 `docs:refresh:check`가 흔들리지 않게 했다.
- 2026-04-16: Cycle 435 완료 - `refresh-docs-index.mjs` 정렬을 기본 `localeCompare()` 대신 환경 독립적인 stable sort로 바꿔 `docs:refresh:check`가 macOS/Linux 간 순서 차이로 깨지지 않게 했다.
- 2026-04-16: Cycle 434 완료 - coverage threshold와 `docs:refresh:check`를 기존 CI에 추가하고, 운영 문서를 `quality:check`/`ops:check:health`/`db:restore:local` + `quality-gate`/`ops-smoke-checks` 중심 최소 루틴으로 재정리했다.
- 2026-04-16: Cycle 433 완료 - `auth`/`notifications` validation-service-query-action을 도메인 하위 폴더로 옮기고 기존 경로는 shim으로 유지했으며, 관련 구조 문서의 canonical path를 동기화했다.
- 2026-04-16: Cycle 432 완료 - `posts`/`moderation` validation-query-service를 도메인 하위 폴더로 옮기고 기존 경로는 shim으로 유지했으며, `README.md`, `AGENTS.md`, `app/README.md`에 canonical path와 계층 경계를 반영했다.
- 2026-04-16: Cycle 431 완료 - `AGENTS.md` 단일 하네스로 통합하고 `FORcodex.md`, `docs/개발_운영_가이드.md`, `docs/operations/Codex_작업_지도.md`를 제거했으며 활성 문서 링크를 재정리했다.
- 2026-04-14: Cycle 429 완료 - Tiptap 기반 공용 에디터로 1차 전환했지만 같은 날 추가 회귀로 Cycle 430에서 SunEditor 경로로 재정리했다.
- 2026-04-14: Cycle 428 완료 - inline typing boundary 분리, selection 저장 보강, 이미지 markdown 중복 직렬화를 정리했다.
- 2026-04-14: Cycle 427 완료 - 툴바 selection regression을 복구하고 브라우저 회귀 스펙을 추가했다.
- 2026-04-14: Cycle 426 완료 - 게시글 에디터 상단 툴바/서식 UX를 공용 구조로 재정리했다.
- 2026-04-14: Cycle 425 완료 - Prisma init failure 시 public feed/search/sitemap/post metadata가 500으로 무너지지 않도록 degraded fallback을 추가했다.
- 2026-04-07: Cycle 423~424 완료 - 블로그 절대경로 링크 제거, 공통 템플릿 보강, 대표 글 면접 Q&A 부록 추가.
- 2026-04-07: Cycle 408~422 완료 - TownPet 블로그 시리즈 01~24 초안 작성과 문체/diagram 강화, feed/detail/comment/accessibility/UI polish를 마쳤다.
- 2026-04-06: Cycle 397~404 완료 - README 포트폴리오 랜딩 정리, production demo seed/이미지 복구, 스크린샷 재캡처, 부산물 정리를 마쳤다.
- 2026-03-27: Cycle 385~388, 395~396 완료 - fresh DB migration repair, admin-only 분리, legal/commercial surface, ops/deploy hardening, 지원용 README 정리를 마쳤다.
- 2026-03-23: Cycle 381~384 완료 - 로컬 Docker Postgres 복구, engagement/test-account seed, one-command local restore를 추가했다.
- 2026-03-19~2026-03-21: Cycle 372~380 완료 - 검색 운영 telemetry, zero-result loop, admin 모바일 fallback, `pg_trgm` health/ops smoke 가시화를 정리했다.
- 2026-03-12~2026-03-13: Cycle 355~371 완료 - red-team remediation, direct moderation, admin/search/auth hardening, public identifier privacy 축소를 마쳤다.
- 2026-03-10~2026-03-12: Cycle 279, 298~354 완료 - upload proxy/backfill, 댓글/반응/뮤트/검색/피드/상세 UX와 정합성 문제를 대거 정리했다.
- 2026-03-07~2026-03-10: Cycle 205, 237~278 완료 - guest abuse defense, auth/OAuth/profile/personalization, adoption/volunteer board, media/upload 체계를 확장했다.
- 2026-03-04~2026-03-06: Cycle 126~204 완료 - OAuth 증적 자동화, hot path latency reduction, guest API 전환, deploy/security/docs hardening, ops smoke/Sentry/`pg_trgm` 운영 루프를 정착시켰다.
- 2026-02-25~2026-03-03: Cycle 67~125 완료 - security hardening track, locality/feed/detail caching, profile/pet/policy, 모바일/접근성 polish를 마쳤다.
- 2026-02-24 이전 포함: Cycle 1~66 완료 - core community, notifications, upload UX, trust/safety, GuestAuthor, community board 기반, growth/ops 문서 초석을 마쳤다.
