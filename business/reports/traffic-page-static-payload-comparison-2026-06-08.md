# page payload와 static probe 비교 리포트

- 작성일: 2026-06-08
- 기준 환경: local production (`next build` 후 `next start`)
- 목적: `/`, `/feed/guest`의 page route 비용을 middleware가 적용되지 않는 정적 probe와 비교해, spike tail latency가 앱 렌더링/DB/query 문제인지 아니면 로컬 HTTP queueing과 payload 전송 문제인지 분리한다.

## 실행 명령

```bash
PERF_BASE_URL=http://localhost:3000 \
PERF_ASSET_TARGETS=home,guest_feed,static_probe \
PERF_ASSET_PROFILES=desktop,mobile \
PERF_ASSET_SETTLE_MS=1200 \
PERF_ASSET_OUT=../docs/reports/route-assets-page-static-local-2026-06-08.md \
PERF_ASSET_JSON_OUT=../docs/reports/route-assets-page-static-local-2026-06-08.json \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
corepack pnpm@9.12.3 -C app perf:assets:local
```

```bash
PERF_TRAFFIC_PROFILE=spike \
PERF_TRAFFIC_TARGETS=home,guest_feed_page,static_probe \
PERF_TRAFFIC_BASE_URL=http://localhost:3000 \
PERF_TRAFFIC_OUT=../docs/reports/traffic-page-static-spike-local-2026-06-08.md \
PERF_TRAFFIC_JSON_OUT=../docs/reports/traffic-page-static-spike-local-2026-06-08.json \
corepack pnpm@9.12.3 -C app perf:traffic
```

## 정적 probe 기준

`/perf-static-baseline.txt`를 추가해 정적 파일 경로의 최소 비용을 측정했다. 현재 middleware matcher는 `.txt` 파일을 제외하므로 이 probe는 앱 page render, DB query, feed serializer, middleware/security header 경로를 통과하지 않는 비교 기준이다.

따라서 이 probe에서도 spike p99가 올라가면, 해당 구간은 앱 코드 최적화만으로 없앨 수 있는 비용이 아니라 로컬 `next start` 프로세스, Node HTTP 처리, 커넥션 queueing, 측정 클라이언트 부하가 섞인 baseline tail로 해석한다.

## route asset snapshot

| profile | route | 문서 크기 | document response end | FCP | LCP | script | fetch | 총 전송량 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | `/` | 41,272 B | 58.3 ms | 140 ms | 140 ms | 173,327 B / 12개 | 0 B / 0개 | 204,709 B |
| desktop | `/feed/guest` | 26,845 B | 20.3 ms | 76 ms | 76 ms | 256,112 B / 15개 | 17,110 B / 3개 | 305,592 B |
| desktop | `/perf-static-baseline.txt` | 270 B | 2.1 ms | 28 ms | 28 ms | 0 B / 0개 | 0 B / 0개 | 0 B |
| mobile | `/` | 41,272 B | 6.5 ms | 68 ms | 68 ms | 173,327 B / 12개 | 0 B / 0개 | 204,709 B |
| mobile | `/feed/guest` | 26,845 B | 5.0 ms | 40 ms | 40 ms | 256,112 B / 15개 | 17,110 B / 3개 | 305,592 B |
| mobile | `/perf-static-baseline.txt` | 270 B | 1.8 ms | 28 ms | 28 ms | 0 B / 0개 | 0 B / 0개 | 0 B |

해석:

- `/`는 문서 자체가 41KB로 `/feed/guest`보다 크다. 홈 랜딩의 server-rendered HTML/RSC payload를 줄일 후보가 있다.
- `/feed/guest`는 문서 크기는 27KB 수준이지만 script transfer가 256KB로 가장 크다. 피드 컨트롤, infinite list, client component 경계를 줄이는 것이 브라우저 초기 비용 후보다.
- 정적 probe는 문서 270B이고 script/fetch가 없다. page route와 비교할 수 있는 최소 baseline으로 충분히 작다.

## spike traffic 비교

프로필: `spike`, duration 15초, concurrency 100, maxRequests 5,000.

| route | 요청 | 실패율 | p50 | p95 | p99 | max | header p99 | body p99 | p50 bytes | 목표 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `/feed/guest` | 2,480 | 0% | 72.3 ms | 173.2 ms | 273.2 ms | 594.9 ms | 190.1 ms | 95.1 ms | 26,845 B | PASS |
| `/` | 1,667 | 0% | 71.8 ms | 133.7 ms | 251.9 ms | 423.9 ms | 190.5 ms | 98.6 ms | 41,272 B | PASS |
| `/perf-static-baseline.txt` | 853 | 0% | 90.1 ms | 174.8 ms | 322.0 ms | 389.0 ms | 322.0 ms | 0.09 ms | 270 B | PASS |

## 결론

1. `home_feed_api` 내부 DB/query phase는 이전 targeted spike에서 p99가 약 1.2ms였으므로 현재 page route tail의 주범으로 보기 어렵다.
2. 정적 probe의 body p99는 0.09ms인데 header p99는 322ms다. 즉 concurrency 100 spike에서는 앱 렌더링 이전의 로컬 HTTP/proc queueing이 tail latency에 크게 섞인다.
3. `/`와 `/feed/guest`의 header p99는 약 190ms로 static probe보다 낮지만, body p99가 약 95~99ms 추가된다. page route의 남은 최적화 후보는 first-byte보다 문서/RSC 전송과 client asset이다.
4. `/feed/guest`는 총 전송량 306KB, script 256KB로 가장 크다. UX 변경 없이 줄이려면 피드 컨트롤/리스트 client boundary와 search/filter client bundle을 먼저 본다.
5. `/`는 script는 상대적으로 작지만 문서 41KB다. 홈에서 server-rendered preview와 footer/section markup이 실제 전환에 필요한 만큼만 들어가는지 점검할 가치가 있다.

## 다음 병목 후보

- `/feed/guest` client bundle 상위 chunk가 어느 컴포넌트 경계에서 붙는지 bundle analyzer 또는 chunk import 추적으로 확인한다.
- `/` 문서 크기 41KB를 구성하는 server-rendered preview/section/footer markup을 줄일 수 있는지 점검한다.
- static probe가 spike에서 header p99 322ms를 보인 만큼, local `next start` spike 수치는 production latency 목표가 아니라 상대 비교용으로만 사용한다.
- 실제 배포 성능 목표는 Vercel 과부하를 피하는 저강도 smoke와 WebPageTest/Lighthouse류 browser metric으로 별도 확인한다.
