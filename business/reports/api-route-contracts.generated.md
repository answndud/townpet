# TownPet API Route Contracts

Generated from `app/src/app/api/**/route.ts` with source-text heuristics.

## Summary

- routeHandlers: 55
- missingMethodExports: 0
- missingAdjacentTests: 2
- accessHeuristics: admin=2, auth-aware=18, authenticated=10, moderator=6, provider-managed=1, public=15, public-internal-token=3
- validationHeuristics: manual=13, no-input=3, provider-managed=1, schema=25, service-delegated=12, static-response=1
- monitoringHeuristics: logger=1, monitorUnhandledError=51, none=1, provider-managed=1, static-response=1

Heuristic labels are review aids, not a security proof. Source of truth remains route code and tests.

## Routes

| Route | Methods | Access | Validation | Monitoring | Route file | Adjacent test |
|---|---:|---|---|---|---|---:|
| `/api/acquisition/events` | POST | public | schema | monitorUnhandledError | `src/app/api/acquisition/events/route.ts` | yes |
| `/api/admin/auth-audits` | GET | admin | schema | monitorUnhandledError | `src/app/api/admin/auth-audits/route.ts` | yes |
| `/api/admin/auth-audits/export` | GET | admin | schema | monitorUnhandledError | `src/app/api/admin/auth-audits/export/route.ts` | yes |
| `/api/admin/moderation/posts/[id]/visibility` | PATCH | moderator | service-delegated | monitorUnhandledError | `src/app/api/admin/moderation/posts/[id]/visibility/route.ts` | yes |
| `/api/admin/moderation/users/hide-content` | POST | moderator | service-delegated | monitorUnhandledError | `src/app/api/admin/moderation/users/hide-content/route.ts` | yes |
| `/api/admin/moderation/users/restore-content` | POST | moderator | service-delegated | monitorUnhandledError | `src/app/api/admin/moderation/users/restore-content/route.ts` | yes |
| `/api/admin/moderation/users/sanction` | POST | moderator | service-delegated | monitorUnhandledError | `src/app/api/admin/moderation/users/sanction/route.ts` | yes |
| `/api/auth/[...nextauth]` | GET, POST | provider-managed | provider-managed | provider-managed | `src/app/api/auth/[...nextauth]/route.ts` | no |
| `/api/auth/logout` | POST | auth-aware | no-input | monitorUnhandledError | `src/app/api/auth/logout/route.ts` | yes |
| `/api/auth/password/reset/confirm` | POST | public | schema | monitorUnhandledError | `src/app/api/auth/password/reset/confirm/route.ts` | yes |
| `/api/auth/password/reset/request` | POST | public | schema | monitorUnhandledError | `src/app/api/auth/password/reset/request/route.ts` | yes |
| `/api/auth/password/setup` | POST | authenticated | schema | monitorUnhandledError | `src/app/api/auth/password/setup/route.ts` | yes |
| `/api/auth/register` | POST | public | schema | monitorUnhandledError | `src/app/api/auth/register/route.ts` | yes |
| `/api/auth/social-accounts/[provider]` | DELETE | authenticated | manual | monitorUnhandledError | `src/app/api/auth/social-accounts/[provider]/route.ts` | yes |
| `/api/auth/social-dev/link` | POST | authenticated | service-delegated | monitorUnhandledError | `src/app/api/auth/social-dev/link/route.ts` | yes |
| `/api/auth/verify/confirm` | POST | public | schema | monitorUnhandledError | `src/app/api/auth/verify/confirm/route.ts` | yes |
| `/api/auth/verify/request` | POST | public | schema | monitorUnhandledError | `src/app/api/auth/verify/request/route.ts` | yes |
| `/api/boards/[board]/posts` | GET | auth-aware | schema | monitorUnhandledError | `src/app/api/boards/[board]/posts/route.ts` | yes |
| `/api/comments/[id]` | PATCH, DELETE | auth-aware | service-delegated | monitorUnhandledError | `src/app/api/comments/[id]/route.ts` | yes |
| `/api/communities` | GET | public | schema | monitorUnhandledError | `src/app/api/communities/route.ts` | yes |
| `/api/corrections` | POST | auth-aware | service-delegated | monitorUnhandledError | `src/app/api/corrections/route.ts` | yes |
| `/api/feed/guest` | GET | public | schema | monitorUnhandledError | `src/app/api/feed/guest/route.ts` | yes |
| `/api/feed/personalization` | POST | authenticated | schema | monitorUnhandledError | `src/app/api/feed/personalization/route.ts` | yes |
| `/api/guest/step-up` | POST | public | schema | monitorUnhandledError | `src/app/api/guest/step-up/route.ts` | yes |
| `/api/health` | GET | public-internal-token | manual | logger | `src/app/api/health/route.ts` | yes |
| `/api/home/feed` | GET | public | manual | monitorUnhandledError | `src/app/api/home/feed/route.ts` | yes |
| `/api/lounges/breeds/[breedCode]/groupbuys` | POST | auth-aware | schema | monitorUnhandledError | `src/app/api/lounges/breeds/[breedCode]/groupbuys/route.ts` | yes |
| `/api/lounges/breeds/[breedCode]/posts` | GET | auth-aware | schema | monitorUnhandledError | `src/app/api/lounges/breeds/[breedCode]/posts/route.ts` | yes |
| `/api/metrics/web-vitals` | POST | public | schema | monitorUnhandledError | `src/app/api/metrics/web-vitals/route.ts` | yes |
| `/api/neighborhoods` | GET | public | schema | monitorUnhandledError | `src/app/api/neighborhoods/route.ts` | yes |
| `/api/notifications` | GET | authenticated | schema | monitorUnhandledError | `src/app/api/notifications/route.ts` | yes |
| `/api/ops/web-vitals/summary` | GET | public-internal-token | schema | monitorUnhandledError | `src/app/api/ops/web-vitals/summary/route.ts` | yes |
| `/api/posts` | GET, POST | auth-aware | schema | monitorUnhandledError | `src/app/api/posts/route.ts` | yes |
| `/api/posts/[id]` | GET, PATCH, DELETE | auth-aware | service-delegated | monitorUnhandledError | `src/app/api/posts/[id]/route.ts` | yes |
| `/api/posts/[id]/comments` | GET, POST | auth-aware | service-delegated | monitorUnhandledError | `src/app/api/posts/[id]/comments/route.ts` | yes |
| `/api/posts/[id]/content` | GET | auth-aware | manual | monitorUnhandledError | `src/app/api/posts/[id]/content/route.ts` | yes |
| `/api/posts/[id]/detail` | GET | auth-aware | manual | monitorUnhandledError | `src/app/api/posts/[id]/detail/route.ts` | yes |
| `/api/posts/[id]/lost-found-share.svg` | GET | public | manual | none | `src/app/api/posts/[id]/lost-found-share.svg/route.ts` | no |
| `/api/posts/[id]/reaction` | GET | authenticated | manual | monitorUnhandledError | `src/app/api/posts/[id]/reaction/route.ts` | yes |
| `/api/posts/[id]/share` | POST | auth-aware | schema | monitorUnhandledError | `src/app/api/posts/[id]/share/route.ts` | yes |
| `/api/posts/[id]/stats` | GET | auth-aware | manual | monitorUnhandledError | `src/app/api/posts/[id]/stats/route.ts` | yes |
| `/api/posts/[id]/view` | POST | auth-aware | manual | monitorUnhandledError | `src/app/api/posts/[id]/view/route.ts` | yes |
| `/api/posts/suggestions` | GET | auth-aware | schema | monitorUnhandledError | `src/app/api/posts/suggestions/route.ts` | yes |
| `/api/profile/audience-segments` | GET | authenticated | no-input | monitorUnhandledError | `src/app/api/profile/audience-segments/route.ts` | yes |
| `/api/reports` | POST | authenticated | service-delegated | monitorUnhandledError | `src/app/api/reports/route.ts` | yes |
| `/api/reports/[id]` | PATCH | moderator | service-delegated | monitorUnhandledError | `src/app/api/reports/[id]/route.ts` | yes |
| `/api/reports/bulk` | PATCH | moderator | service-delegated | monitorUnhandledError | `src/app/api/reports/bulk/route.ts` | yes |
| `/api/search/guest` | GET | public | schema | monitorUnhandledError | `src/app/api/search/guest/route.ts` | yes |
| `/api/search/log` | POST | auth-aware | schema | monitorUnhandledError | `src/app/api/search/log/route.ts` | yes |
| `/api/security/csp-report` | GET, POST | public-internal-token | manual | monitorUnhandledError | `src/app/api/security/csp-report/route.ts` | yes |
| `/api/upload` | POST | auth-aware | manual | monitorUnhandledError | `src/app/api/upload/route.ts` | yes |
| `/api/upload/client` | POST | public | static-response | static-response | `src/app/api/upload/client/route.ts` | yes |
| `/api/users/[id]/profile-summary` | GET | authenticated | manual | monitorUnhandledError | `src/app/api/users/[id]/profile-summary/route.ts` | yes |
| `/api/users/[id]/relation` | GET | authenticated | manual | monitorUnhandledError | `src/app/api/users/[id]/relation/route.ts` | yes |
| `/api/viewer-shell` | GET | auth-aware | no-input | monitorUnhandledError | `src/app/api/viewer-shell/route.ts` | yes |

## Gaps

- missing adjacent test: `src/app/api/auth/[...nextauth]/route.ts`
- missing adjacent test: `src/app/api/posts/[id]/lost-found-share.svg/route.ts`
