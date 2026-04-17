# COMPLETED.md

이 문서는 `docs/PROGRESS.md`에서 옮긴 완료 이력 archive입니다.

- 세션 시작 필수 문서 아님
- 현재 active SSOT: [PLAN.md](./PLAN.md), [PROGRESS.md](./PROGRESS.md)
- 완료 상세와 긴 검증 기록만 시간 오름차순으로 기록하고, 새 완료 항목은 파일 맨 아래에 append합니다
- 각 항목 형식: `완료일 -> 배경 -> 변경내용 -> 코드문서 -> 검증 -> 결과`

## Archived from PROGRESS.md

### Migrated on 2026-04-17

## 상세 완료 항목

### 2026-04-16 | 게시글 에디터 SunEditor 전환 및 styled typing boundary 안정화
- 완료일: `2026-04-16`
- 배경:
  - 기존 `contentEditable + execCommand` 경로와 Tiptap 보수 경로가 반복 회귀를 만들고 있었다.
  - styled typing boundary, selection attach timing, 이미지 직렬화 안정성이 완료 기준을 계속 막고 있었다.
- 변경내용:
  - `@tiptap/*` 의존성을 제거하고 `suneditor-react` 기반 공용 `PostBodyRichEditor`로 전환했다.
  - 작성/수정 폼을 같은 에디터 컴포넌트로 통일하고, 숫자 폰트 크기/이미지/링크/인용/목록을 SunEditor 내장 툴바 기준으로 재구성했다.
  - 불안정한 글자색 커스텀 UI는 제거하고, 기존 `[color=#...]` markup 렌더링은 과거 글 호환성을 위해 유지했다.
  - submit 시 React state 지연 대신 에디터 인스턴스에서 직렬화된 본문/이미지 목록을 직접 읽게 바꿨다.
  - 이미지 width token 정규식을 `1~4`자리로 넓혀 `{width=1}` 문자열이 본문에 남는 문제를 막았다.
  - `editorInstanceVersion` state로 listener attach 타이밍을 고정하고, styled span 뒤에 sentinel text node를 주입해 다음 입력이 기본 스타일로 분리되게 수정했다.
  - `post-editor-toolbar.spec.ts`의 segment reader가 `&nbsp;`를 일반 공백으로 정규화하도록 보강했다.
- 코드문서:
  - [app/src/components/posts/post-body-rich-editor.tsx](../app/src/components/posts/post-body-rich-editor.tsx)
  - [app/src/components/posts/post-create-form.tsx](../app/src/components/posts/post-create-form.tsx)
  - [app/src/components/posts/post-detail-edit-form.tsx](../app/src/components/posts/post-detail-edit-form.tsx)
  - [app/e2e/post-editor-toolbar.spec.ts](../app/e2e/post-editor-toolbar.spec.ts)
  - [blog/26-suneditor-selection-and-typing-boundary.md](../blog/26-suneditor-selection-and-typing-boundary.md)
- 검증:
  - `corepack pnpm -C app typecheck`
  - `corepack pnpm -C app exec vitest run src/app/globals-css.test.ts`
  - `corepack pnpm -C app test:e2e -- e2e/image-upload-flow.spec.ts --project=chromium`
  - `corepack pnpm -C app test:e2e -- e2e/guest-post-management.spec.ts --project=chromium`
  - `PLAYWRIGHT_SKIP_WEBSERVER=1 ENABLE_SOCIAL_DEV_LOGIN=1 corepack pnpm -C app exec playwright test e2e/post-editor-toolbar.spec.ts --project=chromium`
  - `corepack pnpm -C app quality:check`
  - GitHub Actions `browser-smoke` workflow_dispatch `run 24509145867`
- 결과:
  - 게시글 에디터가 SunEditor 기준으로 안정화됐고, selection/typing boundary 회귀를 browser smoke까지 포함해 닫았다.

### 2026-04-16 | 배포 파이프라인 경량화와 workflow 분리
- 완료일: `2026-04-16`
- 배경:
  - `quality-gate`, browser smoke, maintenance rehearsal, deploy preflight가 한 hot path에 섞여 있어 피드백이 느리고 실패 원인도 뒤엉켜 있었다.
  - `build:vercel`도 배포 필수 작업과 운영성 점검이 한 스크립트에 섞여 있었다.
- 변경내용:
  - `quality-gate`를 fresh DB `prisma migrate deploy -> prisma generate -> pnpm quality:check`만 보는 small hot path로 줄였다.
  - docs freshness는 `docs-quality.yml`, browser smoke는 `browser-smoke.yml`, maintenance rehearsal은 `guest-legacy-maintenance.yml`로 분리했다.
  - `vercel-build.ts`를 `security env preflight -> prisma migrate deploy -> prisma generate -> next build`만 수행하도록 줄였다.
  - auth email readiness, neighborhood sync, repair SQL은 deploy hot path에서 제거했다.
  - workflow action 버전을 `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v5`로 올려 Node 20 JavaScript action deprecation 경고를 제거했다.
  - 운영 문서와 회고 블로그를 현재 구조 기준으로 다시 정리했다.
