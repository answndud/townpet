# TownPet 성능 Budget

마지막 갱신: `2026-06-06`

이 문서는 1인 운영 기준의 on-demand 성능 점검선이다. 매 배포마다 강제하지 않고, 홈/피드/로그인/상세 성능을 건드렸을 때만 실행한다.

## 측정 대상

- `/`
- `/login`
- `/feed/guest`
- 대표 public 게시글 상세
- `/api/health`
- `/api/home/feed`
- `/api/feed/guest`

## Budget

모바일 기준:

| route | LCP 목표 | total transfer | script transfer | fetch transfer |
| --- | ---: | ---: | ---: | ---: |
| `/` | `<= 500ms` local, `<= 1500ms` production | `<= 250KB` | `<= 180KB` | `<= 10KB` |
| `/login` | `<= 700ms` local, `<= 1800ms` production | `<= 280KB` | `<= 180KB` | `<= 30KB` |
| `/feed/guest` | `<= 700ms` local, `<= 1800ms` production | `<= 300KB` | `<= 190KB` | `<= 40KB` |

API local production 기준:

| endpoint | p50 | p95 | phase note |
| --- | ---: | ---: | --- |
| `/api/health?perf=1` | `<= 150ms` | `<= 700ms` | `health_snapshot`이 대부분을 차지해야 한다. |
| `/api/home/feed?perf=1` | `<= 50ms` | `<= 250ms` | cold `home_feed_query` outlier는 허용하되 반복되면 query/cache 점검. |
| `/api/feed/guest?perf=1` | `<= 50ms` | `<= 100ms` | 기본 요청은 `bootstrap.policy` + `page_query.all` 중심이어야 한다. |

## 측정 명령

production baseline:

```bash
PERF_POST_PATH=/posts/<public-post-id>/guest PERF_SAMPLES=5 PERF_PAUSE_MS=150 PERF_SLOW_THRESHOLD_MS=1000 pnpm -C app perf:baseline
```

public detail outlier만 분리 관찰:

```bash
PERF_TARGETS=post_detail PERF_POST_PATH=/posts/<public-post-id>/guest PERF_SAMPLES=10 PERF_PAUSE_MS=200 PERF_SLOW_THRESHOLD_MS=1000 pnpm -C app perf:baseline
```

browser paint:

```bash
PERF_POST_PATH=/posts/<public-post-id>/guest PERF_BROWSER_SAMPLES=2 PERF_BROWSER_SETTLE_MS=1500 PERF_BROWSER_PROFILES=desktop,mobile PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers pnpm -C app perf:browser:local
```

route asset:

```bash
PERF_BASE_URL=http://localhost:3000 PERF_ASSET_SETTLE_MS=1200 PERF_ASSET_PROFILES=mobile PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers pnpm -C app perf:assets:local
```

API phase timing:

```bash
PERF_BASE_URL=http://localhost:3000 PERF_API_TIMING_SAMPLES=5 PERF_API_TIMING_PAUSE_MS=150 pnpm -C app perf:api-timings
```

Web Vitals summary:

```bash
pnpm -C app perf:web-vitals
```

## 현재 기준선

2026-05-30 local production after snapshot:

| route | scripts | script transfer | CSS transfer | fetch transfer | total transfer |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | `11` | `161KB` | `37KB` | `0KB` | `198KB` |
| `/login` | `12` | `167KB` | `37KB` | `16KB` | `220KB` |
| `/feed/guest` | `12` | `174KB` | `37KB` | `17KB` | `230KB` |

관련 evidence:

- [performance-route-assets-2026-05-30T06-44-10-663Z.md](../../docs/reports/performance-route-assets-2026-05-30T06-44-10-663Z.md)
- [performance-route-assets-2026-05-30T06-51-31-430Z.md](../../docs/reports/performance-route-assets-2026-05-30T06-51-31-430Z.md)
- [performance-route-assets-2026-05-30T07-06-48-043Z.md](../../docs/reports/performance-route-assets-2026-05-30T07-06-48-043Z.md)
- [api-route-timings-2026-05-30T07-03-05-839Z.md](../../docs/reports/api-route-timings-2026-05-30T07-03-05-839Z.md)

## 최신 production 재측정

2026-06-06 production recheck:

| route | mobile LCP p50 | mobile LCP p95 | mobile total transfer | 판단 |
| --- | ---: | ---: | ---: | --- |
| `/` | `244ms` | `856ms` | `204KB` | OK |
| `/login` | `292ms` | `472ms` | `225KB` | OK |
| `/feed/guest` | `188ms` | `196ms` | `244KB` | OK |
| public detail | `660ms` | `660ms` | `241KB` | OK |

Server fetch 8회 재확인:

| target | p50 total | p95 total | slow >= 1000ms |
| --- | ---: | ---: | ---: |
| `/` | `108ms` | `610ms` | `0` |
| `/feed/guest` | `110ms` | `245ms` | `0` |
| `/api/home/feed` | `106ms` | `136ms` | `0` |
| `/api/feed/guest?limit=20` | `109ms` | `192ms` | `0` |
| public detail | `233ms` | `414ms` | `0` |

public detail 참고:

- guest 상세는 현재 `force-dynamic`, `connection()`, request CSP nonce, referer 기반 back link를 사용한다.
- 따라서 document 응답은 `private, no-cache, no-store`가 정상이고, 첫 요청 outlier가 단발로 튈 수 있다.
- 반복 확인은 전체 baseline 대신 `PERF_TARGETS=post_detail`로 분리해서 본다.
- 같은 public 상세에서 `slow >= 1000ms`가 `10회 중 2회 이상`이거나 warm p95가 `1800ms`를 넘으면 route cache 전환 가능성과 dynamic 의존 제거를 다시 연다.
- 2026-06-06 10회 재측정은 첫 요청만 `1714ms`, warm 요청 범위 `238ms~361ms`, slow `1/10`이었다. 기준 미달이므로 route cache 변경은 보류한다.

관련 evidence:

- [performance-production-recheck-2026-06-06.md](../../docs/reports/performance-production-recheck-2026-06-06.md)
- [performance-baseline-2026-06-06T08-50-41-051Z.md](../../docs/reports/performance-baseline-2026-06-06T08-50-41-051Z.md)
- [performance-browser-baseline-2026-06-06T08-48-48-268Z.md](../../docs/reports/performance-browser-baseline-2026-06-06T08-48-48-268Z.md)
- [performance-route-assets-2026-06-06T08-49-32-892Z.md](../../docs/reports/performance-route-assets-2026-06-06T08-49-32-892Z.md)

## 회귀 판단

다음 중 하나라도 해당하면 성능 회귀로 본다.

- `/` 또는 `/feed/guest` mobile total transfer가 budget을 `20%+` 초과한다.
- `/` 첫 HTML에 live board skeleton만 있고 실제 글/empty action이 없다.
- `/` 첫 진입에서 `/api/home/feed` client fetch가 다시 생긴다.
- `/feed/guest` 첫 진입에서 클릭 전 post detail RSC prefetch가 다시 대량 발생한다.
- `.next/static/media`에 의도하지 않은 webfont 파일이 다시 생긴다.
- `/api/feed/guest?perf=1` 기본 요청에 `bootstrap.communities`가 항상 포함된다.
- public detail의 `PERF_TARGETS=post_detail` 10회 측정에서 slow request가 2회 이상 반복된다.
