# PROGRESS.md

기준일: 2026-05-11
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서는 `docs/PLAN.md`, `docs/PROGRESS.md` slim active와 `docs/COMPLETED.md` archive 구조로 운영한다
- 공개 SEO, 보안 헤더, 운영 smoke, 로딩/빈상태, 레드팀 잔여 remediation, 피드/검색 hot path 검증을 완료했다
- 개인화/광고 운영 판단 기준, 관리자 진단 UX, 광고/추천 정책 분리, 품종 라운지 write gate 점검을 완료했다
- 운영 evidence runner, Search Quality Phase 2, Market State Machine preflight/M1/M2를 완료했다
- Social Dev Onboarding Smoke 안정화와 Launch Gap 다음 후보 재평가를 완료했다
- Care Request Templates preflight, M1 구조화 요청, M2 상태 전환, M3 preflight를 완료했다
- Care Application M3 지원 생성/관리와 Care Request M4 preflight/상태 전환을 완료했다
- Care Request M5 후기/노쇼/증빙 preflight를 완료했다
- Care Request M5 완료 피드백을 완료했다
- Care Request M6 운영 신호 큐 preflight를 완료했다
- Care Request M6 운영 신호 큐를 완료했다
- Care Request M7 케어 플로우 로컬 검증을 완료했다
- Care Request M8 출시 갭 정리를 완료했다
- Care Request M9 운영 런북/데모 seed를 완료했다
- Care Request M10 관리자 큐 처리 상태와 M11 모바일/빈 상태 polish를 완료했다
- Care Request M12 운영 threshold와 M13-M18 production smoke 준비/보류/tooling을 완료했다
- Release Confidence Hardening 상세 계획과 P0-1 CI/build gate, P0-2 rendered HTML/XSS 안전성, P0-3 abuse-prone write path Redis 장애 failure mode, P0-4 production smoke readiness blocker, P1-1 원격 production smoke, P1-2 hot-path browser gate 자동화, P1-3 metadata/SEO 누락 제거, P1-4 privacy hardening, P1-5 upload/media hardening을 완료했다.
- 현재 작업: P1-6 거대 컴포넌트와 monolith query/service 분해

## 열린 blocker
- 원격 production smoke는 GitHub Actions `ops-smoke-checks` run `25645368457` 기준 PASS했다.
- 운영 smoke 계정의 실제 role/session 브라우저 검증은 P1-2/P1 운영 계정 smoke에서 계속 확인한다.

## 직전 검증
- Care Request M1-M6:
  - 구조화 요청, 상태 전환, 지원 생성/관리, 완료 피드백, `/admin/care-feedbacks`, `/admin/ops` 요약을 완료했다.
  - 완료 피드백 이슈는 신고 큐와 분리하고, 공개 피드/검색/프로필에는 노출하지 않는다.
- Care Request M7 로컬 검증:
  - 정상: UI 기준 작성 -> 지원 -> 수락 -> 진행/완료 -> 완료 피드백 -> 관리자 이슈 큐 -> Ops 요약 e2e가 통과했다.
  - 버그: 돌봄 요청 작성 폼의 동네 선택 UI 누락을 재현했고, `showNeighborhood` 조건 수정으로 해결했다.
  - 보류: 결제/보험/정산, production smoke, 자동 제재, 증빙 업로드.
- Care Request M8 출시 갭 정리:
  - 바로 구현: 운영 런북, 로컬 demo seed/seed 지침, e2e 실행 위치 정리.
  - 이후 보강: 빈 상태/모바일 polish, 관리자 큐 처리 상태, 운영 지표 threshold.
  - 보류 유지: 결제/보험/정산, 자동 제재, 증빙 업로드, production smoke.
- Care Request M9 운영 런북/데모 seed:
  - 추가: `db:seed:care-demo`, `db:restore:local` seed step, `business/operations/돌봄_운영_런북.md`.
  - 데이터: 요청자/지원자/운영자 계정과 `OPEN`, `MATCHED`, `COMPLETED + SAFETY issue` 케이스.
  - 보류 유지: 결제/보험/정산, 자동 제재, 증빙 업로드, production smoke.
- Care Request M10 관리자 큐 처리 상태 preflight:
  - 결정: 별도 dispute/queue table 없이 `CareCompletionFeedback`에 검토 상태/운영자 메모를 붙인다.
  - 처리 이력은 신고 큐의 `ReportAudit`이 아니라 `ModerationActionLog`의 `CARE_FEEDBACK_REVIEWED` action으로 남긴다.
- Care Request M10 관리자 큐 처리 상태 구현:
  - 추가: `CareFeedbackReviewStatus`, `reviewStatus/reviewNote/reviewedAt/reviewedBy`, 관리자 action/service, 상태 필터/처리 폼.
  - 검증: migration deploy, care demo seed, targeted Vitest, `typecheck`, `lint`.