- 코드문서:
  - [.github/workflows/quality-gate.yml](../.github/workflows/quality-gate.yml)
  - [.github/workflows/docs-quality.yml](../.github/workflows/docs-quality.yml)
  - [.github/workflows/browser-smoke.yml](../.github/workflows/browser-smoke.yml)
  - [.github/workflows/guest-legacy-maintenance.yml](../.github/workflows/guest-legacy-maintenance.yml)
  - [app/scripts/vercel-build.ts](../app/scripts/vercel-build.ts)
  - [app/scripts/vercel-build.test.ts](../app/scripts/vercel-build.test.ts)
  - [blog/25-overengineering-ci-and-deploy-pipelines.md](../blog/25-overengineering-ci-and-deploy-pipelines.md)
- 검증:
  - `corepack pnpm -C app quality:check`
  - `corepack pnpm -C app exec vitest run scripts/vercel-build.test.ts`
  - `git diff --check`
  - GitHub Actions `quality-gate` 초기 실패 원인 확인 후 `prisma generate` 단계를 추가해 rerun green 확인
- 결과:
  - PR hot path와 deploy hot path가 분리됐고, 무거운 검증은 on-demand로 이동해 배포/CI 피드백 루프가 짧아졌다.

### 2026-04-16 | guest `/feed` 문서 응답 캐시 복원
- 완료일: `2026-04-16`
- 배경:
  - guest `/feed` 문서 응답이 server-first self-fetch 때문에 `private, no-store`가 되면서 캐시 이점을 잃고 있었다.
  - guest shell은 static인데 초기 데이터 fetch가 문서 응답 정책까지 같이 깨뜨리고 있었다.
- 변경내용:
  - `/feed/guest/page.tsx`에서 server self-fetch를 제거하고 `dynamic = "force-static"` guest shell만 렌더하도록 되돌렸다.
  - `guest-feed-page-fetch.service.ts`를 제거하고, guest 첫 진입 데이터는 다시 cacheable `/api/feed/guest`가 담당하도록 경계를 정리했다.
  - `GuestFeedPage` 회귀 테스트와 관련 블로그를 현재 구조에 맞춰 갱신했다.
- 코드문서:
  - [app/src/app/feed/guest/page.tsx](../app/src/app/feed/guest/page.tsx)
  - [app/src/app/feed/guest/page.test.tsx](../app/src/app/feed/guest/page.test.tsx)
  - [app/src/app/api/feed/guest/route.test.ts](../app/src/app/api/feed/guest/route.test.ts)
  - [blog/20-performance-story-search-cache-pagination.md](../blog/20-performance-story-search-cache-pagination.md)
- 검증:
  - `corepack pnpm -C app exec vitest run src/app/feed/guest/page.test.tsx src/app/api/feed/guest/route.test.ts`
  - `corepack pnpm -C app typecheck`
  - `git diff --check`
- 결과:
  - guest `/feed`는 다시 static shell + cacheable guest API 구조로 돌아왔고, 문서 응답 캐시 복원 기반이 마련됐다.

### 2026-04-16 | public `/feed` strict nonce 범위 축소
- 완료일: `2026-04-16`
- 배경:
  - 루트 레이아웃의 전역 `connection()`과 strict nonce CSP가 public `/feed`까지 dynamic/no-store 경로로 밀어 넣고 있었다.
  - nonce가 실제로 필요한 상세/프로필 경로와 public guest shell 경로가 분리되지 않았다.
- 변경내용:
  - `RootLayout`의 전역 `connection()`을 제거하고, nonce가 필요한 `posts/[id]`, `posts/[id]/guest`, `users/[id]`만 각각 `connection()`을 호출하도록 분리했다.
  - `middleware.ts`에서 guest `/feed` rewrite는 static CSP를 적용하고 nonce 헤더를 주입하지 않도록 바꿨다.
  - 배포 후에도 `/feed` 응답에 nonce가 남는 follow-up을 잡아, rewritten `/feed/guest` 내부 경로도 static guest shell 경로로 묶도록 middleware 분기를 한 번 더 좁혔다.
  - middleware 회귀 테스트와 관련 블로그를 갱신했다.
