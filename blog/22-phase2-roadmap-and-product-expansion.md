# 22. Phase 2 로드맵과 제품 확장 방향

## 이번 글에서 풀 문제

TownPet는 이미 커뮤니티, 검색, 인증, 모더레이션, 운영 대시보드까지 갖춘 상태입니다.  
그 다음 단계는 “무엇을 더 만들 수 있는가”가 아니라, “어떤 순서로 열어야 위험하지 않은가”입니다.

이 글은 TownPet의 Phase 2 로드맵을 정리합니다.

## 왜 이 글이 중요한가

많은 포트폴리오는 현재 기능까지만 설명하고 끝납니다.  
하지만 실제 제품은 다음 단계의 우선순위가 훨씬 중요합니다.

TownPet는 Phase 2를 아래 기준으로 정합니다.

- 데이터 밀도
- 운영 리스크
- 신뢰 비용
- 검색/개인화 레버리지

즉 이 글은 “다음에 뭘 만들지”보다 “왜 그 순서로 가야 하는지”를 설명합니다.

## 먼저 볼 문서와 파일

- `/Users/alex/project/townpet/docs/product/Phase2_로드맵_PRD.md`
- `/Users/alex/project/townpet/docs/business/수익화_실험_전략.md`
- `/Users/alex/project/townpet/docs/analytics/가격_실험계획.md`
- `/Users/alex/project/townpet/app/src/app/admin/ops/page.tsx`
- `/Users/alex/project/townpet/app/src/server/queries/search.queries.ts`
- `/Users/alex/project/townpet/app/src/lib/feed-personalization.ts`
- `/Users/alex/project/townpet/app/prisma/schema.prisma`

## 먼저 알아둘 개념

### 1. Phase 2는 “기능 목록”이 아니라 “리스크 순서”다

TownPet 문서에서 Phase 2는 다음처럼 배치됩니다.

1. 검색/개인화/운영 증폭
2. 마켓 상태 머신
3. 케어/돌봄 요청
4. 지도/카카오맵 탐색
5. 결제/정산

즉 화려한 기능부터 여는 게 아니라,  
운영 난이도와 신뢰 리스크가 낮은 것부터 엽니다.

### 2. TownPet는 결제를 가장 나중에 둔다

문서의 한 줄 판단은 분명합니다.

> 결제는 기능이 아니라 운영 시스템이다.

즉 거래 상태, 증빙, 환불, 분쟁, 정산, 회계, 법적 고지가 먼저입니다.

## 1. 현재 Phase 1 출발점

Phase 2 PRD는 현재 TownPet의 출발점을 이렇게 정의합니다.

이미 있는 것:

- community core
- search
- moderation
- alert
- structured input
- upload/media
- public profile
- auth hardening
- `/admin/ops`
- personalization

아직 없는 것:

- 거래 상태 머신
- 결제/정산
- 지도 기반 탐색
- 케어/예약형 워크플로우

즉 TownPet는 “커뮤니티 기반은 충분히 있음, 하지만 transaction layer는 없음” 상태입니다.

## 2. 왜 Phase 2A가 검색/개인화/운영 증폭인가

문서:

- `/Users/alex/project/townpet/docs/product/Phase2_로드맵_PRD.md`

Phase 2A 범위:

- 초성/오타/띄어쓰기 대응
- zero-result 운영 루프
- `/admin/ops` 기반 운영
- 품종 개인화/광고 tuning

이게 1순위인 이유:

1. 리스크가 낮습니다.
2. 이미 있는 사용자 행동 데이터를 바로 활용할 수 있습니다.
3. community density를 높여 이후 Phase 2 기능 성공 확률을 올릴 수 있습니다.

즉 TownPet는 “먼저 더 잘 찾게 만들고, 더 잘 운영하게 만든다”를 Phase 2의 첫 단계로 둡니다.

## 3. 왜 그 다음이 마켓 상태 머신인가

현재도 `MARKET_LISTING` 타입은 있습니다.  
하지만 아직은 “게시글” 수준입니다.

Phase 2B가 하려는 것:

- `OPEN -> RESERVED -> COMPLETED / CANCELLED`
- 판매자/구매자 역할
- 상태 변경 로그
- 문의/협의 동선
- 신고/제재 연동

즉 장터 글을 진짜 `거래 상태가 있는 도메인`으로 올리는 단계입니다.

중요한 점:

- 아직 결제는 하지 않습니다.
- 에스크로도 넣지 않습니다.

TownPet는 거래의 가장 위험한 부분을 바로 열지 않고,  
먼저 상태 머신과 로그부터 붙이려는 구조입니다.

## 4. 케어/돌봄 요청은 왜 그 다음인가

Phase 2C는 케어/구인구직/돌봄 요청입니다.

이 기능의 핵심은 자유게시판이 아니라 요청 템플릿입니다.

예상 필드:

- 날짜
- 지역
- 대상 반려동물
- 요청 유형
- 상태 전환

이 역시 TownPet가 계속 미는 방향과 같습니다.

- free text보다 structured request
- 단발 글보다 상태가 있는 workflow

