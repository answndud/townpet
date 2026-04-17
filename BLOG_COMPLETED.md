# BLOG_COMPLETED.md

이 문서는 `BLOG_PROGRESS.md`에서 옮긴 완료 이력 archive입니다.

- 세션 시작 필수 문서 아님
- 현재 active SSOT: [BLOG_PLAN.md](./BLOG_PLAN.md), [BLOG_PROGRESS.md](./BLOG_PROGRESS.md)
- 완료 로그와 과거 보강 기록만 시간 오름차순으로 기록하고, 새 완료 항목은 파일 맨 아래에 append합니다
- 각 항목 형식: `완료일 -> 배경 -> 변경내용 -> 코드문서 -> 검증 -> 결과`

## Archived from BLOG_PROGRESS.md

### Migrated on 2026-04-17

## 상세 완료 항목

### 2026-04-07 | TownPet blog 작업공간 초기화
- 완료일: `2026-04-07`
- 배경:
  - 블로그 전용 작업공간과 메타 문서가 아직 없어 시리즈를 일관된 규칙으로 시작할 기반이 없었다.
  - 독자 기준과 연재 구조를 먼저 고정해야 이후 본문이 흔들리지 않았다.
- 변경내용:
  - 루트에 `BLOG_PLAN.md`, `BLOG_PROGRESS.md`를 추가했다.
  - `blog/` 디렉터리를 만들고 아래 메타 문서를 추가했다.
  - Kindergarten ERP의 `blog/` 구조를 참고하되, TownPet는 `Python/Java 개발자가 JS 기반 프로젝트를 해석하는 것`에 더 초점을 맞추도록 재설계했다.
