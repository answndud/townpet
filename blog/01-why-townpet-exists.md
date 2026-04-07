# 01. 왜 TownPet를 만들었는가

## 이번 글에서 풀 문제

TownPet는 “반려동물 커뮤니티를 하나 더 만든 프로젝트”가 아닙니다.

이 프로젝트는 처음부터 아래 질문에서 시작했습니다.

- 반려인이 정말 자주 찾는 정보는 왜 항상 뒤섞여 있을까?
- 왜 병원 후기, 입양 공고, 산책 정보, 중고 거래, 실종 제보가 한 타임라인 안에서 경쟁해야 할까?
- 왜 이런 제품은 검색, 신뢰 장치, 운영 구조보다 먼저 자유게시판부터 커지는 경우가 많을까?

이 글은 TownPet의 출발점을 정리합니다.
핵심은 “무엇을 만들었는가”보다 먼저 “왜 이런 구조를 택했는가”를 분명히 잡는 것입니다.

## 왜 이 글이 중요한가

TownPet의 코드는 제품 아이디어를 그대로 반영합니다.

- `LOCAL / GLOBAL` 분리
- 구조화 게시판
- 신고/차단/제재/운영 대시보드
- 검색 telemetry와 zero-result 운영 루프

이런 것들은 기술적 취향 때문에 생긴 것이 아닙니다.  
반려 도메인의 문제를 풀기 위해 필요해서 들어간 구조입니다.

그래서 이 글을 먼저 읽으면 이후의 기술 문서가 훨씬 덜 산만하게 보입니다.

## 먼저 볼 문서와 화면

- [README.md](/Users/alex/project/townpet/README.md)
- [docs/business/내부_개발_운영_개요.md](/Users/alex/project/townpet/docs/business/%EB%82%B4%EB%B6%80_%EA%B0%9C%EB%B0%9C_%EC%9A%B4%EC%98%81_%EA%B0%9C%EC%9A%94.md)
- [docs/business/수익화_실험_전략.md](/Users/alex/project/townpet/docs/business/%EC%88%98%EC%9D%B5%ED%99%94_%EC%8B%A4%ED%97%98_%EC%A0%84%EB%9E%B5.md)
- [app/src/app/feed/page.tsx](/Users/alex/project/townpet/app/src/app/feed/page.tsx)
- [app/src/app/search/page.tsx](/Users/alex/project/townpet/app/src/app/search/page.tsx)
- [app/src/app/boards/adoption/page.tsx](/Users/alex/project/townpet/app/src/app/boards/adoption/page.tsx)
- [app/src/app/admin/ops/page.tsx](/Users/alex/project/townpet/app/src/app/admin/ops/page.tsx)

## 먼저 알아둘 개념

### 1. TownPet는 “커뮤니티 앱”보다 “행동 유도형 정보 서비스”에 가깝다

일반 커뮤니티는 보통 이렇게 동작합니다.

- 자유글이 중심이다
- 댓글과 인기글이 핵심 지표다
- 정보는 텍스트 안에 섞여 있다

TownPet는 다르게 접근합니다.

- 병원을 찾는다
- 입양 공고를 비교한다
- 봉사나 돌봄 요청을 찾는다
- 지역 안에서 실제 행동으로 이어진다

즉 TownPet의 핵심은 “글을 많이 읽는 것”이 아니라 “지금 필요한 상황을 빨리 해결하는 것”입니다.

### 2. 문제는 콘텐츠 양이 아니라 맥락 혼합이다

반려 정보는 의도가 분명합니다.

- 병원 후기
- 유기동물 입양
- 산책 코스
- 장터/공동구매
- 실종/목격

그런데 기존 채널에서는 이 정보가 한 피드 안에 섞여 있는 경우가 많습니다.  
그러면 사용자는 “정보가 없는 것”보다 “있는데 찾기 어려운 것”에 더 많이 막힙니다.

TownPet는 이 문제를 `지역 + 상황` 구조로 다시 나눕니다.

## 1. TownPet가 푸는 실제 사용자 문제

