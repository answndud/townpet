# 20. 성능 개선을 코드 구조와 함께 설명하기

## 이번 글에서 풀 문제

TownPet는 기능이 늘어나면서 성능 문제도 같이 다뤘습니다.

대표 축은 이렇습니다.

- 피드 목록 렌더링
- query cache와 invalidation
- 검색 후보 추출과 fallback
- 댓글 페이지네이션과 best comment 문맥 계산
- 운영 latency snapshot

이 글은 성능 개선을 "튜닝 팁"이 아니라 **데이터 구조와 계층 분리가 병목을 어떻게 바꾸는지** 관점으로 정리합니다.

## 왜 이 글이 중요한가

서비스 성능은 흔히 뒤늦게 손보게 됩니다.

하지만 TownPet에서는 성능을 기능 완료 후의 마지막 polish가 아니라,

- denormalized count
- cache bucket version
- server pagination
- shadow search column
- re-render 분리

같은 구조적 선택으로 먼저 다뤘습니다.

즉 "빠르게 만들고 나중에 튜닝"보다, **처음부터 어떤 비용이 큰지 알고 구조를 잡는 방식**에 가깝습니다.

## 먼저 볼 핵심 파일

- [`app/src/server/cache/query-cache.ts`](../app/src/server/cache/query-cache.ts)
- [`app/src/server/cache/query-cache.test.ts`](../app/src/server/cache/query-cache.test.ts)
- [`app/src/server/queries/post.queries.ts`](../app/src/server/queries/post.queries.ts)
- [`app/src/server/services/posts/feed-page-performance.service.ts`](../app/src/server/services/posts/feed-page-performance.service.ts)
- [`app/src/server/services/posts/feed-page-query.service.ts`](../app/src/server/services/posts/feed-page-query.service.ts)
- [`app/src/server/queries/comment.queries.ts`](../app/src/server/queries/comment.queries.ts)
- [`app/src/server/queries/comment.queries.test.ts`](../app/src/server/queries/comment.queries.test.ts)
- [`app/src/components/posts/feed-loading-skeleton.tsx`](../app/src/components/posts/feed-loading-skeleton.tsx)
- [`app/src/components/posts/feed-infinite-list.tsx`](../app/src/components/posts/feed-infinite-list.tsx)
- [`app/src/lib/feed-list-presenter.ts`](../app/src/lib/feed-list-presenter.ts)
- [`app/src/lib/post-structured-search.ts`](../app/src/lib/post-structured-search.ts)
- [`app/scripts/collect-latency-snapshot.ts`](../app/scripts/collect-latency-snapshot.ts)
- [`/.github/workflows/ops-latency-snapshots.yml`](../.github/workflows/ops-latency-snapshots.yml)

## 먼저 알아둘 개념

### 1. 캐시는 “있으면 좋다”가 아니라 invalidation이 핵심이다

TownPet는 `withQueryCache`만 있는 것이 아니라, bucket별 version bump를 같이 둡니다.

즉 성능 설계의 핵심은:

- 캐시 사용
- 어떤 이벤트에서 버전을 올릴지

두 축이 같이 맞는가입니다.

### 2. denormalized count는 조회 비용을 줄이는 대신 정합성 repair가 필요하다

`commentCount`, `likeCount`, `dislikeCount`, `viewCount`를 조회마다 세지 않는 대신, write path와 repair job이 중요해집니다.

### 3. 렌더 최적화는 state scope를 줄이는 문제다

피드 전체가 분당 다시 렌더되던 문제를, 상대시간 label만 갱신되게 바꾸는 식입니다.

즉 React 최적화의 핵심은 `memo`보다 **어떤 상태가 어디까지 퍼지느냐**입니다.

## 1. Query cache는 어떻게 설계돼 있는가

핵심 파일:

- [`query-cache.ts`](../app/src/server/cache/query-cache.ts)

먼저 볼 함수:

- `getQueryCacheHealth`
- `getCacheVersion`
- `bumpCacheVersion`
- `createQueryCacheKey`
- `withQueryCache`

구조는 단순하지만 중요한 선택이 있습니다.

- cache backend: disabled / memory / upstash
- key 방식: `cache:{bucket}:v{version}:{parts}`
- distributed cache 장애 시: process memory fallback이 아니라 bypass fail-open

이 마지막 선택이 중요합니다.

예전에는 Redis 장애 시 인스턴스별 메모리 fallback으로 갈 수 있었는데, 이러면 multi-instance stale 문제가 커집니다.

지금 TownPet는 Redis가 죽으면 **일시적으로 캐시를 포기하고 직접 fetch**합니다.

즉 성능보다 정합성을 우선한 설계입니다.

## 2. 왜 bucket version 방식이 중요한가

`query-cache.ts` 하단을 보면 bucket별 bump 함수가 있습니다.

