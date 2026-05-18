# Post Query/Create Refactor Slice Selection

Date: 2026-05-18

## Purpose

Select small, behavior-preserving refactor slices for the two largest post backend modules before changing implementation.

This is not a rewrite plan. The goal is to improve locality and testability while keeping the public import surface stable through `@/server/queries/post.queries` and `createPost`.

## Initial Repository Evidence

- `app/src/server/queries/posts/post.queries.ts`: 2,299 lines.
  - Still owns schema fallback detection, feed personalization scoring, detail widget queries, feed list/count, best posts, and ranked search orchestration.
  - Existing helper modules already cover list args, list where building, list fetch fallback, ranked search SQL/cache/hydration, search suggestions, user posts, and detail care queries.
- `app/src/server/services/posts/post-create.service.ts`: 1,145 lines.
  - One exported `createPost` function owns input parsing, guest/member author resolution, new-user/guest policy checks, structured field moderation, board validation, Prisma create payloads for each post type, upload finalization, cache invalidation, and hospital review risk logging.
  - Structured create branches repeat `prisma.post.create`, `structuredSearchText`, include blocks, upload finalization, and cache notification.
- Primary regression tests:
  - `app/src/server/queries/post.queries.test.ts`: 1,904 lines.
  - `app/src/server/services/post-create-policy.test.ts`: 1,008 lines.
  - Additional service coverage exists in `post.service.test.ts`, `guest-post-management.service.test.ts`, and `post-read-access.service.test.ts`.

## Current Refactor State

- `app/src/server/queries/posts/post.queries.ts`: 466 lines after detail widget, feed list/count, and feed personalization extraction.
- `app/src/server/queries/posts/post-list.queries.ts`: owns feed list/count orchestration.
- `app/src/server/queries/posts/post-feed-personalization.queries.ts`: owns feed personalization context loading, scoring, recent behavior/dwell/bookmark signals, and diversity interleaving.
- `app/src/server/queries/posts/post-query-schema-support.ts`: owns shared guest/review/community schema fallback guards.
- Public import surface through `@/server/queries/post.queries` remains stable.

## Candidate 1: Post Create Structured Variant Builders

- Files:
  - `app/src/server/services/posts/post-create.service.ts`
  - new helper under `app/src/server/services/posts/`
  - `app/src/server/services/post-create-policy.test.ts`
- Problem:
  - `createPost` mixes policy decisions with per-type Prisma create payload construction.
  - The policy logic is important and already tested, but payload construction is repeated across hospital review, place review, walk route, market listing, care request, adoption listing, shelter volunteer, and default posts.
  - A reviewer must scan hundreds of lines to know whether a policy change affects persistence shape.
- Solution:
  - Keep `createPost` as the public service interface.
  - Move the per-type structured create payload selection and common include fragments behind a private post-create helper module.
  - Keep side effects such as upload finalization, cache invalidation, and hospital review risk logging in the orchestration path until a later slice.
- Benefits:
  - Locality: type-specific persistence rules live together instead of being interleaved with author and abuse policy.
  - Testability: existing `createPost` behavior tests remain the public contract, and pure payload helpers can gain narrow tests if needed.
  - Maintainability: future post types require one structured create variant change instead of editing the main policy path.
- ADR impact:
  - Respects existing service/query/validation boundary. Policy enforcement remains in service, and validation remains in Zod schemas.
- Confidence:
  - High.

## Candidate 2: Post Detail Widget Query Helper

Status: completed on 2026-05-18.

- Files:
  - `app/src/server/queries/posts/post.queries.ts`
  - possible helper under `app/src/server/queries/posts/`
  - route tests for `/api/posts/[id]/stats`, `/content`, `/comments`, and detail route
- Problem:
  - `getPostMetadataById`, `getPostStatsById`, `getPostReadAccessById`, and `getPostContentById` repeat the same viewer-hidden-author filter, visible-author filter, anonymous cache decision, and `findFirst` structure.
  - Each small public function is easy to read alone, but the repeated visibility/cache contract can drift.
