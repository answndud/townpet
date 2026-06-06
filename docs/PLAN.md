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
  - 우선순위는 public feed/detail 체감 로딩 확인과 필요 수정이다.
- 작업 순서:
  1. public feed/detail 체감 로딩 재측정과 필요 수정
     - 문제: 이번 점검에서 10초 지연은 재현되지 않았지만, 피드가 짧게 `피드를 불러오는 중` 상태를 보인다.
     - 기대 동작: home/feed/detail 첫 진입의 측정값을 남기고, 실제 병목이 있으면 서버 렌더/초기 데이터/캐시 정책 쪽으로 원인을 좁힌다.
     - 완료 기준: 수정 전후 수치를 같은 방식으로 비교할 수 있고, 기능 수정으로 성능 회귀가 생기지 않는다.
     - 검증: `pnpm -C app ops:perf:snapshot` 또는 브라우저 Performance/Lighthouse 수동 측정, production 또는 preview URL 기준 기록.
- 다음 액션:
  - public feed/detail 체감 로딩을 재측정하고 병목 여부를 판단한다.
- 검증:
  - 최소 `pnpm -C app lint`
  - 최소 `pnpm -C app typecheck`
  - 변경 범위에 맞는 unit/e2e targeted test
  - 공개 URL 또는 로컬 브라우저 smoke로 재현 경로 확인
- 관련 파일:
  - `app/src/components`
  - `app/src/server/queries/posts`

## 다음 작업 후보

- 인기글 수동 해제/관리 액션 필요성 검토: 운영자가 특정 글을 인기글에서 내릴 수 있어야 하는지 UX/정책 후보 정리
- authenticated admin queue smoke production credential 확보 후 재실행
