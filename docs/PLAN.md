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

상태: `pending`
기준 컨텍스트: [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), [.impeccable.md](../.impeccable.md)

운영 규칙:
- 코드보다 문서를 먼저 갱신한다. 우선순위나 phase 범위가 바뀌면 이 섹션을 먼저 수정한다.
- 한 번에 모든 화면을 고치지 않는다. 각 phase는 한 화면군 또는 한 사용자 흐름만 다룬다.
- phase 완료 시 상세 결과와 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append하고, active 문서에서는 완료 phase를 제거하거나 다음 phase만 남긴다.
- Impeccable detector finding은 실패로만 보지 않고, phase backlog의 입력으로 기록한다.
- 현재 baseline finding: DB unavailable 시 `/boards/adoption`, `/posts/new`가 generic error로 떨어짐. `/password/reset`은 Next 16 `searchParams` sync access runtime warning 발생. `design:detect`는 5건 anti-pattern을 감지함.

#### Phase 0: baseline / critique / audit
- 목표: 현재 디자인 상태를 재현 가능한 baseline으로 고정하고 P0/P1/P2/P3 backlog를 만든다.
- 대상 화면: `/feed/guest`, `/search/guest`, `/login`, `/register`, `/password/reset`, `/notifications`, `/boards/adoption`, `/posts/new`, `/admin`, `/admin/ops`, `/admin/reports`.
- 사용할 skill 순서: `$impeccable critique` -> `$impeccable audit` -> `$impeccable adapt`.
- 수정 범위: 문서와 evidence만 갱신한다. screenshot, detector 결과, 로컬 DB 상태, 접근 권한 상태를 기록한다.
- 하지 않을 것: UI 코드 수정, DB restore, seeded data 변경, global tool 설치.
- 완료 기준: 화면군별 이슈가 P0/P1/P2/P3로 분류되고, 다음 phase가 한 화면군 단위로 실행 가능해야 한다.
- 검증 명령: `corepack pnpm -C app design:detect`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`.
- screenshot 확인 지점: desktop `1440x1000`, mobile `390x844`; public/auth/admin/write 대표 경로를 `/tmp/townpet-design-audit` 같은 임시 폴더에 저장.

#### Phase 1: 핵심 public entry 구조 정리
- 목표: 홈 역할을 하는 `/feed/guest`와 검색 진입이 첫 방문자에게 비어 보이지 않게 만들고, TownPet의 `LOCAL / GLOBAL` 정책과 작성/탐색 진입점을 명확히 한다.
- 대상 화면: `/feed/guest`, `/feed`, `/search/guest`, `/search`.
- 사용할 skill 순서: `$impeccable layout` -> `$impeccable onboard` -> `$impeccable adapt`.
- 수정 범위: 피드 첫 viewport, empty feed/search 안내, 필터 패널 밀도, mobile header와 feed/search control stacking.
- 하지 않을 것: 게시글 ranking/query 정책 변경, 신규 게시판 IA 추가, 색상 시스템 전면 교체, 마켓/케어/지도 기능 추가.
- 완료 기준: desktop 첫 viewport에서 primary action과 empty/onboarding message가 명확하고, mobile에서 header와 filter controls가 44px touch target 기준을 만족한다.
- 검증 명령: `corepack pnpm -C app test -- src/components/posts/feed-control-panel.test.tsx`, `corepack pnpm -C app test:e2e -- e2e/feed-loading-skeleton.spec.ts --project=chromium`, `corepack pnpm -C app design:detect`.
- screenshot 확인 지점: `/feed/guest`, `/search/guest`의 desktop/mobile first viewport, empty state, filter expanded/collapsed 상태.

#### Phase 2: empty / error / loading / copy hardening
- 목표: 비어 있음, 오류, 권한/로그인 필요, 로딩 상태를 generic fallback이 아니라 회복 가능한 제품 상태로 만든다.
- 대상 화면: global `error.tsx`, `not-found.tsx`, `/notifications` guest state, `/boards/adoption` DB unavailable state, `/posts/new` DB unavailable state, 주요 `loading.tsx`.
- 사용할 skill 순서: `$impeccable harden` -> `$impeccable clarify` -> `$impeccable onboard`.
- 수정 범위: 오류 copy, recovery CTA, DB unavailable fallback, skeleton hierarchy, auth-required empty state.
- 하지 않을 것: 실제 장애 처리 정책/alerting 변경, admin 권한 정책 변경, DB migration, seed data 변경.
- 완료 기준: P0 generic error가 화면별 recovery copy와 CTA를 갖고, loading skeleton이 최종 layout과 유사한 구조를 유지한다.
- 검증 명령: `corepack pnpm -C app test`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, 필요 시 관련 route/component targeted test.
- screenshot 확인 지점: `/boards/adoption` DB unavailable, `/posts/new` DB unavailable, `/notifications` guest, `/not-found` mobile/desktop, `/feed?debugDelayMs=...` loading.

#### Phase 3: 상세 / 쓰기 / form 흐름 정리
- 목표: 글 상세, 댓글/반응, 새 글 작성, 이미지 업로드, password/auth form이 긴장도와 정책을 정확히 드러내면서도 모바일에서 완료 가능하게 만든다.
- 대상 화면: `/posts/[id]/guest`, `/posts/[id]`, `/posts/new`, `/posts/[id]/edit`, `/password/reset`, `/login`, `/register`.
- 사용할 skill 순서: `$impeccable audit` -> `$impeccable distill` -> `$impeccable clarify` -> `$impeccable adapt`.
- 수정 범위: form grouping, validation/error copy, required/disabled/loading states, editor/media overlay anti-pattern, password reset runtime issue, guest write policy visibility.
- 하지 않을 것: editor 라이브러리 교체, 게시글 schema 변경, moderation/write policy 완화, OAuth 실제 연동 변경.
- 완료 기준: 주요 form은 keyboard/focus/error 상태가 확인되고, mobile에서 submit CTA와 오류 메시지가 같은 흐름 안에서 보인다. `design:detect`의 media/editor anti-pattern이 제거된다.
- 검증 명령: `corepack pnpm -C app test -- src/components/auth/auth-page-layout.test.tsx src/components/posts/post-rich-text-editor-shell.test.tsx src/components/ui/empty-state.test.tsx`, `corepack pnpm -C app typecheck`, `corepack pnpm -C app design:detect`.
- screenshot 확인 지점: `/login`, `/register`, `/password/reset`, `/posts/new` desktop/mobile, editor toolbar, upload preview/error, post detail media overlay.

#### Phase 4: admin / dashboard / list density 개선
- 목표: 운영자가 신고, 정책, 인증 로그, Ops 지표를 빠르게 스캔하도록 card-heavy 화면을 테이블/패널 중심의 조용한 작업 화면으로 정리한다.
- 대상 화면: `/admin`, `/admin/ops`, `/admin/reports`, `/admin/reports/[id]`, `/admin/policies`, `/admin/auth-audits`, `/admin/moderation-logs`, `/admin/personalization`.
- 사용할 skill 순서: `$impeccable distill` -> `$impeccable layout` -> `$impeccable audit` -> `$impeccable adapt`.
- 수정 범위: metric card hierarchy, table density, filter bars, bulk action affordance, mobile admin fallback/card table, admin navigation grouping.
- 하지 않을 것: admin 권한 모델 변경, 신고/제재 service 로직 변경, 지표 산식 변경, 운영 문서 개편.
- 완료 기준: admin first viewport가 핵심 상태/대기 작업/필터를 2초 안에 파악 가능하고, wide table은 desktop에서는 밀도 있게, mobile에서는 card/table fallback으로 사용할 수 있다.
- 검증 명령: `corepack pnpm -C app test -- src/components/admin`, `corepack pnpm -C app test:e2e -- e2e/admin-new-user-policy.spec.ts --project=chromium`, `corepack pnpm -C app design:detect`.
- screenshot 확인 지점: seeded admin 계정 기준 `/admin/ops`, `/admin/reports`, `/admin/policies` desktop/mobile, table horizontal overflow, empty admin state.

#### Phase 5: final polish / audit / verification
- 목표: phase별 수정 결과를 하나의 제품 UI로 정렬하고 Impeccable detector, 접근성, responsive, copy, 문서 evidence를 닫는다.
- 대상 화면: Phase 1-4에서 변경한 화면 전체.
- 사용할 skill 순서: `$impeccable polish` -> `$impeccable audit` -> `$impeccable critique`.
- 수정 범위: spacing drift, token drift, focus-visible consistency, detector residuals, screenshot evidence 정리, PLAN/PROGRESS/COMPLETED 동기화.
- 하지 않을 것: 새 기능 추가, IA 대개편, color/typography rebrand, unrelated refactor.
- 완료 기준: `design:detect` 신규 finding 없음 또는 의도된 false positive 문서화, lint/typecheck/test 통과, desktop/mobile screenshot evidence 보관, 완료 phase archive 정리.
- 검증 명령: `corepack pnpm -C app quality:check`, `corepack pnpm -C app design:detect`, 필요 시 `corepack pnpm -C app test:e2e:smoke`.
- screenshot 확인 지점: public/auth/write/admin 대표 경로 desktop/mobile before/after 비교, focus state, empty/error/loading state.

## 다음 실행 순서

1. Phase 0 baseline evidence를 최신 로컬 DB 상태 기준으로 다시 고정한다.
2. Phase 1부터 한 화면군씩 구현한다. 구현 전 `PLAN.md`의 해당 phase 상태와 범위를 먼저 갱신한다.
3. 각 phase 완료 후 `PROGRESS.md`에 짧게 결과를 남기고, 상세 evidence는 [COMPLETED.md](./COMPLETED.md)에 append한 뒤 active 문서에서 완료 phase를 제거한다.
