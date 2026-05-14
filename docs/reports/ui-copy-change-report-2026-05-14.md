# UI Copy Change Report 2026-05-14

## Summary

This report lists the copy changes made during the full Korean UI copy improvement pass.

Primary goals:

- Remove English/internal enum wording from user/operator-facing copy.
- Make board, scope, status, and report terms consistent for Korean users.
- Reduce future drift by reusing canonical post type labels where practical.
- Add a fast repo-local copy audit so copy checks do not require full build/test every time.

## Changed Text

| File | Area | Before | After | Reason | Priority | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| `app/src/lib/post-presenter.ts` | Canonical board label | `병원후기` | `병원 후기` | Korean spacing and readability | P1 | typecheck, tests, screenshots |
| `app/src/lib/post-presenter.ts` | Canonical board label | `리뷰` | `장소 후기` | Removes ambiguous generic review label | P1 | typecheck, tests |
| `app/src/lib/post-presenter.ts` | Canonical board label | `동네모임` | `동네 모임` | Korean spacing consistency | P2 | typecheck, tests |
| `app/src/lib/post-presenter.ts` | Canonical board label | `중고/공동구매` | `중고·공동구매` | Korean punctuation consistency | P2 | typecheck, tests |
| `app/src/lib/post-presenter.ts` | Canonical board label | `리뷰` | `용품 후기` | Distinguishes product reviews from place reviews | P1 | typecheck, tests |
| `app/src/components/posts/post-detail-presenter.tsx` | Detail board label | `병원후기` | `병원 후기` | Align with canonical label | P1 | typecheck |
| `app/src/components/posts/post-detail-presenter.tsx` | Detail board label | `후기/리뷰` | `장소 후기` | Removes mixed terminology | P1 | typecheck |
| `app/src/components/posts/post-detail-presenter.tsx` | Detail board label | `동네모임` | `동네 모임` | Korean spacing consistency | P2 | typecheck |
| `app/src/components/posts/post-detail-presenter.tsx` | Detail board label | `중고/공동구매` | `중고·공동구매` | Align with canonical label | P2 | typecheck |
| `app/src/components/posts/post-detail-presenter.tsx` | Detail board label | `용품리뷰` | `용품 후기` | Align with canonical label | P1 | typecheck |
| `app/src/components/posts/post-detail-presenter.tsx` | Care application status | `대기` | `대기 중` | More natural status wording | P2 | typecheck |
| `app/src/components/posts/post-create-form-options.ts` | Write form board option | `병원후기` | `병원 후기` | Align with canonical label | P1 | unit tests |
| `app/src/components/posts/post-create-form-options.ts` | Write form board option | `동네모임` | `동네 모임` | Korean spacing consistency | P2 | unit tests |
| `app/src/components/posts/post-create-form-options.ts` | Write form board option | `리뷰` | `용품 후기` | Removes ambiguous label | P1 | unit tests |
| `app/src/app/bookmarks/page.tsx` | Board filter labels | local duplicate `typeLabels` | `postTypeMeta[value].label` | Prevents label drift | P1 | typecheck |
| `app/src/app/my-posts/page.tsx` | Board filter labels | local duplicate `typeLabels` | `postTypeMeta[value].label` | Prevents label drift | P1 | typecheck |
| `app/src/app/posts/[id]/guest/page.tsx` | Guest detail board labels | local duplicate `typeMeta` | `postTypeMeta[post.type]` | Prevents label drift | P1 | typecheck, build |
| `app/src/lib/post-write-policy.ts` | New user write policy | duplicate `restrictedTypeLabels` | `getPostTypeMeta(postType).label` | Prevents label drift | P1 | unit tests |
| `app/src/lib/post-write-policy.ts` | New user write policy message | `{label} 카테고리 글` | `{label} 글` | Removes vague category wording | P2 | unit tests |
| `app/src/components/onboarding/onboarding-form.tsx` | Nickname placeholder | `예: townpet-user` | `예: 동네집사` | Removes internal-looking English example | P1 | screenshots |
| `app/src/components/content/linkified-content.tsx` | YouTube iframe title | `YouTube video preview` | `YouTube 영상 미리보기` | Korean accessibility/title copy | P1 | typecheck |
| `app/src/components/admin/breed-catalog-manager.tsx` | Breed catalog button | `entry 저장` | `품종 저장` | Removes English/Korean mixed button text | P1 | typecheck |
| `app/src/app/feed/page.tsx` | Neighborhood gate description | `{label} 게시판은 내 동네 기반으로 노출됩니다...` | `{label}은 동네 설정 후 볼 수 있습니다...` | More direct and less repetitive | P1 | screenshots, API test equivalent |
| `app/src/app/feed/page.tsx` | Guest blocked board notice | `선택한 카테고리(...)는 로그인 후 열람할 수 있습니다.` | `선택한 게시판(...)은 로그인 후 볼 수 있습니다.` | Board context, natural Korean | P1 | screenshots |
| `app/src/app/feed/page.tsx` | Empty state | `해당 카테고리는 로그인 후 확인할 수 있습니다.` | `해당 게시판은 로그인 후 확인할 수 있습니다.` | Board context | P2 | screenshots |
| `app/src/app/feed/page.tsx` | Empty state | `선택한 카테고리/범위...` | `선택한 게시판과 범위...` | Removes awkward slash phrase | P2 | screenshots |
| `app/src/app/feed/page.tsx` | Empty state | `다른 카테고리` | `다른 게시판` | Board context | P2 | screenshots |
| `app/src/components/posts/guest-feed-page-client.tsx` | Guest blocked board notice | `선택한 카테고리(...)는 로그인 후 열람할 수 있습니다.` | `선택한 게시판(...)은 로그인 후 볼 수 있습니다.` | Same copy standard as server feed | P1 | unit tests, screenshots |
| `app/src/components/posts/guest-feed-page-client.tsx` | Empty state | `해당 카테고리` | `해당 게시판` | Board context | P2 | unit tests |
| `app/src/components/posts/guest-feed-page-client.tsx` | Empty state | `선택한 카테고리/범위` | `선택한 게시판과 범위` | More readable Korean | P2 | unit tests |
| `app/src/components/posts/guest-feed-page-client.tsx` | Empty state | `다른 카테고리` | `다른 게시판` | Board context | P2 | unit tests |
| `app/src/components/posts/guest-search-page-client.tsx` | Guest search blocked notice | `선택한 카테고리(...)는 로그인 후 검색할 수 있습니다.` | `선택한 게시판(...)은 로그인 후 검색할 수 있습니다.` | Board context | P1 | screenshots |
| `app/src/app/api/feed/guest/route.ts` | Guest feed gate API copy | `{label}은 내 동네 기반으로 노출됩니다...` | `{label}은 동네 설정 후 볼 수 있습니다...` | Natural Korean, consistent with UI | P1 | API route tests |
| `app/src/app/api/posts/route.ts` | API blocked board message | `선택한 카테고리는 로그인 후 이용할 수 있습니다.` | `선택한 게시판은 로그인 후 이용할 수 있습니다.` | Board context | P1 | tests |
| `app/src/app/api/lounges/breeds/[breedCode]/posts/route.ts` | Lounge API blocked board message | `선택한 카테고리는 로그인 후 이용할 수 있습니다.` | `선택한 게시판은 로그인 후 이용할 수 있습니다.` | Board context | P1 | tests |
| `app/src/app/posts/new/page.tsx` | Write page helper | `분류와 공개 범위...` | `게시판과 공개 범위...` | Matches the actual user action | P2 | screenshots |
| `app/src/app/posts/new/page.tsx` | Guest write restriction | `고위험 카테고리` | `고위험 게시판` | Board context | P1 | screenshots |
| `app/src/components/posts/post-create-form.tsx` | Write policy summary | `병원후기... 온동네... 동네모임...` | `병원 후기... 전체 범위... 동네 모임...` | Removes awkward/incorrect wording | P1 | typecheck |
| `app/src/components/posts/post-create-form.tsx` | Guest write policy summary | `고위험 카테고리` | `고위험 게시판` | Board context | P1 | typecheck |
| `app/src/components/posts/post-create-basic-fields.tsx` | Review field label | `리뷰 카테고리` | `후기 유형` | Clearer Korean form label | P1 | unit tests |
| `app/src/components/posts/post-create-structured-fields.tsx` | Hospital section title | `병원후기 정보` | `병원 후기 정보` | Korean spacing | P2 | unit tests |
| `app/src/components/posts/post-create-structured-fields.tsx` | Market section title | `마켓 거래 정보` | `거래 정보` | Removes unnecessary borrowed term | P2 | unit tests |
| `app/src/components/posts/post-detail-info-panels.tsx` | Hospital detail title | `병원후기 상세` | `병원 후기 상세` | Korean spacing | P2 | accessibility tests |
| `app/src/components/posts/post-detail-info-panels.tsx` | Review detail title | `후기/리뷰 상세` | `후기 상세` | Removes mixed terminology | P2 | accessibility tests |
| `app/src/components/posts/post-detail-info-panels.tsx` | Market detail title | `마켓 거래 정보` | `거래 정보` | Removes unnecessary borrowed term | P2 | accessibility tests |
| `app/src/app/posts/[id]/guest/page.tsx` | Guest detail section title | `병원후기 상세` | `병원 후기 상세` | Korean spacing | P2 | build |
| `app/src/app/posts/[id]/guest/page.tsx` | Guest detail section title | `후기/리뷰 상세` | `후기 상세` | Removes mixed terminology | P2 | build |
| `app/src/app/posts/[id]/guest/page.tsx` | Guest detail section title | `마켓 거래 정보` | `거래 정보` | Removes unnecessary borrowed term | P2 | build |
| `app/src/lib/validations/posts/post.ts` | Review validation | `리뷰 게시글은 세부 카테고리 선택이 필요합니다.` | `후기 글은 후기 유형 선택이 필요합니다.` | Aligns with form label | P1 | tests |
| `app/src/lib/validations/posts/post.ts` | Review validation | `장소 리뷰는 장소 카테고리만 선택할 수 있습니다.` | `장소 후기에는 장소 후기 유형만 선택할 수 있습니다.` | Natural Korean and field consistency | P1 | tests |
| `app/src/lib/validations/posts/post.ts` | Review validation | `용품 리뷰는 장소 카테고리를 선택할 수 없습니다.` | `용품 후기에는 장소 후기 유형을 선택할 수 없습니다.` | Natural Korean and field consistency | P1 | tests |
| `app/src/lib/validations/posts/post.ts` | Market validation | `마켓 글은 거래 정보를 입력해 주세요.` | `거래 글은 거래 정보를 입력해 주세요.` | Removes unnecessary borrowed term | P2 | tests |
| `app/src/components/posts/post-create-submit.ts` | Market price validation | `마켓 글은 가격을 입력해 주세요...` | `거래 글은 가격을 입력해 주세요...` | Removes unnecessary borrowed term | P2 | unit tests |
| `app/src/server/services/posts/post-market-workflow.service.ts` | Market workflow errors | `마켓 상태/글...` | `거래 상태/글...` | User-facing service error clarity | P2 | tests |
| `app/src/server/services/posts/post-create.service.ts` | Market create errors | `마켓 글 입력값...` | `거래 글 입력값...` | User-facing service error clarity | P2 | tests |
| `app/src/server/services/posts/post-create.service.ts` | Admin-only create error | `해당 카테고리 글...` | `해당 게시판 글...` | Board context | P1 | tests |
| `app/src/server/services/posts/post-create.service.ts` | Guest create error | `해당 카테고리 글...` | `해당 게시판 글...` | Board context | P1 | tests |
| `app/src/components/admin/direct-moderation-panel.tsx` | Direct moderation result | `숨길 ACTIVE 글/댓글` | `숨길 공개 중인 글/댓글` | Removes internal enum from operator message | P1 | admin tests |
| `app/src/components/admin/direct-moderation-panel.tsx` | Direct moderation helper | `ACTIVE 게시글과 댓글` | `공개 중인 게시글과 댓글` | Removes internal enum from operator message | P1 | admin tests |
| `app/src/app/admin/moderation/direct/page.tsx` | Macro helper | ``AUTOMATED``, ``hide-content``, ``sanction``, ``restore-content`` in prose | Korean action descriptions | Operator copy should explain action without raw internal names | P1 | build |
| `app/src/app/admin/ops/page.tsx` | Search scope | `전역 검색` | `전체 검색` | Natural Korean for community scope | P1 | build |
| `app/src/app/admin/ops/page.tsx` | Ops label | `검토중` | `검토 중` | Korean spacing | P3 | build |
| `app/src/app/admin/hospital-review-flags/page.tsx` | Empty state | `병원 후기 플래그` | `병원 후기 의심 신호` | Removes operator jargon | P1 | build |
| `app/src/app/admin/care-feedbacks/page.tsx` | Feedback status | `대기`, `검토중`, `해결`, `종료` | `검토 대기`, `검토 중`, `처리 완료`, `조치 없음` | Clearer admin state labels | P1 | build |
| `app/src/app/admin/care-feedbacks/page.tsx` | Care request status | `모집중`, `진행중` | `모집 중`, `진행 중` | Korean spacing | P3 | build |
| `app/src/app/admin/reports/page.tsx` | Report status | `대기`, `승인`, `기각` | `검토 대기`, `조치 완료`, `조치 없음` | Outcome-oriented moderation labels | P1 | tests |
| `app/src/app/admin/reports/[id]/page.tsx` | Report status | `대기`, `승인`, `기각` | `검토 대기`, `조치 완료`, `조치 없음` | Outcome-oriented moderation labels | P1 | tests |
| `app/src/components/admin/report-queue-table.tsx` | Report status | `대기`, `승인`, `기각` | `검토 대기`, `조치 완료`, `조치 없음` | Outcome-oriented moderation labels | P1 | tests |
| `app/src/components/admin/report-actions.tsx` | Report action copy | `승인`, `기각` | `조치 완료`, `조치 없음` | Buttons now describe operator outcome | P1 | unit tests |
| `app/src/components/admin/report-actions.tsx` | Sanction checkbox | `승인 시 단계적 제재 적용...` | `조치 완료 시 단계적 제재 적용...` | Aligns with new report status term | P1 | unit tests |
| `app/src/app/admin/moderation-logs/page.tsx` | Moderation log action | `신고 승인`, `신고 기각` | `신고 조치 완료`, `신고 조치 없음` | Outcome-oriented moderation labels | P1 | build |
| `app/src/app/admin/moderation-logs/page.tsx` | Moderation log action | `마켓 상태 변경` | `거래 상태 변경` | Removes unnecessary borrowed term | P2 | build |
| `app/src/app/admin/moderation-logs/page.tsx` | Hospital review text | `병원후기 의심 신호` | `병원 후기 의심 신호` | Korean spacing | P2 | build |
| `app/src/app/admin/policies/page.tsx` | Policy metrics/helper | `카테고리`, `차단 카테고리`, `제한 카테고리` | `게시판`, `차단 게시판`, `제한 게시판` | Board context | P1 | build |
| `app/src/components/admin/new-user-safety-policy-form.tsx` | New user policy labels | `고위험 카테고리`, `대상 카테고리` | `고위험 게시판`, `대상 게시판` | Board context | P1 | accessibility tests |
| `app/src/components/admin/guest-post-policy-form.tsx` | Guest write policy label | `비회원 작성 차단 카테고리` | `비회원 작성 차단 게시판` | Board context | P1 | accessibility tests |
| `app/src/lib/feed-personalization.ts` | Personalization copy | `콘텐츠 카테고리` | `콘텐츠 분류` | Avoids board/category ambiguity | P2 | unit tests |
| `app/src/app/my-posts/page.tsx` | My posts description | `카테고리별로 내 글...` | `게시판별로 내 글...` | Board context | P2 | screenshots indirectly |
| `app/src/app/profile/page.tsx` | Profile summary card | `카테고리별로 내가 작성한 글...` | `게시판별로 내가 작성한 글...` | Board context | P2 | typecheck |
| `app/scripts/audit-ui-copy.ts` | New script | none | `copy:audit` scanner | Fast copy validation without full quality gate | P1 | script run |
| `app/package.json` | Package scripts | none | `copy:audit`, `copy:audit:strict` | Repo-local validation command | P1 | script run |

