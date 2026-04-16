# BLOG_PLAN.md

기준일: 2026-04-07
목표: `blog/`만 읽어도 TownPet의 구조, 설계 의도, 구현 흐름, 운영 포인트를 따라갈 수 있는 재현형 포트폴리오 시리즈를 만든다.

## 블로그 작업 원칙
- 블로그 SSOT는 이 문서와 `BLOG_PROGRESS.md`다.
- 애플리케이션 개발 SSOT는 계속 `PLAN.md`, `PROGRESS.md`를 사용한다.
- 독자 기준은 `Python/Java 백엔드 경험은 있지만 JS/React/Next는 낯선 개발자`다.
- 각 글은 반드시 `문제 -> 개념 -> 파일 -> 코드 -> 테스트 -> 한계 -> 면접 포인트` 순서를 따른다.
- 글에서 언급하는 파일/함수/명령은 현재 저장소 기준으로 실제 존재해야 한다.

## 대상 독자
- Python/Django, FastAPI, Java/Spring Boot 경험자
- React, Next.js App Router, Server Component, NextAuth가 낯선 개발자
- 단순 기능 소개보다 “왜 이렇게 나눴는가”와 “어디서부터 읽어야 하는가”가 필요한 독자

## 지금 바로 만든 메타 문서
| 문서 | 목적 | 상태 |
|---|---|---|
| `blog/README.md` | 시리즈 전체 목적/읽는 순서/범위 설명 | `done` |
| `blog/00_series_plan.md` | 공개용 연재 목차와 학습 흐름 | `done` |
| `blog/00_rebuild_guide.md` | 각 글의 공통 작성 규칙 | `done` |
| `blog/00_quality_checklist.md` | 초보자 이해도/재현성/면접 대응력 기준 | `done` |
| `blog/00_js_for_backend_engineers.md` | Python/Java 개발자를 위한 JS/Next 번역 가이드 | `done` |
| `blog/02-how-townpet-is-structured.md` | 저장소 전체 구조와 읽는 순서 설명 | `done` |
| `blog/03-nextjs-app-router-for-backend-engineers.md` | App Router를 백엔드 관점으로 번역 | `done` |
| `blog/04-server-component-and-client-component-boundary.md` | Server Component / Client Component 경계 설명 | `done` |
| `blog/05-prisma-zod-service-route-order.md` | Prisma -> Zod -> Service -> Route/UI 읽기 순서 설명 | `done` |
| `blog/06-feed-and-board-architecture.md` | 피드, 보드, read model 구조 설명 | `done` |
| `blog/07-post-create-edit-delete-flow.md` | 글 작성/수정/삭제 흐름 설명 | `done` |
| `blog/08-comments-and-reactions-architecture.md` | 댓글, reply, best comment, 반응 구조 설명 | `done` |
| `blog/09-search-structured-search-and-suggestions.md` | 검색, 구조화 검색, suggestion 설명 | `done` |
| `blog/11-credentials-kakao-naver-auth.md` | Credentials/Kakao/Naver 인증 구조 설명 | `done` |
| `blog/12-session-role-and-admin-surface.md` | 세션, role, 관리자 surface 설명 | `done` |
| `blog/13-social-account-link-unlink-lifecycle.md` | 소셜 계정 연결/해제 lifecycle 설명 | `done` |
| `blog/14-report-block-sanction-direct-moderation.md` | 신고/차단/제재/직접 모더레이션 설명 | `done` |
| `blog/15-admin-hub-and-ops-dashboard.md` | 관리자 허브와 `/admin/ops` 운영 대시보드 설명 | `done` |
| `blog/16-rate-limit-guest-safety-and-abuse-defense.md` | rate limit, guest safety, abuse defense 설명 | `done` |
| `blog/10-notification-center-and-unread-sync.md` | 알림 센터, unread sync, redirect 흐름 설명 | `done` |
| `blog/17-prisma-migrations-and-schema-drift-response.md` | Prisma migration과 schema drift 대응 설명 | `done` |
| `blog/18-health-check-retention-cleanup-and-maintenance-workflows.md` | health/cleanup/maintenance workflow 설명 | `done` |
| `blog/19-testing-and-quality-gate.md` | Vitest/Playwright/quality gate/ops smoke 전략 설명 | `done` |
| `blog/20-performance-story-search-cache-pagination.md` | 캐시/검색/페이지네이션 기반 성능 개선 설명 | `done` |
| `blog/21-business-idea-and-expansion-axes.md` | TownPet의 비즈니스 아이디어와 확장축 설명 | `done` |
| `blog/22-phase2-roadmap-and-product-expansion.md` | Phase 2 로드맵과 제품 확장 방향 설명 | `done` |
| `blog/01-why-townpet-exists.md` | TownPet 문제 정의와 출발점 설명 | `done` |
| `blog/23-how-ai-agents-were-used-in-real-development.md` | AI agent 기반 개발 방식 설명 | `done` |
| `blog/24-demo-docs-and-interview-pack.md` | README/데모/문서/면접 패키지 설명 | `done` |
| `blog/25-overengineering-ci-and-deploy-pipelines.md` | quality gate/deploy pipeline 과설계 회고와 hot path 재설계 판단 설명 | `done` |
| `blog/26-suneditor-selection-and-typing-boundary.md` | SunEditor 전환 후 selection/typing boundary 회귀와 on-demand browser smoke 판단 설명 | `done` |

## 실제 연재 구조 초안

### Part A. 프로젝트와 문제 정의
1. 왜 TownPet를 만들었는가
2. TownPet 전체 구조 한 장으로 보기

### Part B. JS/Next 기초 번역
3. Next.js App Router를 백엔드 관점에서 이해하기
4. Server Component와 Client Component를 어떻게 나눴는가
5. Prisma -> Zod -> Service -> Route/UI 순서로 읽는 법

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

### Part H. 회고와 운영 판단
25. quality gate와 deploy pipeline을 과하게 설계하면 생기는 일
26. SunEditor 전환에서 selection과 typing boundary를 끝까지 고정하기

## 집필 우선순위
1. `09 / 15 / 19 / 20 / 25` 운영 캡처 추가
2. `01 / 21 / 22 / 24` 제품-사업 서사 연결 문장 추가 보강
3. 핵심 글 5편 정도는 본문 안에 실제 명령 블록과 체크리스트를 더 촘촘히 넣기
4. 시리즈 입구에 `처음 읽는 사람 추천 순서` 추가

이유:
- 핵심 본문 `01`부터 `25`까지 초안이 모두 채워졌다.
- 링크 외부 공개성, 공통 템플릿, 검증 명령, 면접 Q&A 부록까지 1차 정리가 끝났다.
- 이제는 새 글 추가보다, 시각 자료와 면접 대응 밀도를 높이는 보강 단계가 더 중요하다.

## 각 글에 꼭 들어가야 할 것
- 이번 글에서 풀 문제
- 지금 이 글을 읽어야 하는 이유
- 먼저 알아둘 JS/Next 개념
- 이번 글에서 볼 파일
- 요청/데이터 흐름 그림
- 파일/함수 단위 코드 설명
- 테스트와 검증 명령
- 현재 구현의 한계
- Python/Java 개발자용 요약
- 면접 포인트
