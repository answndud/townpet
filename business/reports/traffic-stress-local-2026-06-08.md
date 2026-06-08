# Local Traffic Stress Summary

- generatedAt: `2026-06-08`
- baseUrl: `http://localhost:3000`
- server: `next build` + `next start`
- profile: `stress`
- durationMs: `120000`
- concurrency: `30`
- maxRequests: `10000` load phase cap
- actual loadRequests: `10000`
- targets: `home`, `guest_feed_page`, `popular_guest_feed_page`, `lost_found_page`, `guest_feed_api`, `home_feed_api`
- excluded: `health` because local production health is degraded by missing operation secrets, while app hot path DB/cache behavior is usable.

## Summary

| target | requests | rps | error | p50 | p95 | p99 | max | goal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| home | 1267 | 10.56 | 0.00% | 42.2ms | 83.8ms | 109.5ms | 446.6ms | PASS |
| popular_guest_feed_page | 1274 | 10.62 | 0.00% | 41.8ms | 79.9ms | 109.3ms | 350.8ms | PASS |
| lost_found_page | 1369 | 11.41 | 0.00% | 42.5ms | 85.1ms | 109.1ms | 388.1ms | PASS |
| guest_feed_page | 2078 | 17.32 | 0.00% | 41.6ms | 79.9ms | 105.5ms | 429.9ms | PASS |
| guest_feed_api | 2678 | 22.32 | 0.00% | 28.8ms | 56.1ms | 76.0ms | 213.3ms | PASS |
| home_feed_api | 1334 | 11.12 | 0.00% | 21.2ms | 41.4ms | 61.1ms | 427.5ms | PASS |

## Interpretation

- Stress profile still did not break the hot paths: every target returned `200`, `0%` error, and `PASS`.
- The highest p99 routes are page routes, not API routes: `home`, `popular_guest_feed_page`, `lost_found_page`, and `guest_feed_page` are all around `105-110ms` p99.
- The largest max spikes happened during the first saturated wave: `home` `446.6ms`, `guest_feed_page` `429.9ms`, `home_feed_api` `427.5ms`, `lost_found_page` `388.1ms`.
- API steady-state remains lighter: `guest_feed_api` p99 `76.0ms`, `home_feed_api` p99 `61.1ms`.
- Current local stress does not justify query/index tuning yet. The next useful step is a short `spike` profile to see whether concurrency 100 creates failures, queueing, or page render tail amplification.

## Bottleneck Candidate

- Primary candidate: page route render/HTML transfer tail under saturation, especially `home` and `lost_found_page`.
- Secondary candidate: initial saturated wave queueing, because max spikes cluster at the beginning while p95/p99 stay healthy.
- Not currently a candidate: guest feed API query path. It is stable enough under this local stress run.

## Next Measurement

```bash
PERF_TRAFFIC_PROFILE=spike PERF_TRAFFIC_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app perf:traffic
```
