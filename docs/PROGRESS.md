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
- Search Quality Phase 2 zero-result 운영 루프 고정을 완료했다
- Search Quality Phase 2 검색 매칭 품질 보강을 완료했다
- 런치 갭 다음 후보 재평가를 완료했다
- Market State Machine Phase 2 preflight를 완료했다
- Market Listing M1 구조화 생성/조회를 완료했다
- Market Listing M2 상태 전환 액션을 완료했다
- 다음 작업: Social Dev Onboarding Smoke 안정화

## 열린 blocker
- `test:e2e:smoke`의 카카오 social-dev 온보딩이 `/login?next=/onboarding`에 머물거나 프로필 저장 실패로 끝나는 기존 smoke blocker가 남아 있다.

## 직전 검증
- Market Listing M2 상태 전환 액션:
  - 결정: 별도 audit 모델을 만들지 않고 기존 `ModerationActionLog`에 `MARKET_STATUS_CHANGED` action을 추가했다.
  - 추가: 작성자는 `AVAILABLE/RESERVED`에서 예약/판매완료/취소와 예약 해제를 수행할 수 있고, moderator/admin은 모든 상태 override가 가능하다.
  - 차단: 비작성자/비운영자는 `FORBIDDEN`, 작성자의 `SOLD/CANCELLED -> AVAILABLE` 같은 역전환은 `INVALID_MARKET_STATUS_TRANSITION`으로 막는다.
  - UI: 회원 상세 화면의 마켓 거래 정보에 상태 변경 버튼을 추가하고 성공 시 detail/feed cache를 revalidate한다.
  - 통과: 관련 validation/service/action unit, `prisma migrate deploy`, `typecheck`, `lint`, `quality:check`.
- Market Listing M1 구조화 생성/조회:
  - 추가: `MARKET_LISTING` 작성 입력에 `marketListing` 구조화 필드를 필수화하고 post create form과 공동구매 route payload에 연결했다.
  - 연결: `createPost`가 `MarketListing` relation을 생성하고 feed/detail query include와 UI에서 거래 유형, 가격, 상품 상태, 거래 상태를 표시한다.
  - 보호: 신규 유저 제한, 비회원 제한, 금칙어/연락처 제한은 기존 post write policy 경로를 그대로 통과한다.
  - 통과: 관련 validation/search/service/query/groupbuy unit, `typecheck`, `lint`, `quality:check`.
  - 보류: `test:e2e:smoke`는 카카오 social-dev 온보딩이 `/login?next=/onboarding`에 머물거나 프로필 저장 메시지를 받지 못해 실패했다. 마켓 경로와 직접 관련 없는 기존 smoke blocker로 별도 triage가 필요하다.
- Market State Machine Phase 2 preflight:
  - 확인: `MarketListing` 모델과 `MarketStatus` enum은 이미 있지만 validation/service/UI/query 경로에는 연결되어 있지 않다.
  - 결정: 상태 변경 액션보다 먼저 `MARKET_LISTING` 작성 시 구조화 레코드를 생성하고 feed/detail에서 읽는 M1을 구현한다.
  - 보류: `AVAILABLE/RESERVED/SOLD/CANCELLED` 상태 전환 액션은 작성자/admin 권한과 `ModerationActionLog` enum 확장이 필요하므로 M2로 분리한다.
  - 정책: 마켓 운영규칙에 M1/M2 경계, 상태 전환 권한, 감사 로그/신고 연결 기준을 추가했다.
- 런치 갭 다음 후보 재평가:
  - 확인: Search Quality Phase 2는 zero-result 운영 루프와 오타 tolerant feed fallback까지 완료됐다.
  - 비교: 운영 secret이 필요한 production strict/control-plane 확인은 보류 조건이고, 결제/케어/지도는 아직 운영 리스크가 크다.
  - 결정: Phase 2A 이후 다음 구현 후보는 결제 없는 `Market State Machine Phase 2`이며, 첫 단계는 schema/service/UI/API 현황과 상태 전환 권한/감사 로그 preflight로 둔다.
- Search Quality Phase 2 검색 매칭 품질 보강:
  - 추가: compact 검색 문서 fallback에 4자 이상 query의 한 글자 오타 허용 매칭을 추가했다.
  - 고정: suggestion/ranked search뿐 아니라 `/feed` 일반 목록 첫 페이지도 SQL 결과 0건이면 search-document fallback을 한 번 더 시도한다.
  - 보호: 3자 이하 query는 fuzzy fallback에서 제외해 `병원후`가 `병원비`까지 과매칭되던 회귀를 막았다.
  - 통과: 검색 helper/post query/search stat unit, `typecheck`, `search-and-board-filtering` chromium e2e.
- Search Quality Phase 2 zero-result 운영 루프 고정:
  - 추가: `SearchTermInsight`에 `zeroResultRate`와 운영 액션(priority/label/description)을 붙였다.
  - 연결: `/admin/ops`의 0건/결과 부족 검색어 카드에서 우선순위, 개선 액션, `/feed` 검색 재현 링크를 표시한다.
  - 문서: 검색 통계 전환 가이드에 high/medium/low 분류 기준과 주간 운영 루프를 추가했다.
  - 통과: 관련 query unit, `typecheck`, `quality:check`, `docs:refresh:check`.
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
1. `social-onboarding-flow.spec.ts` 실패 컨텍스트와 social-dev credentials callback 로그를 확인한다.
2. 카카오/네이버 병렬 실행 시 세션/테스트 계정 reset 충돌 여부를 분리 테스트로 검증한다.
3. 원인에 맞춰 로그인 시작 또는 nickname 저장 테스트/코드를 보강하고 smoke 전체를 재실행한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
