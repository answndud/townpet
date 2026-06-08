# Local Traffic Baseline Summary

- generatedAt: `2026-06-08`
- baseUrl: `http://localhost:3000`
- server: `next build` + `next start`
- profile: `baseline`
- runs: `3`
- targets: `home`, `guest_feed_page`, `popular_guest_feed_page`, `lost_found_page`, `guest_feed_api`, `home_feed_api`
- excluded: `health` because local production health was degraded by missing local-only operation secrets, while database/cache/rate-limit checks were usable for app hot path measurement.

## Run Results

### Run 1

| target | requests | error | p50 | p95 | p99 | max | goal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| guest_feed_api | 330 | 0.00% | 8.4ms | 19.8ms | 49.5ms | 54.8ms | PASS |
| guest_feed_page | 237 | 0.00% | 7.3ms | 17.4ms | 30.1ms | 51.2ms | PASS |
| home | 171 | 0.00% | 8.3ms | 17.2ms | 30.6ms | 51.4ms | PASS |
| home_feed_api | 149 | 0.00% | 4.3ms | 12.1ms | 27.7ms | 37.6ms | PASS |
| lost_found_page | 158 | 0.00% | 7.3ms | 15.4ms | 26.4ms | 33.5ms | PASS |
| popular_guest_feed_page | 155 | 0.00% | 7.8ms | 16.7ms | 26.4ms | 33.3ms | PASS |

### Run 2

| target | requests | error | p50 | p95 | p99 | max | goal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| guest_feed_api | 315 | 0.00% | 6.4ms | 14.4ms | 26.3ms | 92.3ms | PASS |
| guest_feed_page | 237 | 0.00% | 5.6ms | 14.9ms | 31.1ms | 85.5ms | PASS |
| home | 152 | 0.00% | 5.7ms | 14.0ms | 23.6ms | 27.5ms | PASS |
| home_feed_api | 158 | 0.00% | 3.5ms | 8.7ms | 10.2ms | 32.9ms | PASS |
| lost_found_page | 163 | 0.00% | 6.7ms | 14.8ms | 32.7ms | 85.7ms | PASS |
| popular_guest_feed_page | 175 | 0.00% | 5.9ms | 13.4ms | 32.3ms | 85.3ms | PASS |

### Run 3

| target | requests | error | p50 | p95 | p99 | max | goal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| guest_feed_api | 321 | 0.00% | 8.5ms | 16.4ms | 34.6ms | 61.4ms | PASS |
| guest_feed_page | 237 | 0.00% | 8.1ms | 16.2ms | 39.6ms | 65.3ms | PASS |
| home | 151 | 0.00% | 8.5ms | 15.9ms | 39.3ms | 41.6ms | PASS |
| home_feed_api | 160 | 0.00% | 4.6ms | 9.9ms | 15.5ms | 28.5ms | PASS |
| lost_found_page | 165 | 0.00% | 8.8ms | 17.2ms | 62.8ms | 63.2ms | PASS |
| popular_guest_feed_page | 166 | 0.00% | 6.9ms | 18.2ms | 62.2ms | 67.9ms | PASS |

## Cross-run View

| target | p95 range | p99 range | max range | error | interpretation |
| --- | ---: | ---: | ---: | ---: | --- |
| guest_feed_api | 14.4-19.8ms | 26.3-49.5ms | 54.8-92.3ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |
| guest_feed_page | 14.9-17.4ms | 30.1-39.6ms | 51.2-85.5ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |
| home | 14.0-17.2ms | 23.6-39.3ms | 27.5-51.4ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |
| home_feed_api | 8.7-12.1ms | 10.2-27.7ms | 28.5-37.6ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |
| lost_found_page | 14.8-17.2ms | 26.4-62.8ms | 33.5-85.7ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |
| popular_guest_feed_page | 13.4-18.2ms | 26.4-62.2ms | 33.3-85.3ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |

## Decision

- Local baseline did not expose a hot path failure. Every measured route stayed below `100ms` p99 and `0%` error across three runs.
- The highest local p99 values were page routes: `lost_found_page` at `62.8ms`, `popular_guest_feed_page` at `62.2ms`, and `guest_feed_page` at `39.6ms`.
- API routes were stable under this load. `guest_feed_api` peaked at `49.5ms` p99 and `home_feed_api` peaked at `27.7ms` p99.
- The next useful measurement is not another baseline. Move to local `stress` and then remote preview/production baseline with explicit ACK.

## Next Measurement

```bash
PERF_TRAFFIC_PROFILE=stress PERF_TRAFFIC_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app perf:traffic
```
