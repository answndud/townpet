# PLAN.md

기준일: 2026-05-07
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

### Release Confidence Hardening

상태: `pending`

- 목표: pre-mortem에서 나온 P0/P1 loophole을 순서대로 제거해 운영 배포 확신도를 최대한 끌어올린다.
- 범위: 런타임 고정, production smoke 준비/실행, 관리자 운영 루틴 e2e, abuse/policy gap 점검, 문서-스크립트 동기화.
- 제외: secret 값 문서화, 실사용자 데이터 변경, 결제/보험/정산, 자동 제재 강행.
- 완료 기준: `quality:check`, internal health, care production smoke, 관리자 운영 루틴 smoke가 PASS하거나 남은 No-Go가 구체적으로 기록된다.

## 다음 실행 순서

1. Node/pnpm 표준화: Node 20 LTS 기준 파일/문서/CI를 맞추고 Corepack key 오류 재발을 막는다.
2. Smoke 준비값 확보: `OPS_HEALTH_INTERNAL_TOKEN`, 전용 smoke 계정, 선택 Sentry secret을 값 노출 없이 확인한다.
3. Production smoke: public/internal health, `pg_trgm`, care smoke, 테스트 데이터 정리 여부를 확인한다.
4. 관리자 운영 루틴 e2e: `/admin/ops`, `/admin/reports`, `/admin/care-feedbacks`, `/admin/auth-audits`를 10분 루틴으로 고정한다.
5. Abuse/policy gap 점검: 피드/검색/작성/신고/케어 흐름의 rate limit, 신규유저 제한, 연락처/링크 제한, 감사 로그를 재검증한다.
6. 문서-자동화 동기화: 런북 명령을 package script/test와 맞추고 남은 No-Go를 `PROGRESS.md`/`COMPLETED.md`에 기록한다.
