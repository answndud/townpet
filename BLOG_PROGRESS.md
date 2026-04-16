# BLOG_PROGRESS.md

기준일: 2026-04-16

## 진행 현황 요약
- Cycle B1: 블로그 작업공간 초기화 완료
- Cycle B2: 구조/라우팅/계층 분리 본문 3개 추가 완료
- Cycle B3: 인증/검색/모더레이션 본문 3개 추가 완료
- Cycle B4: 소셜 연동 lifecycle, 관리자 운영, 테스트/quality gate 본문 3개 추가 완료
- Cycle B5: 알림/unread sync, maintenance workflow, 성능 개선 본문 3개 추가 완료
- Cycle B6: 세션/관리자 surface, abuse 방어, migration drift 본문 3개 추가 완료
- Cycle B7: Server/Client 경계, 피드/보드, 글 CRUD 본문 3개 추가 완료
- Cycle B8: 댓글/반응, 비즈니스 아이디어, Phase 2 본문 3개 추가 완료
- Cycle B9: 문제 정의, AI agent 개발 방식, 데모/면접 패키지 본문 3개 추가 완료
- Cycle B10: 블로그 문체 통일 + 핵심 흐름 다이어그램 추가 완료
- Cycle B11: 외부 공개용 링크/템플릿/검증 명령 보강 완료
- Cycle B12: 면접 Q&A 부록 보강 완료
- Cycle B13: quality gate/deploy pipeline 회고 + current workflow refresh 완료

### 2026-04-16: Cycle B14 완료 (SunEditor selection/boundary stabilization 회고)
- 완료 내용
  - [26-suneditor-selection-and-typing-boundary.md](./blog/26-suneditor-selection-and-typing-boundary.md)를 추가해 TownPet 게시글 에디터가 `execCommand -> Tiptap 보수 -> SunEditor`로 이동한 이유와, styled typing boundary가 왜 브라우저 selection만으로는 해결되지 않았는지 정리했다.
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)에 `post-editor-toolbar.spec.ts`를 browser smoke 대상 예시로 반영하고, selection restore / submenu target / styled typing boundary 같은 editor regression은 browser-level smoke로 고정해야 한다는 이유를 추가했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 `26` 링크와 최신 시리즈 범위에 맞게 갱신했다.
- 검증 결과
  - 본문에서 참조한 editor component, serializer, E2E, error docs 경로가 현재 저장소에 실제 존재하는지 확인했다.
  - `git diff --check` 기준으로 블로그/문서 포맷을 함께 점검했다.
- 메모
  - 이번 글은 라이브러리 교체 자체보다, editor 버그를 “DOM 구조 + selection attach timing + browser smoke 회귀” 관점에서 어떻게 닫았는지에 초점을 둔다.

### 2026-04-16: Cycle B13 완료 (quality gate/deploy pipeline 회고 + current workflow refresh)
- 완료 내용
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)를 현재 구조 기준으로 다시 써서 PR hot path, docs-only workflow, on-demand browser smoke, post-deploy ops smoke, deploy-essential `build:vercel` 모델을 반영했다.
  - [25-overengineering-ci-and-deploy-pipelines.md](./blog/25-overengineering-ci-and-deploy-pipelines.md)를 추가해 quality gate/deploy pipeline 과설계가 배포 속도 지연, unrelated failure coupling, flaky gate 증가, 우회 행동 유도 같은 리스크를 만드는 과정을 회고했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 `25` 링크와 최신 보강 우선순위에 맞게 갱신했다.
- 검증 결과
  - 본문에서 참조한 workflow/script/doc 경로가 현재 저장소에 실제 존재하는지 확인했다.
  - `git diff --check` 기준으로 블로그/문서 변경 포맷을 함께 점검했다.
- 메모
  - 이제 테스트/quality gate 글은 “검증을 많이 한다”보다 “검증을 어디에 배치하는가”를 설명하는 글로 성격이 바뀌었다.