- Solution:
  - Keep the exported function names stable.
  - Extract a shared internal detail read helper that accepts the select shape and cache mode.
- Benefits:
  - Locality: visibility and anonymous cache behavior become one contract.
  - Testability: existing route tests validate public behavior; one focused query test can cover hidden author/cache mode reuse.
  - Maintainability: future detail widgets do not duplicate visibility rules.
- ADR impact:
  - Respects query read-only boundary and keeps service policy out of query code.
- Confidence:
  - High.

## Candidate 3: Feed List/Count Orchestrator Module

Status: completed on 2026-05-18.

- Files:
  - `app/src/server/queries/posts/post.queries.ts`
  - new `post-list.queries.ts` or equivalent internal module
  - `app/src/server/queries/post.queries.test.ts`
- Problem:
  - `listPosts`, `listBestPosts`, `countPosts`, and `countBestPosts` still coordinate hidden-author filters, exclusion expansion, legacy schema fallbacks, search fallback, bookmark attachment, personalization, and cache keys in the same file as unrelated detail/ranked-search functions.
  - Existing helper modules reduced some complexity, but the orchestration file remains hard to navigate.
- Solution:
  - Move feed list/count orchestration to a dedicated query module while keeping `app/src/server/queries/post.queries.ts` as the stable facade.
  - Do not change options, return shape, cache key semantics, or personalization behavior.
- Benefits:
  - Locality: feed list behavior can be reviewed without scanning detail/ranked-search/personalization helper exports.
  - Testability: current `post.queries.test.ts` can remain the public contract during the move.
  - AI navigability: future agents can find feed read behavior by filename.
- ADR impact:
  - Respects query read-only boundary.
- Confidence:
  - Medium. The move touches many imports and private fallback handlers, so it should follow smaller extraction slices.

## Candidate 4: Feed Personalization Context Module

Status: completed on 2026-05-18.

- Files:
  - `app/src/server/queries/posts/post.queries.ts`
  - possible `post-feed-personalization.queries.ts`
  - personalization section of `app/src/server/queries/post.queries.test.ts`
- Problem:
  - Personalization scoring, viewer context loading, recent engagement/dwell/bookmark signals, ad-impression dampening, and diversity interleaving take a large middle section of `post.queries.ts`.
  - This behavior is product-critical and has many tests, but it obscures the simpler query entrypoints around it.
- Solution:
  - Extract personalization context loading and scoring behind a query-local helper module.
  - Keep `listPosts({ personalized: true })` as the only public feed entrypoint.
- Benefits:
  - Locality: personalization policy can evolve without editing basic feed query code.
  - Testability: existing personalization tests remain contract tests; pure score helpers can be tested independently later.
  - Maintainability: new signals can be added in one module.
- ADR impact:
  - Respects query boundary as long as the module remains read-only and does not mutate event logs.
- Confidence:
  - Medium. It has more behavioral risk than Candidate 1 or 2 because it touches ranking semantics.

## Selected First Slice

Implement Candidate 1 first: extract post create structured variant builders.

Status: completed on 2026-05-18.

Reason:

- It is the smallest slice that directly reduces a 1,145-line service without changing public behavior.
- It preserves the current `createPost` interface and uses existing `post-create-policy.test.ts` as the regression contract.
- It improves the clearest backend interview signal: policy orchestration stays readable while persistence variants become localized.

## Execution Order

1. Extract shared include fragments and per-type Prisma create data construction from `post-create.service.ts` into a private helper module.
2. Keep author resolution, guest policy, new-user policy, contact moderation, board validation, upload finalization, cache invalidation, and hospital review risk logging in `createPost`.
3. Run `corepack pnpm@9.12.3 -C app test -- src/server/services/post-create-policy.test.ts`.
4. Run `corepack pnpm@9.12.3 -C app typecheck`.
5. If the diff is still broad, stop after the helper extraction and do not combine it with query refactors.

## Follow-up Order

1. Extend the generated API route contract report with access/validation heuristics if it becomes useful.
2. Keep further post query refactors limited to clearly isolated behavior; the current facade is small enough to pause broad extraction.
