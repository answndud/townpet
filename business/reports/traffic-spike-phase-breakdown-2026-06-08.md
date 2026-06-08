# spike phase 분해 리포트

- 생성일: `2026-06-08`
- 원본 데이터: `docs/reports/traffic-spike-local-2026-06-08.json`
- 프로파일: `spike`
- 기준 URL: `http://localhost:3000`
- 동시성: `100`
- load 요청 수: `5000`

## phase 요약

| 대상 | 요청 수 | 전체 p95 | 전체 p99 | 전체 최대 | 헤더 p95 | 헤더 p99 | 헤더 최대 | 본문 p95 | 본문 p99 | 본문 최대 | 판독 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| home | 684 | 201.2ms | 1320.1ms | 2722.5ms | 131.4ms | 1280.9ms | 2669.9ms | 75.3ms | 81.6ms | 84.3ms | first-byte/서버 queueing 우세 |
| guest_feed_page | 985 | 196.3ms | 1111.5ms | 2853.0ms | 131.7ms | 1085.3ms | 2799.8ms | 74.2ms | 79.3ms | 82.2ms | first-byte/서버 queueing 우세 |
| popular_guest_feed_page | 633 | 208.0ms | 1087.3ms | 2624.4ms | 141.0ms | 1044.1ms | 2582.2ms | 71.8ms | 80.2ms | 81.8ms | first-byte/서버 queueing 우세 |
| lost_found_page | 676 | 196.9ms | 1018.4ms | 2895.2ms | 131.8ms | 983.5ms | 2832.1ms | 72.1ms | 79.6ms | 88.1ms | first-byte/서버 queueing 우세 |
| guest_feed_api | 1352 | 136.3ms | 710.5ms | 2728.1ms | 136.2ms | 710.5ms | 2728.1ms | 0.1ms | 0.1ms | 3.0ms | first-byte/서버 queueing 우세 |
| home_feed_api | 670 | 113.6ms | 440.3ms | 2732.6ms | 113.5ms | 440.2ms | 2732.6ms | 0.1ms | 0.2ms | 0.3ms | first-byte/서버 queueing 우세 |

## 해석

- p99 spike는 본문 전송이 아니라 첫 바이트 전후 구간에 집중되어 있다. 모든 hot path에서 `헤더 p99`가 `전체 p99`와 거의 같다.
- page route의 본문 p99는 전체 p99 대비 작다. `/`의 본문 p99는 `81.6ms`, `/feed/guest`의 본문 p99는 `79.3ms`에 머물렀다.
- 따라서 큰 response body 전송이 1차 원인이라는 가설은 약하다. 로컬 서버 queueing, route render scheduling, first-byte work를 먼저 봐야 한다.
- API route도 header-led spike를 보였기 때문에 단일 page component 병목보다 queueing 가설이 더 강하다.

## 다음 작업

- `/`, `/feed/guest`, `/api/feed/guest`의 first-byte p99와 전체 body p99를 이후 실행에서 항상 함께 기록한다.
- 코드 튜닝이 필요하면 DB index보다 page route static/dynamic 상태, middleware/header work, first-byte work를 먼저 점검한다.
- phase-aware spike는 이미 `perf:traffic` 요약 필드로 직접 출력되도록 확장했으므로, 다음 재측정부터 별도 후처리 없이 비교할 수 있다.