## Reviewed And Kept

| Term | Kept because |
| --- | --- |
| `YouTube` | Product name. Only the iframe title was localized. |
| `URL`, `JPG`, `PNG`, technical file names | Technical/product terms users expect. |
| API endpoint paths such as `/api/admin/moderation/users/hide-content` | Shown in admin macro endpoint reference, not a general user label. |
| Enum values in TypeScript types and service logic | Internal implementation, not user-facing copy. |
| `카테고리` in personalization internals where it does not mean board | Some code-only references remain; user-facing board contexts were changed to `게시판`. |

## Validation

| Command | Result |
| --- | --- |
| `corepack pnpm@9.12.3 -C app copy:audit:strict` | Pass, no risky copy patterns found |
| `corepack pnpm@9.12.3 -C app test -- src/components/posts/post-create-basic-fields.test.tsx src/components/posts/post-create-structured-fields.test.tsx src/components/posts/post-create-submit.test.ts src/components/admin/report-actions.test.tsx src/app/api/feed/guest/route.test.ts` | Pass, 5 files / 24 tests |
| `corepack pnpm@9.12.3 -C app lint` | Pass |
| `corepack pnpm@9.12.3 -C app typecheck` | Pass |
| `corepack pnpm@9.12.3 -C app test` | Pass, 239 files / 1146 tests |
| `corepack pnpm@9.12.3 -C app build` | Pass |
| `corepack pnpm@9.12.3 -C app design:detect` | Pass |
| `corepack pnpm@9.12.3 -C app docs:refresh:check` | Pass after `docs:refresh` |

## Screenshot Evidence

Saved in `docs/reports/ui-copy-screenshots-2026-05-14/`.

Checked routes:

- `/feed/guest` desktop/mobile
- `/search/guest?q=강아지` desktop/mobile
- `/posts/new` desktop/mobile
- `/login` desktop/mobile

Notes:

- `/feed/guest` mobile shows compact controls and board labels without text overflow.
- `/posts/new` mobile shows `게시판과 공개 범위`, `고위험 게시판`, and form labels without overflow.
- `/login` mobile copy remains stable and readable.
- Admin screenshots were not captured because this run did not have an authenticated admin browser storage state. Admin copy was covered by static audit, unit/accessibility tests, typecheck, lint, and build.
