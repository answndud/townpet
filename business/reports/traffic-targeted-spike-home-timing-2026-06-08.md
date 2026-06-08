# targeted spike 홈 timing 리포트

- 작성일: `2026-06-08`
- 기준 URL: `http://localhost:3000`
- 서버: `next build` + `next start`
- 프로파일: `spike`
- 동시성: `100`
- load 요청 수: `5000`
- 측정 대상: `home`, `home_feed_api`, `guest_feed_page`, `guest_feed_api`
- 원본 파일: `docs/reports/traffic-targeted-spike-local-2026-06-08.json`

## 실행 명령

```bash
PERF_TRAFFIC_PROFILE=spike \
PERF_TRAFFIC_TARGETS=home,home_feed_api,guest_feed_page,guest_feed_api \
PERF_TRAFFIC_BASE_URL=http://localhost:3000 \
PERF_TRAFFIC_OUT=../docs/reports/traffic-targeted-spike-local-2026-06-08.md \
PERF_TRAFFIC_JSON_OUT=../docs/reports/traffic-targeted-spike-local-2026-06-08.json \
corepack pnpm@9.12.3 -C app perf:traffic
```

## 부하 구간 요약

| 대상 | 요청 수 | 오류율 | 전체 p50 | 전체 p95 | 전체 p99 | 전체 최대 | 헤더 p99 | 본문 p99 | Server-Timing p95 | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| home | 916 | 0.00% | 208ms | 372ms | 544ms | 2194ms | 356ms | 203ms | - | PASS |
| guest_feed_page | 1393 | 0.00% | 203ms | 354ms | 538ms | 2201ms | 355ms | 198ms | - | PASS |
| home_feed_api | 942 | 0.00% | 102ms | 194ms | 290ms | 1919ms | 289ms | 0ms | `home_feed_query=1ms; home_list_posts=0ms; home_policy_query=0ms; total=1ms` | PASS |
| guest_feed_api | 1749 | 0.00% | 135ms | 281ms | 373ms | 1866ms | 373ms | 0ms | `bootstrap.policy=0ms; page_query.all=1ms; total=1ms` | PASS |

## 홈 피드 내부 phase

| phase | p50 | p95 | p99 | 최대 |
| --- | ---: | ---: | ---: | ---: |
| home_feed_query | 0.3ms | 0.6ms | 1.1ms | 7.7ms |
| home_list_posts | 0.2ms | 0.4ms | 0.7ms | 6.7ms |
| home_policy_query | 0.0ms | 0.0ms | 0.1ms | 1.9ms |
| home_serialize_featured | 0.1ms | 0.1ms | 0.2ms | 1.9ms |
| home_serialize_latest | 0.0ms | 0.0ms | 0.0ms | 0.2ms |
| rate_limit | 0.0ms | 0.0ms | 0.0ms | 0.1ms |
| total | 0.4ms | 0.6ms | 1.2ms | 7.7ms |

## 게스트 피드 API 내부 phase

| phase | p50 | p95 | p99 | 최대 |
| --- | ---: | ---: | ---: | ---: |
| bootstrap.policy | 0.0ms | 0.0ms | 1.0ms | 1.0ms |
| page_query.all | 0.0ms | 1.0ms | 1.0ms | 19.0ms |
| total | 0.0ms | 1.0ms | 2.0ms | 23.0ms |

## 해석

- `home_feed_api`와 `guest_feed_api` 모두 내부 `Server-Timing` p99가 매우 낮다. 같은 요청의 외부 header p99가 수백 ms까지 올라가므로, 이번 spike에서 DB query나 serialization이 1차 병목이라는 가설은 약하다.
- `/`와 `/feed/guest` page route는 API보다 body p99가 크다. `home` body p99는 `203ms`, `guest_feed_page` body p99는 `198ms`였다.
- page route의 전체 p99는 이전 전체 hot path spike보다 낮아졌다. 이전 `home` p99는 `1320ms`, 이번 targeted run은 `544ms`다. target 수를 줄이면 queueing noise가 줄어드는 것으로 보인다.
- 모든 경로는 `0%` 오류율과 `PASS`를 유지했다. 기능적 가용성은 깨지지 않았다.

## 결론

다음 튜닝은 DB index나 home feed query가 아니라 page route HTML/RSC payload, static page body 전송, middleware/security header 공통 비용, 로컬 Next 서버 queueing 분리로 넘어가는 것이 맞다.

## 다음 후보

1. `/`와 `/feed/guest`의 HTML/RSC payload 크기와 body p99 관계를 확인한다.
2. middleware가 적용되지 않거나 최소화된 정적 비교 route를 만들어 queueing과 middleware overhead를 분리한다.
3. production/preview는 heavy spike가 아니라 `baseline`/저강도 targeted run만 실행해 로컬 queueing 현상과 실제 배포 현상을 구분한다.