### 2026-04-07: Cycle B10 완료 (블로그 문체 통일 + 핵심 흐름 다이어그램 추가)
- 완료 내용
  - [00_rebuild_guide.md](./blog/00_rebuild_guide.md)에 문체 원칙을 추가해 `이 글은 ...를 정리합니다` 형태, 완충 표현 축소, 강조 문장 절제 기준을 명시했다.
  - `01`, `02`, `03`, `04`, `05`, `06`, `07`, `08`, `09`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`, `19`, `20`, `21`, `22`, `23`, `24` 본문의 도입 문장과 반복되는 완충 표현을 단정형으로 정리했다.
  - [05-prisma-zod-service-route-order.md](./blog/05-prisma-zod-service-route-order.md), [09-search-structured-search-and-suggestions.md](./blog/09-search-structured-search-and-suggestions.md), [11-credentials-kakao-naver-auth.md](./blog/11-credentials-kakao-naver-auth.md), [14-report-block-sanction-direct-moderation.md](./blog/14-report-block-sanction-direct-moderation.md), [15-admin-hub-and-ops-dashboard.md](./blog/15-admin-hub-and-ops-dashboard.md), [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)에 핵심 흐름 mermaid 다이어그램을 추가했다.
  - [BLOG_PLAN.md](./BLOG_PLAN.md)도 현재 보강 우선순위 기준으로 갱신했다.
- 검증 결과
  - `git diff --check` 통과
- 메모
  - 다음 보강 우선순위는 운영 캡처 추가와 면접 Q&A 부록 작성이다.

### 2026-04-07: Cycle B9 완료 (문제 정의, AI agent 개발 방식, 데모/면접 패키지 본문 3개 추가)
- 완료 내용
  - [01-why-townpet-exists.md](./blog/01-why-townpet-exists.md)를 추가해 TownPet가 풀고자 한 문제, `지역 + 상황` 구조, 구조화 게시판과 moderation/ops가 왜 제품 기본값으로 들어갔는지 정리했다.
  - [23-how-ai-agents-were-used-in-real-development.md](./blog/23-how-ai-agents-were-used-in-real-development.md)를 추가해 `PLAN.md`/`PROGRESS.md`, 에이전트 운영 가이드, 프롬프트 템플릿, quality gate를 중심으로 TownPet의 AI-native 개발 방식을 설명했다.
  - [24-demo-docs-and-interview-pack.md](./blog/24-demo-docs-and-interview-pack.md)를 추가해 README, 라이브 데모, `/admin/ops`, 운영/보안 문서, 블로그 시리즈를 하나의 포트폴리오/면접 패키지로 묶는 방법을 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 `01`, `23`, `24` 링크와 보강 우선순위 기준으로 갱신했다.
- 검증 결과
  - 본문에서 참조한 핵심 README, 운영 문서, 보안 문서, workflow, route/action/service/query 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 메모
  - 핵심 시리즈 초안은 `01`부터 `24`까지 모두 채워졌고, 이후 우선순위는 다이어그램/캡처/면접 Q&A 보강이다.

### 2026-04-07: Cycle B8 완료 (댓글/반응, 비즈니스 아이디어, Phase 2 본문 3개 추가)
- 완료 내용
  - [08-comments-and-reactions-architecture.md](./blog/08-comments-and-reactions-architecture.md)를 추가해 `comment.service.ts`, `comment.queries.ts`, `comment.ts` action, `/api/posts/[id]/comments` route, `PostCommentThread`, `CommentReactionControls`를 중심으로 댓글/반응 구조를 정리했다.
  - [21-business-idea-and-expansion-axes.md](./blog/21-business-idea-and-expansion-axes.md)를 추가해 TownPet의 `지역 + 상황` 구조, structured board, moderation/ops, B2B 초기 수익화 아이디어를 제품 관점에서 설명했다.
  - [22-phase2-roadmap-and-product-expansion.md](./blog/22-phase2-roadmap-and-product-expansion.md)를 추가해 검색/개인화 우선, 마켓 상태 머신, 케어 요청, 지도, 결제를 어떤 리스크 순서로 여는지 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 우선순위에 맞게 갱신했다.
- 검증 결과
  - 본문에서 참조한 핵심 route/action/service/query/file, 제품/사업 문서 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 메모
  - 다음 블로그 우선순위는 `AI agent를 실제 개발 방식에 어떻게 녹였는가`, `데모/문서/면접 패키지`, `왜 TownPet를 만들었는가`다.

### 2026-04-07: Cycle B7 완료 (Server/Client 경계, 피드/보드, 글 CRUD 본문 3개 추가)
- 완료 내용
  - [04-server-component-and-client-component-boundary.md](./blog/04-server-component-and-client-component-boundary.md)를 추가해 `page.tsx`, client component, server action, route handler를 TownPet 실제 파일 기준으로 나눠 설명했다.
  - [06-feed-and-board-architecture.md](./blog/06-feed-and-board-architecture.md)를 추가해 `/feed`, guest feed, 입양 게시판, `post.queries.ts`, `community.queries.ts`가 서로 다른 읽기 표면으로 어떻게 나뉘는지 정리했다.
  - [07-post-create-edit-delete-flow.md](./blog/07-post-create-edit-delete-flow.md)를 추가해 `post.ts` validation, `post.service.ts`, `server/actions/post.ts`, `/api/posts` route, `post-create-form.tsx`, `post-detail-edit-form.tsx` 흐름을 CRUD 관점으로 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 우선순위에 맞게 갱신했다.
- 검증 결과
  - 본문에서 참조한 핵심 page, component, action, route, service, query 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 메모
  - 다음 블로그 우선순위는 `댓글과 반응 구조`, `비즈니스 아이디어와 확장축`, `Phase 2 로드맵`, `AI agent 개발 방식`, `데모/면접 패키지`다.

### 2026-04-07: Cycle B6 완료 (세션/abuse 방어/migration drift 본문 3개 추가)
- 완료 내용
  - [12-session-role-and-admin-surface.md](./blog/12-session-role-and-admin-surface.md)를 추가해 NextAuth `signIn/jwt/session` callback, `sessionVersion`, `server/auth.ts`, `admin-page-access.ts`, `middleware.ts`, `AdminSectionNav`, admin-only API/action이 어떻게 역할별 surface를 나누는지 정리했다.
  - [16-rate-limit-guest-safety-and-abuse-defense.md](./blog/16-rate-limit-guest-safety-and-abuse-defense.md)를 추가해 `rate-limit.ts`, `authenticated-write-throttle.ts`, `guest-safety.service.ts`, `guest-step-up.ts`, `sanction.service.ts`, 실제 게시글/댓글/신고 route의 방어 순서를 설명했다.
  - [17-prisma-migrations-and-schema-drift-response.md](./blog/17-prisma-migrations-and-schema-drift-response.md)를 추가해 `quality-gate.yml`, `vercel-build.ts`, `schema-sync.ts`, repair migration, runtime `SCHEMA_SYNC_REQUIRED` 계약을 한 흐름으로 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 우선순위에 맞게 갱신했다.
- 검증 결과
  - 본문에서 참조한 핵심 코드 파일, route/action, workflow, migration 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 메모
  - 다음 블로그 우선순위는 `Server Component와 Client Component`, `피드와 게시판 구조`, `글 작성/수정/삭제 흐름`, `댓글과 반응 구조`다.

### 2026-04-07: Cycle B5 완료 (알림/운영 유지보수/성능 개선 본문 3개 추가)
- 완료 내용
  - [10-notification-center-and-unread-sync.md](./blog/10-notification-center-and-unread-sync.md)를 추가해 `NotificationBell`, `NotificationCenter`, `notification-unread-sync`, 서버 action, `notification.queries.ts`, redirect route가 어떻게 하나의 unread/redirect 계약으로 묶이는지 정리했다.
  - [18-health-check-retention-cleanup-and-maintenance-workflows.md](./blog/18-health-check-retention-cleanup-and-maintenance-workflows.md)를 추가해 `/api/health`, retention helper, cleanup script, `post-integrity-maintenance`, `ops-latency-snapshots` workflow를 운영 관점에서 설명했다.
  - [20-performance-story-search-cache-pagination.md](./blog/20-performance-story-search-cache-pagination.md)를 추가해 versioned query cache, structured search shadow column, root comment pagination, best comment page 계산, 피드 상대시간 re-render 분리, latency snapshot을 한 흐름으로 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 집필 우선순위에 맞게 갱신했다.
- 검증 결과
  - 본문에서 참조한 핵심 코드 파일, maintenance workflow, script, 테스트 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 메모
  - 다음 블로그 우선순위는 `세션/role/관리자 surface`, `rate limit/guest safety/abuse defense`, `Prisma migration과 schema drift 대응`이다.

### 2026-04-07: Cycle B4 완료 (소셜 연동/운영 대시보드/테스트 전략 본문 3개 추가)
- 완료 내용
  - [13-social-account-link-unlink-lifecycle.md](./blog/13-social-account-link-unlink-lifecycle.md)를 추가해 `Account` 모델, `auth.ts` callback, `linkSocialAccountForUser`, `unlinkSocialAccountForUser`, `sessionVersion`, `OAuthAccountNotLinked` 복구 흐름을 정리했다.
  - [15-admin-hub-and-ops-dashboard.md](./blog/15-admin-hub-and-ops-dashboard.md)를 추가해 `/admin` 허브, `AdminSectionNav`, 역할별 접근 제어, `/admin/ops`, `getHealthSnapshot`, `getAdminOpsOverview`의 관계를 정리했다.
  - [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md)를 추가해 Vitest, Playwright, `quality-gate.yml`, `ops-smoke-checks.yml`, migration/ops rehearsal의 의미를 설명했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 집필 우선순위에 맞게 갱신했다.
- 검증 결과
  - 본문에서 참조한 핵심 코드 파일, workflow, 테스트 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 메모
  - 다음 블로그 우선순위는 `알림 센터와 unread sync`, `health check / retention cleanup / maintenance workflow`, `성능 개선을 코드 구조와 함께 설명하기`다.

### 2026-04-07: Cycle B1 완료 (TownPet blog 작업공간 초기화)
- 완료 내용
  - 루트에 `BLOG_PLAN.md`, `BLOG_PROGRESS.md`를 추가했다.
  - `blog/` 디렉터리를 만들고 아래 메타 문서를 추가했다.
    - `README.md`
    - `00_series_plan.md`
    - `00_rebuild_guide.md`
    - `00_quality_checklist.md`
    - `00_js_for_backend_engineers.md`
  - Kindergarten ERP의 `blog/` 구조를 참고하되, TownPet는 `Python/Java 개발자가 JS 기반 프로젝트를 해석하는 것`에 더 초점을 맞추도록 재설계했다.
- 검증 결과
  - 메타 문서 간 링크를 모두 repo-relative 경로로 작성했다.
  - `git diff --check` 통과
- 메모
  - 아직 개별 본문 시리즈(`01`, `02`, `03`...)는 쓰지 않았다.
  - 다음 우선순위는 `TownPet 전체 구조`, `App Router 번역`, `Prisma -> Zod -> Service -> Route/UI 읽는 법` 초안 작성이다.

### 2026-04-07: Cycle B2 완료 (구조/라우팅/계층 분리 본문 3개 추가)
- 완료 내용
  - [02-how-townpet-is-structured.md](./blog/02-how-townpet-is-structured.md)를 작성해 저장소 전체 지도, 폴더 역할, 추천 읽기 순서를 정리했다.
  - [03-nextjs-app-router-for-backend-engineers.md](./blog/03-nextjs-app-router-for-backend-engineers.md)를 작성해 `page.tsx`, `route.ts`, `layout.tsx`, `Server Action`을 Python/Java 개발자 기준으로 번역했다.
  - [05-prisma-zod-service-route-order.md](./blog/05-prisma-zod-service-route-order.md)를 작성해 TownPet의 대표 구현 순서인 `Prisma -> Zod -> Service -> Route/UI`를 게시글 생성 흐름으로 설명했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 집필 우선순위에 맞게 갱신했다.
- 검증 결과
  - 본문에서 참조한 핵심 코드 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 메모
  - 다음 우선순위는 `11. Credentials + Kakao + Naver 인증 구조`, `14. 신고/차단/제재/직접 모더레이션`, `09. 검색, 구조화 검색, suggestion`이다.

### 2026-04-07: Cycle B3 완료 (인증/검색/모더레이션 본문 3개 추가)
- 완료 내용
  - [11-credentials-kakao-naver-auth.md](./blog/11-credentials-kakao-naver-auth.md)를 추가해 NextAuth 설정, credentials 로그인, 카카오/네이버 로그인, sessionVersion, 이메일 인증/비밀번호 재설정, 소셜 계정 연결/해제 흐름을 정리했다.
  - [09-search-structured-search-and-suggestions.md](./blog/09-search-structured-search-and-suggestions.md)를 추가해 본검색, 구조화 검색, suggestion, compact/초성 fallback, `SearchTermStat`/`SearchTermDailyMetric` 운영 루프를 설명했다.
  - [14-report-block-sanction-direct-moderation.md](./blog/14-report-block-sanction-direct-moderation.md)를 추가해 신고, block/mute, 제재, 직접 모더레이션, 운영자 action log의 관계를 정리했다.
  - [blog/README.md](./blog/README.md), [00_series_plan.md](./blog/00_series_plan.md), [BLOG_PLAN.md](./BLOG_PLAN.md)도 새 본문 링크와 다음 집필 우선순위에 맞게 갱신했다.
- 검증 결과
  - 본문에서 참조한 핵심 코드 파일과 함수 위치를 직접 확인했다.
  - `git diff --check` 통과
- 메모
  - 다음 블로그 우선순위는 `관리자 허브/운영 대시보드`, `테스트/quality gate`, `소셜 계정 연결/해제 lifecycle`이다.
### 2026-04-07: Cycle B11 완료 (외부 공개용 링크/템플릿/검증 명령 보강)
- 완료 내용
  - `blog/*.md` 전반의 로컬 절대경로 링크를 repo-relative 링크로 바꿔 GitHub와 외부 독자 환경에서도 그대로 읽을 수 있게 정리했다.
  - [03-nextjs-app-router-for-backend-engineers.md](./blog/03-nextjs-app-router-for-backend-engineers.md), [05-prisma-zod-service-route-order.md](./blog/05-prisma-zod-service-route-order.md), [11-credentials-kakao-naver-auth.md](./blog/11-credentials-kakao-naver-auth.md), [13-social-account-link-unlink-lifecycle.md](./blog/13-social-account-link-unlink-lifecycle.md), [14-report-block-sanction-direct-moderation.md](./blog/14-report-block-sanction-direct-moderation.md), [15-admin-hub-and-ops-dashboard.md](./blog/15-admin-hub-and-ops-dashboard.md), [19-testing-and-quality-gate.md](./blog/19-testing-and-quality-gate.md), [24-demo-docs-and-interview-pack.md](./blog/24-demo-docs-and-interview-pack.md)에 `먼저 알아둘 개념`, `테스트와 검증`, `직접 실행해 보고 싶다면` 같은 공통 섹션을 보강했다.
  - [BLOG_PLAN.md](./BLOG_PLAN.md)도 현재 보강 우선순위 기준으로 갱신했다.
- 검증 결과
  - `blog/`와 `BLOG_*.md`에서 `/Users/alex/project/townpet/...` 절대경로 링크가 남아 있지 않음을 확인했다.
  - `git diff --check` 통과
- 메모
  - 다음 보강 우선순위는 운영 캡처, 면접 Q&A 부록, 핵심 글의 실행 체크리스트 강화다.
### 2026-04-07: Cycle B12 완료 (면접 Q&A 부록 보강)
- 완료 내용
  - [06-feed-and-board-architecture.md](./blog/06-feed-and-board-architecture.md), [07-post-create-edit-delete-flow.md](./blog/07-post-create-edit-delete-flow.md), [08-comments-and-reactions-architecture.md](./blog/08-comments-and-reactions-architecture.md), [10-notification-center-and-unread-sync.md](./blog/10-notification-center-and-unread-sync.md), [12-session-role-and-admin-surface.md](./blog/12-session-role-and-admin-surface.md), [16-rate-limit-guest-safety-and-abuse-defense.md](./blog/16-rate-limit-guest-safety-and-abuse-defense.md), [17-prisma-migrations-and-schema-drift-response.md](./blog/17-prisma-migrations-and-schema-drift-response.md), [18-health-check-retention-cleanup-and-maintenance-workflows.md](./blog/18-health-check-retention-cleanup-and-maintenance-workflows.md), [20-performance-story-search-cache-pagination.md](./blog/20-performance-story-search-cache-pagination.md)에 면접 Q&A 부록을 추가했다.
  - [BLOG_PLAN.md](./BLOG_PLAN.md)도 현재 보강 우선순위 기준으로 갱신했다.
- 검증 결과
  - 각 문서에 `면접에서 이렇게 설명할 수 있다` 뒤에 `면접 Q&A` 부록이 붙었는지 확인했다.
  - `git diff --check` 통과
- 메모
  - 다음 보강 우선순위는 운영 캡처, 제품-사업 서사 문장 정리, 시리즈 입구 추천 순서 추가다.
