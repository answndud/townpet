# TownPet Performance Baseline

- generatedAt: 2026-05-30T06:17:10.428Z
- baseUrl: https://townpet.vercel.app
- samplesPerTarget: 5
- pauseMs: 150
- slowThresholdMs: 1000
- note: Node fetch 기반 서버/다운로드 측정이며, 브라우저 FCP/LCP/hydration 측정은 별도 Playwright 단계에서 추가한다.

## Summary

| target | path | status | redirects | p50 header | p95 header | p50 total | p95 total | first total | warm p50 total | p50 bytes | slow |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| feed | /feed | 200x5 | 5 | 214ms | 745ms | 216ms | 746ms | 746ms | 213ms | 27,373B | 0 |
| guest_feed | /feed/guest | 200x5 | 0 | 105ms | 110ms | 107ms | 111ms | 107ms | 106ms | 27,373B | 0 |
| guest_feed_api | /api/feed/guest?limit=20 | 200x5 | 0 | 107ms | 456ms | 107ms | 458ms | 458ms | 105ms | 16,979B | 0 |
| health | /api/health | 200x5 | 0 | 214ms | 1085ms | 215ms | 1087ms | 1087ms | 214ms | 64B | 1 |
| home | / | 200x5 | 0 | 110ms | 1141ms | 112ms | 1145ms | 1145ms | 108ms | 31,049B | 1 |
| home_feed_api | /api/home/feed | 200x5 | 0 | 107ms | 532ms | 108ms | 534ms | 534ms | 105ms | 6,924B | 0 |
| login | /login | 200x5 | 0 | 283ms | 1120ms | 285ms | 1121ms | 1121ms | 210ms | 30,865B | 1 |
| post_detail | /posts/cmpnejuwa000411t0dazcem8h/guest | 200x5 | 0 | 256ms | 1413ms | 294ms | 1826ms | 1826ms | 278ms | 58,774B | 1 |
| sitemap | /sitemap/0.xml | 200x5 | 0 | 18ms | 857ms | 20ms | 859ms | 859ms | 18ms | 9,310B | 0 |

## Raw Samples

| target | run | status | redirected | header | total | bytes | cache | age | finalUrl |
|---|---:|---:|---:|---:|---:|---:|---|---:|---|
| home | 1 | 200 | no | 1141ms | 1145ms | 31,049B | PRERENDER | 0 | https://townpet.vercel.app/ |
| home | 2 | 200 | no | 352ms | 353ms | 31,049B | HIT | 0 | https://townpet.vercel.app/ |
| home | 3 | 200 | no | 110ms | 112ms | 31,049B | HIT | 0 | https://townpet.vercel.app/ |
| home | 4 | 200 | no | 106ms | 108ms | 31,049B | HIT | 1 | https://townpet.vercel.app/ |
| home | 5 | 200 | no | 101ms | 103ms | 31,049B | HIT | 1 | https://townpet.vercel.app/ |
| login | 1 | 200 | no | 1120ms | 1121ms | 30,865B | MISS | 0 | https://townpet.vercel.app/login |
| login | 2 | 200 | no | 461ms | 461ms | 30,865B | MISS | 0 | https://townpet.vercel.app/login |
| login | 3 | 200 | no | 283ms | 285ms | 30,865B | MISS | 0 | https://townpet.vercel.app/login |
| login | 4 | 200 | no | 199ms | 202ms | 30,865B | MISS | 0 | https://townpet.vercel.app/login |
| login | 5 | 200 | no | 209ms | 210ms | 30,865B | MISS | 0 | https://townpet.vercel.app/login |
| feed | 1 | 200 | yes | 745ms | 746ms | 27,373B | PRERENDER | 0 | https://townpet.vercel.app/feed/guest |
| feed | 2 | 200 | yes | 214ms | 216ms | 27,373B | HIT | 0 | https://townpet.vercel.app/feed/guest |
| feed | 3 | 200 | yes | 212ms | 213ms | 27,373B | HIT | 0 | https://townpet.vercel.app/feed/guest |
| feed | 4 | 200 | yes | 210ms | 211ms | 27,373B | HIT | 1 | https://townpet.vercel.app/feed/guest |
| feed | 5 | 200 | yes | 219ms | 221ms | 27,373B | HIT | 1 | https://townpet.vercel.app/feed/guest |
| guest_feed | 1 | 200 | no | 105ms | 107ms | 27,373B | HIT | 1 | https://townpet.vercel.app/feed/guest |
| guest_feed | 2 | 200 | no | 104ms | 104ms | 27,373B | HIT | 2 | https://townpet.vercel.app/feed/guest |
| guest_feed | 3 | 200 | no | 107ms | 110ms | 27,373B | HIT | 2 | https://townpet.vercel.app/feed/guest |
| guest_feed | 4 | 200 | no | 110ms | 111ms | 27,373B | HIT | 2 | https://townpet.vercel.app/feed/guest |
| guest_feed | 5 | 200 | no | 104ms | 106ms | 27,373B | HIT | 2 | https://townpet.vercel.app/feed/guest |
| health | 1 | 200 | no | 1085ms | 1087ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 2 | 200 | no | 218ms | 219ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 3 | 200 | no | 214ms | 215ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 4 | 200 | no | 207ms | 209ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 5 | 200 | no | 211ms | 214ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| home_feed_api | 1 | 200 | no | 532ms | 534ms | 6,924B | MISS | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 2 | 200 | no | 109ms | 110ms | 6,924B | HIT | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 3 | 200 | no | 104ms | 105ms | 6,924B | HIT | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 4 | 200 | no | 107ms | 108ms | 6,924B | HIT | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 5 | 200 | no | 104ms | 105ms | 6,924B | HIT | 1 | https://townpet.vercel.app/api/home/feed |
| guest_feed_api | 1 | 200 | no | 456ms | 458ms | 16,979B | MISS | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 2 | 200 | no | 113ms | 115ms | 16,979B | HIT | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 3 | 200 | no | 107ms | 107ms | 16,979B | HIT | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 4 | 200 | no | 101ms | 103ms | 16,979B | HIT | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 5 | 200 | no | 104ms | 105ms | 16,979B | HIT | 1 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| sitemap | 1 | 200 | no | 857ms | 859ms | 9,310B | PRERENDER | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 2 | 200 | no | 23ms | 24ms | 9,310B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 3 | 200 | no | 17ms | 18ms | 9,310B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 4 | 200 | no | 18ms | 20ms | 9,310B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 5 | 200 | no | 15ms | 17ms | 9,310B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| post_detail | 1 | 200 | no | 1413ms | 1826ms | 58,774B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 2 | 200 | no | 256ms | 258ms | 58,774B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 3 | 200 | no | 256ms | 294ms | 58,774B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 4 | 200 | no | 208ms | 278ms | 58,774B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 5 | 200 | no | 509ms | 511ms | 58,774B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |

## Next Measurement

- Add browser performance trace for FCP/LCP/hydration and route transition timing.
- Re-run this exact baseline command after `/` shell/feed/comment optimizations.
- Use the same `samplesPerTarget`, target URL set, and base URL for before/after comparison.

