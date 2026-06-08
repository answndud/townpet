# 게시글 조회/생성 리팩터링 작업 단위 선정

작성일: 2026-05-18

## 목적

가장 큰 게시글 백엔드 모듈 두 개를 변경하기 전에, 동작 보존이 가능한 작은 리팩터링 slice를 고른다.

이 문서는 rewrite 계획이 아니다. 목표는 `@/server/queries/post.queries`와 `createPost` public import surface를 유지하면서 locality와 testability를 높이는 것이다.

## 초기 repository 근거

- `app/src/server/queries/posts/post.queries.ts`: 2,299줄
  - schema fallback detection, feed personalization scoring, detail widget query, feed list/count, best posts, ranked search orchestration을 함께 갖고 있었다.
  - list args, list where building, list fetch fallback, ranked search SQL/cache/hydration, search suggestion, user posts, detail care query helper는 이미 일부 분리되어 있었다.
- `app/src/server/services/posts/post-create.service.ts`: 1,145줄
  - 하나의 `createPost`가 input parsing, guest/member author resolution, new-user/guest policy check, structured field moderation, board validation, post type별 Prisma create payload, upload finalization, cache invalidation, hospital review risk logging을 모두 담당했다.
  - structured create branch에서 `prisma.post.create`, `structuredSearchText`, include block, upload finalization, cache notification이 반복되었다.
- 주요 회귀 테스트:
  - `app/src/server/queries/post.queries.test.ts`: 1,904줄
  - `app/src/server/services/post-create-policy.test.ts`: 1,008줄
  - 추가 service coverage: `post.service.test.ts`, `guest-post-management.service.test.ts`, `post-read-access.service.test.ts`

## 현재 리팩터링 상태

- `app/src/server/queries/posts/post.queries.ts`: detail widget, feed list/count, feed personalization 추출 후 466줄
- `app/src/server/queries/posts/post-list.queries.ts`: feed list/count orchestration 담당
- `app/src/server/queries/posts/post-feed-personalization.queries.ts`: feed personalization context loading, scoring, recent behavior/dwell/bookmark signal, diversity interleaving 담당
- `app/src/server/queries/posts/post-query-schema-support.ts`: guest/review/community schema fallback guard 공유
- `@/server/queries/post.queries`를 통한 public import surface는 안정적으로 유지

## 후보 1: 게시글 생성 structured variant builder

- 대상 파일:
  - `app/src/server/services/posts/post-create.service.ts`
  - `app/src/server/services/posts/` 하위 신규 helper
  - `app/src/server/services/post-create-policy.test.ts`
- 문제:
  - `createPost`가 정책 판단과 post type별 Prisma create payload 생성을 함께 들고 있다.
  - 정책 로직은 중요하고 이미 테스트되어 있지만, payload 생성이 병원 후기, 장소 후기, 산책 코스, 중고거래, 돌봄 요청, 입양, 봉사, 기본 글 branch에 반복된다.
  - 리뷰어가 정책 변경이 persistence shape에 영향을 주는지 확인하려면 수백 줄을 훑어야 한다.
- 해결:
  - public service interface인 `createPost`는 유지한다.
  - post type별 structured create payload 선택과 공통 include fragment를 private helper module로 옮긴다.
  - upload finalization, cache invalidation, hospital review risk logging 같은 side effect는 이후 slice 전까지 orchestration path에 남긴다.
- 효과:
  - locality: type-specific persistence rule을 author/abuse policy와 섞지 않고 한곳에서 본다.
  - testability: 기존 `createPost` behavior test가 public contract를 유지하고, 필요하면 pure payload helper에 좁은 테스트를 추가할 수 있다.
  - maintainability: 새 post type 추가 시 main policy path 대신 structured create variant만 수정한다.
- ADR 영향:
  - 기존 service/query/validation boundary를 지킨다. 정책 집행은 service, 입력 검증은 Zod schema에 남긴다.
- 확신도: 높음
- 상태: 2026-05-18 완료

## 후보 2: 게시글 상세 widget query helper

