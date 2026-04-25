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

### 운영 10분 루틴 로컬 evidence runner 보강

상태: `pending`

- 목표: 혼자 운영할 때 매주 10분 안에 실행할 health/security/perf 점검을 단일 로컬 evidence 흐름으로 묶는다.
- 범위: `ops:*` 스크립트 조합, 로컬 리포트 출력 경로, package script, 운영 문서, failure-path 테스트.
- 제외: 실 Sentry ingestion, 실 Vercel/GitHub secrets 조회, 운영 배포 smoke, 장기 모니터링 대시보드 구축.
- 완료 기준: 로컬에서 하나의 명령으로 실행/실패 결과를 남기고, 결과 위치와 판정 기준이 운영 문서와 테스트에 고정된다.

## 다음 실행 순서

1. 기존 `ops:check:health`, `ops:check:security-env`, `ops:perf:snapshot`, `ops:prewarm` 스크립트의 입출력과 실패 방식을 확인한다.
2. 로컬/원격 모두에서 쓸 수 있는 runner 범위를 정하고, 기본은 destructive DB 작업 없이 read-only 점검으로 제한한다.
3. runner와 failure-path 테스트를 추가한 뒤 운영 문서와 `PROGRESS.md`를 갱신한다.
