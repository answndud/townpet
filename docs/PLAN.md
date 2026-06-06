# PLAN.md

목표: TownPet를 기능/운영/품질/속도 기준에서 실제 유저 획득이 가능한 동네 반려생활 정보 서비스 상태로 유지한다.

완료 이력 archive: [DONE.md](./DONE.md)

## 범위/원칙

- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다.
- 완료 요약은 [DONE.md](./DONE.md)에 5줄 이하로 append한다.
- 새 작업을 시작할 때는 코드보다 먼저 이 문서에 새 phase를 추가한다.
- 지역을 하나로 제한하지 않는다. `/`과 public acquisition UI에는 사용자가 선택하지 않은 특정 지역명을 기본값처럼 노출하지 않는다.
- 보류 범위: 결제/보험/정산, 자동 제재 강행, 카카오맵/마켓/공동구매 deep feature 확장.

## Active

### 프로덕션 브라우저 점검 발견 문제 수정

- 상태: pending
- 목표:
  - `https://townpet.vercel.app/` 직접 점검에서 발견한 공개 사용자 흐름 문제를 기능 영향도가 큰 순서대로 수정한다.
  - 우선순위는 URL/라우팅 일관성, 모바일 상세 UI 정리, 인기글 빈 상태 개선, 체감 로딩 확인 순서로 둔다.
- 작업 순서:
  1. guest/public feed 링크 생성 경로 정리
     - 문제: guest 화면 일부 네비게이션 href가 `/feed?...`로 생성된 뒤 `/feed/guest?...`로 redirect된다.
     - 기대 동작: guest/public UI에서는 처음부터 `/feed/guest?...` 링크를 생성한다.
     - 확인 파일 후보: public header/nav 컴포넌트, feed category link presenter, `app/src/app/feed/page.tsx`, `app/src/app/feed/guest/page.tsx`.
     - 완료 기준: guest 홈/피드/상세의 게시판·카테고리 링크가 불필요한 redirect 없이 guest canonical URL을 가리킨다.
     - 검증: link href unit test 또는 Playwright route assertion, legacy `/feed?...` redirect는 기존 호환으로 유지.
  2. 게시글 상세 모바일 운영자 정보 CTA 중복 여부 정리
     - 문제: 모바일 상세 텍스트 기준 `이 정보 정정 요청` CTA가 중복 노출될 가능성이 있다.
     - 기대 동작: desktop/mobile 어느 viewport에서도 같은 운영자 정정 CTA가 동시에 중복 노출되지 않는다.
     - 확인 파일 후보: `app/src/components/posts/post-detail-client.tsx`, 운영자 정리/source box 관련 컴포넌트.
     - 완료 기준: 모바일에서는 CTA가 정보 박스 하단 또는 명확한 한 위치에만 보이고, desktop에서도 CTA 의미가 겹치지 않는다.
     - 검증: 모바일 viewport 브라우저 확인, 가능하면 Testing Library로 중복 text/button count 회귀 테스트.
  3. 인기글 빈 상태와 초기 운영 노출 정책 개선
     - 문제: `/feed/guest?mode=BEST`와 `/best`는 정상 동작하지만 프로덕션에서 빈 상태라 서비스가 비활성처럼 보인다.
     - 기대 동작: 인기글이 없을 때도 사용자가 막힌 느낌을 받지 않고 전체글로 자연스럽게 이동하거나, 운영자 시드/승격 정책으로 최소 콘텐츠가 보인다.
     - 선택지:
       - 빈 상태 문구를 더 짧고 덜 죽은 화면처럼 개선하고 `전체글` 이동을 명확히 한다.
       - 운영자 seed 글이 인기글 조건을 만족하도록 좋아요 임계값/승격 정책을 조정한다.
       - 초기 운영 기간에는 인기글 CTA 노출 조건을 완화한다.
     - 완료 기준: 인기글이 0건이어도 제품 신뢰도를 크게 떨어뜨리지 않는 화면이 된다.
     - 검증: `/feed/guest?mode=BEST`, `/best` 브라우저 확인.
  4. public feed/detail 체감 로딩 재측정과 필요 수정
     - 문제: 이번 점검에서 10초 지연은 재현되지 않았지만, 피드가 짧게 `피드를 불러오는 중` 상태를 보인다.
     - 기대 동작: home/feed/detail 첫 진입의 측정값을 남기고, 실제 병목이 있으면 서버 렌더/초기 데이터/캐시 정책 쪽으로 원인을 좁힌다.
     - 완료 기준: 수정 전후 수치를 같은 방식으로 비교할 수 있고, 기능 수정으로 성능 회귀가 생기지 않는다.
     - 검증: `pnpm -C app ops:perf:snapshot` 또는 브라우저 Performance/Lighthouse 수동 측정, production 또는 preview URL 기준 기록.
- 다음 액션:
  - 1번 guest/public feed 링크 생성 경로 정리부터 구현한다.
- 검증:
  - 최소 `pnpm -C app lint`
  - 최소 `pnpm -C app typecheck`
  - 변경 범위에 맞는 unit/e2e targeted test
  - 공개 URL 또는 로컬 브라우저 smoke로 재현 경로 확인
- 관련 파일:
  - `app/src/app/feed`
  - `app/src/components`
  - `app/src/server/queries/posts`

## 다음 작업 후보

- 인기글 수동 해제/관리 액션 필요성 검토: 운영자가 특정 글을 인기글에서 내릴 수 있어야 하는지 UX/정책 후보 정리
- authenticated admin queue smoke production credential 확보 후 재실행
