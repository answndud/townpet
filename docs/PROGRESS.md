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
- 다음 작업: Care Request M8 출시 갭 정리

## 열린 blocker
- 없음. `test:e2e:smoke` social-dev 온보딩 blocker는 callback side effect 차단과 온보딩 대기 안정화로 해결했고 smoke 통과를 확인했다.

## 직전 검증
- Care Request M1-M4:
  - 구조화 요청, 작성자 취소/admin override, `CareApplication` 지원 생성/취소/승인/거절, `MATCHED -> IN_PROGRESS -> COMPLETED` 상태 전환을 완료했다.
  - `LOCAL` 전용, 게스트 작성 차단, 신규 유저 제한, 연락처/링크/금칙어 검사를 기존 post write path로 재사용한다.
- Care Request M5 후기/노쇼/증빙 preflight:
  - 결정: 공개 평점/증빙 자동 판정이 아니라 비공개 `CareCompletionFeedback`과 운영 이슈 신호 수집으로 제한한다.
  - 권한: 요청 작성자와 수락 지원자만 `COMPLETED` 요청에 각 1회 작성한다.
  - 공개: 피드백은 당사자/관리자만 보고, 공개 프로필 점수나 자동 랭킹에는 사용하지 않는다.
  - 보류: 공개 별점, 체크인 사진, 자동 노쇼 판정, 자동 패널티, 결제/보험/정산.
- Care Request M5 완료 피드백:
  - 추가: `CareCompletionFeedback`, outcome/issueType enum, validation, service/action, detail API/UI를 연결했다.
  - 권한: 요청 작성자와 수락 지원자만 `COMPLETED` 요청에 각 1회 작성한다.
  - 공개: 피드백은 당사자/관리자만 detail API에서 조회한다.
  - 통과: prisma generate/migrate deploy, targeted Vitest, `typecheck`, `lint`.
- Care Request M6 운영 신호 큐 preflight:
  - 결정: 기존 신고 큐에는 섞지 않고 별도 `/admin/care-feedbacks` 큐와 Ops 요약 카드로 구현한다.
  - 이유: `CareCompletionFeedback`은 사용자가 제기한 신고가 아니라 당사자 비공개 운영 신호라 `ReportStatus/ReportAudit` 처리 모델과 다르다.
  - 범위: `issueType != NONE` 조회, issue/outcome 필터, 관련 게시글 상세 링크, 관리자 전용 접근, tests.
  - 보류: 자동 제재, 공개 평판 점수, 증빙 업로드, 결제/보험 분쟁 처리, 별도 dispute table.
- Care Request M6 운영 신호 큐:
  - 추가: `listCareFeedbackIssueQueue`, `getCareFeedbackIssueStats`, `/admin/care-feedbacks`, `/admin/ops` 요약 카드를 연결했다.
  - 공개: `issueType != NONE` 피드백만 관리자 큐에서 보고, 신고 큐/공개 화면에는 섞지 않는다.
- Care Request M7 로컬 검증:
  - 정상: UI 기준 작성 -> 지원 -> 수락 -> 진행/완료 -> 완료 피드백 -> 관리자 이슈 큐 -> Ops 요약 e2e가 통과했다.
  - 버그: 돌봄 요청 작성 폼의 동네 선택 UI 누락을 재현했고, `showNeighborhood` 조건 수정으로 해결했다.
  - 보류: 결제/보험/정산, production smoke, 자동 제재, 증빙 업로드.
## 다음 액션
1. M1-M7 케어 플로우 결과와 남은 리스크를 정리한다.
2. 출시 전 필요한 운영 문서/seed/e2e/UX 보강 후보를 우선순위화한다.
3. 다음 구현 단위를 `PLAN.md`와 정책 문서에 반영한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
