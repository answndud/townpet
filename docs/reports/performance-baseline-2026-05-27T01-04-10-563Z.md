# TownPet Performance Baseline

- generatedAt: 2026-05-27T01:04:10.563Z
- baseUrl: https://townpet.vercel.app
- samplesPerTarget: 7
- pauseMs: 150
- slowThresholdMs: 1000
- note: Node fetch 기반 서버/다운로드 측정이며, 브라우저 FCP/LCP/hydration 측정은 별도 Playwright 단계에서 추가한다.

## Summary

| target | path | status | redirects | p50 header | p95 header | p50 total | p95 total | first total | warm p50 total | p50 bytes | slow |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| feed | /feed | 200x7 | 7 | 214ms | 726ms | 216ms | 728ms | 728ms | 215ms | 23,919B | 0 |
| guest_feed | /feed/guest | 200x7 | 0 | 107ms | 122ms | 109ms | 124ms | 108ms | 109ms | 23,919B | 0 |
| health | /api/health | 200x7 | 0 | 272ms | 1944ms | 274ms | 1945ms | 1945ms | 215ms | 64B | 1 |
| home | / | 200x7 | 0 | 115ms | 2218ms | 117ms | 2225ms | 2225ms | 116ms | 25,728B | 1 |
| sitemap | /sitemap/0.xml | 200x7 | 0 | 22ms | 482ms | 23ms | 484ms | 484ms | 21ms | 8,942B | 0 |

## Raw Samples

| target | run | status | redirected | header | total | bytes | cache | age | finalUrl |
|---|---:|---:|---:|---:|---:|---:|---|---:|---|
| home | 1 | 200 | no | 2218ms | 2225ms | 25,728B | PRERENDER | 0 | https://townpet.vercel.app/ |
| home | 2 | 200 | no | 115ms | 116ms | 25,728B | HIT | 0 | https://townpet.vercel.app/ |
| home | 3 | 200 | no | 423ms | 426ms | 25,728B | HIT | 0 | https://townpet.vercel.app/ |
| home | 4 | 200 | no | 113ms | 117ms | 25,728B | HIT | 1 | https://townpet.vercel.app/ |
| home | 5 | 200 | no | 118ms | 120ms | 25,728B | HIT | 1 | https://townpet.vercel.app/ |
| home | 6 | 200 | no | 104ms | 106ms | 25,728B | HIT | 1 | https://townpet.vercel.app/ |
| home | 7 | 200 | no | 114ms | 115ms | 25,728B | HIT | 1 | https://townpet.vercel.app/ |
| feed | 1 | 200 | yes | 726ms | 728ms | 23,919B | PRERENDER | 0 | https://townpet.vercel.app/feed/guest |
| feed | 2 | 200 | yes | 363ms | 365ms | 23,919B | HIT | 0 | https://townpet.vercel.app/feed/guest |
| feed | 3 | 200 | yes | 211ms | 213ms | 23,919B | HIT | 0 | https://townpet.vercel.app/feed/guest |
| feed | 4 | 200 | yes | 501ms | 502ms | 23,919B | HIT | 1 | https://townpet.vercel.app/feed/guest |
| feed | 5 | 200 | yes | 214ms | 216ms | 23,919B | HIT | 1 | https://townpet.vercel.app/feed/guest |
| feed | 6 | 200 | yes | 210ms | 213ms | 23,919B | HIT | 2 | https://townpet.vercel.app/feed/guest |
| feed | 7 | 200 | yes | 211ms | 215ms | 23,919B | HIT | 2 | https://townpet.vercel.app/feed/guest |
| guest_feed | 1 | 200 | no | 106ms | 108ms | 23,919B | HIT | 2 | https://townpet.vercel.app/feed/guest |
| guest_feed | 2 | 200 | no | 107ms | 109ms | 23,919B | HIT | 3 | https://townpet.vercel.app/feed/guest |
| guest_feed | 3 | 200 | no | 100ms | 102ms | 23,919B | HIT | 3 | https://townpet.vercel.app/feed/guest |
| guest_feed | 4 | 200 | no | 122ms | 124ms | 23,919B | HIT | 3 | https://townpet.vercel.app/feed/guest |
| guest_feed | 5 | 200 | no | 108ms | 109ms | 23,919B | HIT | 3 | https://townpet.vercel.app/feed/guest |
| guest_feed | 6 | 200 | no | 98ms | 99ms | 23,919B | HIT | 4 | https://townpet.vercel.app/feed/guest |
| guest_feed | 7 | 200 | no | 111ms | 113ms | 23,919B | HIT | 4 | https://townpet.vercel.app/feed/guest |
| health | 1 | 200 | no | 1944ms | 1945ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 2 | 200 | no | 213ms | 215ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 3 | 200 | no | 295ms | 298ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 4 | 200 | no | 272ms | 274ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 5 | 200 | no | 210ms | 213ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 6 | 200 | no | 287ms | 288ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 7 | 200 | no | 210ms | 211ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| sitemap | 1 | 200 | no | 482ms | 484ms | 8,942B | PRERENDER | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 2 | 200 | no | 16ms | 17ms | 8,942B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 3 | 200 | no | 21ms | 21ms | 8,942B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 4 | 200 | no | 17ms | 18ms | 8,942B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 5 | 200 | no | 22ms | 23ms | 8,942B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 6 | 200 | no | 31ms | 33ms | 8,942B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 7 | 200 | no | 23ms | 24ms | 8,942B | HIT | 1 | https://townpet.vercel.app/sitemap/0.xml |

## Next Measurement

- Add browser performance trace for FCP/LCP/hydration and route transition timing.
- Re-run this exact baseline command after `/` shell/feed/comment optimizations.
- Use the same `samplesPerTarget`, target URL set, and base URL for before/after comparison.
