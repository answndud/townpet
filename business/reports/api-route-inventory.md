# TownPet API 라우트 인벤토리

마지막 갱신일: 2026-06-07

## 목적

이 인벤토리는 App Router API 표면을 백엔드 리뷰 자료로 바꾼 문서다. 리뷰어가 모든 `route.ts`를 먼저 읽지 않아도 메서드 커버리지, 접근 경계, 입력 검증, 모니터링, 테스트 누락을 볼 수 있게 한다.

소스 텍스트 기반 method/test drift check와 access/validation/monitoring heuristic 생성 명령:

```bash
corepack pnpm@9.12.3 -C app api:contracts
corepack pnpm@9.12.3 -C app api:contracts:write
```

생성 결과 파일: `business/reports/api-route-contracts.generated.md`

## 요약

- API route handler: 55개
- 주요 auth mode: public/guest, auth-aware, moderator/admin
- 표준 backend concern: Zod validation, service/query delegation, structured JSON response, `monitorUnhandledError`
- 즉시 처리할 test-gap 후보: 인접 `route.test.ts`가 없는 직접 구현 route 0건
- 생성 계약 리포트: `api-route-contracts.generated.md`
  - route handler 55개
  - method export 누락 0건
  - 인접 테스트 누락 0건
- 생성 heuristic snapshot:
  - access: admin=2, auth-aware=18, authenticated=10, moderator=6, provider-managed=1, public=15, public-internal-token=3
  - validation: manual=13, no-input=3, provider-managed=1, schema=25, service-delegated=12, static-response=1
  - monitoring: logger=1, monitorUnhandledError=52, provider-managed=1, static-response=1
  - 검토 결과: `validation=none` 0 route, `monitoring=none` 0 route

## 라우트 목록

| 라우트 | 메서드 | 접근/통제 |
|---|---:|---|
| `/api/admin/auth-audits/export` | GET | moderator/admin, validated, monitored |
| `/api/admin/auth-audits` | GET | moderator/admin, validated, monitored |
| `/api/admin/moderation/posts/[id]/visibility` | PATCH | moderator/admin, monitored |
| `/api/admin/moderation/users/hide-content` | POST | moderator/admin, monitored |
| `/api/admin/moderation/users/restore-content` | POST | moderator/admin, monitored |
| `/api/admin/moderation/users/sanction` | POST | moderator/admin, monitored |
| `/api/acquisition/events` | POST | public, validated, monitored |
| `/api/auth/[...nextauth]` | NextAuth handlers | public entry, provider-managed |
| `/api/auth/logout` | POST | public/session-aware, monitored |
| `/api/auth/password/reset/confirm` | POST | public, validated, monitored |
| `/api/auth/password/reset/request` | POST | public, validated, monitored |
| `/api/auth/password/setup` | POST | auth-aware, validated, monitored |
| `/api/auth/register` | POST | public, validated, monitored |
| `/api/auth/social-accounts/[provider]` | DELETE | auth-aware, monitored |
| `/api/auth/social-dev/link` | POST | auth-aware, monitored |
| `/api/auth/verify/confirm` | POST | public, validated, monitored |
| `/api/auth/verify/request` | POST | public, validated, monitored |
| `/api/boards/[board]/posts` | GET | auth-aware, validated, monitored |
| `/api/comments/[id]` | PATCH, DELETE | auth-aware, monitored |
| `/api/communities` | GET | public, validated, monitored |
| `/api/corrections` | POST | auth-aware, service-delegated, monitored |
| `/api/feed/guest` | GET | public guest, validated, monitored |
| `/api/feed/personalization` | POST | auth-aware, validated, monitored |
| `/api/guest/step-up` | POST | public guest, validated, monitored |
| `/api/health` | GET | public minimized response, internal diagnostics token |
| `/api/home/feed` | GET | public, monitored |
| `/api/lounges/breeds/[breedCode]/groupbuys` | POST | auth-aware, validated, monitored |
| `/api/lounges/breeds/[breedCode]/posts` | GET | auth-aware, validated, monitored |
| `/api/metrics/web-vitals` | POST | public, validated, monitored |
| `/api/neighborhoods` | GET | public, validated, monitored |
| `/api/notifications` | GET | auth-aware, validated, monitored |
| `/api/ops/web-vitals/summary` | GET | internal token, validated, monitored |
| `/api/posts/[id]/comments` | GET, POST | auth-aware, monitored |
| `/api/posts/[id]/content` | GET | auth-aware, read-access checked, monitored |
| `/api/posts/[id]/detail` | GET | auth-aware, monitored |
| `/api/posts/[id]/lost-found-share.svg` | GET | public, read-access checked, monitored |
| `/api/posts/[id]/reaction` | GET | auth-aware, monitored |
| `/api/posts/[id]` | GET, PATCH, DELETE | auth-aware, monitored |
| `/api/posts/[id]/stats` | GET | auth-aware, read-access checked, monitored |
| `/api/posts/[id]/view` | POST | auth-aware, monitored |
| `/api/posts` | GET, POST | auth-aware, validated, monitored |
| `/api/posts/suggestions` | GET | auth-aware, validated, monitored |
| `/api/profile/audience-segments` | GET | auth-aware, monitored |
| `/api/reports/[id]` | PATCH | moderator/admin, monitored |
| `/api/reports/bulk` | PATCH | moderator/admin, monitored |
| `/api/reports` | POST | auth-aware, monitored |
| `/api/search/guest` | GET | public guest, validated, monitored |
| `/api/search/log` | POST | auth-aware, validated, monitored |
| `/api/security/csp-report` | GET, POST | public, monitored |
| `/api/upload/client` | POST | public client upload policy |
| `/api/upload` | POST | auth-aware, monitored |
| `/api/users/[id]/profile-summary` | GET | auth-aware, monitored |
| `/api/users/[id]/relation` | GET | auth-aware, monitored |
| `/api/viewer-shell` | GET | public/session-aware, monitored |

