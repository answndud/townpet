# TownPet 개발 블로그 시리즈 요약 인덱스

이 문서는 공개용 목차입니다.

상세 집필 전략과 진행 로그는 [BLOG_PLAN.md](../BLOG_PLAN.md), [BLOG_PROGRESS.md](../BLOG_PROGRESS.md)를 SSOT로 사용합니다.

## 공개 순서

### Part A. 프로젝트와 문제 정의
1. 왜 TownPet를 만들었는가
2. [TownPet 전체 구조 한 장으로 보기](./02-how-townpet-is-structured.md)

### Part B. JS/Next 기초 번역
3. [Next.js App Router를 백엔드 관점에서 이해하기](./03-nextjs-app-router-for-backend-engineers.md)
4. Server Component와 Client Component를 어떻게 나눴는가
5. [Prisma -> Zod -> Service -> Route/UI 순서로 읽는 법](./05-prisma-zod-service-route-order.md)

### Part C. 커뮤니티 핵심 흐름
6. 피드와 게시판 구조
7. 글 작성/수정/삭제 흐름
8. 댓글과 반응 구조
9. 검색, 구조화 검색, suggestion
10. 알림 센터와 unread sync

### Part D. 인증과 권한
11. Credentials + Kakao + Naver 인증 구조
12. 세션, role, 관리자 surface
13. 소셜 계정 연결/해제 lifecycle

### Part E. 안전장치와 운영
14. 신고, 차단, 제재, 직접 모더레이션
15. 관리자 허브와 운영 대시보드
16. rate limit, guest safety, abuse defense

### Part F. 품질과 운영 안정화
17. Prisma migration과 schema drift 대응
18. health check, retention cleanup, maintenance workflow
19. Vitest / Playwright / quality-gate 전략
20. 성능 개선을 코드 구조와 함께 설명하기

### Part G. 제품/사업/포트폴리오 마감
21. TownPet의 비즈니스 아이디어와 확장축
22. Phase 2 로드맵과 제품 확장 방향
23. AI agent를 실제 개발 방식에 어떻게 녹였는가
24. 데모/문서/면접 패키지로 프로젝트를 마감하기

## 실제 집필 우선순위
1. 2. TownPet 전체 구조 한 장으로 보기
2. 3. Next.js App Router를 백엔드 관점에서 이해하기
3. 5. Prisma -> Zod -> Service -> Route/UI 순서로 읽는 법
4. 11. Credentials + Kakao + Naver 인증 구조
5. 14. 신고, 차단, 제재, 직접 모더레이션
