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
   - 필요값: production 관리자 smoke 계정 `ADMIN_QUEUE_SMOKE_EMAIL`, `ADMIN_QUEUE_SMOKE_PASSWORD`
   - 실행 base URL: `OPS_BASE_URL=https://townpet.vercel.app`를 명령에 inline 지정하면 됨
   - 최신 확인: 2026-06-07 `OPS_BASE_URL=https://townpet.vercel.app ./node_modules/.bin/tsx scripts/check-admin-queue-smoke.ts` 실행 시 `ADMIN_QUEUE_SMOKE_EMAIL is required for authenticated admin queue smoke.`로 BLOCKED.
   - 대체 시도: 2026-06-07 `care.smoke.admin@townpet.dev`와 문서상 기본 비밀번호 조합은 production credential login에서 `CredentialsSignin`으로 거절됨.
   - 대체 확인: 2026-06-07 로컬 fixture smoke는 PASS했으므로 production credential 준비 전까지는 추가 실행 필요 없음.
   - 완료 기준: production `production_credentials` mode report가 PASS.