- 코드문서:
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
  - [BLOG_PROGRESS.md](./BLOG_PROGRESS.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [00_rebuild_guide.md](./blog/00_rebuild_guide.md)
  - [00_quality_checklist.md](./blog/00_quality_checklist.md)
  - [00_js_for_backend_engineers.md](./blog/00_js_for_backend_engineers.md)
- 검증:
  - 메타 문서 간 링크를 모두 repo-relative 경로로 작성했다.
  - `git diff --check` 통과
- 결과:
  - 블로그 작업공간과 메타 문서 기준이 생겨 이후 본문을 같은 규칙으로 확장할 수 있게 됐다.

### 2026-04-07 | 구조/라우팅/계층 분리 본문 3개 추가
- 완료일: `2026-04-07`
- 배경:
  - 처음 읽는 사람이 저장소 구조와 App Router, 계층 분리를 어디서부터 봐야 하는지 알기 어려웠다.
- 변경내용:
  - [02-how-townpet-is-structured.md](./blog/02-how-townpet-is-structured.md)를 작성해 저장소 전체 지도, 폴더 역할, 추천 읽기 순서를 정리했다.
  - [03-nextjs-app-router-for-backend-engineers.md](./blog/03-nextjs-app-router-for-backend-engineers.md)를 작성해 `page.tsx`, `route.ts`, `layout.tsx`, `Server Action`을 Python/Java 개발자 기준으로 번역했다.
  - [05-prisma-zod-service-route-order.md](./blog/05-prisma-zod-service-route-order.md)를 작성해 TownPet의 대표 구현 순서인 `Prisma -> Zod -> Service -> Route/UI`를 게시글 생성 흐름으로 설명했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 집필 우선순위에 맞게 갱신했다.
- 코드문서:
  - [02-how-townpet-is-structured.md](./blog/02-how-townpet-is-structured.md)
  - [03-nextjs-app-router-for-backend-engineers.md](./blog/03-nextjs-app-router-for-backend-engineers.md)
  - [05-prisma-zod-service-route-order.md](./blog/05-prisma-zod-service-route-order.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 본문에서 참조한 핵심 코드 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 결과:
  - 시리즈 초반부에 저장소 지도와 App Router, 계층 읽기 순서가 자리 잡았다.

### 2026-04-07 | 인증/검색/모더레이션 본문 3개 추가
- 완료일: `2026-04-07`
- 배경:
  - 인증, 검색, 모더레이션은 TownPet의 핵심 정책 surface인데 이를 설명하는 본문이 비어 있었다.
- 변경내용:
  - [11-credentials-kakao-naver-auth.md](./blog/11-credentials-kakao-naver-auth.md)를 추가해 NextAuth 설정, credentials 로그인, 카카오/네이버 로그인, sessionVersion, 이메일 인증/비밀번호 재설정, 소셜 계정 연결/해제 흐름을 정리했다.
  - [09-search-structured-search-and-suggestions.md](./blog/09-search-structured-search-and-suggestions.md)를 추가해 본검색, 구조화 검색, suggestion, compact/초성 fallback, `SearchTermStat`/`SearchTermDailyMetric` 운영 루프를 설명했다.
  - [14-report-block-sanction-direct-moderation.md](./blog/14-report-block-sanction-direct-moderation.md)를 추가해 신고, block/mute, 제재, 직접 모더레이션, 운영자 action log의 관계를 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 집필 우선순위에 맞게 갱신했다.
- 코드문서:
  - [11-credentials-kakao-naver-auth.md](./blog/11-credentials-kakao-naver-auth.md)
  - [09-search-structured-search-and-suggestions.md](./blog/09-search-structured-search-and-suggestions.md)
  - [14-report-block-sanction-direct-moderation.md](./blog/14-report-block-sanction-direct-moderation.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 본문에서 참조한 핵심 코드 파일과 함수 위치를 직접 확인했다.
  - `git diff --check` 통과
- 결과:
  - 인증, 검색, 모더레이션을 중심으로 TownPet의 고위험 surface 설명이 채워졌다.

### 2026-04-07 | 소셜 연동/운영 대시보드/테스트 전략 본문 3개 추가
- 완료일: `2026-04-07`
- 배경:
  - 소셜 계정 lifecycle, 관리자 surface, 테스트 전략은 운영 관점에서 같이 읽혀야 하는데 연결된 설명이 부족했다.
- 변경내용:
  - [13-social-account-link-unlink-lifecycle.md](./blog/13-social-account-link-unlink-lifecycle.md)를 추가해 `Account` 모델, `auth.ts` callback, `linkSocialAccountForUser`, `unlinkSocialAccountForUser`, `sessionVersion`, `OAuthAccountNotLinked` 복구 흐름을 정리했다.
  - [15-admin-hub-and-ops-dashboard.md](./blog/15-admin-hub-and-ops-dashboard.md)를 추가해 `/admin` 허브, `AdminSectionNav`, 역할별 접근 제어, `/admin/ops`, `getHealthSnapshot`, `getAdminOpsOverview`의 관계를 정리했다.
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)를 추가해 Vitest, Playwright, `quality-gate.yml`, `ops-smoke-checks.yml`, migration/ops rehearsal의 의미를 설명했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 집필 우선순위에 맞게 갱신했다.
- 코드문서:
  - [13-social-account-link-unlink-lifecycle.md](./blog/13-social-account-link-unlink-lifecycle.md)
  - [15-admin-hub-and-ops-dashboard.md](./blog/15-admin-hub-and-ops-dashboard.md)
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 본문에서 참조한 핵심 코드 파일, workflow, 테스트 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 결과:
  - 소셜 lifecycle, 관리자 운영, 테스트 전략이 시리즈 안에서 하나의 운영 축으로 연결됐다.

### 2026-04-07 | 알림/운영 유지보수/성능 개선 본문 3개 추가
- 완료일: `2026-04-07`
- 배경:
  - 알림, 유지보수 workflow, 성능 개선은 운영 경험을 드러내는 영역인데 시리즈 안에서 아직 빠져 있었다.
- 변경내용:
  - [10-notification-center-and-unread-sync.md](./blog/10-notification-center-and-unread-sync.md)를 추가해 `NotificationBell`, `NotificationCenter`, `notification-unread-sync`, 서버 action, `notification.queries.ts`, redirect route가 어떻게 하나의 unread/redirect 계약으로 묶이는지 정리했다.
  - [18-health-check-retention-cleanup-and-maintenance-workflows.md](./blog/18-health-check-retention-cleanup-and-maintenance-workflows.md)를 추가해 `/api/health`, retention helper, cleanup script, `post-integrity-maintenance`, `ops-latency-snapshots` workflow를 운영 관점에서 설명했다.
  - [20-performance-story-search-cache-pagination.md](./blog/20-performance-story-search-cache-pagination.md)를 추가해 versioned query cache, structured search shadow column, root comment pagination, best comment page 계산, 피드 상대시간 re-render 분리, latency snapshot을 한 흐름으로 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 집필 우선순위에 맞게 갱신했다.
- 코드문서:
  - [10-notification-center-and-unread-sync.md](./blog/10-notification-center-and-unread-sync.md)
  - [18-health-check-retention-cleanup-and-maintenance-workflows.md](./blog/18-health-check-retention-cleanup-and-maintenance-workflows.md)
  - [20-performance-story-search-cache-pagination.md](./blog/20-performance-story-search-cache-pagination.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 본문에서 참조한 핵심 코드 파일, maintenance workflow, script, 테스트 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 결과:
  - 알림, 유지보수, 성능 개선 경험이 블로그 시리즈에 편입됐다.

### 2026-04-07 | 세션/abuse 방어/migration drift 본문 3개 추가
- 완료일: `2026-04-07`
- 배경:
  - 세션/권한, abuse 방어, migration drift 대응은 TownPet의 안전장치를 설명하는 축인데 별도 글이 필요했다.
- 변경내용:
  - [12-session-role-and-admin-surface.md](./blog/12-session-role-and-admin-surface.md)를 추가해 NextAuth `signIn/jwt/session` callback, `sessionVersion`, `server/auth.ts`, `admin-page-access.ts`, `middleware.ts`, `AdminSectionNav`, admin-only API/action이 어떻게 역할별 surface를 나누는지 정리했다.
  - [16-rate-limit-guest-safety-and-abuse-defense.md](./blog/16-rate-limit-guest-safety-and-abuse-defense.md)를 추가해 `rate-limit.ts`, `authenticated-write-throttle.ts`, `guest-safety.service.ts`, `guest-step-up.ts`, `sanction.service.ts`, 실제 게시글/댓글/신고 route의 방어 순서를 설명했다.
  - [17-prisma-migrations-and-schema-drift-response.md](./blog/17-prisma-migrations-and-schema-drift-response.md)를 추가해 `quality-gate.yml`, `vercel-build.ts`, `schema-sync.ts`, repair migration, runtime `SCHEMA_SYNC_REQUIRED` 계약을 한 흐름으로 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 우선순위에 맞게 갱신했다.
- 코드문서:
  - [12-session-role-and-admin-surface.md](./blog/12-session-role-and-admin-surface.md)
  - [16-rate-limit-guest-safety-and-abuse-defense.md](./blog/16-rate-limit-guest-safety-and-abuse-defense.md)
  - [17-prisma-migrations-and-schema-drift-response.md](./blog/17-prisma-migrations-and-schema-drift-response.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 본문에서 참조한 핵심 코드 파일, route/action, workflow, migration 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 결과:
  - 세션/권한, abuse defense, migration drift 대응이 안전장치 설명 축으로 정리됐다.

### 2026-04-07 | Server/Client 경계, 피드/보드, 글 CRUD 본문 3개 추가
- 완료일: `2026-04-07`
- 배경:
  - Server/Client 경계와 피드/CRUD 흐름은 앱을 읽는 기본 경로인데 초보 독자용 정리가 없었다.
- 변경내용:
  - [04-server-component-and-client-component-boundary.md](./blog/04-server-component-and-client-component-boundary.md)를 추가해 `page.tsx`, client component, server action, route handler를 TownPet 실제 파일 기준으로 나눠 설명했다.
  - [06-feed-and-board-architecture.md](./blog/06-feed-and-board-architecture.md)를 추가해 `/feed`, guest feed, 입양 게시판, `post.queries.ts`, `community.queries.ts`가 서로 다른 읽기 표면으로 어떻게 나뉘는지 정리했다.
  - [07-post-create-edit-delete-flow.md](./blog/07-post-create-edit-delete-flow.md)를 추가해 `post.ts` validation, `post.service.ts`, `server/actions/post.ts`, `/api/posts` route, `post-create-form.tsx`, `post-detail-edit-form.tsx` 흐름을 CRUD 관점으로 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 우선순위에 맞게 갱신했다.
- 코드문서:
  - [04-server-component-and-client-component-boundary.md](./blog/04-server-component-and-client-component-boundary.md)
  - [06-feed-and-board-architecture.md](./blog/06-feed-and-board-architecture.md)
  - [07-post-create-edit-delete-flow.md](./blog/07-post-create-edit-delete-flow.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 본문에서 참조한 핵심 page, component, action, route, service, query 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 결과:
  - Server/Client 경계부터 CRUD까지 core reading path가 완성됐다.

### 2026-04-07 | 댓글/반응, 비즈니스 아이디어, Phase 2 본문 3개 추가
- 완료일: `2026-04-07`
- 배경:
  - 댓글/반응 구조와 제품 확장축, Phase 2 로드맵을 묶어 설명할 문서가 없어 제품 서사가 비어 있었다.
- 변경내용:
  - [08-comments-and-reactions-architecture.md](./blog/08-comments-and-reactions-architecture.md)를 추가해 `comment.service.ts`, `comment.queries.ts`, `comment.ts` action, `/api/posts/[id]/comments` route, `PostCommentThread`, `CommentReactionControls`를 중심으로 댓글/반응 구조를 정리했다.
  - [21-business-idea-and-expansion-axes.md](./blog/21-business-idea-and-expansion-axes.md)를 추가해 TownPet의 `지역 + 상황` 구조, structured board, moderation/ops, B2B 초기 수익화 아이디어를 제품 관점에서 설명했다.
  - [22-phase2-roadmap-and-product-expansion.md](./blog/22-phase2-roadmap-and-product-expansion.md)를 추가해 검색/개인화 우선, 마켓 상태 머신, 케어 요청, 지도, 결제를 어떤 리스크 순서로 여는지 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 우선순위에 맞게 갱신했다.
- 코드문서:
  - [08-comments-and-reactions-architecture.md](./blog/08-comments-and-reactions-architecture.md)
  - [21-business-idea-and-expansion-axes.md](./blog/21-business-idea-and-expansion-axes.md)
  - [22-phase2-roadmap-and-product-expansion.md](./blog/22-phase2-roadmap-and-product-expansion.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 본문에서 참조한 핵심 route/action/service/query/file, 제품/사업 문서 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 결과:
  - 댓글/반응 구조와 사업/로드맵 서사가 같이 보이도록 시리즈 범위가 넓어졌다.

### 2026-04-07 | 문제 정의, AI agent 개발 방식, 데모/면접 패키지 본문 3개 추가
- 완료일: `2026-04-07`
- 배경:
  - 프로젝트 문제 정의, AI agent 개발 방식, 포트폴리오 패키징은 시리즈의 시작과 끝을 잡는 글인데 아직 없었다.
- 변경내용:
  - [01-why-townpet-exists.md](./blog/01-why-townpet-exists.md)를 추가해 TownPet가 풀고자 한 문제, `지역 + 상황` 구조, 구조화 게시판과 moderation/ops가 왜 제품 기본값으로 들어갔는지 정리했다.
  - [23-how-ai-agents-were-used-in-real-development.md](./blog/23-how-ai-agents-were-used-in-real-development.md)를 추가해 `PLAN.md`/`PROGRESS.md`, 에이전트 운영 가이드, 프롬프트 템플릿, quality gate를 중심으로 TownPet의 AI-native 개발 방식을 설명했다.
  - [24-demo-docs-and-interview-pack.md](./blog/24-demo-docs-and-interview-pack.md)를 추가해 README, 라이브 데모, `/admin/ops`, 운영/보안 문서, 블로그 시리즈를 하나의 포트폴리오/면접 패키지로 묶는 방법을 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 `01`, `23`, `24` 링크와 보강 우선순위 기준으로 갱신했다.
- 코드문서:
  - [01-why-townpet-exists.md](./blog/01-why-townpet-exists.md)
  - [23-how-ai-agents-were-used-in-real-development.md](./blog/23-how-ai-agents-were-used-in-real-development.md)
  - [24-demo-docs-and-interview-pack.md](./blog/24-demo-docs-and-interview-pack.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 본문에서 참조한 핵심 README, 운영 문서, 보안 문서, workflow, route/action/service/query 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 결과:
  - 시리즈에 문제 정의와 AI-native 개발 방식, 포트폴리오 마감 글이 추가돼 입구와 출구가 생겼다.

### 2026-04-07 | 블로그 문체 통일 + 핵심 흐름 다이어그램 추가
- 완료일: `2026-04-07`
- 배경:
  - 초안이 빠르게 늘면서 문체와 설명 밀도가 글마다 달라졌고, 핵심 흐름 다이어그램도 부족했다.
- 변경내용:
  - [00_rebuild_guide.md](./blog/00_rebuild_guide.md)에 문체 원칙을 추가해 `이 글은 ...를 정리합니다` 형태, 완충 표현 축소, 강조 문장 절제 기준을 명시했다.
  - `01`, `02`, `03`, `04`, `05`, `06`, `07`, `08`, `09`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`, `19`, `20`, `21`, `22`, `23`, `24` 본문의 도입 문장과 반복되는 완충 표현을 단정형으로 정리했다.
  - [05-prisma-zod-service-route-order.md](./blog/05-prisma-zod-service-route-order.md), [09-search-structured-search-and-suggestions.md](./blog/09-search-structured-search-and-suggestions.md), [11-credentials-kakao-naver-auth.md](./blog/11-credentials-kakao-naver-auth.md), [14-report-block-sanction-direct-moderation.md](./blog/14-report-block-sanction-direct-moderation.md), [15-admin-hub-and-ops-dashboard.md](./blog/15-admin-hub-and-ops-dashboard.md), [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)에 핵심 흐름 mermaid 다이어그램을 추가했다.
  - [BLOG_PLAN.md](./BLOG_PLAN.md)도 현재 보강 우선순위 기준으로 갱신했다.
- 코드문서:
  - [00_rebuild_guide.md](./blog/00_rebuild_guide.md)
  - [05-prisma-zod-service-route-order.md](./blog/05-prisma-zod-service-route-order.md)
  - [09-search-structured-search-and-suggestions.md](./blog/09-search-structured-search-and-suggestions.md)
  - [11-credentials-kakao-naver-auth.md](./blog/11-credentials-kakao-naver-auth.md)
  - [14-report-block-sanction-direct-moderation.md](./blog/14-report-block-sanction-direct-moderation.md)
  - [15-admin-hub-and-ops-dashboard.md](./blog/15-admin-hub-and-ops-dashboard.md)
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - `git diff --check` 통과
- 결과:
  - 문체 기준과 핵심 mermaid 다이어그램이 보강돼 시리즈 일관성이 높아졌다.

### 2026-04-07 | 외부 공개용 링크/템플릿/검증 명령 보강
- 완료일: `2026-04-07`
- 배경:
  - 외부 공개 기준에서 절대경로 링크와 공통 템플릿 부족이 읽기 경험과 재현성을 떨어뜨리고 있었다.
- 변경내용:
  - `blog/*.md` 전반의 로컬 절대경로 링크를 repo-relative 링크로 바꿔 GitHub와 외부 독자 환경에서도 그대로 읽을 수 있게 정리했다.
  - [03-nextjs-app-router-for-backend-engineers.md](./blog/03-nextjs-app-router-for-backend-engineers.md), [05-prisma-zod-service-route-order.md](./blog/05-prisma-zod-service-route-order.md), [11-credentials-kakao-naver-auth.md](./blog/11-credentials-kakao-naver-auth.md), [13-social-account-link-unlink-lifecycle.md](./blog/13-social-account-link-unlink-lifecycle.md), [14-report-block-sanction-direct-moderation.md](./blog/14-report-block-sanction-direct-moderation.md), [15-admin-hub-and-ops-dashboard.md](./blog/15-admin-hub-and-ops-dashboard.md), [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md), [24-demo-docs-and-interview-pack.md](./blog/24-demo-docs-and-interview-pack.md)에 `먼저 알아둘 개념`, `테스트와 검증`, `직접 실행해 보고 싶다면` 같은 공통 섹션을 보강했다.
  - [BLOG_PLAN.md](./BLOG_PLAN.md)도 현재 보강 우선순위 기준으로 갱신했다.
- 코드문서:
  - [03-nextjs-app-router-for-backend-engineers.md](./blog/03-nextjs-app-router-for-backend-engineers.md)
  - [05-prisma-zod-service-route-order.md](./blog/05-prisma-zod-service-route-order.md)
  - [11-credentials-kakao-naver-auth.md](./blog/11-credentials-kakao-naver-auth.md)
  - [13-social-account-link-unlink-lifecycle.md](./blog/13-social-account-link-unlink-lifecycle.md)
  - [14-report-block-sanction-direct-moderation.md](./blog/14-report-block-sanction-direct-moderation.md)
  - [15-admin-hub-and-ops-dashboard.md](./blog/15-admin-hub-and-ops-dashboard.md)
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)
  - [24-demo-docs-and-interview-pack.md](./blog/24-demo-docs-and-interview-pack.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - `blog/`와 `BLOG_*.md`에서 `/Users/alex/project/townpet/...` 절대경로 링크가 남아 있지 않음을 확인했다.
  - `git diff --check` 통과
- 결과:
  - 외부 독자 기준 링크와 공통 섹션이 정리돼 공개용 읽기 경험이 좋아졌다.

### 2026-04-07 | 면접 Q&A 부록 보강
- 완료일: `2026-04-07`
- 배경:
  - 블로그 본문이 기술 설명에는 충분했지만 면접 상황에서 바로 써먹을 Q&A 구조는 부족했다.
- 변경내용:
  - [06-feed-and-board-architecture.md](./blog/06-feed-and-board-architecture.md), [07-post-create-edit-delete-flow.md](./blog/07-post-create-edit-delete-flow.md), [08-comments-and-reactions-architecture.md](./blog/08-comments-and-reactions-architecture.md), [10-notification-center-and-unread-sync.md](./blog/10-notification-center-and-unread-sync.md), [12-session-role-and-admin-surface.md](./blog/12-session-role-and-admin-surface.md), [16-rate-limit-guest-safety-and-abuse-defense.md](./blog/16-rate-limit-guest-safety-and-abuse-defense.md), [17-prisma-migrations-and-schema-drift-response.md](./blog/17-prisma-migrations-and-schema-drift-response.md), [18-health-check-retention-cleanup-and-maintenance-workflows.md](./blog/18-health-check-retention-cleanup-and-maintenance-workflows.md), [20-performance-story-search-cache-pagination.md](./blog/20-performance-story-search-cache-pagination.md)에 면접 Q&A 부록을 추가했다.
  - [BLOG_PLAN.md](./BLOG_PLAN.md)도 현재 보강 우선순위 기준으로 갱신했다.
- 코드문서:
  - [06-feed-and-board-architecture.md](./blog/06-feed-and-board-architecture.md)
  - [07-post-create-edit-delete-flow.md](./blog/07-post-create-edit-delete-flow.md)
  - [08-comments-and-reactions-architecture.md](./blog/08-comments-and-reactions-architecture.md)
  - [10-notification-center-and-unread-sync.md](./blog/10-notification-center-and-unread-sync.md)
  - [12-session-role-and-admin-surface.md](./blog/12-session-role-and-admin-surface.md)
  - [16-rate-limit-guest-safety-and-abuse-defense.md](./blog/16-rate-limit-guest-safety-and-abuse-defense.md)
  - [17-prisma-migrations-and-schema-drift-response.md](./blog/17-prisma-migrations-and-schema-drift-response.md)
  - [18-health-check-retention-cleanup-and-maintenance-workflows.md](./blog/18-health-check-retention-cleanup-and-maintenance-workflows.md)
  - [20-performance-story-search-cache-pagination.md](./blog/20-performance-story-search-cache-pagination.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 각 문서에 `면접에서 이렇게 설명할 수 있다` 뒤에 `면접 Q&A` 부록이 붙었는지 확인했다.
  - `git diff --check` 통과
- 결과:
  - 대표 글들에 면접 대응용 Q&A 부록이 붙어 실전 설명력이 높아졌다.

### 2026-04-16 | quality gate/deploy pipeline 회고 + current workflow refresh
- 완료일: `2026-04-16`
- 배경:
  - CI/deploy 구조가 바뀌면서 테스트/quality gate 글과 운영 회고가 현재 저장소 상태와 어긋나기 시작했다.
- 변경내용:
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)를 현재 구조 기준으로 다시 써서 PR hot path, docs-only workflow, on-demand browser smoke, post-deploy ops smoke, deploy-essential `build:vercel` 모델을 반영했다.
  - [25-overengineering-ci-and-deploy-pipelines.md](./blog/25-overengineering-ci-and-deploy-pipelines.md)를 추가해 quality gate/deploy pipeline 과설계가 배포 속도 지연, unrelated failure coupling, flaky gate 증가, 우회 행동 유도 같은 리스크를 만드는 과정을 회고했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 `25` 링크와 최신 보강 우선순위에 맞게 갱신했다.
- 코드문서:
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)
  - [25-overengineering-ci-and-deploy-pipelines.md](./blog/25-overengineering-ci-and-deploy-pipelines.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 본문에서 참조한 workflow/script/doc 경로가 현재 저장소에 실제 존재하는지 확인했다.
  - `git diff --check` 기준으로 블로그/문서 변경 포맷을 함께 점검했다.
- 결과:
  - 현재 workflow 기준의 테스트/quality gate 설명과 과설계 회고가 시리즈에 반영됐다.

### 2026-04-16 | SunEditor selection/boundary stabilization 회고
- 완료일: `2026-04-16`
- 배경:
  - SunEditor 전환 이후 selection/boundary 회귀를 어떻게 닫았는지와 browser smoke 판단 근거를 별도 회고로 남길 필요가 있었다.
- 변경내용:
  - [26-suneditor-selection-and-typing-boundary.md](./blog/26-suneditor-selection-and-typing-boundary.md)를 추가해 TownPet 게시글 에디터가 `execCommand -> Tiptap 보수 -> SunEditor`로 이동한 이유와, styled typing boundary가 왜 브라우저 selection만으로는 해결되지 않았는지 정리했다.
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)에 `post-editor-toolbar.spec.ts`를 browser smoke 대상 예시로 반영하고, selection restore / submenu target / styled typing boundary 같은 editor regression은 browser-level smoke로 고정해야 한다는 이유를 추가했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 `26` 링크와 최신 시리즈 범위에 맞게 갱신했다.
- 코드문서:
  - [26-suneditor-selection-and-typing-boundary.md](./blog/26-suneditor-selection-and-typing-boundary.md)
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)
  - [blog/README.md](./blog/README.md)
  - [00_series_plan.md](./blog/00_series_plan.md)
  - [BLOG_PLAN.md](./BLOG_PLAN.md)
- 검증:
  - 본문에서 참조한 editor component, serializer, E2E, error docs 경로가 현재 저장소에 실제 존재하는지 확인했다.
  - `git diff --check` 기준으로 블로그/문서 포맷을 함께 점검했다.
- 결과:
  - SunEditor 회고와 browser smoke 판단 근거가 문서화돼 editor 안정화 경험이 시리즈에 남았다.
