# PROGRESS.md

기준일: 2026-04-24
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서를 `docs/` 아래 slim active + archive 구조로 재편했다
- Impeccable 디자인 개선 workflow Phase 0-5를 완료했다
- 최근 완료 작업 상세와 과거 검증 로그는 [COMPLETED.md](./COMPLETED.md)로 이동했다
- 공개 SEO / metadata / sitemap 안정화를 완료했다
- 보안 헤더 / 운영 smoke evidence 보강을 완료했다
- 로딩 / 빈상태 polish 잔여 점검을 완료했다
- 다음 작업: 레드팀 P0/P1 잔여 remediation 확인

## 열린 blocker
- 없음. 기존 `db:restore:local` local test account count mismatch는 managed account count 검증으로 수정했고 restore 통과를 확인했다.

## 직전 검증
- 로딩 / 빈상태 polish 잔여 점검:
  - 변경: `/bookmarks`, `/my-posts`의 검색/필터 0건 상태를 전체 empty와 분리하고, loading skeleton을 실제 hero/filter/list 구조에 맞췄다.
  - 유지: auth, bookmark, post query, pagination, policy 로직은 변경 없음.
  - 통과: `corepack pnpm -C app design:detect`, 관련 Vitest 54개, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, `corepack pnpm -C app quality:check` 196 files / 933 tests, placeholder env `corepack pnpm -C app build`.
- 과거 Phase 0-5와 checkpoint/push 상세는 [COMPLETED.md](./COMPLETED.md)에 보관했다.

## 다음 액션
1. 레드팀 P0/P1 관련 문서와 테스트 증거를 확인한다.
2. 잔여 gap이 있으면 한 항목만 골라 최소 수정 후 quality gate를 실행한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
