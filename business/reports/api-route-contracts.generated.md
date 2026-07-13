# TownPet API 라우트 계약 리포트

`app/src/app/api/**/route.ts`를 소스 텍스트 기반 휴리스틱으로 스캔해 생성한 리포트다.

## 요약

- 라우트 핸들러 수: 55
- 메서드 export 누락: 0
- 인접 테스트 누락: 0
- 접근 제어 휴리스틱: admin=2, auth-aware=18, authenticated=10, moderator=6, provider-managed=1, public=15, public-internal-token=3
- 검증 휴리스틱: manual=14, no-input=3, provider-managed=1, schema=24, service-delegated=12, static-response=1
- 모니터링 휴리스틱: logger=1, monitorUnhandledError=52, provider-managed=1, static-response=1

휴리스틱 라벨은 리뷰 보조 자료이며 보안 증명이 아니다. 소스 오브 트루스는 route 코드와 테스트다.

## 라우트 목록

| 라우트 | 메서드 | 접근 | 검증 | 모니터링 | 라우트 파일 | 인접 테스트 |
|---|---:|---|---|---|---|---:|
| `/api/acquisition/events` | POST | public | schema | monitorUnhandledError | `src/app/api/acquisition/events/route.ts` | 예 |
| `/api/admin/auth-audits` | GET | admin | schema | monitorUnhandledError | `src/app/api/admin/auth-audits/route.ts` | 예 |
| `/api/admin/auth-audits/export` | GET | admin | schema | monitorUnhandledError | `src/app/api/admin/auth-audits/export/route.ts` | 예 |
| `/api/admin/moderation/posts/[id]/visibility` | PATCH | moderator | service-delegated | monitorUnhandledError | `src/app/api/admin/moderation/posts/[id]/visibility/route.ts` | 예 |
| `/api/admin/moderation/users/hide-content` | POST | moderator | service-delegated | monitorUnhandledError | `src/app/api/admin/moderation/users/hide-content/route.ts` | 예 |
| `/api/admin/moderation/users/restore-content` | POST | moderator | service-delegated | monitorUnhandledError | `src/app/api/admin/moderation/users/restore-content/route.ts` | 예 |
| `/api/admin/moderation/users/sanction` | POST | moderator | service-delegated | monitorUnhandledError | `src/app/api/admin/moderation/users/sanction/route.ts` | 예 |
| `/api/auth/[...nextauth]` | GET, POST | provider-managed | provider-managed | provider-managed | `src/app/api/auth/[...nextauth]/route.ts` | 아니오 |
| `/api/auth/logout` | POST | auth-aware | no-input | monitorUnhandledError | `src/app/api/auth/logout/route.ts` | 예 |
| `/api/auth/password/reset/confirm` | POST | public | schema | monitorUnhandledError | `src/app/api/auth/password/reset/confirm/route.ts` | 예 |
| `/api/auth/password/reset/request` | POST | public | schema | monitorUnhandledError | `src/app/api/auth/password/reset/request/route.ts` | 예 |
| `/api/auth/password/setup` | POST | authenticated | schema | monitorUnhandledError | `src/app/api/auth/password/setup/route.ts` | 예 |
| `/api/auth/register` | POST | public | schema | monitorUnhandledError | `src/app/api/auth/register/route.ts` | 예 |
| `/api/auth/social-accounts/[provider]` | DELETE | authenticated | manual | monitorUnhandledError | `src/app/api/auth/social-accounts/[provider]/route.ts` | 예 |
| `/api/auth/social-dev/link` | POST | authenticated | service-delegated | monitorUnhandledError | `src/app/api/auth/social-dev/link/route.ts` | 예 |
| `/api/auth/verify/confirm` | POST | public | schema | monitorUnhandledError | `src/app/api/auth/verify/confirm/route.ts` | 예 |
| `/api/auth/verify/request` | POST | public | schema | monitorUnhandledError | `src/app/api/auth/verify/request/route.ts` | 예 |
| `/api/boards/[board]/posts` | GET | auth-aware | schema | monitorUnhandledError | `src/app/api/boards/[board]/posts/route.ts` | 예 |
| `/api/comments/[id]` | PATCH, DELETE | auth-aware | service-delegated | monitorUnhandledError | `src/app/api/comments/[id]/route.ts` | 예 |
| `/api/communities` | GET | public | schema | monitorUnhandledError | `src/app/api/communities/route.ts` | 예 |
| `/api/corrections` | POST | auth-aware | service-delegated | monitorUnhandledError | `src/app/api/corrections/route.ts` | 예 |
| `/api/feed/guest` | GET | public | manual | monitorUnhandledError | `src/app/api/feed/guest/route.ts` | 예 |
| `/api/feed/personalization` | POST | authenticated | schema | monitorUnhandledError | `src/app/api/feed/personalization/route.ts` | 예 |
| `/api/guest/step-up` | POST | public | schema | monitorUnhandledError | `src/app/api/guest/step-up/route.ts` | 예 |
| `/api/health` | GET | public-internal-token | manual | logger | `src/app/api/health/route.ts` | 예 |
| `/api/home/feed` | GET | public | manual | monitorUnhandledError | `src/app/api/home/feed/route.ts` | 예 |
| `/api/lounges/breeds/[breedCode]/groupbuys` | POST | auth-aware | schema | monitorUnhandledError | `src/app/api/lounges/breeds/[breedCode]/groupbuys/route.ts` | 예 |
| `/api/lounges/breeds/[breedCode]/posts` | GET | auth-aware | schema | monitorUnhandledError | `src/app/api/lounges/breeds/[breedCode]/posts/route.ts` | 예 |
| `/api/metrics/web-vitals` | POST | public | schema | monitorUnhandledError | `src/app/api/metrics/web-vitals/route.ts` | 예 |
| `/api/neighborhoods` | GET | public | schema | monitorUnhandledError | `src/app/api/neighborhoods/route.ts` | 예 |
| `/api/notifications` | GET | authenticated | schema | monitorUnhandledError | `src/app/api/notifications/route.ts` | 예 |
| `/api/ops/web-vitals/summary` | GET | public-internal-token | schema | monitorUnhandledError | `src/app/api/ops/web-vitals/summary/route.ts` | 예 |
| `/api/posts` | GET, POST | auth-aware | schema | monitorUnhandledError | `src/app/api/posts/route.ts` | 예 |
| `/api/posts/[id]` | GET, PATCH, DELETE | auth-aware | service-delegated | monitorUnhandledError | `src/app/api/posts/[id]/route.ts` | 예 |
| `/api/posts/[id]/comments` | GET, POST | auth-aware | service-delegated | monitorUnhandledError | `src/app/api/posts/[id]/comments/route.ts` | 예 |
| `/api/posts/[id]/content` | GET | auth-aware | manual | monitorUnhandledError | `src/app/api/posts/[id]/content/route.ts` | 예 |
| `/api/posts/[id]/detail` | GET | auth-aware | manual | monitorUnhandledError | `src/app/api/posts/[id]/detail/route.ts` | 예 |
| `/api/posts/[id]/lost-found-share.svg` | GET | public | manual | monitorUnhandledError | `src/app/api/posts/[id]/lost-found-share.svg/route.ts` | 예 |
| `/api/posts/[id]/reaction` | GET | authenticated | manual | monitorUnhandledError | `src/app/api/posts/[id]/reaction/route.ts` | 예 |
| `/api/posts/[id]/share` | POST | auth-aware | schema | monitorUnhandledError | `src/app/api/posts/[id]/share/route.ts` | 예 |
| `/api/posts/[id]/stats` | GET | auth-aware | manual | monitorUnhandledError | `src/app/api/posts/[id]/stats/route.ts` | 예 |
| `/api/posts/[id]/view` | POST | auth-aware | manual | monitorUnhandledError | `src/app/api/posts/[id]/view/route.ts` | 예 |
| `/api/posts/suggestions` | GET | auth-aware | schema | monitorUnhandledError | `src/app/api/posts/suggestions/route.ts` | 예 |
| `/api/profile/audience-segments` | GET | authenticated | no-input | monitorUnhandledError | `src/app/api/profile/audience-segments/route.ts` | 예 |
| `/api/reports` | POST | authenticated | service-delegated | monitorUnhandledError | `src/app/api/reports/route.ts` | 예 |
| `/api/reports/[id]` | PATCH | moderator | service-delegated | monitorUnhandledError | `src/app/api/reports/[id]/route.ts` | 예 |
| `/api/reports/bulk` | PATCH | moderator | service-delegated | monitorUnhandledError | `src/app/api/reports/bulk/route.ts` | 예 |
| `/api/search/guest` | GET | public | schema | monitorUnhandledError | `src/app/api/search/guest/route.ts` | 예 |
| `/api/search/log` | POST | auth-aware | schema | monitorUnhandledError | `src/app/api/search/log/route.ts` | 예 |
| `/api/security/csp-report` | GET, POST | public-internal-token | manual | monitorUnhandledError | `src/app/api/security/csp-report/route.ts` | 예 |
| `/api/upload` | POST | auth-aware | manual | monitorUnhandledError | `src/app/api/upload/route.ts` | 예 |
| `/api/upload/client` | POST | public | static-response | static-response | `src/app/api/upload/client/route.ts` | 예 |
| `/api/users/[id]/profile-summary` | GET | authenticated | manual | monitorUnhandledError | `src/app/api/users/[id]/profile-summary/route.ts` | 예 |
| `/api/users/[id]/relation` | GET | authenticated | manual | monitorUnhandledError | `src/app/api/users/[id]/relation/route.ts` | 예 |
| `/api/viewer-shell` | GET | auth-aware | no-input | monitorUnhandledError | `src/app/api/viewer-shell/route.ts` | 예 |

## 누락 항목

- 없음