## 인접 라우트 테스트 누락

없음. provider-managed route는 인접 unit-test 누락 계산에서 제외하고 auth integration/e2e check로 간접 보호한다.

## 닫힌 라우트 테스트 누락

이 인벤토리 생성 이후 추가된 인접 테스트:

| route 파일 | 테스트 파일 | 커버리지 |
|---|---|---|
| `app/src/app/api/reports/[id]/route.ts` | `app/src/app/api/reports/[id]/route.test.ts` | moderator required, route id/body forwarding, service error mapping, internal error monitoring |
| `app/src/app/api/reports/bulk/route.ts` | `app/src/app/api/reports/bulk/route.test.ts` | moderator required, body forwarding, service error mapping, internal error monitoring |
| `app/src/app/api/posts/[id]/content/route.ts` | `app/src/app/api/posts/[id]/content/route.test.ts` | guest/auth viewer id, not found, read denial, rendered html/text, no-store header, internal error monitoring |
| `app/src/app/api/posts/[id]/stats/route.ts` | `app/src/app/api/posts/[id]/stats/route.test.ts` | guest/auth viewer id, not found, read denial, zero-count normalization, no-store header, internal error monitoring |
| `app/src/app/api/auth/password/reset/confirm/route.ts` | `app/src/app/api/auth/password/reset/confirm/route.test.ts` | invalid payload, rate limit key, metadata forwarding, service error mapping, internal error monitoring |
| `app/src/app/api/auth/password/setup/route.ts` | `app/src/app/api/auth/password/setup/route.test.ts` | auth required, invalid password, rate limit key, metadata forwarding, service error mapping, internal error monitoring |
| `app/src/app/api/auth/verify/confirm/route.ts` | `app/src/app/api/auth/verify/confirm/route.test.ts` | invalid token, rate limit key, welcome email side effect, service error mapping, internal error monitoring |
| `app/src/app/api/posts/[id]/lost-found-share.svg/route.ts` | `app/src/app/api/posts/[id]/lost-found-share.svg/route.test.ts` | public SVG response, not-found/read-access/inactive 404, unexpected error monitoring |

## 추천 다음 작업 단위

provider-managed auth behavior는 provider-specific regression이 필요해질 때까지 간접 커버리지로 유지한다.

1. `app/e2e/kakao-login-entry.spec.ts`
2. `app/e2e/naver-login-entry.spec.ts`
3. `app/e2e/social-onboarding-flow.spec.ts`
4. `app/e2e/profile-social-account-linking.spec.ts`

검증 명령:

```bash
corepack pnpm@9.12.3 -C app test:e2e -- e2e/kakao-login-entry.spec.ts e2e/naver-login-entry.spec.ts e2e/social-onboarding-flow.spec.ts e2e/profile-social-account-linking.spec.ts --project=chromium
corepack pnpm@9.12.3 -C app lint
corepack pnpm@9.12.3 -C app typecheck
```
