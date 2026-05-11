# PLAN.md

기준일: 2026-05-11
목표: TownPet를 기능/운영/품질 기준에서 "완성도 높은 커뮤니티" 상태로 끌어올린다.
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 운영 규칙
- 세션 시작: `PLAN.md` + `PROGRESS.md` 먼저 확인
- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다
- 완료된 상세와 긴 검증 로그는 `PROGRESS.md`에서 정리한 뒤 `COMPLETED.md`로 이동한다
- 작업 시작: 대상 항목 상태를 `in_progress`로 변경
- 작업 종료: `PROGRESS.md` 실행 결과를 갱신하고 완료 상세는 `COMPLETED.md` 맨 아래에 시간 오름차순으로 append한 뒤 `PLAN.md` 상태를 맞춘다
- 블로커 발생: `PLAN.md`와 `PROGRESS.md`를 즉시 함께 갱신한다

## 범위 원칙
- 우선순위: `서비스 안정성 -> 커뮤니티 핵심 기능 -> 재방문/유입 -> 운영 자동화`
- Phase 2 보류: 마켓/케어/결제/공동구매/카카오맵은 Phase 1 완료 후 착수

## 현재 우선순위
1. 레드팀 P0/P1 잔여 remediation 정리
2. 런치 준비 갭 정리: 공개 SEO/metadata/sitemap, 로딩/빈상태 polish, 보안 헤더/coverage 증거 보강
3. 운영 안정화: 무료 주간 10분 루틴 정착(health/log/manual smoke)
4. 운영 문서 유지: Vercel/OAuth/Secrets/데이터 관리 가이드 최신 상태 유지
5. 품종 기반 개인화/광고/커뮤니티 기능 PRD 확정 및 구현 사이클 착수
6. 보안 하드닝 트랙 분리 운영: `business/security/*` 백로그/리스크/진행 로그 상시 동기화

## Active Plan

### 100점 Release Confidence Hardening

상태: `in_progress`

#### 배경

- React Doctor식 정적 품질 점검 추정 점수는 약 76/100이고, pre-mortem까지 포함한 운영 자신감은 약 70~74점대다.
- 현재 앱은 기능 구현과 정책 테스트는 강하지만, 출시 후 실패하지 않는다는 확신을 주기에는 build gate, HTML 안전성, abuse failure mode, production smoke, metadata, privacy, 업로드, architecture split, client fetch, 운영 workflow guard가 부족하다.
- 이 계획의 목적은 “지금도 꽤 괜찮은 앱”을 “운영자가 잠들 수 있는 앱” 수준으로 끌어올리는 것이다.

#### 목표

- React Doctor식 점수와 운영 pre-mortem confidence를 100점에 최대한 가깝게 끌어올린다.
- 모든 P0/P1 loophole을 테스트와 함께 제거한다.
- P2/P3는 실제 결함으로 번지지 않도록 자동화, 문서, 운영 guard, 후속 backlog로 고정한다.
- 각 단계는 가능한 한 작은 커밋 단위로 진행한다.

#### 범위

- CI/build gate, Node/pnpm/Corepack 표준화
- rendered HTML/markdown/editor/post detail 안전성
- rate limit, Redis/Upstash 장애 시 high-risk write path failure mode
- production smoke secret readiness와 원격 smoke
- hot-path browser e2e 자동화
- public/auth/admin metadata/SEO
- 검색어 로그, localStorage draft, guest fingerprint, audit retention privacy hardening
- upload/media validation과 raw image policy
- giant component/query/service architecture split
- client `useEffect` fetch 정리
- production maintenance workflow safety guard
- UX/error boundary/mobile/accessibility 보강
- 문서/런북/PROGRESS/COMPLETED 동기화

#### 제외

- secret 값 자체를 문서에 기록하지 않는다.
- 실사용자 데이터 변경은 dry-run, 백업, 명시 승인 없이는 하지 않는다.
- 결제/보험/정산, 자동 제재 강행은 Phase 2로 유지한다.
- 카카오맵/마켓/공동구매 deep feature 확장은 이번 계획 범위가 아니다.

