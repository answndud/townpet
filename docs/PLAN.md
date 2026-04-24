# PLAN.md

기준일: 2026-04-24
목표: TownPet를 기능/운영/품질 기준에서 "완성도 높은 커뮤니티" 상태로 끌어올린다.
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 운영 규칙
- 세션 시작: `PLAN.md` + `PROGRESS.md` 먼저 확인
- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다
- 완료된 상세와 긴 검증 로그는 `PROGRESS.md`에서 정리한 뒤 `COMPLETED.md`로 이동한다
- 작업 시작: 대상 항목 상태를 `in_progress`로 변경
- 작업 종료: `PROGRESS.md` 실행 결과를 갱신하고 완료 상세는 `COMPLETED.md` 맨 아래에 시간 오름차순으로 append한 뒤 `PLAN.md` 상태를 맞춘다
- 블로커 발생: `PLAN.md`와 `PROGRESS.md`를 즉시 함께 갱신한다

## 범위 원칙
- 우선순위: `서비스 안정성 -> 커뮤니티 핵심 기능 -> 재방문/유입 -> 운영 자동화`
- Phase 2 보류: 마켓/케어/결제/공동구매/카카오맵은 Phase 1 완료 후 착수

## 현재 우선순위
1. 레드팀 P0/P1 잔여 remediation 정리
2. 런치 준비 갭 정리: 공개 SEO/metadata/sitemap, 로딩/빈상태 polish, 보안 헤더/coverage 증거 보강
3. 운영 안정화: 무료 주간 10분 루틴 정착(health/log/manual smoke)
4. 운영 문서 유지: Vercel/OAuth/Secrets/데이터 관리 가이드 최신 상태 유지
5. 품종 기반 개인화/광고/커뮤니티 기능 PRD 확정 및 구현 사이클 착수
6. 보안 하드닝 트랙 분리 운영: `business/security/*` 백로그/리스크/진행 로그 상시 동기화

## Active Plan

### Impeccable 디자인 개선 workflow

상태: `in_progress`
기준 컨텍스트: [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), [.impeccable.md](../.impeccable.md)

운영 규칙:
- 코드보다 문서를 먼저 갱신한다. 우선순위나 phase 범위가 바뀌면 이 섹션을 먼저 수정한다.
- 한 번에 모든 화면을 고치지 않는다. 각 phase는 한 화면군 또는 한 사용자 흐름만 다룬다.
- phase 완료 시 상세 결과와 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append하고, active 문서에서는 완료 phase를 제거하거나 다음 phase만 남긴다.
- Impeccable detector finding은 실패로만 보지 않고, phase backlog의 입력으로 기록한다.
- 완료 archive: Phase 0-1 상세는 [COMPLETED.md](./COMPLETED.md)에 정리한다.
- 현재 blocker: `design:detect` 기존 5건, `build` 로컬 필수 env 누락.

#### Phase 2: empty / error / loading / copy hardening
- 상태: `pending`
- 목표: 비어 있음, 오류, 권한/로그인 필요, 로딩 상태를 generic fallback이 아니라 회복 가능한 제품 상태로 만든다.
- 대상 화면: global `error.tsx`, `not-found.tsx`, `/notifications` guest state, `/boards/adoption` DB unavailable state, `/posts/new` DB unavailable state, 주요 `loading.tsx`.
- 사용할 skill 순서: `$impeccable harden` -> `$impeccable clarify` -> `$impeccable onboard`.
- 수정 범위: 오류 copy, recovery CTA, DB unavailable fallback, skeleton hierarchy, auth-required empty state.
- 하지 않을 것: 실제 장애 처리 정책/alerting 변경, admin 권한 정책 변경, DB migration, seed data 변경.
- 완료 기준: P0 generic error가 화면별 recovery copy와 CTA를 갖고, loading skeleton이 최종 layout과 유사한 구조를 유지한다.
- 검증 명령: `corepack pnpm -C app test`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, 필요 시 관련 route/component targeted test.
- screenshot 확인 지점: `/boards/adoption` DB unavailable, `/posts/new` DB unavailable, `/notifications` guest, `/not-found` mobile/desktop, `/feed?debugDelayMs=...` loading.

## 다음 실행 순서

1. Phase 1 변경분을 commit/push한다.
2. Phase 2 시작 전 관련 skill 문서를 다시 읽는다.
3. 한 번에 한 화면군만 hardening하고, 완료 시 archive로 이동한다.
