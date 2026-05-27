# Production Performance Remeasure After Comment Compactness

- measuredAt: `2026-05-27`
- baseUrl: `https://townpet.vercel.app`
- scope: latest production after comment/detail compactness work
- raw Node fetch baseline: `docs/reports/performance-baseline-2026-05-27T01-04-10-563Z.md`
- raw API latency summary: `docs/reports/api-latency-snapshot-2026-05-27T01-04-45Z.summary.md`
- raw TSV: `docs/reports/api-latency-snapshot-2026-05-27T01-04-45Z.tsv`

## Node Fetch Baseline

| target | path | status | p50 total | p95 total | first total | warm p50 total | note |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| home | `/` | 200x7 | 117ms | 2225ms | 2225ms | 116ms | first request was Vercel `PRERENDER`, then `HIT` |
| feed | `/feed` | 200x7 | 216ms | 728ms | 728ms | 215ms | redirects to `/feed/guest` |
| guest_feed | `/feed/guest` | 200x7 | 109ms | 124ms | 108ms | 109ms | stable cache hit path |
| health | `/api/health` | 200x7 | 274ms | 1945ms | 1945ms | 215ms | first request cold/miss |
| sitemap | `/sitemap/0.xml` | 200x7 | 23ms | 484ms | 484ms | 21ms | first request prerender, then cache hit |

## API Latency Snapshot

Warm-up samples were excluded from threshold evaluation. All steady-state endpoint checks passed.

| endpoint | status | steady p50 total | steady p95 total | slow >500ms | threshold |
| --- | ---: | ---: | ---: | ---: | --- |
| `api_breed_posts` | 200x29 | 136.3ms | 148.3ms | 0 | PASS |
| `api_feed_guest` | 200x29 | 136.5ms | 166.1ms | 0 | PASS |
| `api_posts_global` | 200x29 | 142.2ms | 197.8ms | 0 | PASS |
| `api_posts_suggestions` | 200x29 | 137.0ms | 320.1ms | 0 | PASS |
| `api_search_guest` | 200x29 | 229.4ms | 280.5ms | 0 | PASS |
| `api_search_log` | 200x19 | 232.9ms | 274.3ms | 0 | PASS |
| `page_feed` | 200x29 | 143.0ms | 181.7ms | 0 | PASS |

## Comparison Notes

- Previous documented short baseline in `blog/29-성능개선-측정과-최적화-기록.md` listed first totals around `/` 333ms, `/feed` 311ms, `/feed/guest` 120ms, `/api/health` 355ms.
- Current warm p50 is still strong for `/feed/guest` at 109ms.
- Current `/` and `/api/health` first request totals were higher because this run caught cold/prerender or miss behavior. Warm values stayed close to the previous stable range.
- `/feed` remains slower than direct `/feed/guest` because it intentionally redirects guests to `/feed/guest`.

## Blocked Measurement

- `pnpm -C app perf:browser` could not run because the local Playwright Chromium binary is not installed.
- I did not run `pnpm exec playwright install` because that would write browser binaries to the user home cache in this environment.
- Browser FCP/LCP and route asset snapshots should be rerun only after Playwright browsers are available through an approved local/repo-safe setup.

## Follow-up

- No immediate performance regression is indicated by the steady-state API snapshot.
- If startup cold latency becomes a user-visible issue, investigate Vercel region/cold-start behavior before changing UI code.
- Keep using `/feed/guest` for public guest links when a redirect is unnecessary.
