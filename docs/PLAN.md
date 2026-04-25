# PLAN.md

기준일: 2026-04-26
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

### Care Request M2 상태 전환/지원 흐름 preflight

상태: `pending`

- 목표: 돌봄 요청의 상태 전환과 지원/문의 흐름을 구현하기 전에 권한, 감사 로그, 모델 경계를 확정한다.
- 범위: `CareRequestStatus`, 작성자/운영자 권한, 지원자 모델 후보, 신고/감사 로그 연결, 알림 후보, failure-path tests.
- 제외: 실제 M2 구현, 결제/예약/보험, 외부 계약 자동화, 실시간 위치 추적.
- 완료 기준: 상태 전환 M2와 지원/문의 M3 경계를 분리하고 첫 구현 단위와 테스트 기준을 `PROGRESS/COMPLETED`에 남긴다.

## 다음 실행 순서

1. 마켓 상태 전환 패턴과 `CareRequestStatus` 후보 전이를 비교한다.
2. 작성자/admin/moderator/지원자 권한과 `ModerationActionLog` action 필요 여부를 확정한다.
3. M2 구현 범위와 테스트 목록을 문서화한다.
