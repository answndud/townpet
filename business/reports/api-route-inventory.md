# TownPet API Route Inventory

Last updated: 2026-05-18

## Purpose

This inventory turns the App Router API surface into a backend review artifact. It helps reviewers see method coverage, access boundaries, validation, monitoring, and test gaps without reading every `route.ts` first.

Machine-generated method/test drift check with access/validation/monitoring heuristics:

```bash
corepack pnpm@9.12.3 -C app api:contracts
corepack pnpm@9.12.3 -C app api:contracts:write
```

Generated output: `business/reports/api-route-contracts.generated.md`

## Summary

- API route handlers: 48
- Primary auth modes: public/guest, auth-aware, moderator/admin
- Standard backend concerns: Zod validation, service/query delegation, structured JSON response, `monitorUnhandledError`
- Immediate test-gap candidates: 1 route does not have adjacent `route.test.ts`
- Generated contract report: `api-route-contracts.generated.md`, currently 48 route handlers, 0 missing method exports, 1 adjacent test gap
- Generated heuristic snapshot:
  - access: admin=2, auth-aware=16, authenticated=10, moderator=6, provider-managed=1, public=11, public-internal-token=2
  - validation: manual=10, no-input=4, provider-managed=1, schema=21, service-delegated=11, static-response=1
  - monitoring: logger=1, monitorUnhandledError=45, provider-managed=1, static-response=1
  - review result: `validation=none` 0 routes, `monitoring=none` 0 routes

## Route Table

| Route | Methods | Access / Controls |
|---|---:|---|
| `/api/admin/auth-audits/export` | GET | moderator/admin, validated, monitored |
| `/api/admin/auth-audits` | GET | moderator/admin, validated, monitored |
| `/api/admin/moderation/posts/[id]/visibility` | PATCH | moderator/admin, monitored |
| `/api/admin/moderation/users/hide-content` | POST | moderator/admin, monitored |
| `/api/admin/moderation/users/restore-content` | POST | moderator/admin, monitored |
| `/api/admin/moderation/users/sanction` | POST | moderator/admin, monitored |
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
| `/api/feed/guest` | GET | public guest, validated, monitored |
| `/api/feed/personalization` | POST | auth-aware, validated, monitored |
| `/api/guest/step-up` | POST | public guest, validated, monitored |
| `/api/health` | GET | public minimized response, optional internal token |
| `/api/lounges/breeds/[breedCode]/groupbuys` | POST | auth-aware, validated, monitored |
| `/api/lounges/breeds/[breedCode]/posts` | GET | auth-aware, validated, monitored |
| `/api/neighborhoods` | GET | public, validated, monitored |
| `/api/notifications` | GET | auth-aware, validated, monitored |
| `/api/posts/[id]/comments` | GET, POST | auth-aware, monitored |
| `/api/posts/[id]/content` | GET | auth-aware, read-access checked, monitored |
| `/api/posts/[id]/detail` | GET | auth-aware, monitored |
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

## Adjacent Route Test Gaps

These files currently do not have a sibling `route.test.ts` and should be reviewed first:

| Priority | Route file | Suggested coverage |
|---|---|---|
| P3 | `app/src/app/api/auth/[...nextauth]/route.ts` | usually covered indirectly by auth/e2e; keep as integration/e2e target |

## Closed Route Test Gaps

The following adjacent tests were added after this inventory was created:

| Route file | Test file | Coverage |
|---|---|---|
| `app/src/app/api/reports/[id]/route.ts` | `app/src/app/api/reports/[id]/route.test.ts` | moderator required, route id/body forwarding, service error mapping, internal error monitoring |
| `app/src/app/api/reports/bulk/route.ts` | `app/src/app/api/reports/bulk/route.test.ts` | moderator required, body forwarding, service error mapping, internal error monitoring |
| `app/src/app/api/posts/[id]/content/route.ts` | `app/src/app/api/posts/[id]/content/route.test.ts` | guest/auth viewer id, not found, read denial, rendered html/text, no-store header, internal error monitoring |
| `app/src/app/api/posts/[id]/stats/route.ts` | `app/src/app/api/posts/[id]/stats/route.test.ts` | guest/auth viewer id, not found, read denial, zero-count normalization, no-store header, internal error monitoring |
| `app/src/app/api/auth/password/reset/confirm/route.ts` | `app/src/app/api/auth/password/reset/confirm/route.test.ts` | invalid payload, rate limit key, metadata forwarding, service error mapping, internal error monitoring |
| `app/src/app/api/auth/password/setup/route.ts` | `app/src/app/api/auth/password/setup/route.test.ts` | auth required, invalid password, rate limit key, metadata forwarding, service error mapping, internal error monitoring |
| `app/src/app/api/auth/verify/confirm/route.ts` | `app/src/app/api/auth/verify/confirm/route.test.ts` | invalid token, rate limit key, welcome email side effect, service error mapping, internal error monitoring |

## Recommended Next Slice

The remaining adjacent test gap is the NextAuth catch-all route. Keep it covered indirectly unless a provider-specific regression needs a route-level harness:

1. `app/e2e/kakao-login-entry.spec.ts`
2. `app/e2e/naver-login-entry.spec.ts`
3. `app/e2e/social-onboarding-flow.spec.ts`
4. `app/e2e/profile-social-account-linking.spec.ts`

Verification:

```bash
corepack pnpm@9.12.3 -C app test:e2e -- e2e/kakao-login-entry.spec.ts e2e/naver-login-entry.spec.ts e2e/social-onboarding-flow.spec.ts e2e/profile-social-account-linking.spec.ts --project=chromium
corepack pnpm@9.12.3 -C app lint
corepack pnpm@9.12.3 -C app typecheck
```
