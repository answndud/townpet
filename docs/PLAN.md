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

### Market State Machine Phase 2 preflight

상태: `pending`

- 목표: 마켓 글을 결제 없이도 상태가 있는 거래 표면으로 올릴 수 있는 최소 구현 경계를 확정한다.
- 범위: `MarketListing` schema/service/UI/API/test 현황, `마켓_운영규칙`, 신고/제재/감사 로그 연결 지점.
- 제외: 결제/정산/에스크로/배송, 외부 채팅, 케어/지도 기능, 실운영 데이터 마이그레이션.
- 완료 기준: 상태 전환 권한, 감사 로그, 신고/분쟁 연결, 필요한 schema 변경 여부를 정리하고 첫 구현 단위를 테스트 기준으로 고정한다.

## 다음 실행 순서

1. `MarketListing` schema와 현재 작성/조회 UI/API 경로를 확인한다.
2. `AVAILABLE/RESERVED/SOLD/CANCELLED` 상태 전환 권한과 감사 로그 필요 지점을 정한다.
3. 첫 구현 단위를 schema/service/action/UI/test 중 어디까지로 자를지 문서화한다.
