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
- Care Request M4 수행 체크리스트 preflight를 완료했다
- Care Request M4 수행 상태 전환을 완료했다
- Care Request M5 후기/노쇼/증빙 preflight를 완료했다
- Care Request M5 완료 피드백을 완료했다
- Care Request M6 운영 신호 큐 preflight를 완료했다
- Care Request M6 운영 신호 큐를 완료했다
- Care Request M7 케어 플로우 로컬 검증을 완료했다
- Care Request M8 출시 갭 정리를 완료했다
- Care Request M9 운영 런북/데모 seed를 완료했다
- Care Request M10 관리자 큐 처리 상태 preflight를 완료했다
- Care Request M10 관리자 큐 처리 상태 구현을 완료했다
- Care Request M11 모바일/빈 상태 polish preflight를 완료했다
- 다음 작업: Care Request M11 관리자 큐 모바일/빈 상태 polish

## 열린 blocker
- 없음. `test:e2e:smoke` social-dev 온보딩 blocker는 callback side effect 차단과 온보딩 대기 안정화로 해결했고 smoke 통과를 확인했다.

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
## 다음 액션
1. `/admin/care-feedbacks` 모바일 전용 카드 리스트를 추가한다.
2. 필터 적용 여부에 따라 empty state title/description을 분리한다.
3. 모바일 smoke로 overflow, 저장 CTA, 필터 0건 copy를 검증한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
