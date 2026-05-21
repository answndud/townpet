# DB Region, Pooling, Query Index Readiness

- generatedAt: `2026-05-21T03:06:07.505Z`
- baseUrl: `https://townpet.vercel.app`

## Current Process DB URL (Redacted)

| item | value |
| --- | --- |
| DATABASE_URL configured | yes |
| protocol | postgresql |
| host | localhost |
| database | townpet |
| pooling host signal | no |
| pooling signals | - |

Note: this report never prints credentials. The DB URL shown here is the current process environment, not necessarily production unless the script is run with production env. Provider region must still be confirmed in the DB dashboard.

## Production Header Region Signals

| route | status | x-vercel-cache | x-vercel-id | parsed regions | cache-control |
| --- | ---: | --- | --- | --- | --- |
| `/` | 200 | HIT | `icn1::8hjsv-1779332767615-6aecf25098d0` | icn1 -> 8hjsv | `public, max-age=0, must-revalidate` |
| `/feed/guest` | 200 | HIT | `icn1::plnxm-1779332767615-ec86c98e2e7b` | icn1 -> plnxm | `public, max-age=0, must-revalidate` |
| `/api/feed/guest?mode=ALL&sort=LATEST&page=1` | 200 | STALE | `icn1::sin1::5mpzf-1779332767612-c1e2fa1310e5` | icn1 -> sin1 -> 5mpzf | `public` |
| `/api/health` | 200 | MISS | `icn1::sin1::5jncl-1779332767616-da98054bdf4c` | icn1 -> sin1 -> 5jncl | `public, max-age=0, must-revalidate` |

## Query / Index Coverage

| surface | coverage | expected index signals | risk if slow | next live EXPLAIN |
| --- | --- | --- | --- | --- |
| feed latest GLOBAL first page | covered | `Post_scope_status_createdAt_idx` | GLOBAL 최신글 목록이 sequential scan 또는 sort로 떨어질 수 있다. | `EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Post" WHERE "scope" = 'GLOBAL' AND "status" = 'ACTIVE' ORDER BY "createdAt" DESC LIMIT 21;` |
| feed best GLOBAL first page | covered | `Post_scope_status_best_order_idx` | 베스트글 정렬이 like/comment/view/createdAt sort 비용으로 커질 수 있다. | `EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Post" WHERE "scope" = 'GLOBAL' AND "status" = 'ACTIVE' ORDER BY "likeCount" DESC, "commentCount" DESC, "viewCount" DESC, "createdAt" DESC, "id" DESC LIMIT 21;` |
| local board/type feed | covered | `@@index([neighborhoodId, type, status, createdAt(sort: Desc)])` | 지역+게시판 조합에서 neighborhood/type 필터 후 정렬 비용이 커질 수 있다. | `EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Post" WHERE "neighborhoodId" = $1 AND "type" = $2 AND "status" = 'ACTIVE' ORDER BY "createdAt" DESC LIMIT 21;` |
| ranked search title/content/structured text | covered | `Post_title_trgm_idx`<br>`Post_content_trgm_idx`<br>`Post_structuredSearchText_trgm_idx`<br>`Post_structuredSearchText_tsv_idx` | pg_trgm/GIN이 없거나 LIKE 패턴이 index를 타지 못하면 검색이 가장 먼저 병목이 된다. | `EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Post" WHERE "status" = 'ACTIVE' AND ("title" ILIKE $1 OR "content" ILIKE $1 OR "structuredSearchText" ILIKE $1) LIMIT 80;` |
| post detail comments | covered | `@@index([postId, createdAt(sort: Desc)])` | 상세 댓글 페이지가 postId 필터 후 createdAt 정렬에서 느려질 수 있다. | `EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Comment" WHERE "postId" = $1 ORDER BY "createdAt" DESC LIMIT 51;` |
| admin report queue | covered | `Report_status_targetType_createdAt_idx` | 운영 큐 count/list가 신고 누적 후 관리자 화면 병목이 될 수 있다. | `EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Report" WHERE "status" = 'PENDING' AND "targetType" IN ('POST', 'COMMENT') ORDER BY "createdAt" DESC, "id" DESC LIMIT 25;` |

## Slow Query Top 5 Candidates

1. `ranked_search`: trigram/GIN과 candidate hydration이 같이 걸리는 경로라 데이터가 쌓일수록 가장 먼저 p95가 커질 수 있다.
2. `feed_best_global`: 복합 best order index가 있어도 기간 필터와 excluded type 조건이 붙으면 정렬/필터 비용을 EXPLAIN으로 확인해야 한다.
3. `feed_latest_global`: 첫 페이지 count는 줄였지만 2페이지 이상과 조합 필터는 count/list 계획을 별도로 봐야 한다.
4. `comments_detail`: index는 있으나 댓글이 많은 글에서 페이지 방향과 정렬 방향을 확인해야 한다.
5. `report_queue`: 관리자 큐는 운영 데이터가 누적될 때 count/list 동시 실행 비용이 커질 수 있다.

## Decision

- Vercel runtime signal is visible in `x-vercel-id`; DB provider region is not inferable from code and must be confirmed in provider dashboard.
- If DB region differs from the Vercel runtime region, align regions or use the provider's serverless pooler before adding more indexes.
- If regions are aligned, run the listed `EXPLAIN (ANALYZE, BUFFERS)` statements against production-like data before creating migrations.