즉 마켓 다음에 케어가 오는 이유는,  
둘 다 “요청/상태/운영 추적” 구조가 필요하기 때문입니다.

## 5. 지도/카카오맵은 왜 뒤로 밀리는가

Phase 2D는 지도 기반 탐색입니다.

이 기능이 뒤에 오는 이유:

1. 장소명/병원명/지역명 canonicalization이 더 필요합니다.
2. search/structured field 운영 데이터가 더 쌓여야 합니다.
3. 지도는 보기엔 좋아 보여도, 실제 제품 가치가 나오려면 데이터 정제가 먼저입니다.

즉 TownPet는 지도부터 붙이는 대신,  
먼저 구조화 데이터와 검색 품질을 정리한 뒤에 지도 surface를 올리려는 전략입니다.

## 6. 결제/정산은 왜 마지막인가

Phase 2E는 가장 마지막입니다.

문서의 판단을 기술적으로 풀면:

- 상태 머신이 있어야 함
- dispute 로그가 있어야 함
- moderation action log가 있어야 함
- 운영자가 수동 대응을 충분히 해봐야 함
- 법적 고지/환불/정산 정책이 있어야 함

즉 TownPet는 결제를 “기능 추가”로 보지 않습니다.  
운영/정책/회계 시스템까지 붙는 별도 단계로 봅니다.

## 7. 왜 이 우선순위가 합리적인가

이 순서는 “만들기 쉬운 순서”가 아닙니다.  
`운영 리스크 대비 학습 가치가 높은 순서`입니다.

### 먼저 얻는 것

- 검색 개선
- 운영 데이터 축적
- personalization 신뢰도 증가
- 구조화 입력 품질 향상

### 나중에 여는 것

- 거래 상태
- 돌봄 요청
- 지도 탐색
- 결제

즉 TownPet는 먼저 데이터와 운영 체계를 두껍게 하고,  
그 위에 더 무거운 기능을 올리려는 전략입니다.

## 8. 현재 코드와 어떻게 연결되는가

이미 깔린 레일:

- 검색 telemetry
- `SearchTermDailyMetric`
- `/admin/ops`
- personalization/ad policy
- `MARKET_LISTING`
- 구조화 보드
- moderation / sanction / audit

즉 Phase 2는 뜬금없는 새 제품이 아니라,  
지금 코드가 이미 만들어 둔 기반 위에 올리는 다음 단계입니다.

## 9. Phase 2를 시작하기 전 Go / No-Go 기준

문서에는 명시적으로 운영 기준이 있습니다.

- 14일 연속 `/api/health` 주요 체크 정상
- 신고 적체와 인증 실패율 안정
- zero-result search와 cache bypass 경고가 관리 가능
- 운영자 수동 루틴으로도 대응 가능한 규모

이건 중요한 포인트입니다.

TownPet는 단순히 “개발이 끝났으니 다음 기능 추가”가 아니라,  
운영 지표가 안정적일 때만 다음 단계를 열도록 설계했습니다.

## 10. 지금 시점의 최종 판단

문서 기준 최종 판단:

- 지금 바로 해야 하는 Phase 2: 검색/개인화/운영 증폭
- 지금 바로 하면 안 되는 Phase 2: 결제/정산
- 마켓/케어/지도는 순차 오픈

즉 TownPet의 다음 단계는:

1. 검색과 운영을 더 날카롭게 만들고
2. 그 다음 거래 상태를 만들고
3. 그 뒤에 케어/지도/결제를 연다

는 순서입니다.

## 테스트는 어떻게 읽어야 하는가

Phase 2 글은 전략 문서이므로 테스트보다는 아래를 같이 보는 게 맞습니다.

- `/Users/alex/project/townpet/docs/product/Phase2_로드맵_PRD.md`
- `/Users/alex/project/townpet/app/src/app/admin/ops/page.tsx`
- `/Users/alex/project/townpet/app/src/server/queries/search.queries.ts`
- `/Users/alex/project/townpet/app/src/lib/feed-personalization.ts`

즉 전략 문서와 현재 운영/검색 구현을 같이 보는 방식입니다.

## 현재 구현의 한계

- Phase 2는 아직 문서와 일부 기반 코드까지입니다.
- 마켓 상태 머신, 케어 요청, 지도 surface는 아직 실제 도메인 모델이 없습니다.
- 운영 기준은 잡혀 있지만, 실사용 데이터가 더 필요합니다.

## Python/Java 개발자용 요약

- TownPet의 Phase 2는 “기능 추가 순서”가 아니라 “리스크 관리 순서”입니다.
- 검색/운영을 먼저 두껍게 만들고, 그 다음 상태 머신이 필요한 기능으로 갑니다.
- 결제는 가장 나중입니다.

## 면접에서 이렇게 설명할 수 있다

> TownPet의 Phase 2는 화려한 기능을 먼저 여는 계획이 아닙니다. 먼저 검색과 운영 루프를 강화해서 데이터 밀도와 신뢰를 높이고, 그 다음 마켓 상태 머신과 케어 요청처럼 상태가 있는 도메인을 열고, 결제는 가장 마지막에 두는 순서입니다. 즉 기능 우선이 아니라 운영 리스크 우선 로드맵입니다.
