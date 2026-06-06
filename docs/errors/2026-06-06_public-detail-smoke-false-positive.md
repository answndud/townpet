# public detail visual smoke false positive

- 날짜: `2026-06-06`
- 영향: `ops:check:public-detail-visual`이 요청 타입 중 일부가 public feed에 없어도 README에만 `BLOCKED`로 남기고 프로세스는 성공할 수 있었다.
- 원인: 기본 public smoke 타입에 auth/local 보호형 상세(`HOSPITAL_REVIEW`, `CARE_REQUEST`)가 포함되어 있었고, blocked entry가 최종 실패 조건에 포함되지 않았다.
- 추가 발견: 모바일 상세에서는 신고 진입이 `게시글 메뉴` 안에 접혀 있어 닫힌 화면의 body text만 보면 신고 항목이 없다고 오판할 수 있었다.
- 수정: public 기본 타입을 공개 guest feed 대상(`FREE_BOARD`, `WALK_ROUTE`, `LOST_FOUND`, `MARKET_LISTING`)으로 좁히고, blocked type이 있으면 smoke를 실패 처리한다. 모바일 신고 항목은 게시글 메뉴를 열어 확인한다.
- 검증: production `ops:check:public-detail-visual` 재실행에서 기본 4개 타입 desktop/mobile 모두 PASS.
