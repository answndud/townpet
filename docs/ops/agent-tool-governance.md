# Agent Tool Governance (TownPet)

작성일: 2026-03-04  
목적: AI 에이전트가 도구/스택을 임의로 흔들지 않도록 TownPet 기본값, 금지선, 재검토 트리거를 고정한다.

## 1) 운영 원칙
- 목표는 "최신 도구 도입"이 아니라 "정책/운영 일관성"이다.
- 고위험 영역(auth/moderation/report/sanction/rate-limit)은 검증된 패턴 우선이며 DIY 자동 확장을 금지한다.
- Local/Global 경계, 신고 자동숨김(HIDDEN), 신규 유저 제한 정책은 어떤 도구 선택보다 우선한다.
- 에이전트는 기본값을 따르고, 재검토 트리거를 충족한 경우에만 대안을 제안한다.

## 2) 카테고리별 기본 매트릭스
| 카테고리 | 기본값(현재) | 허용 대안(조건부) | 자동 선택 금지선 | 재검토 트리거 |
|---|---|---|---|---|
| ORM/DB | Prisma + PostgreSQL | Drizzle/기타 ORM은 RFC 승인 후 PoC 1회 | "속도 좋아 보임" 근거로 ORM 교체 | p95 DB 지연/쿼리 실패율/운영비용이 2주 연속 SLO 이탈 |
| Auth | NextAuth + 서버 정책 게이트 | Provider 추가(카카오/네이버 등) | DIY 인증 플로우 신규 도입 | 공급자 정책 변경, 실OAuth 실패율 증가, 보안 이슈 발생 |
| Validation/Policy | Zod + Service 레이어 정책 | 없음(필수 경로) | route/action에서 검증 생략 | 외부 입력 누락 검증 이슈 1건 이상 발생 |
| Cache | Next/HTTP cache + query-cache | Redis/Upstash는 rate-limit/abuse 경로 우선 | 무효화 전략 없는 임의 캐시 추가 | API p95 악화, 캐시 적중률 저하, abuse false-negative 증가 |
| Real-time | 비실시간 기본(SSR/API/폴링) | SSE 우선, 양방향 강요건일 때만 Socket | 초기부터 WebSocket 도입 | 실시간 상호작용 요구가 제품 KPI에 명시되고 지연 기준 미달 |
| Observability | health + 구조화 로그 + GH Actions 스모크 | Sentry는 선택 경로(verify_sentry=true) | 트리거 없이 APM/SaaS 무분별 추가 | MTTR 증가, 주간 장애건수/SLO 이탈, 원인추적 실패 반복 |
| Jobs/Scheduler | 앱 스크립트 + GitHub Actions 스케줄 | 큐 시스템(예: BullMQ)은 처리량 근거 시 | 재시도/중복제어 없이 백그라운드 작업 확장 | 작업 실패율/지연 누적/수동 복구 시간 증가 |
| Feature Flags | env + SiteSetting | 외부 SaaS 플래그(운영분리 필요 시) | 실험 체계 없이 SaaS 도입 | 실험 동시성 증가, 권한 분리 요구, 롤백 지연 |
| UI System | Next.js + Tailwind + shadcn/ui | 대형 UI 프레임워크는 UX 요구 확정 시 | 화면 이슈 대응 목적으로 디자인 시스템 교체 | 접근성/속도/유지보수 비용이 기준 초과 |
| Test/CI | Vitest + Playwright + quality gate + Actions | 도메인별 추가 도구는 커버리지 공백 시 | 실패 경로 테스트 없이 기능 머지 | 회귀 증가, flaky 증가, 배포 후 결함 유출 |

## 3) 고위험 영역 고정 규칙
- auth/payment/report/sanction/rate-limit 경로에서는 "직접 구현" 제안을 기본 거절한다.
- 이 영역 변경은 반드시 실패 경로 테스트를 포함한다.
- 정책 흐름 변경 시 구현 순서는 아래를 고정한다.
  - Prisma -> Zod -> Service -> Action/Route -> UI -> Tests

## 4) 에이전트 제안 체크리스트
에이전트가 도구 변경을 제안할 때 아래를 모두 제출해야 한다.
- 현재 기본값 대비 얻는 이득(성능/비용/운영) 수치 1개 이상
- 마이그레이션 범위(스키마, 서비스, 테스트, 운영문서)
- 롤백 경로와 실패 시 운영 영향
- Local/Global, 신고/제재, 신규유저 제한 정책 영향도
- 테스트 계획(실패 경로 최소 1개 포함)

## 5) 재검토 운영 루틴
- 주간: `ops-smoke-checks` 결과와 장애 로그를 바탕으로 트리거 충족 여부만 확인
- 월간: 본 문서의 매트릭스 항목별 기본값/금지선 재검토
- 변경 발생 시: `PLAN.md`/`PROGRESS.md` 동기화 후 운영 가이드 링크 업데이트
