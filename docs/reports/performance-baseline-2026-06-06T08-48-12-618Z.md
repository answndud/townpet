# TownPet Performance Baseline

- generatedAt: 2026-06-06T08:48:12.618Z
- baseUrl: https://townpet.vercel.app
- samplesPerTarget: 5
- pauseMs: 150
- slowThresholdMs: 1000
- note: Node fetch 기반 서버/다운로드 측정이며, 브라우저 FCP/LCP/hydration 측정은 별도 Playwright 단계에서 추가한다.

## Summary

| target | path | status | redirects | p50 header | p95 header | p50 total | p95 total | first total | warm p50 total | p50 bytes | slow |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| feed | /feed | 200x5 | 5 | 474ms | 1149ms | 477ms | 1149ms | 1149ms | 219ms | 26,376B | 1 |
| guest_feed | /feed/guest | 200x5 | 0 | 106ms | 121ms | 108ms | 123ms | 123ms | 107ms | 26,376B | 0 |
| guest_feed_api | /api/feed/guest?limit=20 | 200x5 | 0 | 112ms | 313ms | 114ms | 313ms | 313ms | 106ms | 16,981B | 0 |
| health | /api/health | 200x5 | 0 | 231ms | 1307ms | 232ms | 1308ms | 583ms | 220ms | 64B | 1 |
| home | / | 200x5 | 0 | 336ms | 1290ms | 340ms | 1293ms | 1293ms | 113ms | 57,846B | 1 |
| home_feed_api | /api/home/feed | 200x5 | 0 | 105ms | 541ms | 105ms | 542ms | 542ms | 104ms | 6,924B | 0 |
| login | /login | 200x5 | 0 | 236ms | 1879ms | 237ms | 1899ms | 1899ms | 222ms | 30,225B | 1 |
| post_detail | /posts/cmpnejuwa000411t0dazcem8h/guest | 200x5 | 0 | 291ms | 1353ms | 317ms | 1721ms | 1112ms | 295ms | 53,285B | 2 |
| sitemap | /sitemap/0.xml | 200x5 | 0 | 17ms | 807ms | 18ms | 808ms | 808ms | 17ms | 9,310B | 0 |

## Raw Samples

| target | run | status | redirected | header | total | bytes | cache | age | finalUrl |
|---|---:|---:|---:|---:|---:|---:|---|---:|---|
| home | 1 | 200 | no | 1290ms | 1293ms | 57,846B | PRERENDER | 0 | https://townpet.vercel.app/ |
| home | 2 | 200 | no | 369ms | 373ms | 57,846B | HIT | 0 | https://townpet.vercel.app/ |
| home | 3 | 200 | no | 336ms | 340ms | 57,846B | HIT | 1 | https://townpet.vercel.app/ |
| home | 4 | 200 | no | 108ms | 111ms | 57,846B | HIT | 1 | https://townpet.vercel.app/ |
| home | 5 | 200 | no | 110ms | 113ms | 57,846B | HIT | 1 | https://townpet.vercel.app/ |
| login | 1 | 200 | no | 1879ms | 1899ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 2 | 200 | no | 219ms | 222ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 3 | 200 | no | 236ms | 237ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 4 | 200 | no | 206ms | 207ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 5 | 200 | no | 453ms | 459ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| feed | 1 | 200 | yes | 1149ms | 1149ms | 26,376B | PRERENDER | 0 | https://townpet.vercel.app/feed/guest |
| feed | 2 | 200 | yes | 216ms | 219ms | 26,376B | HIT | 0 | https://townpet.vercel.app/feed/guest |
| feed | 3 | 200 | yes | 474ms | 477ms | 26,376B | HIT | 0 | https://townpet.vercel.app/feed/guest |
| feed | 4 | 200 | yes | 197ms | 198ms | 26,376B | HIT | 1 | https://townpet.vercel.app/feed/guest |
| feed | 5 | 200 | yes | 971ms | 971ms | 26,376B | HIT | 2 | https://townpet.vercel.app/feed/guest |
| guest_feed | 1 | 200 | no | 121ms | 123ms | 26,376B | HIT | 2 | https://townpet.vercel.app/feed/guest |
| guest_feed | 2 | 200 | no | 105ms | 107ms | 26,376B | HIT | 3 | https://townpet.vercel.app/feed/guest |
| guest_feed | 3 | 200 | no | 103ms | 105ms | 26,376B | HIT | 3 | https://townpet.vercel.app/feed/guest |
| guest_feed | 4 | 200 | no | 111ms | 113ms | 26,376B | HIT | 3 | https://townpet.vercel.app/feed/guest |
| guest_feed | 5 | 200 | no | 106ms | 108ms | 26,376B | HIT | 3 | https://townpet.vercel.app/feed/guest |
| health | 1 | 200 | no | 582ms | 583ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 2 | 200 | no | 214ms | 215ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 3 | 200 | no | 1307ms | 1308ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 4 | 200 | no | 219ms | 220ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 5 | 200 | no | 231ms | 232ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| home_feed_api | 1 | 200 | no | 541ms | 542ms | 6,924B | MISS | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 2 | 200 | no | 103ms | 104ms | 6,924B | HIT | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 3 | 200 | no | 105ms | 105ms | 6,924B | HIT | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 4 | 200 | no | 103ms | 104ms | 6,924B | HIT | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 5 | 200 | no | 107ms | 108ms | 6,924B | HIT | 1 | https://townpet.vercel.app/api/home/feed |
| guest_feed_api | 1 | 200 | no | 313ms | 313ms | 16,981B | MISS | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 2 | 200 | no | 112ms | 114ms | 16,981B | HIT | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 3 | 200 | no | 129ms | 131ms | 16,981B | HIT | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 4 | 200 | no | 103ms | 106ms | 16,981B | HIT | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 5 | 200 | no | 105ms | 106ms | 16,981B | HIT | 1 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| sitemap | 1 | 200 | no | 807ms | 808ms | 9,310B | PRERENDER | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 2 | 200 | no | 17ms | 17ms | 9,310B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 3 | 200 | no | 15ms | 16ms | 9,310B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 4 | 200 | no | 32ms | 33ms | 9,310B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 5 | 200 | no | 17ms | 18ms | 9,310B | HIT | 0 | https://townpet.vercel.app/sitemap/0.xml |
| post_detail | 1 | 200 | no | 705ms | 1112ms | 53,285B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 2 | 200 | no | 1353ms | 1721ms | 53,242B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 3 | 200 | no | 291ms | 295ms | 53,285B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 4 | 200 | no | 232ms | 317ms | 53,285B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 5 | 200 | no | 210ms | 232ms | 53,285B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |

## Next Measurement

- Add browser performance trace for FCP/LCP/hydration and route transition timing.
- Re-run this exact baseline command after `/` shell/feed/comment optimizations.
- Use the same `samplesPerTarget`, target URL set, and base URL for before/after comparison.