- 코드문서:
  - [app/src/app/layout.tsx](../app/src/app/layout.tsx)
  - [app/middleware.ts](../app/middleware.ts)
  - [app/src/middleware.test.ts](../app/src/middleware.test.ts)
  - [app/src/app/posts/[id]/page.tsx](../app/src/app/posts/[id]/page.tsx)
  - [app/src/app/users/[id]/page.tsx](../app/src/app/users/[id]/page.tsx)
- 검증:
  - `corepack pnpm -C app exec vitest run src/middleware.test.ts src/app/feed/guest/page.test.tsx src/app/api/feed/guest/route.test.ts`
  - `corepack pnpm -C app exec vitest run src/middleware.test.ts`
  - `corepack pnpm -C app typecheck`
  - `git diff --check`
- 결과:
  - public `/feed`는 strict nonce 전역 적용에서 빠졌고, nonce는 실제로 필요한 상세 surface에만 남게 됐다.

### 2026-04-16 | guest `/feed` rewrite를 redirect로 전환
- 완료일: `2026-04-16`
- 배경:
  - 실측상 `/feed/guest`는 빠른데 guest `/feed` rewrite 경로만 상대적으로 느렸다.
  - guest client 내부 링크도 `/feed`를 기준으로 남아 있어 canonical/navigation 일관성이 약했다.
- 변경내용:
  - guest `/feed` middleware 동작을 rewrite에서 `/feed/guest` redirect로 바꿨다.
  - `GuestFeedPageClient`의 canonical/navigation base path를 `/feed/guest` 기준으로 바꿔 direct `/feed/guest` 진입 후 다시 `/feed`로 되돌아가는 루프를 막았다.
- 코드문서:
  - [app/middleware.ts](../app/middleware.ts)
  - [app/src/middleware.test.ts](../app/src/middleware.test.ts)
  - [app/src/components/posts/guest-feed-page-client.tsx](../app/src/components/posts/guest-feed-page-client.tsx)
  - [blog/20-performance-story-search-cache-pagination.md](../blog/20-performance-story-search-cache-pagination.md)
- 검증:
  - `corepack pnpm -C app exec vitest run src/middleware.test.ts`
  - `corepack pnpm -C app typecheck`
  - `git diff --check`
- 결과:
  - guest 사용자는 더 빠른 `/feed/guest` 경로를 직접 타게 됐고, guest navigation 기준점도 일관되게 맞춰졌다.

### 2026-04-16 | push 기반 workflow 트리거 복구
- 완료일: `2026-04-16`
- 배경:
  - `quality-gate.yml`과 `docs-quality.yml`이 `pull_request`/`workflow_dispatch`만 듣고 있어 `main` push 후 Actions가 비어 보였다.
  - merge 이후 실제 main 상태를 다시 검증하는 루프가 빠져 있었다.
- 변경내용:
  - 두 workflow에 `push` on `main` trigger를 다시 추가했다.
- 코드문서:
  - [.github/workflows/quality-gate.yml](../.github/workflows/quality-gate.yml)
  - [.github/workflows/docs-quality.yml](../.github/workflows/docs-quality.yml)
- 검증:
  - workflow diff 검토
  - merge 후 `main` 기준 workflow run 확인
- 결과:
  - `main` push 이후에도 품질 게이트와 docs 체크가 다시 실행되는 기본 CI 루프가 복구됐다.

### 2026-04-16 | `/feed` 성능 측정 근거와 stop line 문서화
- 완료일: `2026-04-16`
- 배경:
  - `/feed` 최적화를 반복하면서 무엇을 어떻게 측정했는지와, 언제 더 이상 손대지 않을지 기준이 문서로 남아 있지 않았다.
  - 다음 세션에서 같은 성능 실험을 중복 반복할 위험이 있었다.
- 변경내용:
  - `blog/20-performance-story-search-cache-pagination.md`에 헤더 확인, 5회 반복 실측, `curl -L` redirect chain 측정, `perf=1` API 타이밍 확인 순서와 실제 수치를 정리했다.
  - `/feed`, `/feed/guest`, guest API warmed 기준 실측 범위를 남기고, 현재 단계에서는 추가 최적화보다 회귀 방지가 우선이라는 stop line 판단을 문서화했다.
- 코드문서:
  - [blog/20-performance-story-search-cache-pagination.md](../blog/20-performance-story-search-cache-pagination.md)
  - [PLAN.md](./PLAN.md)
  - [PROGRESS.md](./PROGRESS.md)
- 검증:
  - `curl -L` redirect chain 실측
  - `/api/feed/guest?perf=1` 응답 타이밍 확인
  - 반복 측정 결과 문서 반영 확인
- 결과:
  - `/feed` 성능 판단 기준이 명문화됐고, 이후에는 수치 회귀가 생길 때만 다시 최적화를 여는 stop line이 생겼다.
