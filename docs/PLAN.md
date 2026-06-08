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

없음.

## 다음 작업 후보

- root `AppShellHeader` 전체를 route group별 server shell로 나눌 수 있는지 검토한다. root layout만으로는 pathname 구분이 어려워 route group 재구성이 필요할 수 있다.
- production 과부하를 피하는 저강도 browser metric 측정 루틴을 설계해 local spike와 실제 사용자 체감 성능을 분리한다.
- 분실/목격 다음 확장 후보를 전단 이미지 품질, 카카오 공유 SDK, 보호자 전용 제보 관리 화면 중 하나로 좁혀 설계한다.