- Care Request M11 모바일/빈 상태 polish preflight:
  - 모바일 390px 기준 feed/detail 문서 overflow 없음.
  - `/admin/care-feedbacks`는 1120px 테이블 내부 스크롤로만 운영해야 해 모바일 카드 리스트가 필요하다.
  - 필터 0건 empty copy는 전체 큐 없음과 조건 0건을 분리해야 한다.
- Care Request M11 관리자 큐 모바일/빈 상태 polish:
  - 추가: 모바일 카드 리스트, 데스크톱 테이블 분리, 필터 0건 empty copy.
  - 검증: `care-feedback-mobile.spec.ts`, `typecheck`, `lint`.
- Care Request M12 운영 threshold preflight:
  - 결정: 자동 조치 없이 `/admin/ops` 경고 copy와 count 표시만 추가한다.
  - 기준: `PENDING >= 3`, `PENDING + REVIEWING >= 5`, `SAFETY/PAYMENT_OR_FRAUD >= 1`.
- Care Request M12 운영 threshold 구현: helper, Ops count/badge/copy, targeted Vitest, `typecheck`, `lint` 통과.
- Care Request M13 출시 준비 최종 정리: 로컬 기능 조건부 Go, 운영 배포는 production smoke/strict health 전 No-Go.
- Care Request M14-M17 production smoke 준비/보류 확인: public health PASS, internal token/Sentry/테스트 계정 부재로 blocked.
- Care Request M18 smoke readiness tooling: 표준 smoke 계정 식별자와 `ops:check:care-smoke-readiness`; 현재 환경은 expected `BLOCKED`.
- Release Confidence Hardening P0-1:
  - `quality:check`가 `eslint -> tsc --noEmit -> vitest run -> next build`를 실행하도록 강화했다.
  - GitHub `quality-gate` step 이름을 build 포함 기준으로 갱신했다.
  - Next production build phase에서는 module-load runtime assert를 건너뛰되, `validateRuntimeEnv`와 Vercel strict preflight는 유지되도록 경계를 분리했다.
  - 검증: `corepack pnpm@9.12.3 -C app exec vitest run src/lib/env.test.ts`, `corepack pnpm@9.12.3 -C app quality:check` 통과.
- Release Confidence Hardening P0-2:
  - `markdown-lite`의 link/image token placeholder를 사용자 입력과 충돌하기 어려운 sentinel로 바꿨다.
  - unsafe markdown link는 anchor로 만들지 않고 label만 남기도록 강화했다.
  - `javascript:`, `data:`, raw HTML, link label HTML, image alt quote/event text, unsafe image protocol, placeholder collision fixture를 추가했다.
  - 검증: `corepack pnpm@9.12.3 -C app exec vitest run src/lib/markdown-lite.test.ts src/lib/json-script.test.ts`, `corepack pnpm@9.12.3 -C app quality:check` 통과.
- Release Confidence Hardening P0-3:
  - `enforceRateLimit`에 `failureMode: "closed"`를 추가해 Redis/Upstash 장애 시 high-risk 경로가 503으로 fail-closed할 수 있게 했다.
  - 인증 작성 throttle은 모든 user/ip/fingerprint/scope limit에 closed mode를 적용했다.
  - 게스트 작성/수정/삭제/댓글, 업로드, guest step-up, 검색 로그, 개인화 metric write에 closed mode를 적용했다.
  - 검증: targeted 9개 테스트 파일, `corepack pnpm@9.12.3 -C app quality:check` 통과.
- Release Confidence Hardening P0-4:
  - GitHub Actions secret inventory에서 `HEALTH_INTERNAL_TOKEN`, Sentry 4종 secret 설정 여부를 값 노출 없이 확인했다.
  - GitHub repository variables에 표준 smoke 계정 식별자 3종을 설정했다.
  - `ops-smoke-checks`가 health/prewarm 전에 `ops:check:care-smoke-readiness`를 실행하도록 추가했다.
  - 검증: `HEALTH_INTERNAL_TOKEN=dummy ... corepack pnpm@9.12.3 -C app ops:check:care-smoke-readiness` PASS.
- Release Confidence Hardening P1-1:
  - `main`에 P0-1~P0-4 커밋을 push한 뒤 GitHub Actions `ops-smoke-checks`를 수동 실행했다.
  - `run 25645368457`에서 care readiness, deployment health, prewarm, internal health token, `pg_trgm`, Sentry secret validation, Sentry ingestion이 모두 PASS했다.
