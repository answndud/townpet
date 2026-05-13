# PROGRESS.md

## 현재 상태

- 작업: `Release Confidence Hardening P1-6`
- 상태: `in_progress`
- 현재 초점: `post-detail-client.tsx`의 type/presenter 경계 분리를 완료했고, 다음 작업은 primary card/media/actions 경계 분리다.

## 변경/탐색한 파일

- 이번 세션 변경:
  - `app/src/components/posts/post-detail-client.tsx`
  - `app/src/components/posts/post-detail-presenter.tsx`
  - `app/src/components/posts/post-detail-types.ts`
  - `docs/PLAN.md`
  - `docs/PROGRESS.md`
- 직전 세션 변경:
  - `app/src/server/services/posts/post-create.service.ts`
  - `app/src/server/services/posts/post.service.ts`
  - `docs/PLAN.md`
  - `docs/PROGRESS.md`
- 이전 세션 변경:
  - `app/src/server/services/posts/post-update.service.ts`
  - `app/src/server/services/posts/post-write-support.ts`
  - `app/src/server/services/posts/post.service.ts`
  - `docs/PLAN.md`
  - `docs/PROGRESS.md`
- 이전 세션 변경:
  - `app/src/server/services/posts/post-care-workflow.service.ts`
  - `app/src/server/services/posts/post.service.ts`
  - `docs/PLAN.md`
  - `docs/PROGRESS.md`
- 이전 세션 변경:
  - `app/src/server/services/posts/post-market-workflow.service.ts`
  - `app/src/server/services/posts/post-guest-management.service.ts`
  - `app/src/server/services/posts/post-delete.service.ts`
  - `app/src/server/services/posts/post-write-support.ts`
  - `app/vitest.config.mts`
  - `app/vitest.config.ts`
  - `app/package.json`
  - `app/pnpm-lock.yaml`
  - `app/src/server/services/posts/post-engagement.service.ts`
  - `app/src/server/queries/posts/post-detail-fetch-fallback.ts`
  - `app/src/server/queries/posts/post.queries.ts`
  - `app/package.json`
  - `app/scripts/check-security-env.ts`
  - `app/scripts/check-security-env.test.ts`
  - `app/scripts/vercel-build.ts`
  - `app/scripts/vercel-build.test.ts`
  - `app/README.md`
  - `business/operations/Vercel_OAuth_초기설정_가이드.md`
  - `business/operations/Resend_Vercel_이메일_설정_가이드.md`
  - `business/operations/manual-checks/배포_보안_체크리스트.md`
  - `business/archive/operations/문서 동기화 리포트.md`
  - `business/security/보안_계획.md`
  - `business/security/보안_진행상황.md`
  - `business/security/보안_위험_등록부.md`
  - `docs/errors/2026-05-12_vercel-security-env-build-preflight.md`
  - `docs/COMPLETED.md`
- 이번 세션 결과:
  - 게시글 상세 클라이언트의 response/item 타입을 `post-detail-types.ts`로 분리했다.
  - 게시글 상세 라벨, 포맷, render helper, care/market 상태 option 계산을 `post-detail-presenter.tsx`로 분리했다.
  - `post-detail-client.tsx`를 1727줄에서 1376줄까지 축소했다.
- 직전 세션 결과:
  - 회원/비회원 게시글 생성 흐름(`createPost`)과 create 전용 structured write helper를 `post-create.service.ts`로 분리했다.
  - 기존 `@/server/services/post.service` export 경로는 re-export로 유지했다.
  - `post.service.ts`를 3210줄에서 156줄까지 축소해 service facade/view-count 책임만 남겼다.
- 이전 세션 결과:
  - 회원 게시글 수정 흐름(`updatePost`)을 `post-update.service.ts`로 분리했다.
  - create/update에서 공유하는 이미지 URL 정규화와 image create input 생성을 `post-write-support.ts`로 이동했다.
  - 기존 `@/server/services/post.service` export 경로는 re-export로 유지했다.
  - `post.service.ts`를 3210줄에서 1296줄까지 축소했다.
- 이전 세션 결과:
  - care request status, care application, care decision, completion feedback, feedback review workflow를 `post-care-workflow.service.ts`로 분리했다.
  - 기존 `@/server/services/post.service` export 경로는 re-export로 유지했다.
  - `post.service.ts`를 3210줄에서 1503줄까지 축소했다.
