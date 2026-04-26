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

### Care Request M5 후기/노쇼/증빙 preflight

상태: `pending`

- 목표: 완료된 돌봄 요청 이후 후기/노쇼/증빙을 어느 범위까지 열지 결정한다.
- 범위: 상호 후기/평점, 노쇼 신고, 증빙 첨부, 관리자 확인 큐, 공개 노출 여부 판단.
- 제외: 결제/예약 보증/보험/정산, 실시간 위치 추적, 자동 배상/패널티.
- 완료 기준: M5에서 바로 구현할 최소 신뢰 기능과 보류할 법적/운영 고위험 기능을 분리하고 service/query/schema 경계를 문서화한다.

## 다음 실행 순서

1. M4 수행 상태 전환 결과를 완료 archive에 고정한다.
2. 후기/평점/노쇼/증빙 중 결제 없이도 안전한 최소 기능을 비교한다.
3. 구현 범위를 확정하면 schema/service/action/UI/tests 순서로 별도 커밋한다.