- Release Confidence Hardening P1-2:
  - `test:e2e:hotpath`를 추가해 검색/게시판 필터, 비회원 글 관리, 댓글 auth sync, 알림 필터, 관리자 신규 유저 정책, 신고 흐름을 묶었다.
  - `browser-smoke` workflow는 `main` push path gate와 수동 실행에서 smoke + hotpath를 함께 실행한다.
  - hotpath가 댓글 cross-tab auth sync 회귀를 잡아, 댓글 섹션이 missed storage event도 localStorage timestamp polling으로 서버 렌더 reload에 수렴하도록 수정했다.
  - CI hotpath 차이를 줄이기 위해 댓글 spec fixture community를 자급자족하게 만들고, 알림 보관 UI는 낙관적 제거 후 실패 시 rollback하도록 바꿨다.
  - 검증: targeted unit/e2e, `PLAYWRIGHT_REUSE_EXISTING_SERVER=0 SEED_DEFAULT_PASSWORD=dev-password-1234 corepack pnpm@9.12.3 -C app test:e2e:hotpath` PASS, `corepack pnpm@9.12.3 -C app quality:check` PASS.
- Release Confidence Hardening P1-3:
  - `createPublicPageMetadata`, `createNoIndexPageMetadata` helper를 추가했다.
  - auth/admin/private/작성/수정/legacy redirect 페이지에 noindex metadata를 추가했다.
  - 모든 `app/src/app/**/page.tsx`가 `metadata` 또는 `generateMetadata`를 갖는지 scan test로 고정했다.
  - 검증: metadata/sitemap/robots targeted test PASS, `corepack pnpm@9.12.3 -C app quality:check` PASS.
- Release Confidence Hardening P1-4:
  - 검색어 통계 저장 전 이메일/전화번호/연락 링크/상세주소/토큰 패턴을 redaction 또는 skip 처리했다.
  - recent search localStorage는 7일 TTL payload로 저장하고 민감 검색어는 저장하지 않는다.
  - 글쓰기 draft localStorage는 24시간 만료 payload로 저장하고, 만료/invalid draft를 자동 삭제한다.
  - guest step-up identity mismatch를 abuse signal로 기록하되 원문 fingerprint는 저장하지 않는다.
  - 검증: targeted privacy/storage/guest-step-up test PASS, `corepack pnpm@9.12.3 -C app quality:check` PASS.
- Release Confidence Hardening P1-5:
  - `saveUploadedImage`가 signature 통과 후 polyglot/script payload, corrupt image, HEIC/HEIF/AVIF transcode metadata failure, GIF 용량/프레임/픽셀 budget을 검증한다.
  - `/media` route가 stored source pathname mismatch와 upstream non-image content-type을 거부하고 `X-Content-Type-Options: nosniff`를 보낸다.
  - 게시글 상세 media gallery에 image fallback wrapper를 추가했고, 글쓰기 제목 입력은 editor rerender와 분리해 upload e2e를 안정화했다.
  - 검증: targeted upload/media Vitest 34개 PASS, `test:e2e:upload` PASS, `quality:check` PASS.
