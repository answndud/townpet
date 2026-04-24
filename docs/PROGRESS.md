# PROGRESS.md

기준일: 2026-04-24
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서를 `docs/` 아래 slim active + archive 구조로 재편했다
- Impeccable 디자인 개선 workflow Phase 0-5를 완료했다
- 최근 완료 작업 상세와 과거 검증 로그는 [COMPLETED.md](./COMPLETED.md)로 이동했다
- 현재 작업: `/posts/new` 작성 form 흐름 완료 후 다음 Impeccable cycle 선정 대기

## 열린 blocker
- 없음. 기존 `db:restore:local` local test account count mismatch는 managed account count 검증으로 수정했고 restore 통과를 확인했다.

## 직전 검증
- Local restore 안정화:
  - `corepack pnpm -C app test -- scripts/seed-local-test-accounts.test.ts` 통과, 전체 Vitest 192 files / 924 tests 통과.
  - `corepack pnpm -C app db:seed:local-test-accounts` 통과, managed `52/49/3`, global `88/71/17`.
  - `corepack pnpm -C app db:restore:local` 통과.
  - `corepack pnpm -C app design:detect` 통과.
  - `corepack pnpm -C app lint` 통과, warning 0건.
  - `corepack pnpm -C app typecheck` 통과.
  - local inline env `corepack pnpm -C app build` 통과.
- Impeccable `/admin/reports` 화면군:
  - 변경: hero 통계 compact summary, 필터와 queue를 상단으로 이동, 통계/분포는 후순위 운영 summary로 정리, mobile queue card와 bulk/action touch target 개선.
  - 유지: report query, moderation priority, bulk/single action API, sanction policy 로직은 변경 없음.
  - screenshot evidence: `/tmp/townpet-admin-reports-baseline/{desktop,mobile}.png`, `/tmp/townpet-admin-reports-phase/{desktop-after,mobile-after}.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, local inline env `corepack pnpm -C app build`.
- Impeccable `/admin/reports/[id]` 상세 흐름:
  - 변경: Next dynamic params Promise runtime 오류 수정, 상세 hero/status summary, 신고 개요/대상 정보/처리 작업 2-column 구조, mobile stacked action flow, audit card list 정리.
  - 유지: report/moderation/sanction API와 정책 로직은 변경 없음.
  - screenshot evidence: `/tmp/townpet-admin-report-detail-baseline/{desktop,mobile}.png`, `/tmp/townpet-admin-report-detail-phase/{desktop-after,mobile-after,desktop-pending-after,mobile-pending-after}.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, local inline env `corepack pnpm -C app build`.
- Impeccable `/posts/new` 작성 form 흐름:
  - 변경: outer card 중첩 제거, page hero와 form 분리, 작성 기준/policy guidance를 첫 viewport에 배치, 주요 form controls 44px 계열 touch target으로 정리.
  - 유지: post validation/action/service 정책 로직은 변경 없음.
  - screenshot evidence: `/tmp/townpet-post-new-baseline/{desktop,mobile}.png`, `/tmp/townpet-post-new-phase/{desktop-after,desktop-after-2,mobile-after,mobile-after-2}.png`.
  - 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, local inline env `corepack pnpm -C app build`.
- checkpoint commit `896e6df`를 생성하고 `origin/codex/editor-stabilization-finish`에 push했다.
- Phase 1 public entry 구조 정리 완료 후 commit `f479001`을 원격에 push했다.
- Phase 2 DB unavailable 화면군 완료: `/boards/adoption`, `/posts/new`.
- 변경 요약: Prisma DB unavailable을 generic error 대신 `ServiceUnavailableState`로 복구 가능한 상태로 표시하고, 모바일에서 제목 줄바꿈이 깨지지 않도록 copy를 짧게 정리했다.
- screenshot evidence: `/tmp/townpet-impeccable-phase2/adoption-unavailable-{desktop,mobile}.png`, `/tmp/townpet-impeccable-phase2/post-new-unavailable-{desktop,mobile}.png`.
- 통과: `corepack pnpm -C app exec vitest run src/components/ui/service-unavailable-state.test.tsx`, `corepack pnpm -C app lint`(기존 warning 5개), `corepack pnpm -C app typecheck`.
- Phase 3 detector slice 완료 후 commit `0bdc471`을 원격에 push했다. `linkified-content`와 `post-detail-media-gallery`의 pure black overlay 4건 제거.
- 통과: `corepack pnpm -C app exec vitest run src/components/posts/post-detail-media-gallery.test.tsx`, `corepack pnpm -C app lint`(기존 warning 5개), `corepack pnpm -C app typecheck`.
- `corepack pnpm -C app design:detect`는 5건에서 1건으로 감소했다.
- Phase 4 `/admin/ops` density 개선 완료: status cards를 한 패널 안의 row summary로 정리하고 mobile first viewport에서 검색 품질 필터까지 진입 가능하게 했다.
- Phase 5 final polish 완료: editor blockquote side border를 full border soft block으로 바꿔 detector 잔여 1건 제거.
- 최종 통과: `corepack pnpm -C app design:detect`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, `corepack pnpm -C app test`, local inline env `corepack pnpm -C app build`.
- screenshot evidence: `/tmp/townpet-impeccable-phase4/admin-ops-{desktop,mobile}-{before,after}.png`.

## 다음 액션
1. 다음 Impeccable cycle 후보를 하나 고른다: public post detail/comment flow 또는 search result/detail handoff.
2. 시작 전 `.impeccable.md`, `DESIGN.md`, 관련 skill 문서와 route/component 구조를 다시 확인한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
