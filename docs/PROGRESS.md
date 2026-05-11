# PROGRESS.md

기준일: 2026-05-11
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서는 `docs/PLAN.md`, `docs/PROGRESS.md` slim active와 `docs/COMPLETED.md` archive 구조로 운영한다
- 공개 SEO, 보안 헤더, 운영 smoke, 로딩/빈상태, 레드팀 잔여 remediation, 피드/검색 hot path 검증을 완료했다
- 개인화/광고 운영 판단 기준, 관리자 진단 UX, 광고/추천 정책 분리, 품종 라운지 write gate 점검을 완료했다
- 운영 evidence runner, Search Quality Phase 2, Market State Machine preflight/M1/M2를 완료했다
- Social Dev Onboarding Smoke 안정화와 Launch Gap 다음 후보 재평가를 완료했다
- Care Request Templates preflight, M1 구조화 요청, M2 상태 전환, M3 preflight를 완료했다
- Care Application M3 지원 생성/관리와 Care Request M4 preflight/상태 전환을 완료했다
- Care Request M5 후기/노쇼/증빙 preflight를 완료했다
- Care Request M5 완료 피드백을 완료했다
- Care Request M6 운영 신호 큐 preflight를 완료했다
- Care Request M6 운영 신호 큐를 완료했다
- Care Request M7 케어 플로우 로컬 검증을 완료했다
- Care Request M8 출시 갭 정리를 완료했다
- Care Request M9 운영 런북/데모 seed를 완료했다
- Care Request M10 관리자 큐 처리 상태와 M11 모바일/빈 상태 polish를 완료했다
- Care Request M12 운영 threshold와 M13-M18 production smoke 준비/보류/tooling을 완료했다
- Release Confidence Hardening 상세 계획과 P0-1 CI/build gate, P0-2 rendered HTML/XSS 안전성, P0-3 abuse-prone write path Redis 장애 failure mode, P0-4 production smoke readiness blocker 정리를 완료했다.
- 다음 작업: P1-1 production smoke 실제 원격 실행

## 열린 blocker
- Production smoke는 실제 원격 `ops-smoke-checks` 실행과 운영 smoke 계정 존재/권한 확인 전까지 blocked다.
- 로컬 환경에는 실제 secret 값이 없으므로 internal health/pg_trgm 확인은 GitHub Actions 또는 운영 secret 주입 환경에서 실행해야 한다.

## 직전 검증
- Care Request M1-M6:
  - 구조화 요청, 상태 전환, 지원 생성/관리, 완료 피드백, `/admin/care-feedbacks`, `/admin/ops` 요약을 완료했다.
  - 완료 피드백 이슈는 신고 큐와 분리하고, 공개 피드/검색/프로필에는 노출하지 않는다.
- Care Request M7 로컬 검증:
  - 정상: UI 기준 작성 -> 지원 -> 수락 -> 진행/완료 -> 완료 피드백 -> 관리자 이슈 큐 -> Ops 요약 e2e가 통과했다.
  - 버그: 돌봄 요청 작성 폼의 동네 선택 UI 누락을 재현했고, `showNeighborhood` 조건 수정으로 해결했다.
  - 보류: 결제/보험/정산, production smoke, 자동 제재, 증빙 업로드.
- Care Request M8 출시 갭 정리:
  - 바로 구현: 운영 런북, 로컬 demo seed/seed 지침, e2e 실행 위치 정리.
  - 이후 보강: 빈 상태/모바일 polish, 관리자 큐 처리 상태, 운영 지표 threshold.
  - 보류 유지: 결제/보험/정산, 자동 제재, 증빙 업로드, production smoke.
- Care Request M9 운영 런북/데모 seed:
  - 추가: `db:seed:care-demo`, `db:restore:local` seed step, `business/operations/돌봄_운영_런북.md`.
  - 데이터: 요청자/지원자/운영자 계정과 `OPEN`, `MATCHED`, `COMPLETED + SAFETY issue` 케이스.
  - 보류 유지: 결제/보험/정산, 자동 제재, 증빙 업로드, production smoke.
- Care Request M10 관리자 큐 처리 상태 preflight:
  - 결정: 별도 dispute/queue table 없이 `CareCompletionFeedback`에 검토 상태/운영자 메모를 붙인다.
  - 처리 이력은 신고 큐의 `ReportAudit`이 아니라 `ModerationActionLog`의 `CARE_FEEDBACK_REVIEWED` action으로 남긴다.
- Care Request M10 관리자 큐 처리 상태 구현:
  - 추가: `CareFeedbackReviewStatus`, `reviewStatus/reviewNote/reviewedAt/reviewedBy`, 관리자 action/service, 상태 필터/처리 폼.
  - 검증: migration deploy, care demo seed, targeted Vitest, `typecheck`, `lint`.