#### 최종 완료 기준

- `pnpm -C app quality:check`가 lint, typecheck, unit, build까지 포함해 통과한다.
- 핵심 browser smoke가 로컬과 CI 중 최소 하나에서 자동 실행된다.
- public/internal production health, `pg_trgm`, prewarm, care smoke readiness가 PASS하거나 남은 blocker가 값/계정/외부 서비스 단위로 기록된다.
- rendered HTML/XSS, upload edge case, rate-limit failure mode, privacy redaction에 regression test가 있다.
- metadata 누락 scan이 public/auth/admin 주요 페이지에서 0건이거나 의도적 제외 목록이 있다.
- P0/P1 항목은 모두 `COMPLETED.md`로 이관 가능한 검증 로그를 가진다.

## 실행 순서

### P0-1. CI/build gate를 실제 production failure 기준으로 올린다

상태: `completed`

- 문제: `quality:check`와 GitHub `quality-gate`가 `next build`를 포함하지 않아, 타입/테스트가 통과해도 Next build/runtime bundling failure를 놓칠 수 있다.
- 대상:
  - `app/package.json`
  - `.github/workflows/quality-gate.yml`
  - `AGENTS.md`, `app/README.md` 또는 관련 명령 문서
- 작업:
  - `quality:check` 또는 별도 `quality:release`에 `next build`를 포함한다.
  - CI `quality-gate`가 최소 `lint -> typecheck -> vitest -> build`를 실행하게 한다.
  - build 시간이 너무 길면 `quality:check`와 `quality:gate` 역할을 명확히 분리한다.
  - Node 20, pnpm 9.12.3, Corepack 실행 경로를 문서와 CI 기준에 맞춘다.
- 검증:
  - `pnpm -C app lint`
  - `pnpm -C app typecheck`
  - `pnpm -C app test -- --run`
  - `pnpm -C app build`
  - GitHub `quality-gate` dry run 또는 push 후 PASS 확인
- 완료 기준:
  - build 없는 green 상태가 release-ready로 오인되지 않는다.

### P0-2. rendered HTML/XSS 안전성을 증명한다

상태: `completed`

- 문제: `markdown-lite`, editor preview, post detail, guest post detail이 custom HTML renderer와 `dangerouslySetInnerHTML`에 의존한다.
- 대상:
  - `app/src/lib/markdown-lite.ts`
  - `app/src/lib/editor-content-serializer.ts`
  - `app/src/components/posts/post-body-rich-editor.tsx`
  - `app/src/components/posts/post-detail-client.tsx`
  - `app/src/app/posts/[id]/guest/page.tsx`
  - `app/src/lib/markdown-lite.test.ts`
  - `app/src/lib/editor-image-markup.test.ts`
- 작업:
  - `javascript:`, `data:`, malformed URL, encoded URL, quote breaking, event handler, SVG payload, nested markdown payload, image alt injection fixture를 추가한다.
  - 허용 태그/속성 allowlist를 테스트로 고정한다.
  - raw HTML 입력이 text로 escape되는지 확인한다.
  - JSON-LD `dangerouslySetInnerHTML`은 `serializeJsonForScriptTag` 테스트로 분리 보강한다.
  - sanitizer가 복잡해지면 custom regex renderer 유지 대신 allowlist sanitizer 또는 AST 기반 renderer 전환을 검토한다.
- 검증:
  - `pnpm -C app test -- src/lib/markdown-lite.test.ts src/lib/editor-image-markup.test.ts src/lib/json-script.test.ts`
  - post detail rendering component targeted test
- 완료 기준:
  - 사용자 입력 기반 HTML 경로에서 script execution, attribute injection, unsafe href/src가 불가능하다는 테스트가 있다.

### P0-3. abuse-prone write path의 Redis 장애 failure mode를 정한다

상태: `completed`

