# TownPet Blog Workspace

이 폴더는 TownPet를 기반으로 작성할 **재현형 개발 블로그 시리즈**의 작업 공간입니다.

이 시리즈의 목표는 세 가지입니다.

1. Python / Java 백엔드 경험자가 TownPet의 JS/Next 구조를 이해하게 만들기
2. 독자가 `blog/`만 읽고도 프로젝트를 어디서부터 읽어야 하는지 알게 만들기
3. 포트폴리오 관점에서 “무엇을 만들었는가”뿐 아니라 “왜 이렇게 설계했는가”까지 설명 가능하게 만들기

## 블로그 작업 SSOT

- [00_series_plan.md](./00_series_plan.md)
- [00_rebuild_guide.md](./00_rebuild_guide.md)
- [00_quality_checklist.md](./00_quality_checklist.md)
- [00_js_for_backend_engineers.md](./00_js_for_backend_engineers.md)

기존 [PLAN.md](../docs/PLAN.md), [PROGRESS.md](../docs/PROGRESS.md)는 계속 **앱 개발용 active SSOT**로 유지하고, 완료 이력은 [COMPLETED.md](../docs/COMPLETED.md)에 둡니다.

## active / archive 규칙

- 별도 `BLOG_*` 상태 문서는 두지 않고, 시리즈 방향은 `00_series_plan.md`와 각 글 원고에서 관리합니다.

## 독자 기준

이 시리즈는 특히 아래 독자를 염두에 둡니다.

- Python/Django, FastAPI, Java/Spring Boot는 익숙하지만
- React, Next.js, NextAuth, Prisma는 낯선 개발자

그래서 각 글은 가능하면 아래 두 질문에 답해야 합니다.

- “이건 Spring/Django 기준으로 뭐에 해당하는가?”
- “TownPet에서는 어느 파일부터 보면 되는가?”

## 읽는 순서

1. [00_rebuild_guide.md](./00_rebuild_guide.md)
2. [00_quality_checklist.md](./00_quality_checklist.md)
3. [00_js_for_backend_engineers.md](./00_js_for_backend_engineers.md)
4. [00_series_plan.md](./00_series_plan.md)
5. [01-why-townpet-exists.md](./01-why-townpet-exists.md)
6. [02-how-townpet-is-structured.md](./02-how-townpet-is-structured.md)
7. [03-nextjs-app-router-for-backend-engineers.md](./03-nextjs-app-router-for-backend-engineers.md)
8. [04-server-component-and-client-component-boundary.md](./04-server-component-and-client-component-boundary.md)
9. [05-prisma-zod-service-route-order.md](./05-prisma-zod-service-route-order.md)
10. [06-feed-and-board-architecture.md](./06-feed-and-board-architecture.md)
11. [07-post-create-edit-delete-flow.md](./07-post-create-edit-delete-flow.md)
12. [08-comments-and-reactions-architecture.md](./08-comments-and-reactions-architecture.md)
13. [09-search-structured-search-and-suggestions.md](./09-search-structured-search-and-suggestions.md)
14. [11-credentials-kakao-naver-auth.md](./11-credentials-kakao-naver-auth.md)
15. [12-session-role-and-admin-surface.md](./12-session-role-and-admin-surface.md)
16. [13-social-account-link-unlink-lifecycle.md](./13-social-account-link-unlink-lifecycle.md)
17. [14-report-block-sanction-direct-moderation.md](./14-report-block-sanction-direct-moderation.md)
18. [15-admin-hub-and-ops-dashboard.md](./15-admin-hub-and-ops-dashboard.md)
19. [16-rate-limit-guest-safety-and-abuse-defense.md](./16-rate-limit-guest-safety-and-abuse-defense.md)
20. [10-notification-center-and-unread-sync.md](./10-notification-center-and-unread-sync.md)
21. [17-prisma-migrations-and-schema-drift-response.md](./17-prisma-migrations-and-schema-drift-response.md)
22. [18-health-check-retention-cleanup-and-maintenance-workflows.md](./18-health-check-retention-cleanup-and-maintenance-workflows.md)
23. [19-testing-and-quality-gate.md](./19-testing-and-quality-gate.md)
24. [20-performance-story-search-cache-pagination.md](./20-performance-story-search-cache-pagination.md)
25. [21-business-idea-and-expansion-axes.md](./21-business-idea-and-expansion-axes.md)
26. [22-phase2-roadmap-and-product-expansion.md](./22-phase2-roadmap-and-product-expansion.md)
27. [23-how-ai-agents-were-used-in-real-development.md](./23-how-ai-agents-were-used-in-real-development.md)
28. [24-demo-docs-and-interview-pack.md](./24-demo-docs-and-interview-pack.md)
29. [25-overengineering-ci-and-deploy-pipelines.md](./25-overengineering-ci-and-deploy-pipelines.md)
30. [26-suneditor-selection-and-typing-boundary.md](./26-suneditor-selection-and-typing-boundary.md)

## 이 시리즈가 다루는 범위

- TownPet 문제 정의와 제품 아이디어
- Next.js App Router 구조
- React Server Component / Client Component
- Prisma, Zod, Service, Query, Route의 역할 분리
- 피드, 글, 댓글, 검색, 알림
- 인증, 권한, 소셜 로그인
- 신고, 차단, 제재, 모더레이션
- 운영 대시보드, health check, retention cleanup
- 테스트, quality gate, 배포
- 성능 개선과 캐시/페이지네이션 구조
- AI agent 기반 개발 방식
- README/데모/문서/면접 패키지 정리
- CI/CD 과설계 회고와 운영 판단
- rich text editor selection/typing boundary 안정화
