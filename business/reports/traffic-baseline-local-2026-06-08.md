# 로컬 트래픽 baseline 요약

- 생성일: `2026-06-08`
- 기준 URL: `http://localhost:3000`
- 서버: `next build` + `next start`
- 프로파일: `baseline`
- 반복 횟수: `3`
- 측정 대상: `home`, `guest_feed_page`, `popular_guest_feed_page`, `lost_found_page`, `guest_feed_api`, `home_feed_api`
- 제외 대상: `health`
  - 이유: 로컬 production health는 운영 secret 누락 때문에 degraded가 될 수 있지만, 앱 hot path의 DB/cache/rate-limit 동작 측정에는 문제가 없었다.

## 실행 결과

### 1회차

| 대상 | 요청 수 | 오류율 | p50 | p95 | p99 | 최대 | 목표 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| guest_feed_api | 330 | 0.00% | 8.4ms | 19.8ms | 49.5ms | 54.8ms | PASS |
| guest_feed_page | 237 | 0.00% | 7.3ms | 17.4ms | 30.1ms | 51.2ms | PASS |
| home | 171 | 0.00% | 8.3ms | 17.2ms | 30.6ms | 51.4ms | PASS |
| home_feed_api | 149 | 0.00% | 4.3ms | 12.1ms | 27.7ms | 37.6ms | PASS |
| lost_found_page | 158 | 0.00% | 7.3ms | 15.4ms | 26.4ms | 33.5ms | PASS |
| popular_guest_feed_page | 155 | 0.00% | 7.8ms | 16.7ms | 26.4ms | 33.3ms | PASS |

### 2회차

| 대상 | 요청 수 | 오류율 | p50 | p95 | p99 | 최대 | 목표 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| guest_feed_api | 315 | 0.00% | 6.4ms | 14.4ms | 26.3ms | 92.3ms | PASS |
| guest_feed_page | 237 | 0.00% | 5.6ms | 14.9ms | 31.1ms | 85.5ms | PASS |
| home | 152 | 0.00% | 5.7ms | 14.0ms | 23.6ms | 27.5ms | PASS |
| home_feed_api | 158 | 0.00% | 3.5ms | 8.7ms | 10.2ms | 32.9ms | PASS |
| lost_found_page | 163 | 0.00% | 6.7ms | 14.8ms | 32.7ms | 85.7ms | PASS |
| popular_guest_feed_page | 175 | 0.00% | 5.9ms | 13.4ms | 32.3ms | 85.3ms | PASS |

### 3회차

| 대상 | 요청 수 | 오류율 | p50 | p95 | p99 | 최대 | 목표 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| guest_feed_api | 321 | 0.00% | 8.5ms | 16.4ms | 34.6ms | 61.4ms | PASS |
| guest_feed_page | 237 | 0.00% | 8.1ms | 16.2ms | 39.6ms | 65.3ms | PASS |
| home | 151 | 0.00% | 8.5ms | 15.9ms | 39.3ms | 41.6ms | PASS |
| home_feed_api | 160 | 0.00% | 4.6ms | 9.9ms | 15.5ms | 28.5ms | PASS |
| lost_found_page | 165 | 0.00% | 8.8ms | 17.2ms | 62.8ms | 63.2ms | PASS |
| popular_guest_feed_page | 166 | 0.00% | 6.9ms | 18.2ms | 62.2ms | 67.9ms | PASS |

## 반복 실행 비교

| 대상 | p95 범위 | p99 범위 | 최대 범위 | 오류율 | 해석 |
| --- | ---: | ---: | ---: | ---: | --- |
| guest_feed_api | 14.4-19.8ms | 26.3-49.5ms | 54.8-92.3ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |
| guest_feed_page | 14.9-17.4ms | 30.1-39.6ms | 51.2-85.5ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |
| home | 14.0-17.2ms | 23.6-39.3ms | 27.5-51.4ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |
| home_feed_api | 8.7-12.1ms | 10.2-27.7ms | 28.5-37.6ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |
| lost_found_page | 14.8-17.2ms | 26.4-62.8ms | 33.5-85.7ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |
| popular_guest_feed_page | 13.4-18.2ms | 26.4-62.2ms | 33.3-85.3ms | 0.00% | baseline에서는 안정적이다. stress/spike로 올려야 한계가 보인다. |

## 판단

- 로컬 baseline에서는 hot path 실패가 드러나지 않았다. 세 번의 반복 실행 모두 p99가 `100ms` 아래였고 오류율은 `0%`였다.
- 가장 높은 p99는 page route였다. `lost_found_page` `62.8ms`, `popular_guest_feed_page` `62.2ms`, `guest_feed_page` `39.6ms` 순서였다.
- API route는 같은 부하에서 안정적이었다. `guest_feed_api` p99 최대 `49.5ms`, `home_feed_api` p99 최대 `27.7ms`였다.
- 다음 측정은 baseline 반복이 아니라 local `stress`로 올려야 의미가 있다.

## 다음 측정

```bash
PERF_TRAFFIC_PROFILE=stress PERF_TRAFFIC_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app perf:traffic
```