- 문제: Upstash/Redis rate limit 실패 시 memory fallback을 사용한다. serverless scale-out에서는 instance-local fallback이 abuse 방어로 충분하지 않을 수 있다.
- 대상:
  - `app/src/server/rate-limit.ts`
  - `app/src/server/authenticated-write-throttle.ts`
  - `app/src/app/api/posts/route.ts`
  - `app/src/app/api/reports/route.ts`
  - `app/src/app/api/upload/route.ts`
  - `app/src/app/api/search/log/route.ts`
  - `app/src/app/api/feed/personalization/route.ts`
  - 댓글/수정/삭제/신고/업로드 관련 route tests
- 작업:
  - `enforceRateLimit`에 `failureMode: "open" | "closed" | "memory"` 또는 high-risk wrapper를 추가한다.
  - production에서 작성, 댓글, 신고, 업로드, guest step-up, search log flood, personalization metric flood는 Redis 실패 시 fail-closed 또는 degraded policy를 적용한다.
  - public read path와 low-risk telemetry는 memory fallback 허용 여부를 명시한다.
  - Redis 오류 로그는 Sentry/ops signal로 잡히도록 한다.
- 검증:
  - Redis fetch 실패 mock에서 high-risk write가 503/429 등 정책적 응답을 내는 unit/route test
  - 정상 Redis path regression test
  - memory fallback 허용 route는 명시 테스트
- 완료 기준:
  - Redis 장애가 곧 abuse 방어 무력화로 이어지지 않는다.

### P0-4. production smoke blocker를 값/계정 단위로 제거한다

상태: `completed`

- 문제: production smoke는 `OPS_HEALTH_INTERNAL_TOKEN`, smoke 계정, 선택 Sentry secret이 없어 blocked 상태였다.
- 대상:
  - `app/scripts/check-care-smoke-readiness.ts`
  - `business/operations/돌봄_운영_런북.md`
  - `.github/workflows/ops-smoke-checks.yml`
  - Vercel/GitHub Actions secret inventory
- 작업:
  - `OPS_HEALTH_INTERNAL_TOKEN` 또는 `HEALTH_INTERNAL_TOKEN` 필요 여부를 확정한다.
  - `CARE_SMOKE_ADMIN_EMAIL`, `CARE_SMOKE_REQUESTER_EMAIL`, `CARE_SMOKE_CAREGIVER_EMAIL` 표준 계정을 확정한다.
  - Sentry는 필수/선택을 분리하되, 선택이면 No-Go가 아닌 Degraded로 표시한다.
  - secret 값은 문서에 쓰지 않고 “설정됨/미설정” 상태만 기록한다.
- 검증:
  - `pnpm -C app ops:check:care-smoke-readiness`
  - `OPS_BASE_URL=https://townpet.vercel.app OPS_HEALTH_INTERNAL_TOKEN=<set> pnpm -C app ops:check:health`
- 완료 기준:
  - readiness가 PASS거나, blocker가 정확히 어떤 secret/계정인지 남는다.
- 결과:
  - GitHub Actions secret inventory에서 `HEALTH_INTERNAL_TOKEN`, Sentry 4종 secret이 설정된 것을 값 노출 없이 확인했다.
  - GitHub repository variables에 `CARE_SMOKE_ADMIN_EMAIL`, `CARE_SMOKE_REQUESTER_EMAIL`, `CARE_SMOKE_CAREGIVER_EMAIL`을 표준 smoke 식별자로 설정했다.
  - `.github/workflows/ops-smoke-checks.yml`에 `ops:check:care-smoke-readiness` 선행 gate를 추가했다.
  - 로컬 더미 토큰/동일 변수 조합에서는 readiness가 `PASS`로 분류된다.
  - 실제 운영 계정 존재/권한과 원격 health/pg_trgm/prewarm 실행은 P1-1에서 검증한다.

### P1-1. production smoke를 실제 원격 기준으로 실행한다

상태: `completed`

- 문제: 로컬 기능 검증과 운영 배포 검증은 다르다.
- 대상:
  - `app/scripts/check-health-endpoint.ts`
  - `app/scripts/prewarm-deployment.ts`
  - `app/scripts/check-care-smoke-readiness.ts`
  - `.github/workflows/ops-smoke-checks.yml`
