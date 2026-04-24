# 2026-04-24 | 피드 컨트롤 정렬/기간 클릭 체감 미적용

## 증상

- 피드 보기에서 베스트글 상태로 정렬 버튼을 누르면 URL이 같은 베스트글 조건으로 유지되어 정렬 클릭이 적용되지 않는 것처럼 보였다.
- 회원이 맞춤 추천을 켠 상태에서는 정렬/기간 버튼을 눌러도 개인화 재정렬이 유지되어 최신/좋아요/댓글 정렬의 체감 효과가 약했다.
- 프로덕션 `/feed/guest`에서 정렬/기간 링크를 클릭하면 URL 변경 직후 다시 기본 `/feed/guest` 상태로 되돌아갔다.

## 원인

- `FeedControlPanel`의 정렬 버튼이 현재 `mode`를 유지한 채 `nextSort`만 넘겼다.
- `BEST` 모드에서는 서버가 `sort`를 사용하지 않기 때문에 정렬 버튼 href가 사실상 no-op이 됐다.
- 기간/정렬 전환 시 `personalized=1`을 명시적으로 해제하지 않아, 인증 사용자에게 개인화 재정렬이 계속 적용될 수 있었다.
- `GuestFeedPageClient`의 canonical 정리 effect가 `queryString` 변경 즉시 이전 피드 데이터로 canonical href를 계산했다. 이 때문에 `/feed/guest?sort=LIKE`로 이동하자마자 아직 기본 피드 데이터가 남아 있는 상태에서 `/feed/guest`로 `router.replace`됐다.

## 수정

- 정렬 버튼 클릭 시 `nextMode: "ALL"`과 `nextPersonalized: "0"`을 함께 전달한다.
- 기간 버튼 클릭 시에도 `ALL` 피드와 비개인화 조건을 명시한다.
- 베스트글 상태에서는 정렬 버튼을 active로 표시하지 않게 했다.
- 게스트 피드 canonical 정리는 현재 query에 대응하는 API 데이터가 로드된 뒤에만 실행하도록 `loadedQueryString` guard를 추가했다.

## 회귀 테스트

- `app/src/components/posts/feed-control-panel.test.tsx`
  - 정렬 컨트롤이 전체글/비개인화 조건으로 href를 생성하는지 검증
  - 기간 컨트롤이 전체글/비개인화 조건으로 href를 생성하는지 검증
- `app/src/components/posts/guest-feed-page-client.test.ts`
  - 새 query의 데이터가 로드되기 전에는 canonical replace를 실행하지 않는지 검증
