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

1. 로컬 전체 품질 체크포인트
   - 이유: 2026-06-06에 성능/운영 smoke 스크립트와 문서 consistency를 여러 작은 커밋으로 연속 보강했다.
   - 다음 액션: `./node_modules/.bin/eslint`, `./node_modules/.bin/tsc --noEmit --pretty false`, `./node_modules/.bin/vitest run` 또는 가능한 범위의 `quality:check`를 실행해 누적 drift를 확인한다.
   - 완료 기준: 실패 항목을 `정상 / 버그 / 환경 문제`로 분류하고, 실제 버그는 별도 작업으로 쪼갠다.

2. 배포 후 public health/performance spot check
   - 이유: 최근 변경은 운영/성능 측정 표면을 넓혔고, main push 이후 production 반영 상태를 짧게 확인할 필요가 있다.
   - 다음 액션: latest deploy 반영 후 `ops:check:health`, focused `perf:baseline`, 필요 시 `perf:api-timings`/`ops:perf:snapshot`을 target filter로 짧게 실행한다.
   - 완료 기준: health PASS, focused performance가 `business/operations/성능_budget.md` 기준을 벗어나지 않음.

3. authenticated admin queue smoke production credential 확보 후 재실행
   - 상태: blocked
   - 필요값: `ADMIN_QUEUE_SMOKE_EMAIL`, `ADMIN_QUEUE_SMOKE_PASSWORD`, `OPS_BASE_URL=https://townpet.vercel.app`
   - 대체 확인: credential 준비 전에는 `ADMIN_QUEUE_SMOKE_LOCAL_FIXTURES=1 OPS_BASE_URL=http://localhost:3000` 로컬 fixture smoke만 가능하다.
   - 완료 기준: production `production_credentials` mode report가 PASS.

4. Web Vitals report 실제 수집 상태 확인
   - 상태: conditional
   - 조건: production에 `WebVitalSample` schema/client가 배포되어 있고 실제 브라우저 sample이 쌓여 있어야 한다.
   - 다음 액션: `WEB_VITALS_REPORT_DAYS=7 WEB_VITALS_REPORT_LIMIT=5000 pnpm -C app perf:web-vitals` 실행 후 report 상태가 `NO_SAMPLES`인지 metric rows인지 분류한다.
   - 완료 기준: sample rows가 있으면 p75/p95 해석, 없으면 수집 경로 또는 트래픽 조건을 별도 후보로 남긴다.