- 상태: 2026-05-18 완료
- 대상 파일:
  - `app/src/server/queries/posts/post.queries.ts`
  - `app/src/server/queries/posts/` 하위 helper
  - `/api/posts/[id]/stats`, `/content`, `/comments`, detail route test
- 문제:
  - `getPostMetadataById`, `getPostStatsById`, `getPostReadAccessById`, `getPostContentById`가 viewer-hidden-author filter, visible-author filter, anonymous cache decision, `findFirst` 구조를 반복한다.
  - 각 public function은 따로 보면 단순하지만, visibility/cache contract가 drift될 수 있다.
- 해결:
  - export 함수 이름은 유지한다.
  - select shape과 cache mode를 받는 내부 detail read helper를 추출한다.
- 효과:
  - visibility와 anonymous cache behavior가 하나의 contract가 된다.
  - 기존 route test가 public behavior를 검증하고, query test가 hidden author/cache mode reuse를 좁게 검증한다.

## 후보 3: feed list/count orchestrator module

- 상태: 2026-05-18 완료
- 대상 파일:
  - `app/src/server/queries/posts/post.queries.ts`
  - `post-list.queries.ts`
  - `app/src/server/queries/post.queries.test.ts`
- 문제:
  - `listPosts`, `listBestPosts`, `countPosts`, `countBestPosts`가 hidden-author filter, exclusion expansion, legacy schema fallback, search fallback, bookmark attachment, personalization, cache key를 unrelated detail/ranked-search 함수와 같은 파일에서 조율했다.
- 해결:
  - feed list/count orchestration을 전용 query module로 옮기고, `app/src/server/queries/post.queries.ts`는 stable facade로 유지한다.
- 효과:
  - feed read behavior만 따로 리뷰할 수 있다.
  - 기존 `post.queries.test.ts`가 public contract를 유지한다.
  - 앞으로 agent가 feed read behavior를 파일명으로 찾기 쉬워진다.

## 후보 4: feed personalization context module

- 상태: 2026-05-18 완료
- 대상 파일:
  - `app/src/server/queries/posts/post.queries.ts`
  - `post-feed-personalization.queries.ts`
  - `app/src/server/queries/post.queries.test.ts` personalization section
- 문제:
  - personalization scoring, viewer context loading, recent engagement/dwell/bookmark signal, ad-impression dampening, diversity interleaving이 `post.queries.ts` 중간을 크게 차지했다.
- 해결:
  - personalization context loading과 scoring을 query-local helper module 뒤로 추출한다.
  - `listPosts({ personalized: true })`를 public feed entrypoint로 유지한다.
- 효과:
  - personalization policy가 basic feed query code를 건드리지 않고 진화할 수 있다.
  - existing personalization test가 contract test로 남는다.
  - 새 signal 추가 지점이 한 module로 모인다.

## 첫 slice 선정

첫 slice는 후보 1, 게시글 생성 structured variant builder 추출로 정했다.

선정 이유:

- 1,145줄 service를 줄이면서도 public behavior를 바꾸지 않는 가장 작은 slice였다.
- `createPost` interface를 유지하고 기존 `post-create-policy.test.ts`를 regression contract로 사용할 수 있었다.
- policy orchestration은 읽기 쉬워지고 persistence variant는 지역화되어 backend 면접 설명력이 좋아졌다.

## 실행 순서

1. `post-create.service.ts`에서 shared include fragment와 post type별 Prisma create data construction을 private helper module로 추출한다.
2. author resolution, guest policy, new-user policy, contact moderation, board validation, upload finalization, cache invalidation, hospital review risk logging은 `createPost`에 남긴다.
3. `corepack pnpm@9.12.3 -C app test -- src/server/services/post-create-policy.test.ts`를 실행한다.
4. `corepack pnpm@9.12.3 -C app typecheck`를 실행한다.
5. diff가 여전히 넓으면 helper extraction에서 멈추고 query refactor와 섞지 않는다.

## 후속 순서

1. 필요성이 생기면 generated API route contract report에 access/validation heuristic을 확장한다.
2. 추가 post query refactor는 명확히 고립된 동작에만 제한한다. 현재 facade는 충분히 작아졌으므로 broad extraction은 멈출 수 있다.
