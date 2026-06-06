# TownPet Performance Baseline

- generatedAt: 2026-06-06T08:50:41.051Z
- baseUrl: https://townpet.vercel.app
- samplesPerTarget: 8
- pauseMs: 200
- slowThresholdMs: 1000
- note: Node fetch 기반 서버/다운로드 측정이며, 브라우저 FCP/LCP/hydration 측정은 별도 Playwright 단계에서 추가한다.

## Summary

| target | path | status | redirects | p50 header | p95 header | p50 total | p95 total | first total | warm p50 total | p50 bytes | slow |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| feed | /feed | 200x8 | 8 | 209ms | 238ms | 210ms | 240ms | 240ms | 210ms | 26,376B | 0 |
| guest_feed | /feed/guest | 200x8 | 0 | 105ms | 244ms | 110ms | 245ms | 110ms | 115ms | 26,376B | 0 |
| guest_feed_api | /api/feed/guest?limit=20 | 200x8 | 0 | 107ms | 191ms | 109ms | 192ms | 122ms | 109ms | 16,982B | 0 |
| health | /api/health | 200x8 | 0 | 205ms | 347ms | 206ms | 348ms | 348ms | 206ms | 64B | 0 |
| home | / | 200x8 | 0 | 105ms | 607ms | 108ms | 610ms | 610ms | 108ms | 64,021B | 0 |
| home_feed_api | /api/home/feed | 200x8 | 0 | 105ms | 135ms | 106ms | 136ms | 116ms | 106ms | 6,925B | 0 |
| login | /login | 200x8 | 0 | 199ms | 290ms | 205ms | 292ms | 292ms | 205ms | 30,225B | 0 |
| post_detail | /posts/cmpnejuwa000411t0dazcem8h/guest | 200x8 | 0 | 216ms | 275ms | 233ms | 414ms | 414ms | 233ms | 53,287B | 0 |
| sitemap | /sitemap/0.xml | 200x8 | 0 | 15ms | 53ms | 16ms | 55ms | 55ms | 16ms | 9,310B | 0 |

## Raw Samples

