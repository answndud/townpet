# UI Copy Audit 2026-05-14

## Scope

This audit followed `docs/PLAN.md` Phase A-B for Korean-facing UI copy.

Reviewed surfaces:

- Public feed/search/read: `/`, `/feed`, `/feed/guest`, `/best`, `/search`, `/search/guest`, `/posts/[id]`, `/posts/[id]/guest`
- Write/edit forms: `/posts/new`, `/posts/[id]/edit`
- Auth/onboarding/profile: `/login`, `/register`, `/onboarding`, `/password/*`, `/verify-email`, `/profile`
- Personal lists/notifications/lounge/legal: `/bookmarks`, `/my-posts`, `/saved`, `/notifications`, `/boards/adoption`, `/lounges/breeds/[breedCode]`, legal wrappers
- Admin/operations: `/admin/*`, report queue/detail, policies, direct moderation, ops, hospital review flags, care feedbacks, breed catalog
- API/validation messages that can reach UI

## Priority Findings

| Priority | Finding | Action |
| --- | --- | --- |
| P0 | No remaining public raw board enum pattern found after fixes. | Guarded by `copy:audit:strict`. |
| P1 | English or internal copy was present: `entry 저장`, `YouTube video preview`, `townpet-user`, `ACTIVE 글/댓글`, `hide-content`, `전역 검색`, `플래그`. | Rewritten to Korean user/operator-facing terms. |
| P1 | Report status labels used approval/rejection language that did not describe operator outcome clearly. | Rewritten to `검토 대기`, `조치 완료`, `조치 없음`. |
| P1 | Board labels were duplicated across pages and could drift again. | Removed duplicate maps in bookmarks/my-posts/guest detail where practical; shared `postTypeMeta` is now used. |
| P2 | `카테고리` was overused in board-selection contexts. | Rewritten to `게시판` where the UI means a board. |
| P2 | Review terms were inconsistent: `후기/리뷰`, `용품리뷰`, `병원후기`, `리뷰 카테고리`. | Rewritten to `병원 후기`, `장소 후기`, `용품 후기`, `후기 유형`. |
| P2 | `마켓` was used in user-facing error/section text where `거래` is clearer. | Rewritten to `거래` in user-facing strings. |

## Canonical Terms

| Concept | Canonical Korean UI term |
| --- | --- |
| `LOCAL` scope | 동네 |
| `GLOBAL` scope | 전체 |
| active content | 공개 중 |
| pending report | 검토 대기 |
| resolved report | 조치 완료 |
| dismissed report | 조치 없음 |
| hospital review | 병원 후기 |
| place review | 장소 후기 |
| product review | 용품 후기 |
| meetup | 동네 모임 |
| market listing | 중고·공동구매 / 거래 |
| flag | 의심 신호 |
| category in board context | 게시판 |
| review category field | 후기 유형 |

## Kept Terms

- `YouTube`, `URL`, image formats, and API endpoint paths are kept when they are product/technical names or code references.
- `LOCAL`, `GLOBAL`, `ACTIVE`, `PENDING`, `RESOLVED`, `DISMISSED`, `ALL_ACTIVE` remain in type definitions, API parameters, service logic, tests, and telemetry keys where they are not user-facing copy.
- `/api/admin/moderation/users/hide-content` remains visible as an endpoint in the admin macro endpoint block because it is an operator/developer integration reference.

## Validation

- `corepack pnpm@9.12.3 -C app copy:audit:strict`: pass
- `corepack pnpm@9.12.3 -C app lint`: pass
- `corepack pnpm@9.12.3 -C app typecheck`: pass
- `corepack pnpm@9.12.3 -C app test`: pass, 239 files / 1146 tests
- `corepack pnpm@9.12.3 -C app build`: pass
- `corepack pnpm@9.12.3 -C app design:detect`: pass
- `corepack pnpm@9.12.3 -C app docs:refresh:check`: pass after `docs:refresh`

## Screenshot Evidence

Saved under `docs/reports/ui-copy-screenshots-2026-05-14/`:

- `feed-guest-desktop.png`
- `feed-guest-mobile.png`
- `search-guest-desktop.png`
- `search-guest-mobile.png`
- `posts-new-desktop.png`
- `posts-new-mobile.png`
- `login-desktop.png`
- `login-mobile.png`

Admin screenshots were not captured because no authenticated admin browser storage was available in this run. Admin copy was verified by static audit, unit/accessibility tests, typecheck, lint, and build.