- `bumpFeedCacheVersion`
- `bumpSearchCacheVersion`
- `bumpSuggestCacheVersion`
- `bumpPostDetailCacheVersion`
- `bumpPostCommentsCacheVersion`
- `bumpNotificationUnreadCacheVersion`
- `bumpNotificationListCacheVersion`

장점:

- 특정 도메인만 invalidation 가능
- 키 전체를 scan/delete 하지 않음
- 유저별 notification cache처럼 세밀하게 나눌 수 있음

Spring으로 치환하면:

- `@CacheEvict(allEntries=true)`보다 더 예측 가능한 **versioned namespace cache**입니다.

## 3. 피드는 왜 denormalized count를 적극적으로 쓰는가

TownPet 피드 카드가 빠르게 보여야 하는 대표 이유는, 목록에서 매 row마다 comment/reaction count를 다시 세지 않기 때문입니다.

관련 필드:

- `commentCount`
- `likeCount`
- `dislikeCount`
- `viewCount`

이렇게 해두면 피드/베스트/검색 목록에서 필요한 핵심 수치를 한 row에서 바로 읽을 수 있습니다.

대신 비용은 write path로 이동합니다.

- 반응 변경 시 count 갱신
- 댓글 삭제/복구 시 count 갱신
- drift가 생기면 `repair-post-integrity.ts` 같은 repair job 필요

즉 TownPet는 **read-heavy 커뮤니티 특성에 맞게 read cost를 줄이고, write/repair complexity를 받아들인 구조**입니다.

## 4. 피드 상대시간은 왜 분리 컴포넌트로 뺐는가

핵심 파일:

- [`feed-infinite-list.tsx`](../app/src/components/posts/feed-infinite-list.tsx)
- [`feed-list-presenter.ts`](../app/src/lib/feed-list-presenter.ts)

먼저 볼 함수:

- `subscribeRelativeNow`
- `FeedStatsLabel`
- `buildFeedStatsLabel`
- `getStableFeedDateLabel`

문제:

- 상대시간은 시간이 지나면 변합니다.
- 그런데 이 값을 루트 리스트에서 직접 계산하면, 분당 피드 전체가 다시 렌더됩니다.

TownPet의 해결:

1. `buildFeedStatsLabel`을 presenter 함수로 분리
2. `FeedStatsLabel`을 작은 leaf component로 분리
3. `useSyncExternalStore(subscribeRelativeNow, ...)`로 상대시간만 구독

결과:

- 분당 갱신은 계속 되지만
- 큰 리스트 전체가 아니라 **작은 label leaf만 다시 계산**됩니다.

이건 React에서 매우 중요한 패턴입니다.

## 4.5. 첫 페이지는 왜 count와 list를 겹쳐서 가져오는가

핵심 파일:

- [`feed/page.tsx`](../app/src/app/feed/page.tsx)
- [`feed-page-query.service.ts`](../app/src/server/services/posts/feed-page-query.service.ts)

피드 첫 진입에서 흔한 흐름은 `page=1`입니다.

이 경우 `countPosts`로 전체 개수를 구한 뒤 `listPosts`를 다시 기다리면, 첫 화면은 항상 직렬 비용을 그대로 받습니다.

TownPet는 이 비용을 줄이기 위해 helper 하나로 아래 규칙을 고정했습니다.

1. total count 조회와 requested page 조회를 먼저 병렬로 시작한다.
2. count 결과로 `totalPages`를 계산한다.
3. 요청한 page가 유효하면 첫 조회 결과를 그대로 쓴다.
4. page overflow일 때만 resolved page를 다시 조회한다.

즉 “항상 두 번 조회”가 아니라, **흔한 경로를 빠르게 하고 예외 경로만 보정하는 구조**입니다.

백엔드 관점에서는 이게 중요합니다.

- 정합성: page 범위는 여전히 안전하게 보정
- 성능: 첫 페이지의 직렬 대기 시간을 줄임
- 코드 관리: page overflow 보정 규칙을 page 컴포넌트 여기저기에 흩뿌리지 않음

Spring/Java 식으로 보면, 컨트롤러에 pagination edge case를 직접 적는 대신 **read-model orchestration helper**로 공통화한 셈입니다.

## 4.6. 로딩 문구보다 skeleton을 먼저 보여주는 이유

핵심 파일:

- [`feed-loading-skeleton.tsx`](../app/src/components/posts/feed-loading-skeleton.tsx)
- [`feed/loading.tsx`](../app/src/app/feed/loading.tsx)
- [`feed/guest/page.tsx`](../app/src/app/feed/guest/page.tsx)
- [`guest-feed-page-client.tsx`](../app/src/components/posts/guest-feed-page-client.tsx)

체감 성능은 서버 시간만의 문제가 아닙니다.

같은 500ms라도:

