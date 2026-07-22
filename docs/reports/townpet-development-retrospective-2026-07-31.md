# TownPet 개발 개선 회고

> 면접 준비와 향후 회고를 위한 기록
>
> 기준일: 2026-07-31 (KST)
> 기준 브랜치: `main`
> 기준 commit: `ffcd1447 Align local runtime with production`
> Production: [townpet.vercel.app](https://townpet.vercel.app)

## 1. 이 문서의 목적

이 문서는 TownPet를 개발하면서 진행한 보안, 데이터 정합성, 아키텍처, 운영, 테스트, UI·제품 개선을 “무엇을 바꿨는가”에서 끝내지 않고 다음 구조로 기록한다.

```text
문제 발견 → 위험 판단 → 설계 선택 → 구현 → 회귀 검증 → 운영 반영 → 남은 한계
```

세부 코드 감사 결과는 [`full-repository-audit-2026-07-30.md`](./full-repository-audit-2026-07-30.md), remediation 결과는 [`full-repository-audit-results-2026-07-30.md`](./full-repository-audit-results-2026-07-30.md)를 참조한다.

## 2. 프로젝트 한 줄 설명

TownPet는 `LOCAL / GLOBAL`을 운영 규칙으로 분리한 반려동물 커뮤니티다. 게시글·댓글·검색뿐 아니라 게스트 글쓰기, 분실·목격 제보, 돌봄, 거래, 신고·제재·관리자 운영까지 포함하며, 기능 구현보다 **신뢰·안전·운영 가능성**을 제품 기본값으로 둔다.

### 핵심 기술 구조

- Next.js App Router, React, TypeScript
- PostgreSQL + Prisma migration
- Redis/Upstash 기반 cache·rate limit
- Vercel 배포, Vercel Blob 미디어 저장
- Vitest unit/contract test, Playwright E2E
- 계층: Validation → Action/Route → Service → Query/Prisma → Presenter/UI

## 3. 개선 전후의 변화

| 영역 | 개선 전 위험 | 현재 상태 |
| --- | --- | --- |
| 게스트 credential | 게시글 수정 비밀번호가 URL query에 들어갈 수 있음 | URL·history·Referer에 credential을 싣지 않는 step-up 흐름으로 전환 |
| 업로드 | asset attach 주체와 삭제 lifecycle이 애플리케이션 흐름에 느슨하게 의존 | user/guest ownership, visibility, 참조 정리, 실패 health 지표 추가 |
| 알림 | 조회 과정에 delivery flush/archive/write가 섞이고 실패 원인 파악이 어려움 | read/write 분리, outbox retry/backoff, dead-letter, stale age 운영 지표 추가 |
| Query 계층 | 조회 모듈 안에 write/side effect가 재유입될 가능성 | read-only query와 service/repository write 분리, 59개 파일 boundary 검사 |
| 모더레이션 | 신고 대상 해석·제재·정책 write가 큰 service에 집중 | policy/report/direct moderation support coordinator로 분리 |
| CSP | report-only와 fallback 상태가 혼재 | Production strict nonce + `strict-dynamic`을 public shell까지 검증 |
| 운영 env | 로컬·CI·Vercel Node/build 경로 불일치 | Vercel/CI Node 24 기준, `app/.nvmrc`, `engines`, `pnpm build:vercel` 정렬 |
| 검증 | 기능별 테스트는 있으나 경계·실패 경로가 약함 | 363 test files / 1,784 tests, query/API/build/health 게이트 운영 |

## 4. 주요 개발 흐름

### 4.1 감사에서 remediation으로

2026-07-30 전체 저장소 감사에서 baseline을 만들었다.

- P0: 0건
- P1: 1건
- P2: 14건
- 주요 위험: guest password URL 노출, upload ownership, mutation/finalization partial success, query write 혼입, notification/cache 관측 부족, CSP rollout 불명확성

감사 후에는 문제를 파일 단위로 무작정 고치지 않고, 공통 원인을 계층·정책·운영 단위로 묶었다. 예를 들어 알림 query의 여러 문제를 각각 고치는 대신 read model, write service, outbox, 운영 지표로 분리했다.

### 4.2 날짜별 최근 작업 기록

| 날짜 | Commit | 작업 | 핵심 결과 |
| --- | --- | --- | --- |
| 2026-07-15 | `a4b25f96` | guest ownership 및 media access hardening | guest step-up nonce, upload ownership, private/deleted media 접근 차단 |
| 2026-07-16 | `4baba03a` | post write orchestration coordinator 추출 | post-care side effect와 upload finalization 경계 분리 |
| 2026-07-17 | `3d5b66e2` | partial-success 회귀 테스트 | notification 실패, cache refresh, upload attach/release 실패 계약 고정 |
| 2026-07-18 | `717c8261` | notification/search read model 분리 | query write 제거, notification outbox와 search statistics service 분리 |
| 2026-07-19 | `7b03ce4f` | failure age 운영 지표 | failed/dead-letter/cache invalidation 경과 시간 노출 |
| 2026-07-20 | `7408a5f0` | 운영 화면·장애 런북 정렬 | `/admin/ops`와 1인 운영 runbook에 판단 기준 반영 |
| 2026-07-22 | `d5622350` | moderation/lost-found workflow hardening | 정책 write, 신고 대상, 직접 제재 coordinator 분리 및 상태 event 추가 |
| 2026-07-26 | `76828e17` | public shell·Production smoke | strict CSP public shell, public route/시각 smoke 기반 정리 |
| 2026-07-31 | `ffcd1447` | local/Production runtime 정렬 | Vercel build command, Node 24 기준, Production-only env 정리 |

## 5. 보안 개선

### 5.1 게스트 게시글 credential 노출 제거

#### 문제

게스트 글 수정 링크에 비밀번호를 query parameter로 전달하면 브라우저 history, access log, analytics, Referer, 복사된 링크에 실제 수정·삭제 credential이 남을 수 있다. 이 문제는 단순한 URL 설계 문제가 아니라 게시글 소유권 탈취 가능성이 있는 P1 위험이었다.

#### 해결

- `app/src/components/posts/guest-post-detail-actions.tsx`에서 password query 전달 제거
- `app/src/server/guest-step-up.ts`에서 HMAC token과 TTL 사용
- `GuestStepUpNonce.tokenHash @unique`와 원자적 consume으로 replay 방어
- `app/src/app/api/guest/step-up/route.ts`에서 step-up 처리
- URL·Referer에 credential이 없음을 E2E와 회귀 테스트로 검증

#### 설계 판단

비밀번호를 URL에서 완전히 제거하되, 기존 게스트 경험을 깨지 않기 위해 짧은 TTL의 step-up credential을 사용했다. 이후 high-value operation에 대해서는 single-use nonce를 추가해 “짧은 시간 동안만 유효”와 “한 번만 사용 가능”을 모두 만족시켰다.

관련 근거: [`docs/errors/2026-07-30_guest-password-url-exposure.md`](../errors/2026-07-30_guest-password-url-exposure.md), [`app/src/server/guest-step-up.ts`](../../app/src/server/guest-step-up.ts)

### 5.2 UploadAsset ownership와 media lifecycle

게시글·반려동물·사용자 이미지 업로드는 저장소에 파일이 생기는 것과 실제 도메인 데이터에 연결되는 것이 서로 다른 단계다. attach 실패 또는 삭제 시점 오류가 생기면 다른 사용자의 asset을 연결하거나, 아직 참조 중인 asset을 삭제할 수 있다.

적용한 개선:

- 인증 사용자 또는 검증된 guest identity만 upload attach 가능
- guest IP/fingerprint는 원문이 아니라 pepper 기반 hash로 소유권 확인
- `UploadAsset.visibility`로 PUBLIC/PRIVATE 계약 명시
- 삭제된 asset을 media proxy의 local fallback으로 되살리지 않음
- PostImage/User/Pet 참조가 남은 TEMPORARY asset은 cleanup에서 재연결
- attach/release finalization 실패를 health와 Ops에 기록

관련 파일:

- [`app/prisma/schema.prisma`](../../app/prisma/schema.prisma)
- [`app/src/server/upload-asset.service.ts`](../../app/src/server/upload-asset.service.ts)
- [`app/src/app/api/upload/route.ts`](../../app/src/app/api/upload/route.ts)
- [`app/src/app/media/[...path]/route.ts`](../../app/src/app/media/%5B...path%5D/route.ts)

### 5.3 인증·세션·악용 방어

보안 계획의 주요 항목을 실제 코드와 운영 gate로 연결했다.

- 강한 password policy와 breached password deny-list
- account/IP 차원의 login backoff와 rate limit
- 등록 시 IP/fingerprint/email 조합 throttling
- password 변경/reset 시 `sessionVersion` 증가로 기존 JWT 무효화
- 정지 사용자 write-path sanction enforcement
- social dev login과 demo auth fallback explicit opt-in
- login/register 성공·실패·제한 audit
- trusted proxy hop 기반 client IP 해석
- open redirect를 막는 내부 callback path allowlist
- public guest identifier에서 네트워크 기반 식별자 노출 축소

정책 목록의 근거는 [`business/security/보안_계획.md`](../../business/security/보안_계획.md)와 [`business/security/보안_위험_등록부.md`](../../business/security/보안_위험_등록부.md)에 기록되어 있다.

### 5.4 XSS·CSP·민감 응답 최소화

- JSON-LD/inline JSON은 `</script>`, U+2028/U+2029 breakout을 막는 serializer 사용
- 댓글 public/auth response에서 author email 제거
- 삭제 댓글은 원문 대신 redacted placeholder 반환
- public/API/HTML shell에 nonce 기반 CSP와 `strict-dynamic` 적용
- `frame-ancestors`, `object-src`, `X-Frame-Options`, HSTS, Referrer-Policy, Permissions-Policy 적용
- `/api/health` public response에서 env 누락 키와 raw DB 오류를 제거하고 상세 정보는 internal token으로 분리

Production에서 `/api/health`, `/feed/guest`, `/posts/new`를 curl로 확인했으며 요청마다 다른 nonce와 `strict-dynamic`이 반환됐다.

## 6. 아키텍처와 계층 개선

### 6.1 Query는 읽기, Service는 정책과 쓰기

기존에는 notification/search query 파일에 조회와 write side effect가 함께 존재할 가능성이 있었다. 이를 다음처럼 정리했다.

```text
외부 입력
  → Validation
  → Action / Route
  → Service / Repository (정책·write·side effect)
  → Query (read-only)
  → Presenter / UI
```

변경 내용:

- notification read: `app/src/server/queries/notifications/notification-read.queries.ts`
- notification write: `app/src/server/services/notifications/notification-write.service.ts`
- search statistics orchestration: `app/src/server/services/search/search-statistics.service.ts`
- search persistence: `app/src/server/services/search/search-statistics.repository.ts`
- query boundary 검사: `app/scripts/check-query-boundaries.ts`

`src/server/queries/**` 59개 파일에 Prisma write, transaction, mutation re-entry가 없는지 자동 검사하고 품질 게이트에 연결했다.

### 6.2 큰 Service의 공통 정책 추출

거대한 service를 한 번에 삭제하거나 public API를 깨지 않고, facade를 유지한 채 내부 coordinator를 추출했다.

- `post-create-policy-support.ts`: 작성 정책과 moderation helper
- `care-workflow-policy.ts`: 돌봄 상태 전이표
- `report-target-support.ts`: 신고 대상 해석
- `direct-moderation-support.ts`: bulk 제재·직접 moderation 공통 흐름
- `comment-guest-support.ts`: 게스트 댓글 credential/identity 검증
- `post-care-side-effects.ts`: 돌봄 알림·cache side effect
- `post-upload-finalization.ts`: upload attach/release finalization

이 방식의 장점은 route/action/UI 계약을 유지하면서 변경 범위와 회귀 범위를 줄인 것이다. 반대로 모든 분리를 완료한 것은 아니며, `comment.service.ts`, `post-care-workflow.service.ts`, `post-create.service.ts` 등에는 추가 coordinator 분해 여지가 남아 있다.

## 7. 데이터 정합성과 도메인 흐름

### 7.1 Notification outbox 신뢰성

알림 생성과 실제 delivery 시도는 사용자 mutation과 분리되어야 한다. 현재 구조는 다음 상태를 관리한다.

- PENDING
- FAILED
- DEAD_LETTER
- 최대 8회 시도
- 1분부터 최대 1시간까지 지수 backoff
- due, oldest due age, failed age, dead-letter age
- `/admin/ops`의 재처리·수동 원인 확인 표시
- `ops:notifications:retry -- --dry-run` 후 `--apply` 절차

알림 실패가 게시글·댓글 mutation 자체를 성공/실패와 혼동하지 않도록 했고, 실패를 삼키는 대신 outbox와 운영 지표에 남겼다.

### 7.2 분실·목격 상태 이력

분실·목격 제보는 현재 상태만 바뀌면 “누가 언제 어떤 상태로 바꿨는지”를 알 수 없다. `LostFoundStatusEvent`와 backfill migration을 추가해 상태 타임라인을 기록하고 보호자 관리 화면에서 확인할 수 있게 했다.

이는 단순 이력 기능이 아니라 다음 운영 질문에 답하기 위한 기반이다.

- 제보가 접수됐는가?
- 보호자 또는 운영자가 확인했는가?
- 상태가 허위 또는 반복 변경됐는가?
- 향후 alert/subscription을 보낼 기준 상태가 무엇인가?

### 7.3 명시적 demo content와 media visibility

public query에서 제목·본문 키워드로 demo content를 추정하는 방식은 오탐 위험이 있다. `Post.isDemoContent`를 명시적으로 저장하고 seed/smoke fixture가 그 값을 기록하도록 바꿨다. 같은 방향으로 `UploadAsset.visibility`를 명시해 공개·비공개 계약을 데이터 모델에 반영했다.

## 8. 운영·배포·관측 가능성

### 8.1 Production strict env gate

배포 직전 다음 항목을 자동 확인한다.

- `AUTH_SECRET` 또는 허용된 auth secret
- guest hash pepper
- internal health token
- Upstash URL/token pair
- Resend API key
- Blob token
- demo/social dev auth 비활성화
- CSP runtime mode

Production strict 점검은 실제 Production 값을 명시적으로 로드했을 때 `pass=10, warn=0, fail=0`이었고, Vercel build preflight는 `pass=9, warn=0, fail=0`이었다. build profile은 remote control-plane read를 수행하지 않으므로 두 결과의 숫자가 다른 것은 의도된 프로파일 차이다.

### 8.2 Health와 Ops snapshot

`/api/health`는 public 생존 확인용으로 최소 응답만 제공하고, 내부 control plane 상세는 token-gated 경로로 제한한다. `/admin/ops`에는 다음을 모은다.

- database, rate limit, cache, control plane
- `pg_trgm` 활성화 상태
- notification pending/failed/due/dead-letter
- 오래된 실패와 지연 경과 시간
- upload finalization failure
- auth audit, report, search, personalization, lost-found 운영 지표

Cache 장애 시 source read를 권위 데이터로 유지하고 distributed cache를 bypass한다. 다만 failure count, bucket, last failure age를 노출해 “안전하지만 느린 상태”와 “운영자가 모르는 stale 상태”를 구분할 수 있게 했다.

### 8.3 로컬·CI·Production 정렬

확인 과정에서 다음 차이를 발견하고 정리했다.

- Vercel project build command와 저장소 `vercel.json` 불일치 → `pnpm build:vercel`로 통일
- CI/Vercel Node 24와 로컬 Node 20 불일치 → `app/.nvmrc`, `package.json.engines`에 Node 24 명시
- Production env pull 후에도 남아 있던 local-only seed/admin/legacy 키 → `.env.local`을 Production env로 재생성

주의: 현재 개발 Mac의 실제 Node binary는 아직 20.x일 수 있으므로, 다음 로컬 세션 전에 Node 24를 설치하고 `app/.nvmrc`를 적용해야 한다.

## 9. 테스트와 품질 게이트

### 자동 검증 결과

- ESLint 통과
- TypeScript `tsc --noEmit` 통과
- Vitest: **363개 파일 / 1,784개 테스트 통과**
- Query boundary: **59개 query 파일 통과**
- API route contract freshness 통과
- Next.js Production build 통과, static pages **81/81** 생성
- Vercel Production build 통과
- Prisma: **76 migrations**, Production database pending migration 없음
- Production `/api/health`: HTTP 200
- Production CSP: nonce + `strict-dynamic` 확인

### 실패 경로를 포함한 테스트

- guest step-up replay와 credential URL 비노출
- upload attach/release failure 및 cleanup health
- notification outbox retry/dead-letter
- Redis unavailable 시 cache bypass
- cache invalidation failure count
- query에 write가 재유입되는 경우
- API route contract stale 상태
- 권한 없는 moderation/report 접근
- deleted comment redaction과 public payload 최소화
- lost-found status transition

### 실행하지 않은 것

- 전체 Playwright E2E suite
- Production 실제 Google OAuth 브라우저 smoke
- Production 사용자에게 쓰기를 발생시키는 seed/cleanup/backfill/repair
- production admin authenticated browser smoke

따라서 “모든 사용자 흐름이 완벽하다”고 주장하지 않고, 자동화된 코드·빌드·health·CSP 검증과 아직 수동 확인이 필요한 범위를 구분한다.

## 10. 제품과 UX 개선

### 적용한 개선

- guest search zero-result에서 새 글 작성 CTA 제공
- 분실·목격 상태 타임라인 제공
- public shell의 접근성·action control·모바일 상세 흐름 보강
- 게시글·댓글·신고·관리자 UI의 권한 상태와 실패 상태 표시 개선
- 공개 콘텐츠와 운영자 fixture/demo content의 명시적 분리

### 제품 원칙과의 연결

- 지역 콘텐츠가 부족할 때 검색 실패를 작성 전환으로 연결
- 분실·목격 제보를 단순 게시판이 아니라 상태가 있는 workflow로 전환
- 운영자가 신고·알림·cache·업로드 상태를 직접 판단하도록 해 1인 운영 비용 축소
- 신규 대형 기능보다 현재 데이터와 정책을 활용해 초기 사용자 수가 적어도 가치가 생기는 방향 유지

## 11. 대표 면접 설명 사례

### 사례 A — URL에 비밀번호를 넣는 문제를 어떻게 판단했는가?

1. 문제: guest edit 링크가 password를 query string으로 전달했다.
2. 위험: history, Referer, access log로 credential이 유출될 수 있어 P1로 분류했다.
3. 선택: URL 전달을 제거하고 TTL step-up token을 도입했다.
4. 보완: replay를 막기 위해 token hash unique nonce를 원자적으로 consume했다.
5. 검증: guest create/edit/delete E2E, URL 비노출 assertion, strict CSP shell smoke.

### 사례 B — Query와 Service 경계를 왜 나눴는가?

조회 함수가 알림 flush/archive 같은 write를 수행하면 GET 요청이 예상치 못한 side effect를 만들고, 테스트·캐시·장애 분석이 어려워진다. 그래서 Query는 read-only, Service는 정책·transaction·notification·audit를 담당하도록 분리하고, 59개 파일을 자동 검사하는 quality gate를 추가했다.

### 사례 C — 알림 실패를 어떻게 “안전한 실패”로 만들었는가?

알림 실패 때문에 게시글 작성까지 실패시키면 핵심 mutation 가용성이 떨어지고, 반대로 조용히 삼키면 운영자가 문제를 알 수 없다. outbox 상태·retry/backoff·dead-letter를 분리하고, `/admin/ops`에 failed/dead-letter age를 표시해 사용자 mutation과 delivery 장애를 독립적으로 운영하도록 했다.

### 사례 D — 1인 운영에서 관측 가능성을 어떻게 설계했는가?

고가의 관측 플랫폼을 먼저 도입하기보다 health endpoint, strict env preflight, admin Ops snapshot, dry-run/apply maintenance script, 장애 runbook을 조합했다. 핵심은 “문제가 없다”가 아니라 “문제가 생겼을 때 혼자 원인과 다음 조치를 찾을 수 있는가”였다.

### 사례 E — 큰 Service를 어떻게 안전하게 리팩터링했는가?

public service facade와 route 계약을 유지한 채 policy, target resolution, guest support, side-effect coordinator를 내부 모듈로 추출했다. 그래서 한 번에 전체 도메인을 재작성하지 않고, 각 slice마다 typecheck·targeted test·full test·build로 회귀 범위를 통제했다.

## 12. 기술적 Trade-off와 회고

### 잘한 점

- 보안 문제를 스타일 문제가 아니라 공격 경로와 credential 가치로 평가했다.
- query write boundary를 코드 리뷰 취향이 아니라 자동 검사로 만들었다.
- cache/notification 실패를 사용자 mutation과 분리하면서도 운영 지표를 남겼다.
- 1인 운영을 고려해 manual workflow와 dry-run을 기본값으로 두었다.
- migration, 테스트, 운영 문서를 같은 기능 단위로 묶었다.
- “전체 E2E 통과”처럼 검증 범위를 과장하지 않고 실행한 것과 못 한 것을 분리했다.

### 아쉬운 점

- 초기에는 큰 service에 정책·DB·알림·presenter가 함께 커지는 것을 더 일찍 감지할 수 있었다.
- production-like Node/runtime과 local Node가 늦게 정렬되어 재현성 확인에 비용이 들었다.
- notification/cache 지표가 장애 후반에 추가되어 초기부터 failure age와 SLO를 설계하지 못했다.
- 전체 E2E와 실제 OAuth/admin smoke는 여전히 환경·계정 준비에 의존한다.
- private media, durable outbox worker, search batch aggregation은 아직 트래픽과 제품 요구를 보고 결정해야 한다.

## 13. 남은 작업과 판단 기준

### 지금 바로 하지 않아도 되는 작업

- 실제 트래픽 없이 search statistics를 batch worker로 전환
- private media 요구가 없는데 signed URL 체계 추가
- 1인 운영 규모를 넘지 않았는데 별도 queue/분산 worker 도입
- 근거 없이 모든 대형 service를 작은 파일로 쪼개기

### 다음에 할 가치가 높은 작업

1. 실제 Google 로그인과 관리자 authenticated smoke
2. upload finalization/cache invalidation failure injection 및 retry evidence
3. `/admin/ops`의 notification/cache age를 기준으로 한 alert threshold 결정
4. `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` 설정 후 실기기 공유 smoke
5. 분실·목격 제보의 안전한 연락 relay 또는 alert subscription 실험

## 14. 재현 가능한 확인 명령

앱 디렉터리에서 Node 24와 pinned pnpm을 사용한다.

```bash
cd app
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm api:contracts
pnpm architecture:check:queries
pnpm build
OPS_BASE_URL=https://townpet.vercel.app pnpm ops:check:health
```

Production 배포는 일반 `pnpm build`가 아니라 migration·strict env preflight를 포함한 다음 경로를 사용한다.

```bash
pnpm build:vercel
```

운영 장애 시에는 [`business/operations/장애 대응 런북.md`](../../business/operations/%EC%9E%A5%EC%95%A0%20%EB%8C%80%EC%9D%91%20%EB%9F%B0%EB%B6%81.md)과 [`business/operations/운영_문서_안내.md`](../../business/operations/%EC%9A%B4%EC%98%81_%EB%AC%B8%EC%84%9C_%EC%95%88%EB%82%B4.md)를 먼저 확인한다.

## 15. 최종 요약

TownPet의 가장 큰 개선은 기능 수를 늘린 것이 아니라, **신뢰할 수 있는 커뮤니티를 운영할 수 있는 구조**를 만든 것이다.

- 위험한 credential과 media 접근을 줄였다.
- 정책과 write side effect를 올바른 계층으로 이동했다.
- 실패를 숨기지 않고 outbox·health·Ops로 관측했다.
- migration과 회귀 테스트로 데이터·행동 계약을 고정했다.
- 1인 운영자가 배포·장애·재처리를 혼자 판단할 수 있게 했다.
- 실제 사용자가 적은 초기 단계에서도 지역 콘텐츠와 분실·목격 행동으로 이어질 제품 실험 기반을 남겼다.

이 프로젝트를 면접에서 설명할 때는 “무엇을 많이 만들었는가”보다 “어떤 위험을 어떻게 발견하고, 어떤 trade-off로 안전하게 운영 가능한 구조로 바꿨는가”를 중심으로 설명한다.