- 작업:
  - public health, internal health, `pg_trgm`, rate-limit backend, storage/email readiness를 원격에서 확인한다.
  - `/feed/guest`, `/feed`, `/search`, post detail, care/admin routes를 prewarm한다.
  - care smoke가 운영 데이터에 남기는 흔적과 cleanup 절차를 확인한다.
- 검증:
  - `pnpm -C app ops:check:health`
  - `OPS_HEALTH_REQUIRE_PG_TRGM=1 pnpm -C app ops:check:health`
  - `pnpm -C app ops:prewarm`
  - GitHub `ops-smoke-checks` manual run
- 완료 기준:
  - 원격 배포가 local-only green 착시가 아님을 증명한다.
- 결과:
  - GitHub Actions `ops-smoke-checks` manual run `25645368457` PASS.
  - care readiness, public health, prewarm, internal health token validation, `pg_trgm`, Sentry secret validation, Sentry ingestion이 모두 통과했다.
  - 남은 범위는 브라우저 기반 실제 클릭 hot path gate와 운영 계정 role/session smoke다.

### P1-2. hot-path browser gate를 자동화한다

상태: `completed`

- 문제: 피드/검색/정렬/기간 같은 실제 클릭 기능은 단위 테스트만으로 부족하고, 이전에 실제로 regress 되었다.
- 대상:
  - `app/e2e/search-and-board-filtering.spec.ts`
  - `app/e2e/guest-post-management.spec.ts`
  - `app/e2e/post-comment-auth-sync.spec.ts`
  - `app/e2e/notification-filter-controls.spec.ts`
  - `app/e2e/admin-new-user-policy.spec.ts`
  - `app/e2e/report-flow.spec.ts`
  - `app/package.json`
  - `.github/workflows/browser-smoke.yml`
- 작업:
  - 핵심 hot path suite를 `test:e2e:hotpath`로 묶는다.
  - `browser-smoke`를 manual-only에서 push/main 또는 dispatch 필수 체크로 승격할지 결정한다.
  - 너무 느리면 smoke와 nightly/full suite를 분리한다.
  - 게스트/회원 feed controls, footer search, legacy `/search` redirect, post create/comment/reaction/bookmark/report/admin review를 포함한다.
- 검증:
  - `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm -C app test:e2e:hotpath`
  - GitHub `browser-smoke` PASS
- 완료 기준:
  - 사용자가 클릭했을 때 적용되지 않는 회귀가 CI에서 잡힌다.
- 결과:
  - `test:e2e:hotpath`를 추가해 검색/게시판 필터, 비회원 글 관리, 댓글 auth sync, 알림 필터, 관리자 신규 유저 정책, 신고 흐름을 한 suite로 묶었다.
  - `browser-smoke` workflow를 `main` push path gate와 수동 실행 모두에서 smoke + hotpath를 실행하도록 확장했다.
  - CI browser job에서 seed users/local test accounts를 준비하도록 고정했다.
  - hotpath가 댓글 cross-tab auth sync 회귀를 잡았고, 댓글 섹션이 missed storage event까지 서버 렌더로 수렴하도록 수정했다.
  - 검증: targeted unit/e2e, `test:e2e:hotpath` 10개 PASS, `quality:check` PASS.

### P1-3. metadata/SEO 누락을 체계적으로 제거한다

상태: `completed`

- 문제: `page.tsx` 40개 중 metadata 또는 `generateMetadata` 누락이 25개였다.
- 대상:
  - public/auth/admin page 전체
  - `app/src/lib/post-page-metadata.test.ts`
  - `app/src/app/sitemap.test.ts`
  - `app/src/app/robots.test.ts`
- 작업:
  - route group별 metadata factory를 만든다.
  - public 페이지는 title/description/open graph/canonical/noindex 여부를 명확히 한다.
  - auth/admin/private 페이지는 noindex 정책을 고정한다.
  - metadata 누락 scan test를 추가한다.
- 검증:
  - metadata scan test
  - `pnpm -C app test -- src/lib/post-page-metadata.test.ts src/app/sitemap.test.ts src/app/robots.test.ts`
  - `pnpm -C app build`