- “피드를 준비 중입니다” 같은 빈상태 문구를 먼저 보면 느리게 느껴지고
- 실제 카드 레이아웃 skeleton을 먼저 보면 곧 채워질 화면처럼 느껴집니다.

TownPet는 그래서 feed loading UI를 공통 skeleton으로 맞췄습니다.

이건 단순 디자인 수정이 아니라, 운영 중 느린 구간이 있더라도 사용자가 보는 첫 인상을 더 안정적으로 만드는 선택입니다.

## 4.7. 느린 구간은 왜 `/feed` 안에서 단계별로 로그를 남기는가

핵심 파일:

- [`feed/page.tsx`](../app/src/app/feed/page.tsx)
- [`feed-page-performance.service.ts`](../app/src/server/services/posts/feed-page-performance.service.ts)
- [`collect-latency-snapshot.ts`](../app/scripts/collect-latency-snapshot.ts)

페이지가 느릴 때 중요한 건 “느리다”가 아니라 **어디가 느린가**입니다.

TownPet는 `/feed` 서버 렌더에서 아래 단계를 분리해 기록합니다.

- `bootstrap.session_and_communities`
- `bootstrap.viewer_context`
- `page_query.all` 또는 `page_query.best`
- `personalization.context`

기본 동작은 단순합니다.

- 전체 시간이 threshold를 넘는 slow request만 `warn` 로그로 남긴다.
- 운영 중 특정 요청을 바로 보고 싶으면 `?perf=1`로 강제 `info` 로그를 남긴다.

즉 평소에는 로그를 과하게 늘리지 않고, 필요할 때만 `/feed?perf=1` 요청 하나로 배포 로그에서 병목 위치를 바로 볼 수 있습니다.

여기에 운영 snapshot도 같이 맞췄습니다.

- `ops:perf:snapshot`
- `ops-latency-snapshots.yml`
- `page_feed` label

이제 API만 재지 않고 **canonical `/feed` 페이지 자체도 주기적으로 측정**합니다.

## 5. 검색 성능은 왜 structured shadow column으로 옮겼는가

메인 검색은 예전처럼 relation table을 매번 크게 조인하면 비싸집니다.

그래서 TownPet는:

- `structuredSearchText`

같은 shadow column을 둬서, 구조화 필드를 미리 합쳐 놓고 검색 시 relation join을 줄였습니다.

이 선택의 장점:

- query가 단순해짐
- 검색/자동완성에서 같은 문서를 재사용하기 쉬움
- compact query, 초성 fallback 같은 후속 최적화를 얹기 쉬움

즉 성능 개선이 단순 인덱스 추가가 아니라 **search document 모델 재구성**과 연결됩니다.

## 6. 댓글 페이지네이션은 왜 “루트 기준”인가

핵심 파일:

- [`comment.queries.ts`](../app/src/server/queries/comment.queries.ts)

먼저 볼 함수:

- `listComments`
- `listCommentDescendants`
- `listBestComments`
- `attachBestCommentThreadContext`
- `listRootCommentPages`

TownPet의 댓글은 flat list가 아니라 thread입니다.

그래서 페이지네이션을 아무 댓글 기준으로 하면 문맥이 깨집니다.

TownPet는:

- root comment 기준 페이지네이션
- root에 매달린 descendants는 같이 조회

를 택합니다.

이 덕분에 사용자는 "댓글 페이지 2"가 실제 thread 문맥과 함께 보이게 됩니다.

## 7. best comment 문맥 계산은 어떻게 최적화했는가

예전에는 best comment가 root의 몇 번째 페이지인지 계산할 때 root마다 `count()`를 반복하기 쉬웠습니다.

지금 TownPet는:

- `listRootCommentPages`
- raw SQL `ROW_NUMBER() OVER (...)`

로 root들의 page를 한 번에 계산합니다.

즉

- 여러 root에 대해 count 반복

대신

- window function 1회

를 사용합니다.

이건 "JS 루프로 성능을 때우는 것"이 아니라, **DB가 잘하는 일을 DB로 보내는 전형적인 최적화**입니다.

## 8. 댓글 조회는 왜 full cache가 아니라 조건부 cache인가

`listComments` 하단을 보면 cache 사용 조건이 보수적입니다.

대략:

- viewer 없음
- hidden author viewer 없음
- blocked/muted author 없음

일 때만 캐시합니다.

이 이유는 명확합니다.

- viewer가 있는 댓글 목록은 사람마다 다름
- block/mute 상태가 끼면 payload가 달라짐

즉 TownPet는 캐시 hit를 무리하게 늘리기보다, **캐시 가능한 경우를 엄격히 제한해 correctness를 우선**합니다.

## 9. 운영에서 성능은 어떻게 관측하는가

핵심 파일:

