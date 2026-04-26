# PROGRESS.md

기준일: 2026-04-26
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서는 `docs/PLAN.md`, `docs/PROGRESS.md` slim active와 `docs/COMPLETED.md` archive 구조로 운영한다
- 공개 SEO, 보안 헤더, 운영 smoke, 로딩/빈상태, 레드팀 잔여 remediation, 피드/검색 hot path 검증을 완료했다
- 개인화/광고 운영 판단 기준, 관리자 진단 UX, 광고/추천 정책 분리, 품종 라운지 write gate 점검을 완료했다
- 운영 evidence runner, Search Quality Phase 2, Market State Machine preflight/M1/M2를 완료했다
- Social Dev Onboarding Smoke 안정화와 Launch Gap 다음 후보 재평가를 완료했다
- Care Request Templates preflight, M1 구조화 요청, M2 상태 전환, M3 preflight를 완료했다
- Care Application M3 지원 생성/관리를 완료했다
- 다음 작업: Care Request M4 수행 체크리스트 preflight

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
- Care Request M2 상태 전환/지원 흐름 preflight:
  - 결정: M2는 지원자 모델 없이 요청 상태 전환 액션만 구현한다.
  - 권한: 작성자는 `OPEN -> CANCELLED`만 가능하고, admin/moderator는 운영 복구/취소 목적의 override를 수행한다.
  - 감사: 상태 변경은 `ModerationActionLog.CARE_STATUS_CHANGED`로 남긴다.
  - 보류: `CareApplication`/문의/수행자 배정/알림은 M3 preflight로 분리한다.
- Care Request M2 상태 전환 액션:
  - 추가: `CARE_STATUS_CHANGED` audit action, status update validation, service/action, detail UI 버튼을 추가했다.
  - 권한: 작성자는 `OPEN -> CANCELLED`만 가능하고, admin/moderator는 모든 상태 override가 가능하다.
  - 차단: 비작성자/비운영자는 `FORBIDDEN`, 작성자의 `CANCELLED -> OPEN`은 `INVALID_CARE_STATUS_TRANSITION`으로 막는다.
  - 통과: migration deploy, targeted unit, `typecheck`, `lint`, `quality:check`.
- Care Request M3 지원/문의 흐름 preflight:
  - 비교: 댓글 확장은 공개 토론과 지원 상태가 섞여 개인정보/권한/알림 경계가 약하다.
  - 결정: M3는 별도 `CareApplication` 모델로 구현하고 댓글은 일반 문의/대화 표면으로 유지한다.
  - 권한: 로그인 지원자만 가능, 작성자 본인/게스트/제재 유저/차단 관계/중복 지원/이미 매칭된 요청은 차단한다.
  - 범위: 지원 생성/취소/승인/거절과 지원 생성/결정 알림까지만 포함하고, 수행 체크리스트/후기/노쇼는 이후로 분리한다.
- Care Application M3 지원 생성/관리:
  - 추가: `CareApplication`, `CareApplicationStatus`, 지원 생성/결정 notification type과 migration을 추가했다.
  - 연결: validation, service/action, 회원 상세 UI, 상세 API 지원 목록 조회를 연결했다.
  - 권한: 지원자는 본인 지원 생성/취소만 가능하고, 작성자/운영자는 대기 지원을 수락/거절한다. 수락 시 요청 상태는 `MATCHED`가 되고 다른 대기 지원은 거절된다.
  - 차단: 작성자 self-apply, 차단 관계, 중복 지원, 모집 종료 요청, 연락처/금칙어 메시지를 서비스에서 막는다.
  - 통과: prisma generate/migrate deploy, targeted unit, `typecheck`, `lint`.
- 이전 상세 검증은 [COMPLETED.md](./COMPLETED.md)에 보관했다.

## 다음 액션
1. M4 수행 체크리스트/시작/완료/취소/노쇼 상태가 필요한지 preflight한다.
2. 분쟁/신고/관리자 큐 연결과 결제/보험 보류 경계를 확정한다.
3. 구현 범위를 확정하면 schema/service/action/UI/tests 순서로 별도 커밋한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
