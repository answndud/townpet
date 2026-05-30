# Performance Phase 1 Baseline

- 날짜: `2026-05-30`
- 대상: `https://townpet.vercel.app`
- 목적: 성능 개선 Phase 1 기준선을 고정하고, 이후 Phase 2-8 개선 전후 비교 기준을 남긴다.
- 대표 public 상세: `/posts/cmpnejuwa000411t0dazcem8h/guest`

## Raw Reports

- Server fetch baseline: [performance-baseline-2026-05-30T06-17-10-428Z.md](./performance-baseline-2026-05-30T06-17-10-428Z.md)
- Server fetch raw JSON: [performance-baseline-2026-05-30T06-17-10-428Z.json](./performance-baseline-2026-05-30T06-17-10-428Z.json)
- Browser baseline: [performance-browser-baseline-2026-05-30T06-17-47-629Z.md](./performance-browser-baseline-2026-05-30T06-17-47-629Z.md)
- Browser raw JSON: [performance-browser-baseline-2026-05-30T06-17-47-629Z.json](./performance-browser-baseline-2026-05-30T06-17-47-629Z.json)
- Route asset snapshot: [performance-route-assets-2026-05-30T06-19-13-791Z.md](./performance-route-assets-2026-05-30T06-19-13-791Z.md)
- Route asset raw JSON: [performance-route-assets-2026-05-30T06-19-13-791Z.json](./performance-route-assets-2026-05-30T06-19-13-791Z.json)

## Commands

```bash
PERF_POST_PATH=/posts/cmpnejuwa000411t0dazcem8h/guest \
PERF_SAMPLES=5 \
PERF_PAUSE_MS=150 \
PERF_SLOW_THRESHOLD_MS=1000 \
COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app perf:baseline
```

```bash
PERF_POST_PATH=/posts/cmpnejuwa000411t0dazcem8h/guest \
PERF_BROWSER_SAMPLES=2 \
PERF_BROWSER_SETTLE_MS=1500 \
PERF_BROWSER_PROFILES=desktop,mobile \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app perf:browser
```

```bash
PERF_POST_PATH=/posts/cmpnejuwa000411t0dazcem8h/guest \
PERF_ASSET_SETTLE_MS=1500 \
PERF_ASSET_PROFILES=desktop,mobile \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app perf:assets
```

## Server Fetch Summary

| target | path | warm p50 total | p95 total | first total | slow >= 1000ms |
|---|---|---:|---:|---:|---:|
| home | `/` | `108ms` | `1145ms` | `1145ms` | `1` |
| login | `/login` | `210ms` | `1121ms` | `1121ms` | `1` |
| guest_feed | `/feed/guest` | `106ms` | `111ms` | `107ms` | `0` |
| post_detail | `/posts/cmpnejuwa000411t0dazcem8h/guest` | `278ms` | `1826ms` | `1826ms` | `1` |
| health | `/api/health` | `214ms` | `1087ms` | `1087ms` | `1` |
| home_feed_api | `/api/home/feed` | `105ms` | `534ms` | `534ms` | `0` |
| guest_feed_api | `/api/feed/guest?limit=20` | `105ms` | `458ms` | `458ms` | `0` |

## Browser Summary

| profile | route | LCP p50 | LCP p95 | load p50 |
|---|---|---:|---:|---:|
| desktop | `/` | `192ms` | `572ms` | `214ms` |
| desktop | `/login` | `332ms` | `392ms` | `334ms` |
| desktop | `/feed/guest` | `192ms` | `208ms` | `226ms` |
| desktop | public detail | `652ms` | `788ms` | `509ms` |
| mobile | `/` | `180ms` | `188ms` | `218ms` |
| mobile | `/login` | `292ms` | `360ms` | `309ms` |
| mobile | `/feed/guest` | `180ms` | `188ms` | `211ms` |
| mobile | public detail | `680ms` | `684ms` | `353ms` |

## Route Asset Summary

| profile | route | scripts | script transfer | CSS transfer | fetch transfer | total transfer |
|---|---|---:|---:|---:|---:|---:|
| desktop | `/` | `12` | `169 KB` | `81 KB` | `31 KB` | `281 KB` |
| desktop | `/login` | `13` | `184 KB` | `81 KB` | `42 KB` | `307 KB` |
| desktop | `/feed/guest` | `12` | `179 KB` | `81 KB` | `32 KB` | `293 KB` |
| desktop | public detail | `17` | `274 KB` | `81 KB` | `40 KB` | `395 KB` |
| mobile | `/` | `14` | `184 KB` | `81 KB` | `38 KB` | `303 KB` |
| mobile | `/login` | `12` | `174 KB` | `81 KB` | `36 KB` | `290 KB` |
| mobile | `/feed/guest` | `16` | `270 KB` | `81 KB` | `67 KB` | `436 KB` |
| mobile | public detail | `17` | `274 KB` | `81 KB` | `23 KB` | `378 KB` |

## Findings

- Warm server response is good for `/`, `/feed/guest`, `/api/home/feed`, `/api/feed/guest`.
- Cold or cache-miss outlier is still visible:
  - `/` first total `1145ms`
  - `/login` first total `1121ms`
  - `/api/health` first total `1087ms`
  - public detail first total `1826ms`
- Browser LCP is healthy in this lab run. The slowest measured mobile LCP is public detail at `684ms`.
- Resource weight is the clearest next client-side target:
  - mobile `/feed/guest` total transfer `436 KB`
  - public detail script transfer `274 KB`
  - shared CSS transfer `81 KB` on every measured route

## Next Phases

- Phase 2 should add production Web Vitals collection so lab LCP is not the only evidence.
- Phase 3 should focus on `/` live board data delivery if real-user metrics show skeleton/data delay.
- Phase 4 should inspect why feed/detail load heavier script chunks than login/home.
- Phase 5 should separate cold/cache-miss outliers by endpoint timing, especially public detail and health.
