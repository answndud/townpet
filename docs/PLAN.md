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

### 광고/추천 정책 분리 증거 보강

상태: `pending`

- 목표: 광고 노출/클릭 신호가 커뮤니티 추천 랭킹을 직접 구매하지 않는다는 원칙을 회귀 테스트로 고정한다.
- 범위: personalization policy helper/service tests, 추천 boost 계산 경계, 광고 cap 문서 연결.
- 제외: 실제 광고 계약/과금, 광고 소재 관리 UI, 관리자 진단 UX 추가 확장.
- 완료 기준: 광고 클릭/노출 신호는 cap 안의 약한 engagement 신호로만 반영되고, sponsored/partner 표면은 별도 후보라는 증거가 남는다.

## 다음 실행 순서

1. 개인화 추천 boost 계산과 광고 신호 cap 테스트를 확인한다.
2. 광고 클릭/노출이 추천 랭킹을 직접 구매하지 않는 회귀 테스트를 추가한다.
3. 필요하면 정책 문서와 helper명을 정리한다.
4. 관련 unit test, `lint`, `typecheck`, `quality:check`를 검증한다.
