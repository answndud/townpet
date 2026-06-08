# TownPet 백엔드 포트폴리오 케이스 스터디

마지막 갱신일: 2026-06-07

## 목적

TownPet는 반려동물 커뮤니티 제품을 위한 서비스형 백엔드 포트폴리오 프로젝트다. 단순 게시판 UI가 아니라 인증, 비회원 안전장치, 구조화 글쓰기, 검색, 모더레이션, 알림, 관리자 운영, retention cleanup, health check, 배포 preflight, 회귀 테스트까지 포함한다.

## 백엔드 스냅샷

- 런타임 앱: `app/`의 Next.js App Router
- 데이터 계층: Prisma + PostgreSQL
- 입력 검증: `app/src/lib/validations`의 Zod schema
- write orchestration: `app/src/server/services`
- read model: `app/src/server/queries`
- API route: App Router route handler 55개
- 테스트: Vitest test file 248개 / test 1198개, Playwright spec 25개
- 운영 도구: health, security env preflight, latency snapshot, cleanup/repair script

## 도메인 모델 요약

스키마는 CRUD 데모가 아니라 커뮤니티 제품을 모델링한다.

- identity/access: `User`, `Account`, `Session`, `PasswordResetToken`, `AuthAuditLog`
- community structure: `Neighborhood`, `Community`, `CommunityCategory`, `UserNeighborhood`
- content: `Post`, `Comment`, `PostReaction`, `PostBookmark`, `PostImage`
- structured board: 병원 후기, 산책 코스, 중고거래, 돌봄 요청, 입양, 봉사, 장소 후기, 모임, 분실/목격, 질문/답변
- safety/moderation: `Report`, `ReportAudit`, `UserSanction`, `ModerationActionLog`, `GuestAuthor`, `GuestBan`, `GuestViolation`
- operations/analytics: `SearchTermStat`, `SearchTermDailyMetric`, `Notification`, `NotificationDelivery`, feed personalization stats/event log

## 아키텍처 결정

### 1. 정책 우선 service layer

위험도가 높은 흐름은 UI 체크에만 의존하지 않고 service module에서 처리한다. 게시글, 댓글, 반응, 신고, 업로드, 비회원 관리, 제재, moderation action은 backend policy enforcement를 거친다.

근거 파일:

- `app/src/server/services/posts/*`
- `app/src/server/services/moderation/*`
- `app/src/server/services/auth/*`
- `app/src/server/services/notifications/*`

### 2. read model 분리

목록, 상세, 검색, 관리자 화면은 query module을 사용한다. 이렇게 해야 write-side policy orchestration과 섞지 않고 read behavior를 최적화할 수 있다.

근거 파일:

- `app/src/server/queries/posts/*`
- `app/src/server/queries/moderation/*`
- `app/src/server/queries/notifications/*`
- `app/src/server/queries/ops-overview.queries.ts`

### 3. 명시적 안전장치를 둔 비회원 지원

비회원 읽기/쓰기는 제품상 중요하지만, 회원 write path와 분리하고 rate limit, guest hash, step-up check, moderation visibility rule로 보호한다.

근거 파일:

- `app/src/server/guest-step-up.ts`
- `app/src/server/services/guest-author.service.ts`
- `app/src/server/services/moderation/guest-safety.service.ts`
- `app/src/server/services/posts/post-guest-management.service.ts`

### 4. 운영을 백엔드 일부로 취급

이 프로젝트는 로컬 테스트만이 아니라 production 운영에 가까운 점검을 포함한다.

근거 파일:

- `app/scripts/check-health-endpoint.ts`
- `app/scripts/check-security-env.ts`
- `app/scripts/run-ops-evidence.ts`
- `app/scripts/collect-latency-snapshot.ts`
- `.github/workflows/quality-gate.yml`
- `.github/workflows/ops-smoke-checks.yml`

## 보안과 abuse 대응

완료된 주요 보안 작업:

- health response 최소화와 internal diagnostics token
- CSP strict mode 경로
- password policy, login lockout, session invalidation
- HMAC pepper 기반 guest identifier hardening
- auth enumeration-safe response
- production security env preflight
- uploaded image provenance enforcement
- comment response 최소화
- admin surface concealment와 privileged audit trail
- guest write/read override hardening

소스 오브 트루스:

- `business/security/보안_계획.md`
- `business/security/보안_위험_등록부.md`
- `business/security/보안_진행상황.md`

## 신뢰성과 운영

1인 운영 기준 최소 루틴:

- `corepack pnpm -C app quality:check`
- `corepack pnpm -C app ops:check:health`
- `corepack pnpm -C app db:restore:local`

on-demand 운영 도구:

- security env strict check
- Sentry ingestion check
- latency snapshot
- notification cleanup과 delivery outbox retry
- auth audit cleanup
- search-term cleanup
- post integrity repair
- guest legacy maintenance

## API 표면

라우트 지도는 `business/reports/api-route-inventory.md`를 본다. 백엔드 관점에서 중요한 route group은 다음과 같다.

- `/api/auth/*`
- `/api/posts/*`
- `/api/feed/*`
- `/api/search/*`
- `/api/reports/*`
- `/api/admin/*`
- `/api/notifications`
- `/api/upload`
- `/api/health`

생성된 계약 리포트는 현재 route handler 55개를 다루며, method export 누락 0건, 인접 테스트 누락 0건, `validation=none` / `monitoring=none` 검토 라벨 0건이다.

## 테스트 전략

계층별 검증 방식:

- unit/integration: service, query, validation, script behavior
- API route test: request parsing, authorization, failure path
- Playwright: feed/search/auth/report/notification/editor hot path
- quality gate: lint, typecheck, Vitest, Next build
- operations check: health, security env, latency, Sentry optional smoke

대표 명령:

```bash
corepack pnpm@9.12.3 -C app quality:check
```

## 현재 개선 목표

포트폴리오 관점에서 작고 명확한 다음 slice:

1. release candidate 이후 production evidence report를 최신 상태로 유지한다.
2. 가장 강한 backend slice를 면접 Q&A 카드와 demo narration으로 변환한다.
3. 실제 browser-specific risk가 있는 기능 변경에만 targeted e2e를 추가한다.

## 면접에서 설명할 포인트

- `LOCAL / GLOBAL`을 단순 UI filter가 아니라 policy boundary로 다룬 이유
- 비회원 글쓰기를 허용하면서 abuse가 moderation을 우회하지 못하게 한 방식
- read model과 write service를 분리한 이유
- security env preflight가 깨진 production deploy를 막은 사례
- 1인 운영 단순성과 release safety를 균형 있게 잡은 방식
- 의도적으로 미룬 범위: 결제, 자동 hard sanction, 지도 중심 deep flow, marketplace deep workflow

## 알려진 trade-off

- 프로젝트 범위는 넓지만 일부 backend module은 아직 크다.
- API route method, adjacent test, access/validation/monitoring heuristic label은 생성 점검 경로가 있으나, heuristic label은 정책 증거로 쓰기 전에 사람이 리뷰해야 한다.
- Sentry는 optional이라 외부 secret이 없으면 observability는 health/log/script 중심이다.
- production smoke는 1인 운영에 맞게 작게 유지한다. 더 깊은 browser smoke는 on-demand로 분리한다.
