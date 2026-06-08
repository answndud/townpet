# Spike Phase Breakdown

- generatedAt: `2026-06-08`
- source: `docs/reports/traffic-spike-local-2026-06-08.json`
- profile: `spike`
- baseUrl: `http://localhost:3000`
- concurrency: `100`
- loadRequests: `5000`

## Phase Summary

| target | count | total p95 | total p99 | total max | header p95 | header p99 | header max | body p95 | body p99 | body max | read |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| home | 684 | 201.2ms | 1320.1ms | 2722.5ms | 131.4ms | 1280.9ms | 2669.9ms | 75.3ms | 81.6ms | 84.3ms | first byte / server queue dominates |
| guest_feed_page | 985 | 196.3ms | 1111.5ms | 2853.0ms | 131.7ms | 1085.3ms | 2799.8ms | 74.2ms | 79.3ms | 82.2ms | first byte / server queue dominates |
| popular_guest_feed_page | 633 | 208.0ms | 1087.3ms | 2624.4ms | 141.0ms | 1044.1ms | 2582.2ms | 71.8ms | 80.2ms | 81.8ms | first byte / server queue dominates |
| lost_found_page | 676 | 196.9ms | 1018.4ms | 2895.2ms | 131.8ms | 983.5ms | 2832.1ms | 72.1ms | 79.6ms | 88.1ms | first byte / server queue dominates |
| guest_feed_api | 1352 | 136.3ms | 710.5ms | 2728.1ms | 136.2ms | 710.5ms | 2728.1ms | 0.1ms | 0.1ms | 3.0ms | first byte / server queue dominates |
| home_feed_api | 670 | 113.6ms | 440.3ms | 2732.6ms | 113.5ms | 440.2ms | 2732.6ms | 0.1ms | 0.2ms | 0.3ms | first byte / server queue dominates |

## Interpretation

- The p99 spike is mostly present before or at first byte, not in body transfer. For all hot paths, `header p99` is close to `total p99`.
- Page route body p99 is small relative to total p99: `/` body p99 is below the total spike by a wide margin, and `/feed/guest` behaves similarly.
- This points away from large response body transfer as the primary cause. It points toward local server queueing, route render scheduling, or first-byte work under concurrency 100.
- API routes also show header-led spikes, which supports the queueing hypothesis more than a single page component bottleneck.

## Next Work

- Add a targeted route timing check for `/`, `/feed/guest`, and `/api/feed/guest` that records first-byte p99 under spike separately from full body p99 in future runs.
- If code tuning is needed, inspect page route static/dynamic status, middleware/header work, and first-byte work before touching database indexes.
- Run the same phase-aware spike once after this script change to confirm the summary fields are emitted directly by `perf:traffic`.
