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

2. production Web Vitals summary 실행 경로 확보
   - 상태: ready
   - 이유: production 브라우저 수집 endpoint는 `recorded:true`로 검증됐지만, 로컬 `perf:web-vitals`는 local DB만 집계하므로 production p75/p95를 안전하게 읽는 경로가 아직 없다.
   - 다음 액션: production DB secret을 로컬로 내려받지 않고도 확인 가능한 admin-only summary route 또는 보호된 ops report 경로를 설계/구현한다.
   - 완료 기준: production sample count와 metric별 p75/p95를 admin 인증 또는 internal token으로 안전하게 확인할 수 있다.
