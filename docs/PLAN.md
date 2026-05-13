# PLAN.md

목표: TownPet를 기능/운영/품질 기준에서 출시 가능한 반려 커뮤니티 상태로 끌어올린다.

완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 범위/원칙

- 우선순위: `서비스 안정성 -> 커뮤니티 핵심 기능 -> 재방문/유입 -> 운영 자동화`
- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다.
- 완료 상세와 긴 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append한다.
- Phase 2 보류: 결제/보험/정산, 자동 제재 강행, 카카오맵/마켓/공동구매 deep feature 확장.

## Active

### P1-8: 1인 운영용 과설계 축소 배치

- 상태: `in_progress`
- 배경:
  - P1-7에서 production smoke를 health-only 중심으로 줄인 결과, 같은 기준을 나머지 운영/개발 표면에도 적용할 필요가 생겼다.
  - 현재 저장소는 출시 안정성을 끌어올리는 과정에서 workflow, package script, one-off 운영 스크립트, 운영 문서, 개인화/광고 판단 기준이 1인 운영 규모보다 넓어졌다.
  - 목표는 기능을 무작정 삭제하는 것이 아니라, 기본 경로를 작게 만들고 무거운 루틴은 on-demand 또는 archive로 낮추는 것이다.
- 축소 원칙:
  - 기본 루틴은 매일 기억할 수 있는 수준으로 둔다.
  - 운영 DB를 쓰거나 외부 계정/secret을 요구하는 작업은 자동 schedule보다 명시 수동 실행을 우선한다.
  - 사용 빈도가 낮은 one-off script는 `package.json`의 일상 명령 표면에서 제거하거나 문서 전용 실행법으로 격하한다.
  - 수집/스키마/테스트처럼 되돌리기 어려운 기반은 보존하고, 운영 판단/자동화/노출 경로부터 줄인다.
  - 삭제보다 먼저 `workflow_dispatch`, archive, on-demand 문서화로 리스크를 낮춘다.
- 완료 기준:
  - 각 축소 단위마다 변경 이유, 남긴 실행 경로, 검증 명령을 [COMPLETED.md](./COMPLETED.md)에 기록한다.
  - `docs/PLAN.md`와 `docs/PROGRESS.md`가 현재 작업과 다음 작업을 일관되게 가리킨다.
  - workflow/script 변경 후 관련 문서 freshness check가 통과한다.
  - 변경 범위별로 `lint`, `typecheck`, 관련 unit test 또는 YAML/script sanity check 중 필요한 검증을 실행한다.

#### P1-8.1 scheduled maintenance/workflow 축소

- 상태: `completed`
- 문제:
  - `.github/workflows`에 workflow가 12개 있고, 일부는 schedule로 production secret/DB에 접근한다.
  - `ops-latency-snapshots`는 하루 3회 실행되며, 1인 운영 단계에서는 비용/노이즈 대비 판단 가치가 낮다.
  - `auth-audit-cleanup`, `notification-cleanup`, `search-term-cleanup`, `post-integrity-maintenance`는 운영 DB를 대상으로 하므로 자동 schedule보다 수동 실행이 더 안전하다.
- 대상:
  - `.github/workflows/ops-latency-snapshots.yml`
  - `.github/workflows/auth-audit-cleanup.yml`
  - `.github/workflows/notification-cleanup.yml`
  - `.github/workflows/search-term-cleanup.yml`
  - `.github/workflows/post-integrity-maintenance.yml`
  - 관련 운영 문서: `AGENTS.md`, `app/README.md`, `business/operations/*`
- 작업:
  - 기본 schedule은 `quality-gate`, `docs-quality`, `ops-smoke-checks` 정도만 유지한다.
  - latency snapshot은 `workflow_dispatch` 전용으로 낮춘다.
  - retention cleanup과 post integrity repair는 `workflow_dispatch` 전용으로 낮추고, 실행 조건을 문서에 명시한다.
  - “매일/주간 자동 실행”으로 남아 있는 문구를 “필요 시 수동 실행”으로 정리한다.