반려인이 겪는 대표 상황은 대부분 시간 민감도가 있습니다.

- 오늘 갈 병원을 찾아야 한다
- 이번 주말 입양처를 비교해야 한다
- 지금 분실 제보를 봐야 한다
- 오늘 동네 산책 정보가 필요하다

이런 흐름에서는 단순 최신순 피드만으로는 부족합니다.

필요한 것은:

1. 상황별로 나뉜 진입면
2. 검색 가능한 구조화 정보
3. 신뢰를 담보하는 운영 장치
4. 지역성과 전국 단위 탐색을 함께 다루는 구조

TownPet는 이 네 가지를 같이 설계한 프로젝트입니다.

## 2. 왜 `지역 + 상황` 구조인가

TownPet의 가장 중요한 제품 판단은 두 가지입니다.

### 지역

- 동네 기반 질문과 재방문
- 실제 생활 동선과 가까운 정보
- 산책, 모임, 생활형 대화

### 상황

- 병원 후기
- 입양 공고
- 보호소 봉사
- 장터/공동구매
- 실종/목격

이 둘을 같이 잡아야만 “커뮤니티성”과 “정보 탐색성”을 동시에 가질 수 있습니다.

코드로 보면 이 판단이 이렇게 드러납니다.

- `Post.scope = LOCAL | GLOBAL`
- `Post.boardScope = COMMUNITY | COMMON`
- 구조화 필드와 보드별 validation
- 검색/자동완성/ops telemetry의 분리

즉 TownPet는 카테고리를 나열한 것이 아니라, 제품의 기본 좌표계를 `지역`과 `상황`으로 잡았습니다.

## 3. 왜 자유글보다 구조화 입력을 먼저 넣었는가

TownPet는 자유글을 없애지 않았습니다.  
하지만 우선순위는 자유글보다 구조화 게시판에 더 가깝습니다.

이유는 분명합니다.

### 검색 품질

병원명, 지역, 품종, 치료 유형, 보호소명 같은 필드가 있어야 검색이 좋아집니다.

### 카드 비교

입양 게시판이나 병원 후기 게시판은 단순 텍스트보다 카드형 비교가 훨씬 잘 맞습니다.

### 운영 개선

zero-result 검색어, 누락 필드, alias 정규화를 운영자가 보고 손볼 수 있습니다.

### 이후 확장

구조화 데이터가 있어야 추천, 광고, 리드, 파트너 상품, 상태 머신으로 연결하기 쉽습니다.

즉 구조화 입력은 UX 장식이 아니라, TownPet의 정보 구조 그 자체입니다.

## 4. 왜 moderation과 ops를 초반부터 강하게 넣었는가

반려 도메인은 감정 비용이 높습니다.

- 입양
- 병원 후기
- 거래
- 실종/목격

이런 영역은 일반 자유게시판보다 분쟁과 악용이 빨리 생깁니다.

그래서 TownPet는 처음부터 아래를 기본값으로 넣었습니다.

- 신고
- 차단/뮤트
- 제재
- direct moderation
- 운영 감사 로그
- `/admin/ops`
- health check / cleanup workflow

이 구조는 과한 것이 아니라, 오히려 도메인에 맞는 최소선에 가깝습니다.

## 5. 왜 `LOCAL / GLOBAL`을 같이 두는가

TownPet가 `LOCAL`과 `GLOBAL`을 같이 두는 이유는 단순히 필터를 풍부하게 만들기 위해서가 아닙니다.

### `LOCAL`

- 재방문과 관계 형성
- 동네 질문, 산책, 생활형 정보
- 지역 커뮤니티 감각

### `GLOBAL`

- 병원 후기, 입양, 봉사처럼 더 넓게 읽혀야 하는 정보
- 공급이 적은 콘텐츠의 밀도 확보
- 검색과 랭킹, 구조화 정보 누적

즉 TownPet는 동네 커뮤니티와 전국 단위 정보 탐색을 따로 분리하면서도 한 제품 안에 묶으려는 구조입니다.

## 6. 이 아이디어가 코드에서 어떻게 보이는가

