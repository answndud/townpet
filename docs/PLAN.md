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

### Care Request M8 출시 갭 정리

상태: `pending`

- 목표: 케어 요청 M1-M7 이후 출시 전 남은 제품/운영/테스트 갭을 정리한다.
- 범위: e2e 편입 기준, 운영 runbook, demo seed, 빈 상태/모바일 polish, 관리자 검토 루틴.
- 제외: 결제/보험/정산, 자동 제재, 증빙 업로드, production smoke.
- 완료 기준: 바로 구현할 항목과 보류 항목을 우선순위와 완료 조건으로 분리한다.

## 다음 실행 순서

1. M1-M7 케어 플로우 결과와 남은 리스크를 정리한다.
2. 출시 전 필요한 운영 문서/seed/e2e/UX 보강 후보를 우선순위화한다.
3. 다음 구현 단위를 `PLAN.md`와 정책 문서에 반영한다.