- 완료 기준:
  - 의도하지 않은 metadata 누락이 없다.
- 결과:
  - `createPublicPageMetadata`, `createNoIndexPageMetadata` helper를 추가했다.
  - auth/admin/private/작성/수정/legacy redirect 페이지에 noindex metadata를 추가했다.
  - 모든 `app/src/app/**/page.tsx`가 `metadata` 또는 `generateMetadata`를 갖는지 scan test로 고정했다.
  - metadata/sitemap/robots targeted test와 `quality:check`가 통과했다.

### P1-4. privacy hardening을 실제 데이터 흐름 기준으로 한다

상태: `completed`

- 문제: 검색어 로그, localStorage draft, guest fingerprint, auth/search/admin audit는 기능상 필요하지만 개인정보/민감정보 리스크가 있다.
- 대상:
  - `app/src/app/api/search/log/route.ts`
  - `app/src/server/queries/search.queries.ts`
  - `app/src/components/posts/post-create-form.tsx`
  - `app/src/components/posts/feed-search-form.tsx`
  - `app/src/components/posts/guest-post-detail-actions.tsx`
  - `app/src/components/posts/post-detail-edit-form.tsx`
  - `app/src/server/auth-audit-retention.ts`
  - search/auth audit retention scripts
- 작업:
  - 검색어 로그 저장 전 이메일/전화번호/상세주소/토큰 패턴 redaction을 추가한다.
  - recent search localStorage도 민감 패턴은 저장하지 않거나 TTL을 둔다.
  - post draft localStorage에 만료 시간, 명시 clear, shared-device 안내를 추가한다.
  - guest fingerprint mismatch를 abuse signal로 기록하되 원문 fingerprint는 저장하지 않는다.
  - auth/search/admin audit retention 값을 운영 문서와 테스트에 맞춘다.
- 검증:
  - privacy fixture unit tests
  - search log route test
  - draft TTL/client behavior test
  - retention script dry-run
- 완료 기준:
  - 편의 기능이 개인정보 저장소로 변하지 않는다.
- 결과:
  - 검색어 통계 저장 전 이메일/전화번호/연락 링크/상세주소/토큰 패턴을 redaction 또는 skip 처리했다.
  - recent search localStorage를 7일 TTL payload로 바꾸고 민감 검색어는 저장하지 않게 했다.
  - 글쓰기 draft localStorage에 24시간 만료를 추가하고 공용 기기 안내를 노출했다.
  - guest step-up identity mismatch도 원문 fingerprint 없이 abuse signal로 기록하게 했다.
  - privacy/storage/guest-step-up targeted test와 `quality:check`가 통과했다.

### P1-5. upload/media hardening을 보강한다

상태: `completed`

- 문제: 업로드는 signature/Sharp 처리가 있으나 GIF 원본 유지, raw `<img>`, remote/local mixed media 정책이 남아 있다.
- 대상:
  - `app/src/server/upload.ts`
  - `app/src/server/upload-asset.service.ts`
  - `app/src/components/posts/post-detail-media-gallery.tsx`
  - `app/src/app/media/[...path]/route.ts`
  - `app/src/lib/upload-url.ts`
  - upload/media tests
- 작업:
  - GIF 용량, 픽셀 수, 프레임 수 또는 duration 제한을 추가한다.
  - HEIC/HEIF/AVIF 처리 실패 케이스를 명확히 한다.
  - polyglot image, wrong MIME, oversized dimensions, corrupt image fixture를 추가한다.
  - raw `<img>` 사용 지점을 공용 media component로 감싸 alt/lazy/size/error fallback을 강제한다.
  - `/media` proxy cache, content-type, trusted source policy를 재검증한다.
- 검증:
  - `pnpm -C app test -- src/server/upload-asset.service.test.ts src/app/api/upload/route.test.ts src/app/media/[...path]/route.test.ts`
  - `pnpm -C app test:e2e:upload`
- 완료 기준:
  - 업로드가 storage 비용/성능/보안 사고의 열린 입구가 아니다.
