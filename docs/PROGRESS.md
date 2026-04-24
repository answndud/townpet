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
- 레드팀 P0/P1 잔여 remediation 확인을 완료했다
- 다음 작업: 운영 문서 최신성 점검

## 열린 blocker
- 없음. 기존 `db:restore:local` local test account count mismatch는 managed account count 검증으로 수정했고 restore 통과를 확인했다.

## 직전 검증
- 레드팀 P0/P1 잔여 remediation 확인:
  - 변경: `business/product/게시글_코어.md`의 stale `신고 3건 이상이면 HIDDEN` 규칙을 현재 가중치 기반 자동숨김 정책으로 갱신했다.
  - 추가: 고정 3건 자동숨김 문구가 정책 문서에 재도입되지 않도록 문서 일관성 테스트를 추가했다.
  - 유지: report service/API, moderation scoring, admin queue 로직은 변경 없음.
  - 통과: 관련 Vitest 18개, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, `corepack pnpm -C app quality:check` 197 files / 935 tests, placeholder env `corepack pnpm -C app build`.
- 과거 Phase 0-5와 checkpoint/push 상세는 [COMPLETED.md](./COMPLETED.md)에 보관했다.

## 다음 액션
1. 운영 문서와 `app/package.json` scripts의 대표 명령을 대조한다.
2. 불일치가 있으면 문서를 최소 수정하고 검증한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
