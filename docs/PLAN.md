# PLAN.md

기준일: 2026-04-25
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

### 로컬 핵심 기능 동작 검증

상태: `pending`

- 목표: 게스트/회원 기준 핵심 기능이 로컬 브라우저에서 실제로 동작하는지 확인한다.
- 범위: 피드, 검색, 인증, 글쓰기, 댓글, 좋아요/북마크, 신고, 알림, 관리자 운영 화면.
- 제외: 결제/마켓/카카오맵/실 OAuth 실계정 검증, 운영 배포 smoke.
- 기본 순서: `quality:check` -> local data/server 준비 -> 게스트 피드/검색 -> 회원 피드/검색/인증 -> 게시글 액션 -> 신고/정책 -> 알림/마이페이지 -> 관리자/운영 화면.
- 자동화 매핑: `test:e2e:smoke`, `test:e2e:auth`, `search-and-board-filtering`, `guest-post-management`, `post-comment-auth-sync`, `notification-filter-controls`, `admin-new-user-policy`.
- 완료 기준: 기능별 결과를 `정상 / 버그 / 보류`로 분류하고, 버그는 재현 URL, 재현 단계, 원인 후보, 수정 우선순위를 남긴다.

## 다음 실행 순서

1. `corepack pnpm -C app quality:check`로 기본 품질 게이트를 먼저 확인한다.
2. 필요 시 `corepack pnpm -C app db:restore:local` 후 `corepack pnpm -C app dev`로 로컬 서버를 띄운다.
3. `/feed/guest`, `/feed`, 글쓰기/댓글/신고/알림/관리자 흐름을 순서대로 브라우저와 Playwright로 검증한다.
4. 발견 결과를 `docs/PROGRESS.md`에 기능별 `정상 / 버그 / 보류`로 기록한다.
5. 보류: 개인화 운영 판단 기준 문서화는 로컬 핵심 기능 검증 완료 후 재개한다.