| target | run | status | redirected | header | total | bytes | cache | age | finalUrl |
|---|---:|---:|---:|---:|---:|---:|---|---:|---|
| home | 1 | 200 | no | 607ms | 610ms | 64,021B | STALE | 104 | https://townpet.vercel.app/ |
| home | 2 | 200 | no | 113ms | 117ms | 64,021B | STALE | 104 | https://townpet.vercel.app/ |
| home | 3 | 200 | no | 101ms | 104ms | 64,021B | STALE | 104 | https://townpet.vercel.app/ |
| home | 4 | 200 | no | 105ms | 107ms | 64,021B | STALE | 105 | https://townpet.vercel.app/ |
| home | 5 | 200 | no | 105ms | 108ms | 64,021B | STALE | 105 | https://townpet.vercel.app/ |
| home | 6 | 200 | no | 99ms | 102ms | 64,021B | STALE | 105 | https://townpet.vercel.app/ |
| home | 7 | 200 | no | 107ms | 109ms | 64,021B | STALE | 105 | https://townpet.vercel.app/ |
| home | 8 | 200 | no | 107ms | 110ms | 64,021B | STALE | 106 | https://townpet.vercel.app/ |
| login | 1 | 200 | no | 290ms | 292ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 2 | 200 | no | 201ms | 205ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 3 | 200 | no | 199ms | 205ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 4 | 200 | no | 201ms | 212ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 5 | 200 | no | 198ms | 201ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 6 | 200 | no | 198ms | 200ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 7 | 200 | no | 205ms | 207ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| login | 8 | 200 | no | 198ms | 200ms | 30,225B | MISS | 0 | https://townpet.vercel.app/login |
| feed | 1 | 200 | yes | 238ms | 240ms | 26,376B | HIT | 147 | https://townpet.vercel.app/feed/guest |
| feed | 2 | 200 | yes | 202ms | 203ms | 26,376B | HIT | 147 | https://townpet.vercel.app/feed/guest |
| feed | 3 | 200 | yes | 208ms | 209ms | 26,376B | HIT | 147 | https://townpet.vercel.app/feed/guest |
| feed | 4 | 200 | yes | 230ms | 231ms | 26,376B | HIT | 148 | https://townpet.vercel.app/feed/guest |
| feed | 5 | 200 | yes | 211ms | 212ms | 26,376B | HIT | 148 | https://townpet.vercel.app/feed/guest |
| feed | 6 | 200 | yes | 200ms | 202ms | 26,376B | HIT | 149 | https://townpet.vercel.app/feed/guest |
| feed | 7 | 200 | yes | 218ms | 220ms | 26,376B | HIT | 149 | https://townpet.vercel.app/feed/guest |
| feed | 8 | 200 | yes | 209ms | 210ms | 26,376B | HIT | 149 | https://townpet.vercel.app/feed/guest |
| guest_feed | 1 | 200 | no | 108ms | 110ms | 26,376B | HIT | 150 | https://townpet.vercel.app/feed/guest |
| guest_feed | 2 | 200 | no | 244ms | 245ms | 26,376B | HIT | 150 | https://townpet.vercel.app/feed/guest |
| guest_feed | 3 | 200 | no | 124ms | 126ms | 26,376B | HIT | 151 | https://townpet.vercel.app/feed/guest |
| guest_feed | 4 | 200 | no | 233ms | 234ms | 26,376B | HIT | 151 | https://townpet.vercel.app/feed/guest |
| guest_feed | 5 | 200 | no | 105ms | 106ms | 26,376B | HIT | 151 | https://townpet.vercel.app/feed/guest |
| guest_feed | 6 | 200 | no | 102ms | 105ms | 26,376B | HIT | 152 | https://townpet.vercel.app/feed/guest |
| guest_feed | 7 | 200 | no | 102ms | 106ms | 26,376B | HIT | 152 | https://townpet.vercel.app/feed/guest |
| guest_feed | 8 | 200 | no | 105ms | 115ms | 26,376B | HIT | 152 | https://townpet.vercel.app/feed/guest |
| health | 1 | 200 | no | 347ms | 348ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 2 | 200 | no | 205ms | 206ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 3 | 200 | no | 258ms | 259ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 4 | 200 | no | 213ms | 215ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 5 | 200 | no | 204ms | 205ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 6 | 200 | no | 211ms | 213ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 7 | 200 | no | 195ms | 196ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| health | 8 | 200 | no | 202ms | 203ms | 64B | MISS | 0 | https://townpet.vercel.app/api/health |
| home_feed_api | 1 | 200 | no | 115ms | 116ms | 6,924B | STALE | 148 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 2 | 200 | no | 105ms | 106ms | 6,925B | HIT | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 3 | 200 | no | 101ms | 102ms | 6,925B | HIT | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 4 | 200 | no | 99ms | 101ms | 6,925B | HIT | 0 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 5 | 200 | no | 113ms | 115ms | 6,925B | HIT | 1 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 6 | 200 | no | 101ms | 102ms | 6,925B | HIT | 1 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 7 | 200 | no | 135ms | 136ms | 6,925B | HIT | 1 | https://townpet.vercel.app/api/home/feed |
| home_feed_api | 8 | 200 | no | 106ms | 107ms | 6,925B | HIT | 2 | https://townpet.vercel.app/api/home/feed |
| guest_feed_api | 1 | 200 | no | 121ms | 122ms | 16,981B | STALE | 149 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 2 | 200 | no | 118ms | 119ms | 16,982B | HIT | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 3 | 200 | no | 105ms | 106ms | 16,982B | HIT | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 4 | 200 | no | 191ms | 192ms | 16,982B | HIT | 0 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 5 | 200 | no | 102ms | 104ms | 16,982B | HIT | 1 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 6 | 200 | no | 102ms | 103ms | 16,982B | HIT | 1 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 7 | 200 | no | 110ms | 111ms | 16,982B | HIT | 1 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| guest_feed_api | 8 | 200 | no | 107ms | 109ms | 16,982B | HIT | 2 | https://townpet.vercel.app/api/feed/guest?limit=20 |
| sitemap | 1 | 200 | no | 53ms | 55ms | 9,310B | HIT | 150 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 2 | 200 | no | 19ms | 19ms | 9,310B | HIT | 150 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 3 | 200 | no | 15ms | 16ms | 9,310B | HIT | 150 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 4 | 200 | no | 14ms | 15ms | 9,310B | HIT | 150 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 5 | 200 | no | 16ms | 18ms | 9,310B | HIT | 151 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 6 | 200 | no | 20ms | 21ms | 9,310B | HIT | 151 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 7 | 200 | no | 14ms | 16ms | 9,310B | HIT | 151 | https://townpet.vercel.app/sitemap/0.xml |
| sitemap | 8 | 200 | no | 15ms | 16ms | 9,310B | HIT | 151 | https://townpet.vercel.app/sitemap/0.xml |
| post_detail | 1 | 200 | no | 232ms | 414ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 2 | 200 | no | 211ms | 280ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 3 | 200 | no | 211ms | 280ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 4 | 200 | no | 275ms | 348ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 5 | 200 | no | 216ms | 225ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 6 | 200 | no | 220ms | 227ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 7 | 200 | no | 219ms | 233ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 8 | 200 | no | 204ms | 216ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |

## Next Measurement

- Add browser performance trace for FCP/LCP/hydration and route transition timing.
- Re-run this exact baseline command after `/` shell/feed/comment optimizations.
- Use the same `samplesPerTarget`, target URL set, and base URL for before/after comparison.
