# TownPet

> AI 에이전트 기반으로 설계, 구현, 검증, 운영까지 밀어붙인 반려동물 커뮤니티 프로젝트

[라이브 데모](https://townpet.vercel.app) · [개발 계획](./PLAN.md) · [실행 로그](./PROGRESS.md)

TownPet은 단순 CRUD 토이 프로젝트가 아니라, 실제 서비스처럼 `피드 · 검색 · 인증 · 신고/제재 · 관리자 도구 · 운영 대시보드`까지 한 흐름으로 닫은 프로젝트입니다.
특히 이 프로젝트는 AI를 자동완성 도구가 아니라, **문제 분해 → 구현 → 테스트 → 배포 → 운영 개선**까지 함께 돌리는 개발 시스템으로 사용한 점이 핵심입니다.

## 왜 시작했는가

- 예비창업패키지 관점에서, 지역 반려인은 병원·돌봄·산책·분실·거래 정보를 여러 채널에서 따로 찾아야 해서 시간과 신뢰 비용이 크다는 문제를 먼저 봤습니다.
- TownPet은 범용 반려 앱이 아니라, `지역 + 상황` 중심으로 지금 바로 실행 가능한 정보를 더 빨리 찾게 만드는 로컬 반려 커뮤니티/플랫폼을 목표로 했습니다.
- 그래서 기능 수를 늘리기보다 `템플릿 기반 글쓰기`, `Local / Global 분리`, `신고/제재/운영 로그` 같은 신뢰 장치를 제품 기본값으로 먼저 설계했습니다.

## 한눈에 보기

- `LOCAL / GLOBAL` 정책이 분리된 커뮤니티 피드와 검색
- Kakao / Naver / Credentials 인증, 온보딩, 세션/권한 제어
- 신고, 차단, 제재, 직접 모더레이션, 관리자 감사 로그
- 검색 자동완성, 구조화 검색, zero-result 분석, `/admin/ops` 운영 대시보드
- Prisma migration, health check, retention cleanup, CI quality gate까지 포함한 운영형 구조

## 대표 화면

**전체 피드**

<img src="./docs/assets/readme/feed-desktop.png" alt="TownPet 전체 피드" width="1100" />

- 게시판 태그, 정렬, 기간 필터가 한 화면에 보이는 커뮤니티 기본 화면

**게시글 검색**

<img src="./docs/assets/readme/search-desktop.png" alt="TownPet 게시글 검색" width="1100" />

- 검색 결과, 자동완성, zero-result 운영 개선이 연결되는 검색 화면

**유기동물 입양 게시판**

<img src="./docs/assets/readme/adoption-desktop.png" alt="TownPet 유기동물 입양 게시판" width="1100" />

- 보호소, 지역, 품종 같은 구조화 정보를 카드 중심으로 보여주는 전용 게시판

**중고 · 공동구매 게시판**

<img src="./docs/assets/readme/market-desktop.png" alt="TownPet 중고 공동구매 게시판" width="1100" />

- 장터/공동구매 타입이 피드 필터와 함께 동작하는 거래형 게시판 화면

**글 상세와 댓글/반응**

<img src="./docs/assets/readme/post-detail-desktop.png" alt="TownPet 글 상세와 댓글" width="1100" />

- 글 본문, 구조화 메타 정보, 댓글, 반응까지 한 흐름으로 보여주는 상세 화면

**모바일 사용성**

<p align="center">
  <img src="./docs/assets/readme/adoption-mobile.png" alt="TownPet 모바일 입양 게시판" width="420" />
</p>

- 모바일에서도 검색과 게시판 탐색이 바로 가능하도록 헤더 밀도와 진입성을 정리했다.

## 이 프로젝트가 보여주는 것

### 1. 기능 구현보다 운영 가능한 상태까지 만든 프로젝트
- 커뮤니티 핵심 기능뿐 아니라 신고, 제재, 관리자 허브, `/admin/ops`, health check, cleanup workflow까지 포함했습니다.
- 배포 후에도 검색 통계, auth audit, moderation log를 보고 운영할 수 있게 만들었습니다.

### 2. AI를 실제 개발 방식으로 내재화한 프로젝트
- 작업을 작은 사이클로 분해하고, `PLAN.md`와 `PROGRESS.md`로 계획/실행/검증 로그를 누적했습니다.
- 기능 추가뿐 아니라 보안, migration chain, 운영 가드, 모바일 사용성까지 AI 에이전트와 함께 반복적으로 닫았습니다.

### 3. 품질 기준이 있는 프로젝트
- 구현 순서를 `Prisma -> Zod -> Service -> Action/Route -> UI -> Tests`로 고정했습니다.
- lint, typecheck, unit/E2E, migration 검증, health check까지 품질 게이트를 운영했습니다.

## 기술 스택

- Next.js App Router
- React 19
- TypeScript
- Prisma + PostgreSQL
- Zod
- NextAuth v5
- Upstash Redis
- Vitest + Playwright
- Vercel

## AI-native 개발 방식

- 문제를 기능 단위가 아니라 `정합성`, `모더레이션`, `검색 품질`, `운영 가시성` 같은 축으로 나눴습니다.
- AI 에이전트에게 구현을 맡길 때도 바로 머지하지 않고, 테스트/문서/운영 영향까지 같이 확인했습니다.
- 결과적으로 README 한 장 뒤에 숨은 실제 산출물이 많습니다.
  - 제품/운영 문서: [docs](./docs)
  - 계획/실행 로그: [PLAN.md](./PLAN.md), [PROGRESS.md](./PROGRESS.md)
  - 보안 트랙: [보안 계획](./docs/security/%EB%B3%B4%EC%95%88_%EA%B3%84%ED%9A%8D.md), [보안 진행상황](./docs/security/%EB%B3%B4%EC%95%88_%EC%A7%84%ED%96%89%EC%83%81%ED%99%A9.md)

## 빠른 실행

```bash
docker compose up -d
cp app/.env.local app/.env
corepack pnpm -C app install
corepack pnpm -C app db:migrate
corepack pnpm -C app db:seed
corepack pnpm -C app dev
```

## 한 줄 정리

> TownPet은 “AI로 빨리 만든 프로젝트”가 아니라, **AI를 활용해 제품·운영·보안·품질까지 끝까지 밀어붙인 프로젝트**입니다.
