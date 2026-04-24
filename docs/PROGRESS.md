# PROGRESS.md

기준일: 2026-04-24
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서를 `docs/` 아래 slim active + archive 구조로 재편했다
- Impeccable 디자인 개선 workflow Phase 0-5를 완료했다
- 최근 완료 작업 상세와 과거 검증 로그는 [COMPLETED.md](./COMPLETED.md)로 이동했다
- 현재 작업: 다음 품질 안정화 사이클 대기

## 열린 blocker
- 없음. 기존 `db:restore:local` local test account count mismatch는 managed account count 검증으로 수정했고 restore 통과를 확인했다.

## 직전 검증
- Impeccable `/admin/reports` 화면군:
  - 변경: hero 통계 compact summary, 필터와 queue를 상단으로 이동, 통계/분포는 후순위 운영 summary로 정리, mobile queue card와 bulk/action touch target 개선.
  - 유지: report query, moderation priority, bulk/single action API, sanction policy 로직은 변경 없음.
  - screenshot evidence: `/tmp/townpet-admin-reports-baseline/{desktop,mobile}.png`, `/tmp/townpet-admin-reports-phase/{desktop-after,mobile-after}.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, local inline env `corepack pnpm -C app build`.
- Impeccable `/admin/reports/[id]` 상세 흐름:
  - 변경: Next dynamic params Promise runtime 오류 수정, 상세 hero/status summary, 신고 개요/대상 정보/처리 작업 2-column 구조, mobile stacked action flow, audit card list 정리.
  - 유지: report/moderation/sanction API와 정책 로직은 변경 없음.
  - screenshot evidence: `/tmp/townpet-admin-report-detail-baseline/{desktop,mobile}.png`, `/tmp/townpet-admin-report-detail-phase/{desktop-after,mobile-after,desktop-pending-after,mobile-pending-after}.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, local inline env `corepack pnpm -C app build`.
- Impeccable `/posts/new` 작성 form 흐름:
  - 변경: outer card 중첩 제거, page hero와 form 분리, 작성 기준/policy guidance를 첫 viewport에 배치, 주요 form controls 44px 계열 touch target으로 정리.
  - 유지: post validation/action/service 정책 로직은 변경 없음.
  - screenshot evidence: `/tmp/townpet-post-new-baseline/{desktop,mobile}.png`, `/tmp/townpet-post-new-phase/{desktop-after,desktop-after-2,mobile-after,mobile-after-2}.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, local inline env `corepack pnpm -C app build`.
- Impeccable `/posts/[id]/guest` comment/detail 흐름:
  - 변경: comment thread 내부 중첩 surface를 줄이고, best/latest 댓글 hierarchy, reply guide spacing, 모바일 reaction/pagination/form touch target을 정리했다.
  - 유지: post/comment reaction, create/update/delete/report, read access 정책 로직은 변경 없음.
  - screenshot evidence: `/tmp/townpet-post-detail-baseline/{guest-desktop,guest-mobile}.png`, `/tmp/townpet-post-detail-phase/{guest-desktop-after,guest-mobile-after}.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app exec vitest run src/components/posts/post-comment-layout-class.test.ts src/components/posts/post-comment-thread.test.tsx src/components/posts/post-reaction-controls.test.tsx`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, local inline env `corepack pnpm -C app build`.
- Impeccable `/search/guest` result 흐름:
  - 변경: search form에 명시적 submit button과 모바일 44px 계열 controls를 추가하고, guest result row에 category/scope/comment/author/date scan 정보를 보강했다.
  - 유지: search query/ranking/logging, guest scope/type block, API 정책 로직은 변경 없음.
  - screenshot evidence: `/tmp/townpet-search-baseline/{guest-results,guest-empty}-{desktop,mobile}.png`, `/tmp/townpet-search-phase/{guest-results,guest-empty}-{desktop-after,mobile-after}.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, `corepack pnpm -C app exec vitest run src/app/api/search/guest/route.test.ts src/app/api/search/log/route.test.ts src/server/queries/search.queries.test.ts`, local inline env `corepack pnpm -C app build`.
