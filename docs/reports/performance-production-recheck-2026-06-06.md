# Production Performance Recheck - 2026-06-06

- 대상: `https://townpet.vercel.app`
- 대표 public 상세: `/posts/cmpnejuwa000411t0dazcem8h/guest`
- 목적: public home/feed/detail 체감 로딩이 다시 10초대 지연으로 회귀했는지 확인한다.
- 결론: 10초급 지연은 재현되지 않았다. `/feed/guest`와 public detail의 browser LCP는 budget 안쪽이며, 실제 공개 DOM에도 오래 남는 feed loading skeleton은 없었다.

## Raw Evidence

- Server fetch 5회: [performance-baseline-2026-06-06T08-48-12-618Z.md](./performance-baseline-2026-06-06T08-48-12-618Z.md)
- Server fetch 5회 raw: [performance-baseline-2026-06-06T08-48-12-618Z.json](./performance-baseline-2026-06-06T08-48-12-618Z.json)
- Browser LCP/FCP: [performance-browser-baseline-2026-06-06T08-48-48-268Z.md](./performance-browser-baseline-2026-06-06T08-48-48-268Z.md)
- Browser LCP/FCP raw: [performance-browser-baseline-2026-06-06T08-48-48-268Z.json](./performance-browser-baseline-2026-06-06T08-48-48-268Z.json)
- Route asset: [performance-route-assets-2026-06-06T08-49-32-892Z.md](./performance-route-assets-2026-06-06T08-49-32-892Z.md)
- Route asset raw: [performance-route-assets-2026-06-06T08-49-32-892Z.json](./performance-route-assets-2026-06-06T08-49-32-892Z.json)
- Server fetch 재확인 8회: [performance-baseline-2026-06-06T08-50-41-051Z.md](./performance-baseline-2026-06-06T08-50-41-051Z.md)
- Server fetch 재확인 8회 raw: [performance-baseline-2026-06-06T08-50-41-051Z.json](./performance-baseline-2026-06-06T08-50-41-051Z.json)

## Commands

```bash
OPS_BASE_URL=https://townpet.vercel.app \
PERF_POST_PATH=/posts/cmpnejuwa000411t0dazcem8h/guest \
PERF_SAMPLES=5 \
PERF_PAUSE_MS=150 \
PERF_SLOW_THRESHOLD_MS=1000 \
./node_modules/.bin/tsx scripts/measure-production-performance.ts
```

```bash
OPS_BASE_URL=https://townpet.vercel.app \
PERF_POST_PATH=/posts/cmpnejuwa000411t0dazcem8h/guest \
PERF_BROWSER_SAMPLES=2 \
PERF_BROWSER_SETTLE_MS=1500 \
PERF_BROWSER_PROFILES=desktop,mobile \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
./node_modules/.bin/tsx scripts/measure-browser-performance.ts
```

```bash
OPS_BASE_URL=https://townpet.vercel.app \
PERF_POST_PATH=/posts/cmpnejuwa000411t0dazcem8h/guest \
PERF_ASSET_SETTLE_MS=1500 \
PERF_ASSET_PROFILES=desktop,mobile \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
./node_modules/.bin/tsx scripts/measure-route-assets.ts
```

```bash
OPS_BASE_URL=https://townpet.vercel.app \
PERF_POST_PATH=/posts/cmpnejuwa000411t0dazcem8h/guest \
PERF_SAMPLES=8 \
PERF_PAUSE_MS=200 \
PERF_SLOW_THRESHOLD_MS=1000 \
./node_modules/.bin/tsx scripts/measure-production-performance.ts
```

## Server Response

두 번째 8회 재확인 기준:

| target | p50 total | p95 total | slow >= 1000ms | note |
| --- | ---: | ---: | ---: | --- |
| `/` | `108ms` | `610ms` | `0` | 첫 sample `610ms`, 이후 대부분 `102~117ms` |
| `/feed/guest` | `110ms` | `245ms` | `0` | 직접 접근은 안정적 |
| `/feed` | `210ms` | `240ms` | `0` | `/feed/guest`로 redirect되므로 직접 링크에는 쓰지 않는다 |
| `/api/home/feed` | `106ms` | `136ms` | `0` | HIT/STALE 중심 |
| `/api/feed/guest?limit=20` | `109ms` | `192ms` | `0` | HIT/STALE 중심 |
| public detail | `233ms` | `414ms` | `0` | 첫 5회 측정의 p95 `1721ms` outlier는 재확인에서 반복되지 않음 |

## Browser LCP

| profile | route | LCP p50 | LCP p95 | budget |
| --- | --- | ---: | ---: | ---: |
| desktop | `/` | `672ms` | `1184ms` | production 참고 |
| desktop | `/feed/guest` | `228ms` | `244ms` | production 참고 |
| desktop | public detail | `648ms` | `980ms` | production 참고 |
| mobile | `/` | `244ms` | `856ms` | `<= 1500ms` |
| mobile | `/feed/guest` | `188ms` | `196ms` | `<= 1800ms` |
| mobile | public detail | `660ms` | `660ms` | `<= 1800ms` 기준 안쪽 |

## Route Asset

| profile | route | script transfer | CSS transfer | fetch transfer | total transfer | budget 판단 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| mobile | `/` | `174KB` | `30KB` | `0KB` | `204KB` | OK |
| mobile | `/login` | `180KB` | `30KB` | `15KB` | `225KB` | OK |
| mobile | `/feed/guest` | `188KB` | `30KB` | `7KB` | `244KB` | OK |
| mobile | public detail | `197KB` | `30KB` | `14KB` | `241KB` | OK |

## Browser DOM Probe

- `/` 공개 링크 중 `/feed` 또는 `/feed?...` 링크: `0개`
- `/` 공개 링크 중 `/feed/guest...` 링크: 정상 존재
- `/` hydrate 후 `animate-pulse` skeleton: 없음
- `/feed/guest` hydrate 후 `피드를 불러오는 중`: 없음
- `/feed/guest` hydrate 후 public post link: 정상 존재

## 판단

- 사용자가 말한 10초 이상 첫 랜딩 지연은 이번 production 재측정에서 재현되지 않았다.
- 가장 중요한 public acquisition path인 `/`, `/feed/guest`, public detail은 현재 budget 안쪽이다.
- `/feed` alias는 redirect 비용이 있으므로 내부 링크에서는 계속 `/feed/guest` canonical을 사용해야 한다. 이번 DOM probe에서는 남은 `/feed` 링크가 없었다.
- public detail은 dynamic/MISS 응답이라 순간 outlier가 생길 수 있다. 이번 재확인에서는 반복되지 않았으므로 즉시 코드 수정보다 관찰 후보로 둔다.

## Follow-up

- Web Vitals 실사용 p75/p95가 쌓이면 lab LCP와 비교한다.
- public detail outlier가 반복되면 route cache 가능성, 댓글/반응 count 조회, 이미지/운영자 source 조회 경계를 다시 본다.
- UI 기능 변경 후 `/feed/guest` total transfer가 `300KB`를 넘거나 mobile LCP가 `1800ms`를 넘으면 성능 작업을 다시 연다.
