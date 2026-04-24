# PROGRESS.md

기준일: 2026-04-24
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서를 `docs/` 아래 slim active + archive 구조로 재편했다
- Impeccable 디자인 개선 workflow Phase 0-5를 완료했다
- 최근 완료 작업 상세와 과거 검증 로그는 [COMPLETED.md](./COMPLETED.md)로 이동했다
- 공개 SEO / metadata / sitemap 안정화를 완료했다
- 다음 작업: 보안 헤더 / 운영 smoke evidence 보강

## 열린 blocker
- 없음. 기존 `db:restore:local` local test account count mismatch는 managed account count 검증으로 수정했고 restore 통과를 확인했다.

## 직전 검증
- 공개 SEO / metadata / sitemap 안정화:
  - 변경: `/boards/adoption`을 public sitemap static route에 추가했고, redirect alias/private/auth/admin/API 화면은 sitemap/robots 경계로 고정했다.
  - 수정: Next 16 dynamic sitemap 실제 경로가 `/sitemap/0.xml`인데 robots가 `/sitemap.xml`을 가리키던 404 증거를 발견해 수정했다.
  - 유지: 게시글 조회, 검색, 인증, 관리자, 운영 정책 로직은 변경 없음.
  - endpoint evidence: `curl http://localhost:3000/robots.txt`, `curl -I http://localhost:3000/sitemap/0.xml`, sitemap loc 확인 통과.
  - 통과: `corepack pnpm -C app exec vitest run src/app/sitemap.test.ts src/app/robots.test.ts`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, `corepack pnpm -C app quality:check` 194 files / 929 tests, placeholder env `corepack pnpm -C app build`.
  - 참고: 기본 `corepack pnpm -C app build`는 로컬 필수 env 누락으로 실패하므로 placeholder env를 명시해 검증했다.
- 과거 Phase 0-5와 checkpoint/push 상세는 [COMPLETED.md](./COMPLETED.md)에 보관했다.

## 다음 액션
1. `release-readiness` 기준으로 security header와 운영 smoke evidence의 현재 커버리지를 확인한다.
2. 누락된 증거 또는 경미한 테스트 갭이 있으면 최소 수정 후 quality gate를 실행한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
