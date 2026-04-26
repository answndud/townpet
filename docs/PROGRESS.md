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
- 다음 작업: Care Request M7 케어 플로우 로컬 검증

## 열린 blocker
- 없음. `test:e2e:smoke` social-dev 온보딩 blocker는 callback side effect 차단과 온보딩 대기 안정화로 해결했고 smoke 통과를 확인했다.

## 직전 검증
- Care Request M1-M3:
  - 구조화 요청, 작성자 취소/admin override, 별도 `CareApplication` 지원 생성/취소/승인/거절과 알림을 완료했다.
  - `LOCAL` 전용, 게스트 작성 차단, 신규 유저 제한, 연락처/링크/금칙어 검사를 기존 post write path로 재사용한다.
- Care Application M3 지원 생성/관리:
  - 추가: `CareApplication`, `CareApplicationStatus`, 지원 생성/결정 notification type과 migration을 추가했다.
  - 연결: validation, service/action, 회원 상세 UI, 상세 API 지원 목록 조회를 연결했다.
  - 권한: 지원자는 본인 지원 생성/취소만 가능하고, 작성자/운영자는 대기 지원을 수락/거절한다. 수락 시 요청 상태는 `MATCHED`가 되고 다른 대기 지원은 거절된다.
  - 차단: 작성자 self-apply, 차단 관계, 중복 지원, 모집 종료 요청, 연락처/금칙어 메시지를 서비스에서 막는다.
  - 통과: prisma generate/migrate deploy, targeted unit, `typecheck`, `lint`.
- Care Request M4 수행 체크리스트 preflight:
  - 결정: M4는 세부 체크리스트가 아니라 `MATCHED -> IN_PROGRESS -> COMPLETED` 상태 전환, 작성자 취소, 운영자 override로 제한한다.
  - 권한: 작성자와 수락 지원자만 매칭된 요청의 시작/완료 전환을 수행하고, 운영자는 수동 복구/취소를 수행한다.
  - 정책: 분쟁은 기존 Post 신고 큐(`FRAUD`, `PRIVACY`, `EMERGENCY`)와 `ModerationActionLog`/`ReportAudit`로 연결한다.
  - 보류: 체크인 사진, 노쇼 판정, 후기/평점, 별도 dispute table, 결제/보험/실시간 위치.
- Care Request M4 수행 상태 전환:
  - 추가: `CARE_STATUS_CHANGED` 알림 type과 status change notification helper를 추가했다.
  - 권한: 작성자와 수락 지원자는 `MATCHED -> IN_PROGRESS -> COMPLETED`, 작성자는 `MATCHED -> CANCELLED`, 운영자는 override 가능하다.
  - 감사: 기존 `CARE_STATUS_CHANGED` audit metadata에 actor scope와 accepted application id를 남긴다.
  - UI: 회원 상세에서 현재 상태/역할별로 가능한 상태 버튼만 표시한다.
  - 통과: prisma generate/migrate deploy, targeted unit, `typecheck`, `lint`.
- Care Request M5 후기/노쇼/증빙 preflight:
  - 결정: 공개 평점/증빙 자동 판정이 아니라 비공개 `CareCompletionFeedback`과 운영 이슈 신호 수집으로 제한한다.
  - 권한: 요청 작성자와 수락 지원자만 `COMPLETED` 요청에 각 1회 작성한다.
  - 공개: 피드백은 당사자/관리자만 보고, 공개 프로필 점수나 자동 랭킹에는 사용하지 않는다.
  - 보류: 공개 별점, 체크인 사진, 자동 노쇼 판정, 자동 패널티, 결제/보험/정산.
- Care Request M5 완료 피드백:
  - 추가: `CareCompletionFeedback`, outcome/issueType enum, validation, service/action, detail API/UI를 연결했다.
  - 권한: 요청 작성자와 수락 지원자만 `COMPLETED` 요청에 각 1회 작성한다.
  - 공개: 피드백은 당사자/관리자만 detail API에서 조회하고 공개 피드/검색에는 노출하지 않는다.
  - 통과: prisma generate/migrate deploy, targeted Vitest, `typecheck`, `lint`.
- Care Request M6 운영 신호 큐 preflight:
  - 결정: 기존 신고 큐에는 섞지 않고 별도 `/admin/care-feedbacks` 큐와 Ops 요약 카드로 구현한다.
  - 이유: `CareCompletionFeedback`은 사용자가 제기한 신고가 아니라 당사자 비공개 운영 신호라 `ReportStatus/ReportAudit` 처리 모델과 다르다.
  - 범위: `issueType != NONE` 조회, issue/outcome 필터, 관련 게시글 상세 링크, 관리자 전용 접근, tests.
  - 보류: 자동 제재, 공개 평판 점수, 증빙 업로드, 결제/보험 분쟁 처리, 별도 dispute table.
- Care Request M6 운영 신호 큐:
  - 추가: `listCareFeedbackIssueQueue`, `getCareFeedbackIssueStats`, `/admin/care-feedbacks`, `/admin/ops` 요약 카드를 연결했다.
  - 공개: `issueType != NONE` 피드백만 관리자 큐에서 보고, 신고 큐/공개 화면에는 섞지 않는다.
## 다음 액션
1. 로컬 DB/서버를 준비하고 케어 요청 시나리오 계정을 확인한다.
2. 작성자/지원자/관리자 역할별 hot path를 브라우저에서 검증한다.
3. 실패 기능은 즉시 재현 테스트 후보와 수정 우선순위로 분류한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