제품 아이디어는 README 설명에만 있지 않습니다.  
실제 코드 구조에도 바로 박혀 있습니다.

예:

- [app/src/app/feed/page.tsx](/Users/alex/project/townpet/app/src/app/feed/page.tsx)
  - `LOCAL / GLOBAL`, 정렬, 기간, 타입 필터를 피드 진입점에서 다룹니다.
- [app/src/app/boards/adoption/page.tsx](/Users/alex/project/townpet/app/src/app/boards/adoption/page.tsx)
  - 입양이라는 하나의 상황을 독립된 전용 게시판으로 다룹니다.
- [app/src/server/queries/post.queries.ts](/Users/alex/project/townpet/app/src/server/queries/post.queries.ts)
  - 검색, suggestion, structured search, context별 telemetry가 붙어 있습니다.
- [app/src/app/admin/ops/page.tsx](/Users/alex/project/townpet/app/src/app/admin/ops/page.tsx)
  - 운영자가 검색 zero-result, auth 실패, 신고 적체를 볼 수 있습니다.

즉 TownPet는 “예쁜 게시판”보다 “운영 가능한 정보 구조”를 먼저 만든 프로젝트입니다.

## 7. 이 제품이 사업적으로 갖는 의미

TownPet는 콘텐츠를 많이 모으는 것만으로 끝나지 않습니다.

의도가 강한 보드는 이후 확장 여지가 큽니다.

- 병원: 제휴, 리뷰 신뢰 상품, 광고
- 입양/봉사: 기관 노출, 검증형 파트너십
- 거래: 상태 머신, 안전장치
- 검색/운영 로그: 어떤 니즈가 반복되는지 관찰 가능

그래서 TownPet는 커뮤니티이면서도,  
나중에는 정보 탐색과 파트너 연결이 가능한 구조를 가집니다.

## 테스트는 어떻게 읽어야 하는가

이 글은 제품 문제 정의 문서라서 unit test보다 아래 자료를 함께 보면 됩니다.

- [README.md](/Users/alex/project/townpet/README.md)
- [blog/21-business-idea-and-expansion-axes.md](/Users/alex/project/townpet/blog/21-business-idea-and-expansion-axes.md)
- [blog/22-phase2-roadmap-and-product-expansion.md](/Users/alex/project/townpet/blog/22-phase2-roadmap-and-product-expansion.md)
- [docs/business/수익화_실험_전략.md](/Users/alex/project/townpet/docs/business/%EC%88%98%EC%9D%B5%ED%99%94_%EC%8B%A4%ED%97%98_%EC%A0%84%EB%9E%B5.md)

그리고 실제 화면은 아래 순서로 보는 것이 좋습니다.

1. `/feed`
2. `/search`
3. `/boards/adoption`
4. `/admin/ops`

## 현재 구현의 한계

- 아직 거래 상태 머신이나 결제는 없습니다.
- 구조화 보드는 준비됐지만, 데이터 밀도는 계속 운영으로 쌓아야 합니다.
- 비즈니스 모델은 가능성을 설계한 단계이고, 실제 수익화는 Phase 2 이후입니다.

## Python/Java 개발자용 요약

- TownPet는 자유게시판 중심 커뮤니티가 아니라, 반려인의 고의도 상황을 `지역 + 구조화된 맥락`으로 다시 나누는 제품입니다.
- 그래서 피드, 검색, moderation, ops 설계가 일반 커뮤니티보다 더 두껍습니다.
- 이후 글에서 보는 대부분의 코드 결정은 이 문제 정의에서 출발합니다.

## 면접에서 이렇게 설명할 수 있다

> TownPet는 반려 정보를 단순 게시글로 모으는 대신, 입양·병원·봉사·거래 같은 고의도 상황을 지역성과 구조화 데이터 위에서 다시 연결하는 프로젝트입니다. 그래서 자유글보다 구조화 게시판, 검색 품질, moderation, 운영 대시보드를 먼저 설계했고, 그 결과 코드도 `지역 + 상황 + 신뢰 장치`를 중심으로 짜여 있습니다.
