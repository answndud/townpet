# Browser Performance Remeasure With Repo-Local Playwright

- measuredAt: `2026-05-27`
- baseUrl: `https://townpet.vercel.app`
- browserRuntime: repo-local `.playwright-browsers` cache
- raw browser baseline: `docs/reports/performance-browser-baseline-2026-05-27T01-16-57-383Z.md`
- raw browser baseline JSON: `docs/reports/performance-browser-baseline-2026-05-27T01-16-57-383Z.json`
- raw route asset snapshot: `docs/reports/performance-route-assets-2026-05-27T01-17-29-165Z.md`
- raw route asset JSON: `docs/reports/performance-route-assets-2026-05-27T01-17-29-165Z.json`

## Setup

- Added `playwright:install:local` so Chromium installs to repo-local `.playwright-browsers`.
- Added `perf:browser:local` and `perf:assets:local` so browser measurements use that repo-local browser cache.
- `.playwright-browsers/` is ignored and not committed.
- An initial mistaken parent-cache path was removed; `/Users/alex/project/.playwright-browsers` is absent.

## Browser Navigation Summary

| profile | route | status | responseEnd p50 | FCP p50 | LCP p50 | LCP p95 | total goto p50 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| desktop | `/` | 200x3 | 139ms | 256ms | 256ms | 1424ms | 214ms |
| desktop | `/feed` -> `/feed/guest` | 200x3 | 242ms | 320ms | 320ms | 748ms | 343ms |
| desktop | `/feed/guest` | 200x3 | 136ms | 216ms | 216ms | 236ms | 236ms |
| mobile | `/` | 200x3 | 134ms | 196ms | 196ms | 200ms | 225ms |
| mobile | `/feed` -> `/feed/guest` | 200x3 | 235ms | 308ms | 308ms | 340ms | 339ms |
| mobile | `/feed/guest` | 200x3 | 140ms | 200ms | 204ms | 212ms | 255ms |

## Route Asset Summary

| profile | route | doc response | FCP | LCP | scripts | script transfer | CSS transfer | fetch transfer | total transfer |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| desktop | `/` | 154ms | 216ms | 216ms | 11 | 166 KB | 80 KB | 21 KB | 268 KB |
| desktop | `/feed/guest` | 136ms | 236ms | 236ms | 12 | 177 KB | 80 KB | 25 KB | 284 KB |
| mobile | `/` | 138ms | 204ms | 204ms | 14 | 182 KB | 80 KB | 29 KB | 291 KB |
| mobile | `/feed/guest` | 151ms | 212ms | 212ms | 13 | 181 KB | 80 KB | 29 KB | 308 KB |

## Notes

- Direct `/feed/guest` remains faster and cleaner than `/feed` because `/feed` intentionally redirects guest users.
- Desktop `/` run 1 had a high LCP/FCP outlier at 1424ms; subsequent runs were 200ms and 256ms. Treat this as cold/browser-start noise unless it repeats in later runs.
- No long tasks were reported in the route asset snapshot.
- Current total transfer is under 310 KB for measured home/feed guest routes.
