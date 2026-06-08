# 로컬 트래픽 stress 요약

- 생성일: `2026-06-08`
- 기준 URL: `http://localhost:3000`
- 서버: `next build` + `next start`
- 프로파일: `stress`
- 측정 시간(ms): `120000`
- 동시성: `30`
- 최대 요청 수: `10000` load 구간 기준
- 실제 load 요청 수: `10000`
- 측정 대상: `home`, `guest_feed_page`, `popular_guest_feed_page`, `lost_found_page`, `guest_feed_api`, `home_feed_api`
- 제외 대상: `health`
  - 이유: 로컬 production health는 운영 secret 누락 때문에 degraded가 될 수 있지만, 앱 hot path의 DB/cache 동작은 측정 가능했다.

## 요약

| 대상 | 요청 수 | RPS | 오류율 | p50 | p95 | p99 | 최대 | 목표 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| home | 1267 | 10.56 | 0.00% | 42.2ms | 83.8ms | 109.5ms | 446.6ms | PASS |
| popular_guest_feed_page | 1274 | 10.62 | 0.00% | 41.8ms | 79.9ms | 109.3ms | 350.8ms | PASS |
| lost_found_page | 1369 | 11.41 | 0.00% | 42.5ms | 85.1ms | 109.1ms | 388.1ms | PASS |
| guest_feed_page | 2078 | 17.32 | 0.00% | 41.6ms | 79.9ms | 105.5ms | 429.9ms | PASS |
| guest_feed_api | 2678 | 22.32 | 0.00% | 28.8ms | 56.1ms | 76.0ms | 213.3ms | PASS |
| home_feed_api | 1334 | 11.12 | 0.00% | 21.2ms | 41.4ms | 61.1ms | 427.5ms | PASS |

## 해석

- stress 프로파일에서도 hot path는 깨지지 않았다. 모든 대상이 `200`, 오류율 `0%`, 목표 `PASS`였다.
- p99가 가장 높은 경로는 API가 아니라 page route였다. `home`, `popular_guest_feed_page`, `lost_found_page`, `guest_feed_page`가 모두 약 `105-110ms` p99에 모였다.
- 가장 큰 최대값 spike는 초기 포화 구간에 몰렸다. `home` `446.6ms`, `guest_feed_page` `429.9ms`, `home_feed_api` `427.5ms`, `lost_found_page` `388.1ms`였다.
- API steady-state는 더 가벼웠다. `guest_feed_api` p99 `76.0ms`, `home_feed_api` p99 `61.1ms`였다.
- 이 결과만으로는 query/index 튜닝을 시작할 근거가 부족하다. 다음은 짧은 `spike` 프로파일로 동시성 100에서 queueing이나 page render tail 증폭이 생기는지 확인하는 것이 맞다.

## 병목 후보

- 1순위: 포화 상태의 page route render 또는 HTML first-byte tail. 특히 `home`, `lost_found_page`를 본다.
- 2순위: 초기 포화 wave의 로컬 Node/Next 서버 queueing. p95/p99는 안정적인데 최대값이 시작 구간에 몰리는 패턴이다.
- 현재 1순위가 아닌 것: guest feed API query path. local stress에서는 충분히 안정적이었다.

## 다음 측정

```bash
PERF_TRAFFIC_PROFILE=spike PERF_TRAFFIC_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app perf:traffic
```