- 결과:
  - 업로드 저장 전 polyglot/script payload, corrupt image, HEIC/HEIF/AVIF metadata failure, GIF 용량/프레임/픽셀 제한을 검증한다.
  - `/media` proxy가 저장된 trusted pathname과 요청 pathname 불일치를 거부하고, upstream non-image content-type을 차단하며 `nosniff`를 붙인다.
  - 게시글 상세 media gallery의 raw image 사용을 내부 공용 fallback component로 감쌌다.
  - 글쓰기 draft hydration과 제목 입력이 업로드 e2e를 깨지 않도록 제목 입력과 editor rerender를 분리했다.
  - 검증: upload/media targeted unit PASS, `test:e2e:upload` PASS, `quality:check` PASS.

### P1-6. 거대 컴포넌트와 monolith query/service를 분해한다

상태: `in_progress`

- 문제: 500~4800줄 파일들이 많아 회귀 수정 속도와 AI/사람 리뷰 품질이 떨어진다.
- 대상:
  - `app/src/components/posts/post-create-form.tsx`
  - `app/src/components/posts/post-detail-client.tsx`
  - `app/src/components/posts/post-comment-thread.tsx`
  - `app/src/components/posts/feed-infinite-list.tsx`
  - `app/src/app/feed/page.tsx`
  - `app/src/server/queries/posts/post.queries.ts`
  - `app/src/server/services/posts/post.service.ts`
- 작업:
  - `post-create-form`: draft, upload, structured fields, editor shell, submit orchestration, policy banner를 분리한다.
  - `post-detail-client`: media, actions, comments, stats refresh, JSON-LD, report/moderation controls를 분리한다.
  - `post-comment-thread`: fetch/mutation, item rendering, guest/member permission, reaction controls를 분리한다.
  - `feed/page`: query param parsing, personalization decision, feed context, UI shell을 분리한다.
  - `post.queries`: feed list, detail, search, admin, care/adoption specific read model로 쪼갠다.
  - `post.service`: create/update/delete/reaction/bookmark/view/care/adoption/guest policy를 파일 단위로 나눈다.
  - 파일별 테스트는 먼저 이동만 하고, 동작 변경은 별도 커밋으로 제한한다.
- 검증:
  - 기존 targeted tests 전부 유지
  - `pnpm -C app quality:check`
  - hot-path e2e
- 완료 기준:
  - 핵심 파일이 700~900줄 이하 또는 명확한 책임 단위로 줄어든다.
- 진행:
  - 1차 inventory: `post-create-form` 2204줄, `post-detail-client` 1727줄, `post-comment-thread` 1135줄, `feed-infinite-list` 821줄, `feed/page` 1102줄, `post.queries` 4850줄, `post.service` 3210줄.
  - 첫 slice: `post-create-form` 상태 타입/초기값/draft guard를 `post-create-form-state`로 분리.
  - 두 번째 slice: `post-create-form` option constants와 scope resolver를 `post-create-form-options`로 분리.
  - 세 번째 slice: `post-create-form` draft hydration/autosave/clear 로직을 `use-post-create-draft` hook으로 분리.
  - 네 번째 slice: `post-create-form` 마켓/돌봄 structured fields와 공용 section wrapper를 `post-create-structured-fields`로 분리.

### P1-7. 운영 관리자 루틴을 10분 smoke로 고정한다

- 문제: 관리자 화면은 접근/표시뿐 아니라 운영자가 실제로 처리할 수 있어야 한다.
- 대상:
  - `/admin/ops`
  - `/admin/reports`
  - `/admin/reports/[id]`
  - `/admin/care-feedbacks`
  - `/admin/auth-audits`
  - `/admin/moderation/direct`
  - admin e2e
- 작업:
  - 운영자 계정으로 report queue, direct moderation, care feedback review, auth audit read/export, ops overview를 한 번에 검증하는 e2e를 만든다.
  - non-admin 접근은 404/noindex/권한 차단을 확인한다.
  - empty/loading/error state도 포함한다.