- Release Confidence Hardening P1-6:
  - 1차 inventory: `post-create-form` 2204줄, `post-detail-client` 1727줄, `post-comment-thread` 1135줄, `feed-infinite-list` 821줄, `feed/page` 1102줄, `post.queries` 4850줄, `post.service` 3210줄.
  - 첫 slice로 `post-create-form` 상태 타입/초기값/draft guard를 `post-create-form-state`로 분리했다.
  - 두 번째 slice로 `post-create-form` option constants와 scope resolver를 `post-create-form-options`로 분리했다.
  - 세 번째 slice로 draft hydration/autosave/clear/submit-clear 로직을 `use-post-create-draft` hook으로 분리했다.
  - 네 번째 slice로 마켓/돌봄 structured fields와 공용 section wrapper를 `post-create-structured-fields`로 분리했다.
  - 다섯 번째 slice로 병원/장소/산책/입양/봉사 structured fields와 datalist를 `post-create-structured-fields`로 분리했고, `post-create-form`을 912줄까지 줄였다.
  - 여섯 번째 slice로 submit payload assembly/validation/reset helper를 `post-create-submit`으로 분리했고, `post-create-form`을 692줄까지 줄였다.
  - 일곱 번째 slice로 상단 글 정보/비회원 인증 입력 블록을 `post-create-basic-fields` presentational component로 분리했고, `post-create-form`을 532줄까지 줄였다.
  - 여덟 번째 slice로 작성 기준 aside/editor footer/submit footer를 `post-create-form-shell`로 분리했고, `post-create-form`을 485줄까지 줄였다.
  - 아홉 번째 slice로 type/scope/legacy/default community 자동 보정 effect를 `use-post-create-guards`로 분리했고, `post-create-form`을 380줄까지 줄였다.
  - 열 번째 slice로 submit orchestration/auth-guest transport/redirect-reset 흐름을 `use-post-create-submit`으로 분리했고, `post-create-form`을 298줄까지 줄였다.
  - 열한 번째 slice로 `post.queries`의 상세 structured relation select/type을 `post-detail-read-model`로 분리했고, public query export와 결과 shape는 유지했다.
  - 열두 번째 slice로 care application/feedback 상세 helper를 `post-detail-care.queries`로 분리했고, 기존 `post.queries` public export는 re-export로 유지했다.
  - 열세 번째 slice로 `getPostById`가 쓰는 상세 include builder와 structured extra attach 로직을 `post-detail-extras`로 분리했고, `post.queries`를 4444줄까지 줄였다.
  - 열네 번째 slice로 legacy list/detail select builder를 `post-legacy-selects`로 분리했고, `post.queries`를 4330줄까지 줄였다.
  - 열다섯 번째 slice로 reaction/bookmark support fallback, empty reaction shaping, bookmark attach helper를 `post-engagement-support`로 분리했고, `post.queries`를 4187줄까지 줄였다.
  - 열여섯 번째 slice로 guest meta column fallback mapper를 `post-guest-meta-fallback`으로 분리했고, `post.queries`를 4155줄까지 줄였다.
  - 열일곱 번째 slice로 search where builder, `PostSearchIn`, structured suggestion candidate helper를 `post-search-support`로 분리했고, `post.queries`를 4062줄까지 줄였다.
  - 열여덟 번째 slice로 내 글/북마크 목록 조회를 `post-user-posts.queries`로 분리했고, `post.queries`를 3805줄까지 줄였다.
  - 열아홉 번째 slice로 ranked search SQL/fallback helper를 `post-ranked-search-support`로 분리했고, `post.queries`를 3618줄까지 줄였다.
  - 스무 번째 slice로 검색 제안 public query를 `post-search-suggestions.queries`로 분리했고, `post.queries`를 3345줄까지 줄였다.
  - 스물한 번째 slice로 list/best/count 공용 where builder를 `post-list-where-support`로 분리했고, `post.queries`를 3182줄까지 줄였다.
  - 스물두 번째 slice로 post list include builder를 `post-list-includes`로 분리했고, `post.queries`를 3053줄까지 줄였다.
  - 스물세 번째 slice로 reviewCategory legacy fallback where helper를 `post-list-where-support`에 추가했고, 반복 fallback where 조립을 제거했다.
  - 스물네 번째 slice로 feed/best list fallback args 계산을 `buildPostFindManyFallbackArgs`로 통합했고, `post.queries`를 3043줄까지 줄였다.
  - 스물다섯 번째 slice로 feed/best list fetch fallback error 판정과 side-effect 처리를 helper로 통합했고, `post.queries`를 3011줄까지 줄였다.
  - 스물여섯 번째 slice로 feed/best list fetch와 schema compatibility fallback 절차를 helper로 통합했고, `post.queries`를 2883줄까지 줄였다.
  - 스물일곱 번째 slice로 검색 document fallback ranking 절차를 `post-ranked-search-support`로 분리했고, `post.queries`를 2855줄까지 줄였다.
  - 스물여덟 번째 slice로 ranked search candidate limit 계산과 candidate SQL 조립을 `post-ranked-search-support`로 분리했고, `post.queries`를 2816줄까지 줄였다.
  - 다음 작업: ranked search hydrate 함수 또는 count fallback 절차 분리를 추가로 시도한다.
  - 검증: `post.queries.test.ts` PASS, structured fields/options/state targeted test PASS, `typecheck` PASS, `lint` PASS.
- Vercel preview 배포 차단:
  - 원인: `build:vercel`이 `VERCEL_ENV=preview`도 strict security env preflight 대상으로 취급해 preview secret 구성이 production급이 아니면 빌드 전에 실패했다.
  - 수정: `VERCEL_ENV=preview/development`를 `VERCEL_TARGET_ENV`보다 우선해 skip하고, production/명시적 staging 또는 `DEPLOY_SECURITY_PREFLIGHT_STRICT=1`에서만 strict preflight를 실행한다.
  - 검증: `corepack pnpm@9.12.3 -C app exec vitest run scripts/vercel-build.test.ts` PASS.
## 다음 액션
1. 다음 slice는 `post.queries`의 ranked search hydrate 함수 또는 count fallback 절차를 별도 module/helper로 분리한다.
2. public API/result shape는 유지하고, 기존 `post.queries.test.ts`를 우선 회귀 테스트로 사용한다.
3. 각 slice마다 targeted test, `typecheck`, `lint`를 실행하고 작은 커밋으로 끊는다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
