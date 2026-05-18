# PLAN.md

목표: TownPet를 기능/운영/품질 기준에서 출시 가능한 반려 커뮤니티 상태로 끌어올린다.

완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 범위/원칙

- 우선순위: `서비스 안정성 -> 커뮤니티 핵심 기능 -> 재방문/유입 -> 운영 자동화`
- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다.
- 완료 상세와 긴 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append한다.
- Phase 2 보류: 결제/보험/정산, 자동 제재 강행, 카카오맵/마켓/공동구매 deep feature 확장.

## Active

### 2일 백엔드 포트폴리오 고도화

- 상태: `in_progress`
- 목표: 남은 Pro 사용 기간 동안 TownPet를 백엔드 개발자 취업 포트폴리오로 더 선명하게 보이도록 증거화, API 계약화, 운영 신뢰성, 테스트 공백 보강을 우선 처리한다.
- 원칙:
  - 새 기능을 무작정 늘리지 않고, 채용자가 백엔드 역량으로 읽을 수 있는 증거를 먼저 만든다.
  - 큰 재작성보다 작은 vertical slice를 완료하고 검증한다.
  - 보안/운영/데이터 경계는 기존 `service/query/validation/action-route` 책임을 유지한다.
- P0:
  - [x] 백엔드 case study 문서화
  - [x] API route inventory와 테스트 공백 정리
  - [x] 안전한 local/prod env example 정리
  - [x] README에서 백엔드 증거 문서와 안전한 실행 경로 연결
  - [x] route test gap 중 우선순위 높은 경로 보강 계획 확정
- P1:
  - [x] route test gap P1 보강: report detail/bulk, post content/stats
  - [x] auth route test gap 보강: password reset confirm, password setup, email verification confirm
  - [x] 알림 outbox 재처리/관측 루틴 개선
  - [x] cleanup/backfill 스크립트 dry-run/apply guard 표준화
  - [ ] post query/create 대형 모듈 리팩터링 slice 선정
  - [ ] production evidence report 최신화
- 완료 기준:
  - README에서 백엔드 포트폴리오 증거를 바로 찾을 수 있다.
  - clone 사용자가 `app/.env.example` 기준으로 로컬 실행 경로를 이해할 수 있다.
  - API route별 method/access/validation/monitoring/test gap이 문서화되어 다음 구현 순서가 명확하다.
  - 변경 파일 검증이 완료되고 결과가 `PROGRESS.md`에 남는다.

## 다음 작업 후보

- 다음 vertical slice는 post query/create 대형 모듈 리팩터링 slice 선정 또는 production evidence report 최신화다.
