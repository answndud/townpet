# BLOG_PROGRESS.md

기준일: 2026-04-07

## 진행 현황 요약
- Cycle B1: 블로그 작업공간 초기화 완료
- Cycle B2: 구조/라우팅/계층 분리 본문 3개 추가 완료

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
  - [02-how-townpet-is-structured.md](/Users/alex/project/townpet/blog/02-how-townpet-is-structured.md)를 작성해 저장소 전체 지도, 폴더 역할, 추천 읽기 순서를 정리했다.
  - [03-nextjs-app-router-for-backend-engineers.md](/Users/alex/project/townpet/blog/03-nextjs-app-router-for-backend-engineers.md)를 작성해 `page.tsx`, `route.ts`, `layout.tsx`, `Server Action`을 Python/Java 개발자 기준으로 번역했다.
  - [05-prisma-zod-service-route-order.md](/Users/alex/project/townpet/blog/05-prisma-zod-service-route-order.md)를 작성해 TownPet의 대표 구현 순서인 `Prisma -> Zod -> Service -> Route/UI`를 게시글 생성 흐름으로 설명했다.
  - [blog/README.md](/Users/alex/project/townpet/blog/README.md), [00_series_plan.md](/Users/alex/project/townpet/blog/00_series_plan.md), [BLOG_PLAN.md](/Users/alex/project/townpet/BLOG_PLAN.md)도 새 본문 링크와 다음 집필 우선순위에 맞게 갱신했다.
- 검증 결과
  - 본문에서 참조한 핵심 코드 파일 존재 여부를 직접 확인했다.
  - `git diff --check` 통과
- 메모
  - 다음 우선순위는 `11. Credentials + Kakao + Naver 인증 구조`, `14. 신고/차단/제재/직접 모더레이션`, `09. 검색, 구조화 검색, suggestion`이다.
