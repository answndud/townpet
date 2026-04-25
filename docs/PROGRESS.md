# PROGRESS.md

기준일: 2026-04-26
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서는 `docs/PLAN.md`, `docs/PROGRESS.md` slim active와 `docs/COMPLETED.md` archive 구조로 운영한다
- 공개 SEO, 보안 헤더, 운영 smoke, 로딩/빈상태, 레드팀 잔여 remediation, 피드/검색 hot path 검증을 완료했다
- 개인화/광고 운영 판단 기준, 관리자 진단 UX, 광고/추천 정책 분리, 품종 라운지 write gate 점검을 완료했다
- 운영 evidence runner, Search Quality Phase 2, Market State Machine preflight/M1/M2를 완료했다
- Social Dev Onboarding Smoke 안정화와 Launch Gap 다음 후보 재평가를 완료했다
- Care Request Templates preflight를 완료했다
- Care Request M1 구조화 요청 생성/조회를 완료했다
- 다음 작업: Care Request M2 상태 전환/지원 흐름 preflight

## 열린 blocker
- 없음. `test:e2e:smoke` social-dev 온보딩 blocker는 callback side effect 차단과 온보딩 대기 안정화로 해결했고 smoke 통과를 확인했다.

## 직전 검증
- Social Dev Onboarding Smoke 안정화:
  - 재현: `social-onboarding-flow.spec.ts` 단독 1 worker는 통과하지만 전체 smoke 병렬 실행에서는 카카오 social-dev 온보딩이 `/login?next=/onboarding`에 머물렀다.
  - 원인: 소셜 entry 테스트가 요청 시작만 확인해야 하는데 `social-dev` callback까지 실제 처리해 정적 e2e 소셜 계정/session에 부작용을 만들 수 있었다.
  - 수정: 소셜 entry 테스트는 callback을 `204`로 intercept해 DB/session 변경을 막고, 온보딩 플로우는 병렬 dev server 부하를 감안해 `/onboarding` 대기를 15초로 늘렸다.
  - 통과: social onboarding 단독, 전체 `test:e2e:smoke`, 관련 user unit, `typecheck`, `lint`.
- Launch Gap 다음 후보 재평가:
  - 확인: 마켓 M1/M2와 social-dev smoke blocker가 완료되어 Phase 2B의 핵심 상태 머신 갭은 닫혔다.
  - 비교: 결제는 분쟁/정산/법적 고지 선행이 필요하고, 카카오맵은 외부 API와 장소 canonicalization 의존이 남아 있다.
  - 결정: 다음 후보는 `Care Request Templates preflight`이며, 바로 구현하지 않고 돌봄/구인구직 정책, 구조화 relation, 상태/감사 로그 경계를 먼저 확정한다.
  - 보류: production strict/control-plane 확인과 실 OAuth 계정 검증은 운영 secret이 필요한 별도 보류 조건으로 유지한다.
- Care Request Templates preflight:
  - 확인: 현재 schema에는 케어 전용 `PostType`이나 relation이 없고, 위험 작성 제한은 마켓/모임/실종 등 기존 타입에 묶여 있다.
  - 결정: M1은 `PostType.CARE_REQUEST` + `CareRequest` relation으로 구현해 기존 feed/search/detail/comment/report/auto-hide 경로를 재사용한다.
  - 정책: `LOCAL` 전용, 게스트 작성 차단, 신규 유저 제한, 연락처/링크 제한, 금칙어 검사를 구조화 필드까지 포함한다.
  - 보류: 지원자 매칭, 상태 전환, 증빙, 결제/예약/보험은 M2 이후로 분리한다.
- Care Request M1 구조화 요청 생성/조회:
  - 추가: `PostType.CARE_REQUEST`, `CareRequest`, `CareType`, `CareRequestStatus`와 migration을 추가했다.
  - 연결: validation/service/query/create form/feed/detail/guest detail에 돌봄 요청 구조화 필드를 연결했다.
  - 정책: `LOCAL` 강제, 게스트 작성 차단, 신규 유저 제한, 연락처/링크/금칙어 검사를 기존 post write path로 재사용한다.
  - 통과: migration deploy, targeted unit, `typecheck`, `lint`, `quality:check`.
- Market Listing M2 상태 전환 액션:
  - 결정: 별도 audit 모델을 만들지 않고 기존 `ModerationActionLog`에 `MARKET_STATUS_CHANGED` action을 추가했다.
  - 추가: 작성자는 `AVAILABLE/RESERVED`에서 예약/판매완료/취소와 예약 해제를 수행할 수 있고, moderator/admin은 모든 상태 override가 가능하다.
  - 차단: 비작성자/비운영자는 `FORBIDDEN`, 작성자의 `SOLD/CANCELLED -> AVAILABLE` 같은 역전환은 `INVALID_MARKET_STATUS_TRANSITION`으로 막는다.
  - UI: 회원 상세 화면의 마켓 거래 정보에 상태 변경 버튼을 추가하고 성공 시 detail/feed cache를 revalidate한다.
  - 통과: 관련 validation/service/action unit, `prisma migrate deploy`, `typecheck`, `lint`, `quality:check`.
- 이전 상세 검증은 [COMPLETED.md](./COMPLETED.md)에 보관했다.

## 다음 액션
1. 마켓 상태 전환 패턴과 `CareRequestStatus` 후보 전이를 비교한다.
2. 작성자/admin/moderator/지원자 권한과 `ModerationActionLog` action 필요 여부를 확정한다.
3. M2 구현 범위와 테스트 목록을 문서화한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
