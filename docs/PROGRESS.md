# PROGRESS.md

기준일: 2026-04-26
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서를 `docs/` 아래 slim active + archive 구조로 재편했다
- 공개 SEO, 보안 헤더, 운영 smoke, 로딩/빈상태, 레드팀 잔여 remediation, 운영 문서 최신성 점검을 완료했다
- 피드 컨트롤 버그 수정, 하단 검색 통합, 로컬 핵심 기능 검증과 발견 버그 수정을 완료했다
- 개인화 운영 판단 기준 문서화를 완료했다
- 관리자 개인화 진단 UX 보강을 완료했다
- 광고/추천 정책 분리 증거 보강을 완료했다
- 품종 라운지 고위험 write gate 점검을 완료했다
- Cycle A 완료 후 다음 후보 재평가를 완료했다
- 운영 10분 루틴 로컬 evidence runner 보강을 완료했다
- 운영 evidence 첫 실행 및 결과 triage를 완료했다
- 런치 갭 다음 후보 재평가를 완료했다
- 다음 작업: Search Quality Phase 2 zero-result 운영 루프 고정

## 열린 blocker
- 없음. 기존 `db:restore:local` local test account count mismatch는 managed account count 검증으로 수정했고 restore 통과를 확인했다.

## 직전 검증
- 런치 갭 다음 후보 재평가:
  - 확인: 운영 evidence는 원격 health/prewarm/latency 기준 PASS였고, 남은 security-env WARN은 운영 secret이 필요한 보류 조건이다.
  - 비교: 결제/마켓/케어/지도보다 Phase 2A 검색/개인화/운영 증폭이 현재 우선순위와 리스크에 맞다.
  - 결정: 다음 작업은 `Search Quality Phase 2` 중 zero-result/low-result 운영 루프를 `/admin/ops`와 테스트로 고정하는 것이다.
- 운영 evidence 첫 실행 및 결과 triage:
  - 실행: `OPS_BASE_URL=https://townpet.vercel.app corepack pnpm -C app ops:evidence`
  - 정상: health 200, prewarm 7 targets 200, latency steady-state 전 항목 threshold PASS.
  - 수정: runner가 bare `pnpm`을 spawn해 실패하던 문제를 현재 package manager 경로 재사용으로 고쳤고, perf `page_feed`가 `/feed` 307을 측정하던 문제를 `/feed/guest` 기준으로 고쳤다.
  - 보류: security-env WARN 7건은 로컬 env 기준이며 production strict/control-plane 상세 확인은 운영 secret이 필요하다.
- 운영 10분 루틴 로컬 evidence runner 보강:
  - 추가: `ops:evidence`가 health, security env, prewarm, latency snapshot을 read-only로 순차 실행하고 `docs/reports/ops-evidence-*.md`에 결과를 남긴다.
  - 실패: 한 단계가 실패해도 나머지 점검을 계속 기록한 뒤 required 실패가 있으면 exit code 1로 종료한다.
  - 문서: README, app README, 운영 문서 안내, 주간 보안 운영 점검 템플릿에 실행법과 판정 기준을 연결했다.
  - 통과: runner unit/failure-path test, `lint`, `typecheck`, `quality:check`.
- Cycle A 완료 후 다음 후보 재평가:
  - 확인: 개인화/광고/커뮤니티 Cycle A는 A1-A4까지 완료됐고 `quality:check` 증거가 남아 있다.
  - 비교: Phase 2 대형 기능보다 현재 우선순위 3번인 운영 안정화가 먼저다.
  - 결정: 다음 작업은 `ops:*` 점검을 단일 로컬 evidence 흐름으로 묶는 작업으로 둔다.
- 품종 라운지 고위험 write gate 점검:
  - 고정: 공동구매 route가 `MARKET_LISTING`, `GLOBAL`, `animalTags: [breedCode]`로 `createPost`에 넘기는 계약을 테스트로 보강했다.
  - 정책: 신규유저 제한, 연락처 제한, 비회원 제한은 `createPost`의 `ServiceError`를 그대로 반환하고 500으로 가리지 않게 검증했다.
  - 신고: 일반 post 신고/자동숨김/audit trail은 기존 `report.service` 테스트를 함께 실행해 같은 post 경로로 유지됨을 확인했다.
  - 통과: groupbuy route, post create policy, report service 관련 테스트, `lint`, `typecheck`, `quality:check`.
- 광고/추천 정책 분리 증거 보강:
  - 고정: `FEED_PERSONALIZATION_AD_SIGNAL_CAP_MAX`를 추가하고 광고 신호 cap을 0.08 이하로 제한했다.
  - 테스트: `AD_IMPRESSION`은 추천 랭킹 행동 신호가 아니며, `AD_CLICK`도 cap 안의 약한 보조 신호라 최신/선호 게시글을 직접 구매해 뒤집지 못함을 검증했다.
  - 연결: 운영 판단 기준과 실행계획 A3에 sponsored/partner는 라벨과 frequency cap이 있는 별도 후보로만 다룬다는 기준을 남겼다.
  - 통과: `feed-personalization-policy`, `post.queries`, `policy.queries` 관련 테스트, `lint`, `typecheck`, `quality:check`, `docs:refresh:check`.
- 관리자 개인화 진단 UX 보강:
  - 추가: `/admin/personalization`에 데이터 상태, Feed CTR, Ad CTR, audience 쏠림 진단 카드를 추가했다.
  - 연결: 진단별 다음 행동을 `/admin/ops`, `/admin/policies`, `/admin/breeds`로 바로 이동하게 했다.
  - 보강: 큰 수치와 긴 audience key가 모바일 폭에서 페이지를 밀지 않도록 admin page layout을 조정했다.
  - 통과: `admin-personalization-diagnostics` unit/e2e, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`, `corepack pnpm -C app quality:check`.
- 개인화 운영 판단 기준 문서화, 로컬 핵심 기능 동작 검증, 피드 컨트롤/하단 검색 통합 상세는 [COMPLETED.md](./COMPLETED.md)에 보관했다.
- 과거 Phase 0-5와 checkpoint/push 상세도 [COMPLETED.md](./COMPLETED.md)에 보관했다.

## 다음 액션
1. `/admin/ops` 검색 품질 신호와 query/test 구조를 확인한다.
2. zero-result/low-result 후보 표시 기준과 개선 액션을 점검한다.
3. 테스트를 먼저 추가하고 필요한 UI/query/문서를 수정한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