- 완료 기준:
  - production DB 변경 가능성이 있는 maintenance workflow가 자동 schedule에서 빠져 있다.
  - on-demand 실행 방법이 운영 문서에 남아 있다.
  - YAML 문법 sanity와 docs freshness check가 통과한다.

#### P1-8.2 package script 표면 축소

- 상태: `completed`
- 문제:
  - `app/package.json` script가 81개로, 일상 명령과 one-off 운영 명령이 같은 레벨에 섞여 있다.
  - 신규 세션/AI agent가 어떤 명령을 기본으로 써야 하는지 판단 비용이 커진다.
- 대상:
  - `app/package.json`
  - `app/README.md`
  - `AGENTS.md`
  - `business/archive/operations/문서 동기화 리포트.md`
- 작업:
  - 일상 명령: `dev`, `build`, `lint`, `typecheck`, `test`, `quality:check`, `db:restore:local`, `ops:check:health`, `ops:evidence:solo` 중심으로 유지한다.
  - one-off seed/backfill/cleanup/manual-report/perf/growth alias는 제거 후보와 유지 후보를 분류한다.
  - 제거하는 alias는 스크립트 파일을 바로 지우지 않고 문서에 `tsx scripts/...` 직접 실행법으로 남긴다.
  - 실제 참조가 많은 alias는 당장 제거하지 않고 “maintenance 전용” 섹션으로 낮춘다.
- 완료 기준:
  - `package.json`의 기본 script 목록이 눈에 띄게 줄거나, 최소한 일상/maintenance 구분이 명확해진다.
  - 문서의 명령 소스 오브 트루스가 새 기준과 충돌하지 않는다.
  - `docs:refresh:check`, `lint`, `typecheck`가 통과한다.

#### P1-8.3 production demo/OAuth manual automation 격하

- 상태: `completed`
- 문제:
  - production demo content workflow는 운영 DB에 데모 데이터를 넣고 지우는 위험한 표면이다.
  - OAuth 수동점검 자동화는 report 생성/갱신/검증까지 3개 script로 쪼개져 있지만, 1인 운영에서는 Markdown 체크리스트와 실제 OAuth 진입 확인으로 충분하다.
- 대상:
  - `.github/workflows/production-demo-content.yml`
  - `app/scripts/seed-production-demo-content.ts`
  - `app/scripts/generate-oauth-manual-check-report.ts`
  - `app/scripts/update-oauth-manual-check.ts`
  - `app/scripts/verify-oauth-manual-check.ts`
  - `business/operations/OAuth_외부로그인_운영_가이드.md`
  - `business/operations/Vercel_OAuth_초기설정_가이드.md`
- 작업:
  - production demo workflow는 archive 또는 manual-only 위험 경고를 추가한다.
  - demo seed는 local/staging 전용으로 격하하고 production 실행 조건을 더 강하게 문서화한다.
  - OAuth manual script 3종은 제거 후보로 분류하고, 우선 문서 체크리스트 중심으로 운영 절차를 단순화한다.
- 완료 기준:
  - production DB에 demo content를 넣는 경로가 기본 운영 루틴에서 제거된다.
  - OAuth 수동점검은 script-first가 아니라 checklist-first로 정리된다.
  - 관련 script를 유지한다면 “on-demand/legacy helper”로 명확히 표시한다.

#### P1-8.4 개인화/광고 운영 판단 기준 축소

- 상태: `completed`
- 문제:
  - 개인화/광고 CTR, audience concentration 기준은 초기 트래픽이 적을 때 통계적으로 불안정하다.
  - 운영자가 매주 볼 지표로 두면 잘못된 튜닝이나 불필요한 정책 변경을 유도할 수 있다.
