# TownPet 개발 블로그 시리즈 요약 인덱스

이 문서는 공개용 목차입니다.

현재 보강 전략과 진행 상태는 [BLOG_PLAN.md](../BLOG_PLAN.md), [BLOG_PROGRESS.md](../BLOG_PROGRESS.md)를 active SSOT로 사용하고, 완료 이력은 [BLOG_COMPLETED.md](../BLOG_COMPLETED.md)에 보관합니다.

## 공개 순서

### Part A. 프로젝트와 문제 정의
1. [왜 TownPet를 만들었는가](./01-why-townpet-exists.md)
2. [TownPet 전체 구조 한 장으로 보기](./02-how-townpet-is-structured.md)

### Part B. JS/Next 기초 번역
3. [Next.js App Router를 백엔드 관점에서 이해하기](./03-nextjs-app-router-for-backend-engineers.md)
4. [Server Component와 Client Component를 어떻게 나눴는가](./04-server-component-and-client-component-boundary.md)
5. [Prisma -> Zod -> Service -> Route/UI 순서로 읽는 법](./05-prisma-zod-service-route-order.md)

### Part C. 커뮤니티 핵심 흐름
6. [피드와 게시판 구조](./06-feed-and-board-architecture.md)
7. [글 작성/수정/삭제 흐름](./07-post-create-edit-delete-flow.md)
8. [댓글과 반응 구조](./08-comments-and-reactions-architecture.md)
9. [검색, 구조화 검색, suggestion](./09-search-structured-search-and-suggestions.md)
10. [알림 센터와 unread sync](./10-notification-center-and-unread-sync.md)

### Part D. 인증과 권한
11. [Credentials + Kakao + Naver 인증 구조](./11-credentials-kakao-naver-auth.md)
12. [세션, role, 관리자 surface](./12-session-role-and-admin-surface.md)
13. [소셜 계정 연결/해제 lifecycle](./13-social-account-link-unlink-lifecycle.md)

### Part E. 안전장치와 운영
14. [신고, 차단, 제재, 직접 모더레이션](./14-report-block-sanction-direct-moderation.md)
15. [관리자 허브와 운영 대시보드](./15-admin-hub-and-ops-dashboard.md)
16. [rate limit, guest safety, abuse defense](./16-rate-limit-guest-safety-and-abuse-defense.md)

### Part F. 품질과 운영 안정화
17. [Prisma migration과 schema drift 대응](./17-prisma-migrations-and-schema-drift-response.md)
18. [health check, retention cleanup, maintenance workflow](./18-health-check-retention-cleanup-and-maintenance-workflows.md)
19. [Vitest / Playwright / quality-gate 전략](./19-testing-and-quality-gate.md)
20. [성능 개선을 코드 구조와 함께 설명하기](./20-performance-story-search-cache-pagination.md)

### Part G. 제품/사업/포트폴리오 마감
21. [TownPet의 비즈니스 아이디어와 확장축](./21-business-idea-and-expansion-axes.md)
22. [Phase 2 로드맵과 제품 확장 방향](./22-phase2-roadmap-and-product-expansion.md)
23. [AI agent를 실제 개발 방식에 어떻게 녹였는가](./23-how-ai-agents-were-used-in-real-development.md)
24. [데모/문서/면접 패키지로 프로젝트를 마감하기](./24-demo-docs-and-interview-pack.md)

### Part H. 회고와 운영 판단
25. [quality gate와 deploy pipeline을 과하게 설계하면 생기는 일](./25-overengineering-ci-and-deploy-pipelines.md)
26. [SunEditor 전환에서 selection과 typing boundary를 끝까지 고정하기](./26-suneditor-selection-and-typing-boundary.md)

## 현재 상태

- 핵심 시리즈 `01`부터 `26`까지 초안 작성 완료

## 다음 보강 우선순위
1. `09`, `15`, `19`, `20`, `25`에 다이어그램/수치 캡처 추가
2. `01`, `21`, `22`, `24`를 묶는 제품/사업 서사 보강
3. 각 글 말미의 면접 포인트를 Q&A 카드 형태로 확장
