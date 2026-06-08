# Local Traffic Spike Summary

- generatedAt: `2026-06-08`
- baseUrl: `http://localhost:3000`
- server: `next build` + `next start`
- profile: `spike`
- durationMs: `15000`
- concurrency: `100`
- maxRequests: `5000` load phase cap
- actual loadRequests: `5000`
- targets: `home`, `guest_feed_page`, `popular_guest_feed_page`, `lost_found_page`, `guest_feed_api`, `home_feed_api`
- excluded: `health` because local production health is degraded by missing operation secrets, while app hot path DB/cache behavior is usable.

## Summary

| target | requests | rps | error | p50 | p95 | p99 | max | goal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| home | 684 | 45.60 | 0.00% | 133.0ms | 201.2ms | 1320.1ms | 2722.5ms | PASS |
| guest_feed_page | 985 | 65.67 | 0.00% | 132.4ms | 196.3ms | 1111.5ms | 2853.0ms | PASS |
| popular_guest_feed_page | 633 | 42.20 | 0.00% | 133.6ms | 208.0ms | 1087.3ms | 2624.4ms | PASS |
| lost_found_page | 676 | 45.07 | 0.00% | 132.4ms | 196.9ms | 1018.4ms | 2895.2ms | PASS |
| guest_feed_api | 1352 | 90.13 | 0.00% | 89.4ms | 136.3ms | 710.5ms | 2728.1ms | PASS |
| home_feed_api | 670 | 44.67 | 0.00% | 64.3ms | 113.6ms | 440.3ms | 2732.6ms | PASS |

## Stress vs Spike

| target | stress p99 | spike p99 | amplification | spike max | interpretation |
| --- | ---: | ---: | ---: | ---: | --- |
| home | 109.5ms | 1320.1ms | 12.1x | 2722.5ms | 순간 concurrency에서 tail이 1초대로 증폭된다. |
| guest_feed_page | 105.5ms | 1111.5ms | 10.5x | 2853.0ms | 순간 concurrency에서 tail이 1초대로 증폭된다. |
| popular_guest_feed_page | 109.3ms | 1087.3ms | 9.9x | 2624.4ms | 순간 concurrency에서 tail이 1초대로 증폭된다. |
| lost_found_page | 109.1ms | 1018.4ms | 9.3x | 2895.2ms | 순간 concurrency에서 tail이 1초대로 증폭된다. |
| guest_feed_api | 76.0ms | 710.5ms | 9.3x | 2728.1ms | 증폭은 있으나 아직 1초 미만이다. |
| home_feed_api | 61.1ms | 440.3ms | 7.2x | 2732.6ms | 증폭은 있으나 아직 1초 미만이다. |

## Interpretation

- Spike profile still returned `200` for every request and kept `0%` error, so functional availability did not break.
- However p99 changed materially: page routes crossed `1s` p99 under concurrency 100, while API routes stayed lower except max outliers.
- `home` is the highest p99 route at `1320.1ms`; `guest_feed_page`, `popular_guest_feed_page`, and `lost_found_page` are also around `1.0-1.1s`.
- `guest_feed_api` is not the first bottleneck: p99 `710.5ms` under spike and `0%` error.
- Because header p95 is much lower than total max/p99 for page routes, the next investigation should split HTML render, body transfer, and server process queueing instead of adding DB indexes blindly.

## Bottleneck Candidate

- Primary: page route tail amplification under concurrency 100, especially `/` and `/feed/guest`.
- Secondary: local Node/Next server queueing during the initial saturated wave.
- Not proven: database query saturation. API p95 remains under `140ms` for `guest_feed_api` and under `115ms` for `home_feed_api`.

## Next Work

- Add phase-level timing to page routes or extend the traffic report to compare header time vs body time per route.
- Then inspect `/` and `/feed/guest` page payload/render path before changing indexes.