- Care Request M11 모바일/빈 상태 polish preflight:
  - 모바일 390px 기준 feed/detail 문서 overflow 없음.
  - `/admin/care-feedbacks`는 1120px 테이블 내부 스크롤로만 운영해야 해 모바일 카드 리스트가 필요하다.
  - 필터 0건 empty copy는 전체 큐 없음과 조건 0건을 분리해야 한다.
- Care Request M11 관리자 큐 모바일/빈 상태 polish:
  - 추가: 모바일 카드 리스트, 데스크톱 테이블 분리, 필터 0건 empty copy.
  - 검증: `care-feedback-mobile.spec.ts`, `typecheck`, `lint`.
- Care Request M12 운영 threshold preflight:
  - 결정: 자동 조치 없이 `/admin/ops` 경고 copy와 count 표시만 추가한다.
  - 기준: `PENDING >= 3`, `PENDING + REVIEWING >= 5`, `SAFETY/PAYMENT_OR_FRAUD >= 1`.
- Care Request M12 운영 threshold 구현: helper, Ops count/badge/copy, targeted Vitest, `typecheck`, `lint` 통과.
- Care Request M13 출시 준비 최종 정리: 로컬 기능 조건부 Go, 운영 배포는 production smoke/strict health 전 No-Go.
- Care Request M14-M17 production smoke 준비/보류 확인: public health PASS, internal token/Sentry/테스트 계정 부재로 blocked.
- Care Request M18 smoke readiness tooling: 표준 smoke 계정 식별자와 `ops:check:care-smoke-readiness`; 현재 환경은 expected `BLOCKED`.
- Release Confidence Hardening P0-1:
  - `quality:check`가 `eslint -> tsc --noEmit -> vitest run -> next build`를 실행하도록 강화했다.
  - GitHub `quality-gate` step 이름을 build 포함 기준으로 갱신했다.
  - Next production build phase에서는 module-load runtime assert를 건너뛰되, `validateRuntimeEnv`와 Vercel strict preflight는 유지되도록 경계를 분리했다.
  - 검증: `corepack pnpm@9.12.3 -C app exec vitest run src/lib/env.test.ts`, `corepack pnpm@9.12.3 -C app quality:check` 통과.
- Release Confidence Hardening P0-2:
  - `markdown-lite`의 link/image token placeholder를 사용자 입력과 충돌하기 어려운 sentinel로 바꿨다.
  - unsafe markdown link는 anchor로 만들지 않고 label만 남기도록 강화했다.
  - `javascript:`, `data:`, raw HTML, link label HTML, image alt quote/event text, unsafe image protocol, placeholder collision fixture를 추가했다.
  - 검증: `corepack pnpm@9.12.3 -C app exec vitest run src/lib/markdown-lite.test.ts src/lib/json-script.test.ts`, `corepack pnpm@9.12.3 -C app quality:check` 통과.
- Release Confidence Hardening P0-3:
  - `enforceRateLimit`에 `failureMode: "closed"`를 추가해 Redis/Upstash 장애 시 high-risk 경로가 503으로 fail-closed할 수 있게 했다.
  - 인증 작성 throttle은 모든 user/ip/fingerprint/scope limit에 closed mode를 적용했다.
  - 게스트 작성/수정/삭제/댓글, 업로드, guest step-up, 검색 로그, 개인화 metric write에 closed mode를 적용했다.
  - 검증: targeted 9개 테스트 파일, `corepack pnpm@9.12.3 -C app quality:check` 통과.
- Release Confidence Hardening P0-4:
  - GitHub Actions secret inventory에서 `HEALTH_INTERNAL_TOKEN`, Sentry 4종 secret 설정 여부를 값 노출 없이 확인했다.
  - GitHub repository variables에 표준 smoke 계정 식별자 3종을 설정했다.
  - `ops-smoke-checks`가 health/prewarm 전에 `ops:check:care-smoke-readiness`를 실행하도록 추가했다.
  - 검증: `HEALTH_INTERNAL_TOKEN=dummy ... corepack pnpm@9.12.3 -C app ops:check:care-smoke-readiness` PASS.
## 다음 액션
1. P1-1에서 `ops-smoke-checks`를 원격 기준으로 실행한다.
2. `verify_pg_trgm=true`, 필요 시 `verify_sentry=true`로 internal health와 Sentry ingestion을 확인한다.
3. 운영 smoke 계정이 실제로 존재하고 필요한 role/session 조건을 만족하는지 브라우저 smoke로 확인한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