- 이전 세션 결과:
  - `updateMarketListingStatus`, 마켓 상태 전환 정책, 마켓 moderation action 기록을 `post-market-workflow.service.ts`로 분리했다.
  - 기존 `@/server/services/post.service` export 경로는 re-export로 유지했다.
  - `post.service.ts`를 3210줄에서 2272줄까지 축소했다.
  - `updateGuestPost`, `deleteGuestPost`, 비회원 비밀번호 검증, 비회원 identity 매칭, 비회원 수정 정책 검사를 `post-guest-management.service.ts`로 분리했다.
  - 기존 `@/server/services/post.service` export 경로는 re-export로 유지했다.
  - `post.service.ts`를 3210줄에서 2406줄까지 축소했다.
  - 회원 게시글 삭제 흐름을 `post-delete.service.ts`로 분리하고 기존 `@/server/services/post.service` export 경로는 유지했다.
  - cache invalidation, notification cache invalidation, upload attach/release, soft delete dependent cleanup을 `post-write-support.ts`로 분리했다.
  - `post.service.ts`를 3210줄에서 2761줄까지 축소했다.
  - 로컬 잠금파일 기준 재설치 후 Vitest가 Vite 7 ESM을 CJS로 로드하며 실패하는 문제를 확인해 `vitest.config.mts`로 전환하고 `vite-tsconfig-paths`를 제거했다.
  - `togglePostReaction`, `togglePostBookmark`, raw SQL reaction fallback, notification/cache invalidation을 `post-engagement.service.ts`로 분리했다.
  - 기존 `@/server/services/post.service` export 경로는 re-export로 유지했다.
  - `post.service.ts`를 3210줄에서 2904줄까지 축소했다.
  - `getPostById`의 reactions/guestAuthor/legacy guest column fallback orchestration을 `post-detail-fetch-fallback.ts`로 분리했다.
  - 상세 조회의 public cache/result shape는 유지하고 `post.queries.ts`를 2299줄까지 축소했다.
  - `ops:check:security-env`를 `build`/`full(strict)` profile로 분리해 Vercel build가 원격 `/api/health` control-plane drift 때문에 다시 실패하지 않도록 수정했다.
  - `build:vercel`는 production/staging target에서 `ops:check:security-env:build`만 실행하고, 실제 실패 key를 에러 메시지에 포함하게 보강했다.
  - 운영 문서와 보안 문서를 현재 동작 기준으로 동기화해 build gate와 수동 strict 진단을 혼동하지 않도록 정리했다.
- 직전 P1-6 맥락:
  - `listRankedSearchPosts`의 cache/run fallback orchestration을 `post-ranked-search-cache`로 분리했다.
  - `post.queries.ts`를 4850줄에서 2299줄까지 축소했다.
  - `post-create-form`은 298줄 수준까지 축소해 현재 P1-6의 첫 큰 경계를 완료했다.

## 직전 검증

- `corepack pnpm@9.12.3 -C app typecheck` PASS
- `corepack pnpm@9.12.3 -C app lint` PASS
- `corepack pnpm@9.12.3 -C app exec vitest run src/server/services/post-create-policy.test.ts src/server/services/post.service.test.ts src/server/actions/post.test.ts` PASS
- `corepack pnpm@9.12.3 -C app typecheck` PASS
- `corepack pnpm@9.12.3 -C app lint` PASS
- `corepack pnpm@9.12.3 -C app exec vitest run src/server/services/post.service.test.ts src/server/actions/post.test.ts` PASS
- `corepack pnpm@9.12.3 -C app typecheck` PASS
- `corepack pnpm@9.12.3 -C app lint` PASS
- `corepack pnpm@9.12.3 -C app exec vitest run src/server/queries/post.queries.test.ts` PASS
- `corepack pnpm@9.12.3 -C app exec vitest run src/server/services/post.service.test.ts src/server/queries/care-feedback.queries.test.ts` PASS
- `corepack pnpm@9.12.3 -C app exec vitest run src/server/services/post.service.test.ts` PASS
- `corepack pnpm@9.12.3 -C app exec vitest run src/server/services/guest-post-management.service.test.ts src/server/services/post.service.test.ts` PASS
- `corepack pnpm@9.12.3 -C app exec vitest run src/server/services/post.service.test.ts` PASS
- `corepack pnpm@9.12.3 -C app typecheck` PASS
- `corepack pnpm@9.12.3 -C app lint` PASS
- `corepack pnpm@9.12.3 -C app quality:check` PASS
- `corepack pnpm@9.12.3 -C app exec vitest run scripts/vercel-build.test.ts scripts/check-security-env.test.ts src/lib/env.test.ts` PASS
- `corepack pnpm@9.12.3 -C app typecheck` PASS
- `corepack pnpm@9.12.3 -C app lint scripts/vercel-build.ts scripts/vercel-build.test.ts scripts/check-security-env.ts scripts/check-security-env.test.ts src/lib/env.ts src/lib/env.test.ts` PASS
- `placeholder production env + OPS_BASE_URL=https://127.0.0.1.invalid corepack pnpm@9.12.3 -C app ops:check:security-env:build` PASS
- `placeholder production env + OPS_BASE_URL=https://127.0.0.1.invalid corepack pnpm@9.12.3 -C app ops:check:security-env:strict` -> `MODERATION_CONTROL_PLANE_HEALTH` FAIL 확인
- `corepack pnpm@9.12.3 -C app docs:refresh` PASS
- `corepack pnpm@9.12.3 -C app docs:refresh:check` PASS

## Blocker

- 현재 known blocker 없음. deploy recurrence issue closed.

## 다음 액션

1. `post-detail-client.tsx`의 primary card/media/actions 경계를 분리한다.
2. 이어서 `post-comment-thread.tsx`, `app/feed/page.tsx` 중 더 큰 결합을 먼저 분리한다.
3. public API/result shape를 유지하고 targeted test, `typecheck`, `lint`를 실행한다.