- [`ops-latency-snapshots.yml`](../.github/workflows/ops-latency-snapshots.yml)

이 workflow는:

- 배포 URL 기준
- GET/POST endpoint에 대해 샘플 수집
- TSV + summary artifact 업로드

를 수행합니다.

즉 TownPet는 "느린 것 같다"가 아니라, **정기적인 latency snapshot**을 남깁니다.

아직 완전한 APM 대시보드는 아니지만, 운영자가 baseline 변화를 볼 수 있다는 점이 중요합니다.

## 10. 전체 흐름을 그림으로 보면

```mermaid
flowchart TD
  A["query call"] --> B["createQueryCacheKey(bucket, parts)"]
  B --> C["withQueryCache(fetcher)"]
  C --> D["Upstash 또는 memory cache"]
  C --> E["cache miss 시 DB query"]

  E --> F["post.queries.ts"]
  E --> G["comment.queries.ts"]

  F --> H["denormalized count + structuredSearchText"]
  G --> I["root pagination + descendant hydration"]
  G --> J["ROW_NUMBER window function for best comment page"]

  K["feed-infinite-list.tsx"] --> L["FeedStatsLabel leaf"]
  L --> M["subscribeRelativeNow"]
  M --> N["분당 label만 갱신"]

  O["ops-latency-snapshots"] --> P["실제 배포 latency 측정"]
```

## 11. 테스트는 어떻게 읽어야 하는가

핵심 테스트:

- [`query-cache.test.ts`](../app/src/server/cache/query-cache.test.ts)
- [`comment.queries.test.ts`](../app/src/server/queries/comment.queries.test.ts)

`query-cache.test.ts`에서 볼 포인트:

- build phase에서 Upstash fetch를 하지 않는지
- runtime에서 Upstash를 쓰는지
- Redis 장애 시 bypass fail-open 되는지

`comment.queries.test.ts`에서 볼 포인트:

- best comment에 `threadRootId`, `threadPage`가 붙는지
- muted comment placeholder 처리
- blocked author filtering

즉 성능 테스트라고 해서 benchmark만 보는 것이 아니라, **최적화 이후에도 의미가 유지되는지**를 테스트합니다.

## 12. 직접 실행해 보고 싶다면

```bash
cd /Users/alex/project/townpet/app
corepack pnpm test -- src/server/cache/query-cache.test.ts src/server/queries/comment.queries.test.ts
```

운영 명령:

```bash
cd /Users/alex/project/townpet/app
corepack pnpm ops:perf:snapshot
```

실제 UI에서 보기 좋은 곳:

- `/feed`
- `/search`
- 게시글 상세 댓글
- `/admin/ops`

## 현재 구현의 한계

- query cache는 강력하지만, 완전한 tag-based invalidation 시스템은 아닙니다.
- latency snapshot은 artifact 중심이라 장기 time-series 시각화까지는 가지 않습니다.
- structured search shadow column이 있어도, 검색 품질과 성능을 더 높이려면 더 강한 unified search document로 갈 수 있습니다.

## Python/Java 개발자용 요약

- `query-cache.ts`는 versioned cache namespace 계층입니다.
- 피드 성능은 denormalized count와 리스트 렌더 분리로 잡았습니다.
- 검색 성능은 relation join 대신 shadow search column으로 줄였습니다.
- 댓글 성능은 root pagination과 window function으로 잡았습니다.
- 운영 관측은 workflow로 정기 latency snapshot을 남깁니다.

## 면접에서 이렇게 설명할 수 있다

> TownPet의 성능 개선은 “느린 쿼리 몇 개 튜닝”보다 구조를 바꾸는 쪽에 가까웠습니다. 읽기 많은 화면에는 denormalized count와 versioned query cache를 쓰고, 검색은 structured shadow column으로 join 비용을 줄였고, 댓글은 root pagination과 window function으로 문맥과 성능을 같이 맞췄습니다. 프론트에서는 상대시간 label만 다시 렌더되게 범위를 줄였습니다.

## 면접 Q&A

### Q1. 왜 query cache를 tag invalidation 대신 bucket version으로 풀었나요?

TownPet는 피드/검색/알림처럼 읽기 표면이 명확해서 bucket version이 구현과 운영 모두 단순했습니다. 필요한 표면만 선택적으로 무효화하기 좋았습니다.

### Q2. 왜 검색은 relation join 대신 shadow column으로 갔나요?

구조화 필드가 많아질수록 join 기반 검색은 비싸집니다. `structuredSearchText`로 검색 후보 추출 비용을 줄였습니다.

### Q3. 댓글 페이지네이션은 왜 전체 댓글이 아니라 루트 기준인가요?

댓글 thread 문맥을 유지하려면 루트 기준이 더 자연스럽고, 페이지네이션·best comment jump·reply 렌더도 이 기준이 더 안정적입니다.