- 검증:
  - `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm -C app playwright test e2e/admin-*.spec.ts --project=chromium`
- 완료 기준:
  - 주간 10분 운영 루틴이 문서가 아니라 테스트로 고정된다.

### P2-1. client `useEffect` fetch를 정리한다

- 문제: viewer shell, notification bell, guest feed/search, neighborhood search, suggestions 등에서 client effect fetch가 분산되어 있다.
- 대상:
  - `app/src/components/navigation/app-shell-header.tsx`
  - `app/src/components/notifications/notification-bell.tsx`
  - `app/src/components/posts/guest-feed-page-client.tsx`
  - `app/src/components/posts/guest-search-page-client.tsx`
  - `app/src/components/posts/feed-search-form.tsx`
  - `app/src/components/onboarding/onboarding-form.tsx`
  - `app/src/components/profile/neighborhood-preference-form.tsx`
- 작업:
  - 첫 화면 필수 데이터는 server component/route loader에서 주입한다.
  - 검색 제안/동네 검색처럼 interactive query가 필요한 곳은 공용 debounced client query hook으로 통일한다.
  - stale response race, abort controller, error retry, loading/empty state를 표준화한다.
- 검증:
  - component tests
  - feed/search/notification e2e
  - React Doctor식 effect/fetch 재스캔
- 완료 기준:
  - 임의 effect fetch가 아니라 의도된 client query 표면만 남는다.

### P2-2. production maintenance workflow guard를 강화한다

- 문제: production demo seed, post integrity repair, cleanup workflows가 production DB를 직접 다루며, apply/cleanup 실수 시 피해가 크다.
- 대상:
  - `.github/workflows/production-demo-content.yml`
  - `.github/workflows/post-integrity-maintenance.yml`
  - `.github/workflows/notification-cleanup.yml`
  - `.github/workflows/search-term-cleanup.yml`
  - `.github/workflows/auth-audit-cleanup.yml`
  - 관련 scripts
- 작업:
  - destructive workflow는 environment approval을 필수화한다.
  - dry-run artifact와 summary를 항상 남긴다.
  - apply 모드는 대상 DB host, row count, backup/readiness 확인을 출력한다.
  - `reset_existing` 기본값을 보수적으로 재검토한다.
  - cleanup은 retention days와 삭제 건수 상한을 명시한다.
- 검증:
  - workflow dry-run
  - script unit tests
  - local non-production guard tests
- 완료 기준:
  - 유지보수 자동화가 실수로 production 데이터를 망가뜨릴 가능성이 낮다.

### P2-3. UX/error boundary/mobile/accessibility 보강

- 문제: error boundary가 제한적이고, 모바일/빈상태/권한 차단/접근성은 핵심 흐름 중심으로만 검증되어 있다.
- 대상:
  - feed/search/post/auth/admin route `loading.tsx`, `error.tsx`, empty state
  - `app/src/components/ui/*`
  - mobile e2e/screenshots
- 작업:
  - feed/search/post/auth/admin 단위 error boundary를 보강한다.
  - 필터 0건, 검색 0건, 권한 없음, 세션 만료, 서비스 장애 상태를 구분한다.
  - 390px/768px/1440px viewport에서 주요 화면 overflow를 확인한다.
  - button label, focus visible, raw anchor/image alt를 재점검한다.
- 검증:
  - Playwright mobile smoke
  - axe 또는 자체 accessibility assertions 가능한 범위
  - visual screenshot spot-check
- 완료 기준:
  - 장애/빈상태/모바일 상태가 “깨진 화면”처럼 보이지 않는다.

### P2-4. CORS, CSP, security headers를 운영 조건으로 재검증한다

- 문제: middleware가 보안 헤더와 CORS를 담당하지만, env origin 오설정이나 static guest feed CSP 분기가 운영에서 문제를 만들 수 있다.
- 대상:
  - `app/middleware.ts`
  - `app/src/lib/security-headers.ts`
  - `app/src/app/api/security/csp-report/route.ts`
  - middleware/security tests