- 대상:
  - `business/operations/개인화_운영_판단_기준.md`
  - `app/src/app/admin/personalization`
  - `app/src/lib/admin-personalization-diagnostics.ts`
  - `app/src/server/queries/feed-personalization-metrics.queries.ts`
- 작업:
  - 계측/스키마는 유지한다.
  - 운영 판단 문서는 “4주 이상 데이터 또는 최소 표본 충족 후 재개” 기준으로 낮춘다.
  - ad CTR 기반 조치는 초기 운영 기본 루틴에서 제외한다.
  - `/admin/personalization`은 접근/표시 확인만 기본 smoke 후보로 남기고, 튜닝 판단은 보류한다.
- 완료 기준:
  - 문서와 UI copy가 과도한 통계 확신을 주지 않는다.
  - 개인화 정책 변경은 충분한 표본 전까지 No-Go로 남는다.

#### P1-8.5 client `useEffect` fetch/telemetry 표면 정리

- 상태: `pending`
- 문제:
  - 클라이언트 fetch와 `useEffect`가 feed, guest feed, detail, notification, search, reaction, telemetry에 분산되어 있다.
  - 일부 telemetry/prefetch는 있으면 좋지만 초기 1인 운영 단계의 필수 기능은 아니다.
- 대상:
  - `app/src/components/posts/feed-infinite-list.tsx`
  - `app/src/components/posts/guest-feed-page-client.tsx`
  - `app/src/components/posts/post-detail-client.tsx`
  - `app/src/components/notifications/notification-bell.tsx`
  - `app/src/components/posts/feed-search-form.tsx`
  - `app/src/components/posts/search-result-telemetry.tsx`
- 작업:
  - 기능 필수 fetch와 부가 telemetry/prefetch를 분리한다.
  - telemetry는 feature flag 또는 no-op fallback으로 묶어 기본 복잡도를 줄인다.
  - 반복되는 fetch error/content-type 처리 패턴은 작은 helper로 통일한다.
  - 사용자가 직접 체감하는 feed/detail/comment/reaction 동작은 유지한다.
- 완료 기준:
  - 핵심 사용자 동작은 유지하면서 부가 telemetry/prefetch의 회귀 표면이 줄어든다.
  - 변경한 fetch 흐름에 unit 또는 e2e smoke 검증을 붙인다.

#### P1-8.6 운영 문서 active/archive 정리

- 문제:
  - `business/operations`, `business/security`, `docs`, `blog`를 합치면 Markdown 문서가 100개 이상이고, 현재 기준과 과거 기록이 섞여 있다.
  - 1인 운영에서는 문서가 많을수록 실행 기준을 찾는 시간이 늘어난다.
- 대상:
  - `business/operations/*`
  - `business/security/*`
  - `business/archive/*`
  - `AGENTS.md`
- 작업:
  - 현재 active 운영 문서 5-7개를 `business/operations/운영_문서_안내.md`에 명확히 표시한다.
  - 과거 구현 기록이나 특수 상황 가이드는 archive로 이동하거나 archive 상태를 표시한다.
  - `AGENTS.md`의 “먼저 볼 파일”과 “운영 확인 기준”을 축소 기준에 맞춘다.
- 완료 기준:
  - 새 세션이 active 운영 기준과 archive 기록을 혼동하지 않는다.
  - docs freshness check가 통과한다.

최근 완료:
- `P1-7 1인 운영용 최소 production smoke 축소`는 `2026-05-13` 완료했고, 상세 변경/검증은 [COMPLETED.md](./COMPLETED.md)에 기록한다.
- `Release Confidence Hardening P1-6`은 `2026-05-13` 완료했고, 상세 변경/검증은 [COMPLETED.md](./COMPLETED.md)에 기록한다.

## 다음 작업 후보

- P1-8.1 완료 후 P1-8.2 package script 표면 축소를 진행한다.
- P1-8 배치 완료 후 P2-1 client `useEffect` fetch 표면 정리로 넘어간다.
