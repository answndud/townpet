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

1. authenticated admin queue smoke production credential 확보 후 재실행
   - 상태: blocked
   - 필요값: `ADMIN_QUEUE_SMOKE_EMAIL`, `ADMIN_QUEUE_SMOKE_PASSWORD`, `OPS_BASE_URL=https://townpet.vercel.app`
   - 대체 확인: credential 준비 전에는 `ADMIN_QUEUE_SMOKE_LOCAL_FIXTURES=1 OPS_BASE_URL=http://localhost:3000` 로컬 fixture smoke만 가능하다.
   - 완료 기준: production `production_credentials` mode report가 PASS.

2. production Web Vitals LCP/FCP 개선 후보 조사
   - 상태: ready
   - 이유: remote Web Vitals summary가 `OK`로 수집됐지만 `/` LCP p75 `2596ms`, FCP p95 `3148ms`, `/feed/guest` LCP p95 `2816ms`로 일부 field sample이 좋음 기준을 넘는다.
   - 다음 액션: browser trace와 route asset snapshot을 같은 production route 기준으로 다시 수집해 LCP element, 이미지/스크립트/스타일 차단 요인을 분리한다.
   - 완료 기준: sample 수가 작다는 전제를 기록하고도 개선 가능한 원인 후보를 `정상 / 버그 / 보류`로 분류한다.
