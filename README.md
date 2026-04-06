# TownPet

> AI 에이전트 기반으로 설계, 구현, 검증, 운영까지 밀어붙인 반려동물 커뮤니티 프로젝트

[데모 사이트 링크](https://townpet.vercel.app)
---
[개발 계획](./PLAN.md) · [실행 로그](./PROGRESS.md)

TownPet은 단순 커뮤니티가 아니라, 반려인이 `병원 · 입양 · 산책 · 거래 · 분실` 같은 상황별 정보를 더 빨리 찾고 더 신뢰할 수 있게 만드는 로컬 반려 플랫폼을 목표로 한 프로젝트입니다.
핵심은 AI를 자동완성 도구가 아니라, **문제 분해 → 구현 → 테스트 → 배포 → 운영 개선**까지 함께 돌리는 개발 시스템으로 사용했다는 점입니다.

## 핵심 아이디어

- 반려 정보는 병원 후기, 입양 공고, 산책 코스, 중고 거래처럼 맥락이 강한데, 대부분 한 채널 안에서 뒤섞여 있어 탐색 비용이 큽니다.
- TownPet은 이 문제를 `지역 + 상황` 단위로 다시 쪼개서, 범용 게시판이 아니라 **행동으로 이어지는 정보 화면**을 만드는 방향으로 접근했습니다.
- 그래서 자유글보다 `구조화 게시판`, 조회수보다 `신뢰 장치`, 단순 피드보다 `운영 가능한 커뮤니티 구조`를 먼저 설계했습니다.

## 왜 사업적으로 흥미로운가

- `지역 커뮤니티`와 `상황별 정보 탐색`을 한 제품 안에서 연결할 수 있습니다.
- 입양, 병원, 산책, 거래처럼 intent가 분명한 카테고리는 이후 추천, 광고, 제휴, 거래 상태 머신으로 확장하기 좋습니다.
- 단순 콘텐츠 모음이 아니라, 구조화된 UGC와 운영 로그가 계속 쌓이는 형태라 서비스와 데이터가 함께 커집니다.

## 대표 화면

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="./docs/assets/readme/feed-desktop.png" alt="TownPet 전체 피드" width="100%" />
      <p><strong>전체 피드</strong><br />게시판 태그, 정렬, 기간 필터가 한 화면에 보이는 커뮤니티 기본 화면</p>
    </td>
    <td width="50%" valign="top">
      <img src="./docs/assets/readme/search-desktop.png" alt="TownPet 게시글 검색" width="100%" />
      <p><strong>게시글 검색</strong><br />검색 결과, 자동완성, zero-result 운영 개선이 연결되는 검색 화면</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="./docs/assets/readme/adoption-desktop.png" alt="TownPet 유기동물 입양 게시판" width="100%" />
      <p><strong>유기동물 입양 게시판</strong><br />보호소, 지역, 품종 같은 구조화 정보를 카드 중심으로 보여주는 전용 게시판</p>
    </td>
    <td width="50%" valign="top">
      <img src="./docs/assets/readme/market-desktop.png" alt="TownPet 중고 공동구매 게시판" width="100%" />
      <p><strong>중고 · 공동구매 게시판</strong><br />장터/공동구매 타입이 피드 필터와 함께 동작하는 거래형 게시판 화면</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="./docs/assets/readme/post-detail-desktop.png" alt="TownPet 글 상세와 댓글" width="100%" />
      <p><strong>글 상세와 댓글/반응</strong><br />글 본문, 구조화 메타 정보, 댓글, 반응까지 한 흐름으로 보여주는 상세 화면</p>
    </td>
    <td width="50%" valign="top" align="center">
      <img src="./docs/assets/readme/adoption-mobile.png" alt="TownPet 모바일 입양 게시판" width="72%" />
      <p><strong>모바일 사용성</strong><br />모바일에서도 검색과 게시판 탐색이 바로 가능하도록 헤더 밀도와 진입성을 정리한 화면</p>
    </td>
  </tr>
</table>

## 제품으로서 보여주는 것

### 1. 커뮤니티를 정보 탐색 제품으로 바꾼 구조
- `LOCAL / GLOBAL` 피드와 검색을 나눠 지역 커뮤니티 감각과 확장성을 같이 가져가도록 설계했습니다.
- 병원 후기, 입양, 산책, 거래, 봉사처럼 서로 다른 맥락을 게시판과 구조화 필드로 분리했습니다.

### 2. 신뢰를 기본값으로 둔 운영형 구조
- Kakao / Naver / Credentials 인증, 신고/차단/제재, 직접 모더레이션, 관리자 감사 로그를 제품 기본값으로 넣었습니다.
- `/admin/ops`, health check, cleanup workflow까지 포함해 배포 후에도 운영 가능한 상태를 목표로 했습니다.

### 3. AI를 실제 개발 방식으로 내재화한 프로젝트
- 작업을 작은 사이클로 분해하고, `PLAN.md`와 `PROGRESS.md`로 계획/실행/검증 로그를 남겼습니다.
- 기능 추가뿐 아니라 보안, migration chain, 운영 가드, 모바일 사용성까지 AI 에이전트와 함께 반복적으로 닫았습니다.

## 기술적으로 한 일

- `LOCAL / GLOBAL` 정책이 분리된 커뮤니티 피드와 검색
- Kakao / Naver / Credentials 인증, 온보딩, 세션/권한 제어
- 신고, 차단, 제재, 직접 모더레이션, 관리자 감사 로그
- 검색 자동완성, 구조화 검색, zero-result 분석, `/admin/ops` 운영 대시보드
- Prisma migration, health check, retention cleanup, CI quality gate까지 포함한 운영형 구조

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
