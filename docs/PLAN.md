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

### 카카오 공유 SDK 실전 smoke 증적 확보

- 상태: in_progress
- 목표: 카카오 공유 SDK 1차 구현이 production/local에서 안전하게 노출되는지 확인하고, 제가 직접 확인할 수 없는 실기기 카카오톡 전송은 명확한 보류 증적으로 남긴다.
- 범위: local env 존재 여부, Vercel/production 버튼 노출 여부, SDK lazy-load/fallback 경로, 공유 액션 API 수용 여부, smoke 리포트.
- 제외: Kakao Developers 콘솔 직접 대행, Android/iOS 카카오톡 앱 실전 전송.
- 완료 기준: 확인 가능한 항목은 PASS/FAIL로 기록하고, 실기기 전송은 필요한 설정/절차/체크리스트와 함께 보류로 분류한다.

## 다음 작업 후보

- 분실/목격 제보 상태 변경, 보호자-제보자 비공개 대화, 지도 기반 표시 중 다음 확장 후보를 별도 설계한다.