- Impeccable `/feed/guest` 흐름:
  - 변경: mobile에도 공개 피드 목적/현재 feed title을 보이게 하고, 상단에 `게시글 검색`/`글쓰기` affordance를 배치했다.
  - 유지: feed ranking, pagination, personalization, guest API 정책 로직은 변경 없음.
  - screenshot evidence: `/tmp/townpet-feed-guest-baseline/{default,best,search}-{desktop,mobile}.png`, `/tmp/townpet-feed-guest-phase/{default,best,search}-{desktop-after,mobile-after}.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, `corepack pnpm -C app exec vitest run src/app/feed/guest/page.test.tsx src/app/api/feed/guest/route.test.ts src/components/posts/feed-control-panel.test.tsx src/components/posts/feed-post-meta-badges.test.tsx`, local inline env `corepack pnpm -C app build`.
- Impeccable auth/login/register/recovery 흐름:
  - 변경: `/password/reset`, `/verify-email`, `/password/setup`을 shared auth shell로 통일하고, reset/verify/setup/register form의 mobile touch target, focus, aria-live/error 상태, recovery copy를 정리했다.
  - 유지: credential/social auth, password reset/setup, email verify API와 정책 로직은 변경 없음.
  - 발견/수정: Next 16 page props 계약에 맞게 `/password/reset`, `/verify-email` `searchParams`를 Promise로 unwrap했다.
  - screenshot evidence: `/tmp/townpet-auth-baseline/{login,register,password-reset,verify-email}-{desktop,mobile}.png`, `/tmp/townpet-auth-phase/{login,register,password-reset,verify-email}-{desktop-after,mobile-after}.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app exec vitest run src/components/auth/auth-page-layout.test.tsx src/lib/password-setup.test.ts src/app/api/auth/register/route.test.ts src/app/api/auth/password/reset/request/route.test.ts src/app/api/auth/verify/request/route.test.ts`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, local inline env `corepack pnpm -C app build`.
- Impeccable `/profile`, `/notifications` utility 흐름:
  - 변경: notification empty state/filters/action targets, unauthenticated notification shell, profile hero image fallback, mute management nested surface, loading shell background을 정리했다.
  - 유지: profile/auth/session/notification query/action/service 정책 로직은 변경 없음.
  - screenshot evidence: `/tmp/townpet-utility-baseline/{profile,notifications,notifications-unread}-{desktop,mobile}.png`, `/tmp/townpet-utility-phase/{profile,notifications,notifications-unread}-{desktop-after,mobile-after}.png`, `/tmp/townpet-utility-phase/profile-mobile-after-2.png`.
  - 통과: `corepack pnpm -C app design:detect`, 관련 Vitest 30개, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, local inline env `corepack pnpm -C app build`.
- Impeccable final audit / verification:
  - 확인: public/auth/write/admin/utility 대표 화면 spot-check screenshot을 새로 남기고 console error를 점검했다.
  - 수정: `/search/guest` result telemetry가 `type: null`을 보내 `/api/search/log` 400을 내던 문제를 고치고 회귀 테스트를 추가했다.
  - evidence: `/tmp/townpet-final-audit/{feed-guest,search-guest,login,password-reset,post-new,profile,notifications,admin-reports}-{desktop,mobile}.png`, `/tmp/townpet-final-audit/search-guest-{desktop,mobile}-after-fix.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app quality:check` 193 files / 926 tests, local inline env `corepack pnpm -C app build`.
  - error note: [docs/errors/2026-04-24_search-result-telemetry-null-type.md](./errors/2026-04-24_search-result-telemetry-null-type.md).
- 과거 Phase 0-5와 checkpoint/push 상세는 [COMPLETED.md](./COMPLETED.md)에 보관했다.

## 다음 액션
1. 다음 launch gap 중 하나를 선택해 active scope를 확정한다.
2. 구현 전 `docs/PLAN.md`에 해당 사이클의 목표/범위/검증 명령을 먼저 구체화한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
