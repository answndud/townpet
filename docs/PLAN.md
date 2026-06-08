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

현재 active 작업 없음.

## 다음 작업 후보

- 로컬 production 서버에서 `perf:traffic` spike profile을 실행해 순간 concurrency 100의 queueing/tail latency를 확인한다.
- traffic 리포트에서 tail latency가 가장 큰 `home`/`lost_found_page` cache 상태와 page payload를 좁혀 본다.
- 분실/목격 다음 확장 후보를 전단 이미지 품질, 카카오 공유 SDK, 보호자 전용 제보 관리 화면 중 하나로 좁혀 설계한다.
