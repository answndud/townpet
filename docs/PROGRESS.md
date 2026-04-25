# PROGRESS.md

기준일: 2026-04-25
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
- 다음 작업: 운영 10분 루틴 로컬 evidence runner 보강

## 열린 blocker
- 없음. 기존 `db:restore:local` local test account count mismatch는 managed account count 검증으로 수정했고 restore 통과를 확인했다.

## 직전 검증
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
1. 기존 운영 점검 스크립트의 입출력과 실패 방식을 확인한다.
2. read-only 로컬 evidence runner 범위를 정한다.
3. runner, package script, 테스트, 운영 문서를 추가한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
