# PROGRESS.md

기준일: 2026-04-24
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서를 `docs/` 아래 slim active + archive 구조로 재편했다
- Impeccable 디자인 개선 workflow Phase 0-5를 완료했다
- 최근 완료 작업 상세와 과거 검증 로그는 [COMPLETED.md](./COMPLETED.md)로 이동했다
- 공개 SEO / metadata / sitemap 안정화를 완료했다
- 보안 헤더 / 운영 smoke evidence 보강을 완료했다
- 다음 작업: 로딩 / 빈상태 polish 잔여 점검

## 열린 blocker
- 없음. 기존 `db:restore:local` local test account count mismatch는 managed account count 검증으로 수정했고 restore 통과를 확인했다.

## 직전 검증
- 보안 헤더 / 운영 smoke evidence 보강:
  - 변경: `next.config.ts`의 전역 security header bundle과 public cache rules 분리를 회귀 테스트로 고정했다.
  - 유지: 보안 헤더 값, middleware CSP, health endpoint, 운영 스크립트 로직은 변경 없음.
  - smoke evidence: strict security env preflight pass=8/warn=2/fail=0, local `/api/health` 200, controlPlane ok, `pg_trgm` enabled, `/feed/guest` security headers 확인.
  - 통과: `corepack pnpm -C app exec vitest run scripts/next-config-security-headers.test.ts src/lib/security-headers.test.ts src/app/api/health/route.test.ts`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, `corepack pnpm -C app quality:check` 195 files / 931 tests, placeholder env `corepack pnpm -C app build`.
- 과거 Phase 0-5와 checkpoint/push 상세는 [COMPLETED.md](./COMPLETED.md)에 보관했다.

## 다음 액션
1. loading/empty/error 상태가 약한 화면군을 하나만 고른다.
2. 구현 전 대상 화면군과 검증 명령을 `docs/PLAN.md`에 구체화한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
