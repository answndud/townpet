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

2. Web Vitals field sample 확대 후 재판정
   - 상태: conditional
   - 이유: 2026-06-07 재확인 기준 production Web Vitals sample은 `/` LCP 4개, `/feed/guest` LCP 12개로 여전히 작아 lab 측정과 field p75/p95가 크게 갈린다.
   - 다음 액션: 7일 sample이 route별 최소 30개 이상 쌓인 뒤 `perf:web-vitals:remote`를 재실행하고, 같은 날 browser/asset snapshot과 비교한다.
   - 완료 기준: field p75/p95가 반복적으로 budget을 넘으면 구체 개선 작업으로 전환하고, 아니면 정상 변동으로 archive한다.

3. authenticated admin queue smoke local fixture fallback 실행
   - 상태: ready
   - 이유: production credential은 blocked지만 local fixture mode로 smoke report 계약과 관리자 큐 기본 흐름은 계속 검증할 수 있다.
   - 다음 액션: `ADMIN_QUEUE_SMOKE_LOCAL_FIXTURES=1 OPS_BASE_URL=http://localhost:3000` 조건으로 로컬 fixture smoke를 실행하고 report mode/status를 확인한다.
   - 완료 기준: local fixture report가 PASS하거나, 실패 시 재현 단계와 원인 후보를 남긴다.
