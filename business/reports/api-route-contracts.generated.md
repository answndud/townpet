# TownPet API Route Contracts

Generated from `app/src/app/api/**/route.ts`.

## Summary

- routeHandlers: 48
- missingMethodExports: 0
- missingAdjacentTests: 1

## Routes

| Route | Methods | Route file | Adjacent test |
|---|---:|---|---:|
| `/api/admin/auth-audits` | GET | `src/app/api/admin/auth-audits/route.ts` | yes |
| `/api/admin/auth-audits/export` | GET | `src/app/api/admin/auth-audits/export/route.ts` | yes |
| `/api/admin/moderation/posts/[id]/visibility` | PATCH | `src/app/api/admin/moderation/posts/[id]/visibility/route.ts` | yes |
| `/api/admin/moderation/users/hide-content` | POST | `src/app/api/admin/moderation/users/hide-content/route.ts` | yes |
| `/api/admin/moderation/users/restore-content` | POST | `src/app/api/admin/moderation/users/restore-content/route.ts` | yes |
| `/api/admin/moderation/users/sanction` | POST | `src/app/api/admin/moderation/users/sanction/route.ts` | yes |
| `/api/auth/[...nextauth]` | GET, POST | `src/app/api/auth/[...nextauth]/route.ts` | no |
| `/api/auth/logout` | POST | `src/app/api/auth/logout/route.ts` | yes |
| `/api/auth/password/reset/confirm` | POST | `src/app/api/auth/password/reset/confirm/route.ts` | yes |
| `/api/auth/password/reset/request` | POST | `src/app/api/auth/password/reset/request/route.ts` | yes |
| `/api/auth/password/setup` | POST | `src/app/api/auth/password/setup/route.ts` | yes |
| `/api/auth/register` | POST | `src/app/api/auth/register/route.ts` | yes |
| `/api/auth/social-accounts/[provider]` | DELETE | `src/app/api/auth/social-accounts/[provider]/route.ts` | yes |
| `/api/auth/social-dev/link` | POST | `src/app/api/auth/social-dev/link/route.ts` | yes |
| `/api/auth/verify/confirm` | POST | `src/app/api/auth/verify/confirm/route.ts` | yes |
| `/api/auth/verify/request` | POST | `src/app/api/auth/verify/request/route.ts` | yes |
| `/api/boards/[board]/posts` | GET | `src/app/api/boards/[board]/posts/route.ts` | yes |
| `/api/comments/[id]` | PATCH, DELETE | `src/app/api/comments/[id]/route.ts` | yes |
| `/api/communities` | GET | `src/app/api/communities/route.ts` | yes |
| `/api/feed/guest` | GET | `src/app/api/feed/guest/route.ts` | yes |
| `/api/feed/personalization` | POST | `src/app/api/feed/personalization/route.ts` | yes |
| `/api/guest/step-up` | POST | `src/app/api/guest/step-up/route.ts` | yes |
| `/api/health` | GET | `src/app/api/health/route.ts` | yes |
| `/api/lounges/breeds/[breedCode]/groupbuys` | POST | `src/app/api/lounges/breeds/[breedCode]/groupbuys/route.ts` | yes |
| `/api/lounges/breeds/[breedCode]/posts` | GET | `src/app/api/lounges/breeds/[breedCode]/posts/route.ts` | yes |
| `/api/neighborhoods` | GET | `src/app/api/neighborhoods/route.ts` | yes |
| `/api/notifications` | GET | `src/app/api/notifications/route.ts` | yes |
| `/api/posts` | GET, POST | `src/app/api/posts/route.ts` | yes |
| `/api/posts/[id]` | GET, PATCH, DELETE | `src/app/api/posts/[id]/route.ts` | yes |
| `/api/posts/[id]/comments` | GET, POST | `src/app/api/posts/[id]/comments/route.ts` | yes |
| `/api/posts/[id]/content` | GET | `src/app/api/posts/[id]/content/route.ts` | yes |
| `/api/posts/[id]/detail` | GET | `src/app/api/posts/[id]/detail/route.ts` | yes |
| `/api/posts/[id]/reaction` | GET | `src/app/api/posts/[id]/reaction/route.ts` | yes |
| `/api/posts/[id]/stats` | GET | `src/app/api/posts/[id]/stats/route.ts` | yes |
| `/api/posts/[id]/view` | POST | `src/app/api/posts/[id]/view/route.ts` | yes |
| `/api/posts/suggestions` | GET | `src/app/api/posts/suggestions/route.ts` | yes |
| `/api/profile/audience-segments` | GET | `src/app/api/profile/audience-segments/route.ts` | yes |
| `/api/reports` | POST | `src/app/api/reports/route.ts` | yes |
| `/api/reports/[id]` | PATCH | `src/app/api/reports/[id]/route.ts` | yes |
| `/api/reports/bulk` | PATCH | `src/app/api/reports/bulk/route.ts` | yes |
| `/api/search/guest` | GET | `src/app/api/search/guest/route.ts` | yes |
| `/api/search/log` | POST | `src/app/api/search/log/route.ts` | yes |
| `/api/security/csp-report` | GET, POST | `src/app/api/security/csp-report/route.ts` | yes |
| `/api/upload` | POST | `src/app/api/upload/route.ts` | yes |
| `/api/upload/client` | POST | `src/app/api/upload/client/route.ts` | yes |
| `/api/users/[id]/profile-summary` | GET | `src/app/api/users/[id]/profile-summary/route.ts` | yes |
| `/api/users/[id]/relation` | GET | `src/app/api/users/[id]/relation/route.ts` | yes |
| `/api/viewer-shell` | GET | `src/app/api/viewer-shell/route.ts` | yes |

## Gaps

- missing adjacent test: `src/app/api/auth/[...nextauth]/route.ts`
