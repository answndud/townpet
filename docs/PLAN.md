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
   - 상태: in_progress
   - 필요값: production 관리자 smoke 계정 `ADMIN_QUEUE_SMOKE_EMAIL`, `ADMIN_QUEUE_SMOKE_PASSWORD`
   - 실행 base URL: `OPS_BASE_URL=https://townpet.vercel.app`를 명령에 inline 지정하면 됨
   - 최신 확인: 2026-06-07 `OPS_BASE_URL=https://townpet.vercel.app ./node_modules/.bin/tsx scripts/check-admin-queue-smoke.ts` 실행 시 `ADMIN_QUEUE_SMOKE_EMAIL is required for authenticated admin queue smoke.`로 BLOCKED.
   - 대체 시도: 2026-06-07 `care.smoke.admin@townpet.dev`와 문서상 기본 비밀번호 조합은 production credential login에서 `CredentialsSignin`으로 거절됨.
   - GitHub 실행 경로: `ops-smoke-checks`를 `verify_admin_queue=true`로 수동 실행하면 GitHub Secrets `ADMIN_QUEUE_SMOKE_EMAIL`, `ADMIN_QUEUE_SMOKE_PASSWORD`로 authenticated admin queue smoke를 실행함.
   - 2026-06-07 GitHub Actions run `27090154907`은 secret 검증과 health는 통과했지만 `Install Playwright Chromium` 단계가 12분 job timeout을 초과해 smoke 본문까지 도달하지 못함.
   - 2026-06-07 GitHub Actions run `27090473838`도 Playwright Chromium 설치 단계에 장시간 머물러 취소함. workflow는 GitHub hosted runner의 system Chrome을 `ADMIN_QUEUE_SMOKE_BROWSER_CHANNEL=chrome`으로 사용하도록 바꾸고 재실행한다.
   - 2026-06-07 GitHub Actions run `27090692211`은 secret 검증, health, system Chrome 확인까지 통과했고 `Check authenticated admin queue`에서 `CredentialsSignin`으로 실패함. workflow 경로는 정상이며, production DB의 smoke 계정이 없거나 비밀번호/hash/emailVerified/admin role 중 하나가 secret과 맞지 않는 상태다.
   - 2026-06-07 GitHub Actions에 `provision_admin_queue_smoke=true` input을 추가해 `DATABASE_URL`, `ADMIN_QUEUE_SMOKE_EMAIL`, `ADMIN_QUEUE_SMOKE_PASSWORD` secret으로 production DB smoke admin 계정을 먼저 보정한 뒤 authenticated smoke를 실행할 수 있게 한다.
   - 대체 확인: 2026-06-07 로컬 fixture smoke는 PASS했으므로 production credential 준비 전까지는 추가 실행 필요 없음.
   - 완료 기준: production DB에 해당 이메일의 `role=ADMIN`, `emailVerified` 존재, `passwordHash`가 GitHub Secret 비밀번호와 일치하는 계정을 만든 뒤 production `production_credentials` mode report가 PASS.
