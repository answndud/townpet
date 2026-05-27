# API Latency Snapshot

- generatedAt: 2026-05-27T01:06:08.084Z
- samples_total: 200
- samples_warmup_excluded: 7
- samples_steady_state: 193
- warmup_samples_per_endpoint: 1

## Full Samples (cold + steady)

### api_breed_posts
- count: 30
- status: 200x30
- total p50/p95(ms): 136.3 / 152.4
- ttfb p50/p95(ms): 135.7 / 151.9
- connect p50/p95(ms): 11.4 / 18.1
- tls p50/p95(ms): 27.3 / 34.9
- slow(>500ms): 1

### api_feed_guest
- count: 30
- status: 200x30
- total p50/p95(ms): 136.5 / 173.2
- ttfb p50/p95(ms): 136.0 / 172.5
- connect p50/p95(ms): 10.3 / 18.4
- tls p50/p95(ms): 26.7 / 34.7
- slow(>500ms): 1

### api_posts_global
- count: 30
- status: 200x30
- total p50/p95(ms): 142.2 / 230.7
- ttfb p50/p95(ms): 140.2 / 229.5
- connect p50/p95(ms): 12.2 / 20.2
- tls p50/p95(ms): 28.3 / 37.8
- slow(>500ms): 1

### api_posts_suggestions
- count: 30
- status: 200x30
- total p50/p95(ms): 137.0 / 369.6
- ttfb p50/p95(ms): 136.3 / 369.0
- connect p50/p95(ms): 12.2 / 18.5
- tls p50/p95(ms): 28.7 / 35.9
- slow(>500ms): 1

### api_search_guest
- count: 30
- status: 200x30
- total p50/p95(ms): 229.4 / 422.0
- ttfb p50/p95(ms): 228.7 / 421.4
- connect p50/p95(ms): 12.2 / 18.5
- tls p50/p95(ms): 28.1 / 35.9
- slow(>500ms): 1

### api_search_log
- count: 20
- status: 200x20
- total p50/p95(ms): 232.9 / 274.3
- ttfb p50/p95(ms): 232.7 / 273.3
- connect p50/p95(ms): 10.6 / 18.3
- tls p50/p95(ms): 26.4 / 33.6
- slow(>500ms): 1

### page_feed
- count: 30
- status: 200x30
- total p50/p95(ms): 143.0 / 181.7
- ttfb p50/p95(ms): 141.7 / 180.4
- connect p50/p95(ms): 16.2 / 18.9
- tls p50/p95(ms): 31.9 / 35.7
- slow(>500ms): 0

## Warm-up Samples (excluded from threshold)

### api_breed_posts
- count: 1
- status: 200x1
- total p50/p95(ms): 540.2 / 540.2
- ttfb p50/p95(ms): 539.8 / 539.8
- connect p50/p95(ms): 11.4 / 11.4
- tls p50/p95(ms): 26.8 / 26.8
- slow(>500ms): 1

### api_feed_guest
- count: 1
- status: 200x1
- total p50/p95(ms): 568.0 / 568.0
- ttfb p50/p95(ms): 567.3 / 567.3
- connect p50/p95(ms): 9.8 / 9.8
- tls p50/p95(ms): 25.1 / 25.1
- slow(>500ms): 1

### api_posts_global
- count: 1
- status: 200x1
- total p50/p95(ms): 946.1 / 946.1
- ttfb p50/p95(ms): 944.8 / 944.8
- connect p50/p95(ms): 12.3 / 12.3
- tls p50/p95(ms): 28.3 / 28.3
- slow(>500ms): 1

### api_posts_suggestions
- count: 1
- status: 200x1
- total p50/p95(ms): 955.5 / 955.5
- ttfb p50/p95(ms): 954.7 / 954.7
- connect p50/p95(ms): 18.3 / 18.3
- tls p50/p95(ms): 36.2 / 36.2
- slow(>500ms): 1

### api_search_guest
- count: 1
- status: 200x1
- total p50/p95(ms): 586.5 / 586.5
- ttfb p50/p95(ms): 586.1 / 586.1
- connect p50/p95(ms): 10.0 / 10.0
- tls p50/p95(ms): 25.8 / 25.8
- slow(>500ms): 1

### api_search_log
- count: 1
- status: 200x1
- total p50/p95(ms): 972.9 / 972.9
- ttfb p50/p95(ms): 972.6 / 972.6
- connect p50/p95(ms): 17.4 / 17.4
- tls p50/p95(ms): 32.5 / 32.5
- slow(>500ms): 1

### page_feed
- count: 1
- status: 200x1
- total p50/p95(ms): 175.0 / 175.0
- ttfb p50/p95(ms): 174.4 / 174.4
- connect p50/p95(ms): 16.2 / 16.2
- tls p50/p95(ms): 31.9 / 31.9
- slow(>500ms): 0

## Steady-state Samples (threshold basis)

### api_breed_posts
- count: 29
- status: 200x29
- total p50/p95(ms): 136.3 / 148.3
- ttfb p50/p95(ms): 135.7 / 147.6
- connect p50/p95(ms): 11.4 / 18.1
- tls p50/p95(ms): 27.5 / 34.9
- slow(>500ms): 0

### api_feed_guest
- count: 29
- status: 200x29
- total p50/p95(ms): 136.5 / 166.1
- ttfb p50/p95(ms): 136.0 / 165.2
- connect p50/p95(ms): 10.4 / 18.4
- tls p50/p95(ms): 26.8 / 34.7
- slow(>500ms): 0

### api_posts_global
- count: 29
- status: 200x29
- total p50/p95(ms): 142.2 / 197.8
- ttfb p50/p95(ms): 140.2 / 196.4
- connect p50/p95(ms): 12.2 / 20.2
- tls p50/p95(ms): 28.3 / 37.8
- slow(>500ms): 0

### api_posts_suggestions
- count: 29
- status: 200x29
- total p50/p95(ms): 137.0 / 320.1
- ttfb p50/p95(ms): 136.3 / 319.6
- connect p50/p95(ms): 12.2 / 18.5
- tls p50/p95(ms): 28.7 / 34.5
- slow(>500ms): 0

### api_search_guest
- count: 29
- status: 200x29
- total p50/p95(ms): 229.4 / 280.5
- ttfb p50/p95(ms): 228.7 / 279.8
- connect p50/p95(ms): 12.6 / 18.5
- tls p50/p95(ms): 28.6 / 35.9
- slow(>500ms): 0

### api_search_log
- count: 19
- status: 200x19
- total p50/p95(ms): 232.9 / 274.3
- ttfb p50/p95(ms): 232.7 / 273.3
- connect p50/p95(ms): 10.6 / 18.9
- tls p50/p95(ms): 26.4 / 35.4
- slow(>500ms): 0

### page_feed
- count: 29
- status: 200x29
- total p50/p95(ms): 143.0 / 181.7
- ttfb p50/p95(ms): 141.7 / 180.4
- connect p50/p95(ms): 16.4 / 18.9
- tls p50/p95(ms): 33.2 / 35.7
- slow(>500ms): 0

## Threshold Evaluation
- basis: steady-state samples (warmup excluded)
- api_breed_posts: PASS
- api_feed_guest: PASS
- api_posts_global: PASS
- api_posts_suggestions: PASS
- api_search_guest: PASS
- api_search_log: PASS
- page_feed: PASS
