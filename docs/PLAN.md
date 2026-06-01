# PLAN.md

목표: TownPet를 기능/운영/품질/속도 기준에서 실제 유저 획득이 가능한 동네 반려생활 정보 서비스 상태로 유지한다.

완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 범위/원칙

- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다.
- 완료 상세와 긴 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append한다.
- 새 작업을 시작할 때는 코드보다 먼저 이 문서에 새 phase를 추가한다.
- 지역을 하나로 제한하지 않는다. `/`과 public acquisition UI에는 사용자가 선택하지 않은 특정 지역명을 기본값처럼 노출하지 않는다.
- 보류 범위: 결제/보험/정산, 자동 제재 강행, 카카오맵/마켓/공동구매 deep feature 확장.

## Active

### Production feed smoke 확인

- 상태: `in_progress`
- 목표: 배포 환경에서 인기글 migration 반영 여부와 `/feed/guest` 상단 검색/인기글 기본 동작을 확인한다.
- 범위:
  - `https://townpet.vercel.app/api/feed/guest`가 schema 오류 없이 응답하는지 확인한다.
  - `https://townpet.vercel.app/feed/guest`에서 상단 검색 폼과 `전체글 / 인기글` 탭이 표시되는지 확인한다.
  - production DB migration이 막혀 있으면 원인과 필요한 조치를 기록한다.
- 완료 기준:
  - production smoke 결과를 [COMPLETED.md](./COMPLETED.md)에 기록하고 active 문서를 비운다.

## 다음 작업 후보

- authenticated admin queue smoke production credential 확보 후 재실행
