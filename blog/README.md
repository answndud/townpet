# TownPet Blog Workspace

이 폴더는 TownPet를 기반으로 작성할 **재현형 개발 블로그 시리즈**의 작업 공간입니다.

이 시리즈의 목표는 세 가지입니다.

1. Python / Java 백엔드 경험자가 TownPet의 JS/Next 구조를 이해하게 만들기
2. 독자가 `blog/`만 읽고도 프로젝트를 어디서부터 읽어야 하는지 알게 만들기
3. 포트폴리오 관점에서 “무엇을 만들었는가”뿐 아니라 “왜 이렇게 설계했는가”까지 설명 가능하게 만들기

## 블로그 작업 SSOT

- [BLOG_PLAN.md](../BLOG_PLAN.md)
- [BLOG_PROGRESS.md](../BLOG_PROGRESS.md)
- [00_series_plan.md](./00_series_plan.md)
- [00_rebuild_guide.md](./00_rebuild_guide.md)
- [00_quality_checklist.md](./00_quality_checklist.md)
- [00_js_for_backend_engineers.md](./00_js_for_backend_engineers.md)

기존 [PLAN.md](../PLAN.md), [PROGRESS.md](../PROGRESS.md)는 계속 **앱 개발용 SSOT**로 유지합니다.

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
5. [02-how-townpet-is-structured.md](./02-how-townpet-is-structured.md)
6. [03-nextjs-app-router-for-backend-engineers.md](./03-nextjs-app-router-for-backend-engineers.md)
7. [05-prisma-zod-service-route-order.md](./05-prisma-zod-service-route-order.md)
8. 이후 각 본문을 순서대로 읽기

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
- AI agent 기반 개발 방식