- 작업:
  - good Origin/bad Origin/empty Origin 테스트를 보강한다.
  - strict CSP report-only/enforce 전환 조건을 문서화한다.
  - admin/API noindex, HSTS, permissions-policy, referrer-policy를 scan test로 고정한다.
- 검증:
  - `pnpm -C app test -- src/middleware.test.ts src/lib/security-headers.test.ts src/app/api/security/csp-report/route.test.ts`
- 완료 기준:
  - 운영 env 오설정이 보안 헤더 공백으로 이어지지 않는다.

### P2-5. observability와 early warning signal을 정리한다

- 문제: Sentry, auth audit, search stats, ops latency snapshot, health check가 있지만 early warning 기준이 흩어져 있다.
- 대상:
  - `app/scripts/collect-latency-snapshot.ts`
  - `app/scripts/check-sentry-ingestion.ts`
  - `app/scripts/run-ops-evidence.ts`
  - `business/operations/*`
- 작업:
  - latency p95, error rate, Redis fallback, upload failure, report queue pending, care safety issue threshold를 운영 지표로 정리한다.
  - Sentry가 optional이면 대체 로그 확인 루틴을 문서화한다.
  - 주간 evidence runner 결과를 `COMPLETED.md`로 옮길 수 있는 형태로 표준화한다.
- 검증:
  - `pnpm -C app ops:perf:snapshot`
  - `pnpm -C app ops:evidence`
  - Sentry configured 환경에서 `pnpm -C app ops:check:sentry`
- 완료 기준:
  - 장애 전조를 볼 곳과 임계값이 분명하다.

### P3-1. dependency, bundle, runtime hygiene를 정리한다

- 문제: `node_modules` 용량 자체보다 실제 bundle/runtime 비용과 unused dependency drift가 중요하다.
- 대상:
  - `app/package.json`
  - `app/pnpm-lock.yaml`
  - Next build output
- 작업:
  - dependency usage를 정적/빌드 기준으로 재확인한다.
  - SunEditor, Sharp, Playwright, Prisma 등 큰 의존성은 runtime/dev boundary와 bundle 포함 여부를 확인한다.
  - 필요하면 bundle analyzer를 임시 도구로만 실행하고 결과는 문서화한다.
- 검증:
  - `pnpm -C app build`
  - build output route size 확인
- 완료 기준:
  - 불필요한 의존성보다 실제 bundle/runtime 비용이 관리된다.

### P3-2. 문서와 완료 이력을 작업 단위로 이관한다

- 문제: 계획이 길어질수록 active 문서가 다시 무거워진다.
- 대상:
  - `docs/PLAN.md`
  - `docs/PROGRESS.md`
  - `docs/COMPLETED.md`
- 작업:
  - 각 P0/P1/P2 묶음 완료 시 `PROGRESS.md`에 결과를 요약한다.
  - 검증 명령, 실패/수정/재검증 로그는 `COMPLETED.md`에 시간 오름차순으로 append한다.
  - PLAN은 완료된 항목을 제거하고 다음 active 항목만 남긴다.
- 검증:
  - docs diff review
  - `pnpm -C app docs:refresh:check` 필요 시 실행
- 완료 기준:
  - 긴 계획은 archive되고 다음 작업자가 바로 이어받을 수 있다.

## 커밋 전략

1. 문서 계획 확장만 별도 커밋한다.
2. P0-1 CI/build gate만 별도 커밋한다.
3. P0-2 HTML safety fixture와 sanitizer 변경은 별도 커밋한다.
4. P0-3 rate-limit failure mode는 별도 커밋한다.
5. P0-4/P1-1 smoke readiness와 원격 smoke 기록은 secret 값 없이 문서/스크립트 커밋으로 분리한다.
6. P1 이후는 metadata, privacy, upload, architecture split, e2e, ops workflow guard 단위로 커밋한다.

## 작업 중단 시 다음 사람에게 남길 것

- 마지막으로 완료한 항목 번호
- 실행한 검증 명령과 결과
- 남은 blocker가 코드 문제인지, secret/계정 문제인지, 외부 서비스 문제인지
- 다음에 바로 실행할 명령
