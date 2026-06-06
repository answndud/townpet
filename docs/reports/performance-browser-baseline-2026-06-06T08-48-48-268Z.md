# TownPet Browser Performance Baseline

- generatedAt: 2026-06-06T08:48:48.268Z
- baseUrl: https://townpet.vercel.app
- samplesPerTarget: 2
- settleMsAfterLoad: 1500
- profiles: desktop, mobile
- note: Playwright Chromium 기준 브라우저 navigation/paint/LCP 측정이다.

## Summary

| profile | target | path | status | responseEnd p50 | FCP p50 | FCP p95 | LCP p50 | LCP p95 | load p50 | total goto p50 |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | guest_feed | /feed/guest | 200x2 | 137ms | 200ms | 216ms | 228ms | 244ms | 594ms | 595ms |
| desktop | home | / | 200x2 | 556ms | 672ms | 1184ms | 672ms | 1184ms | 666ms | 668ms |
| desktop | login | /login | 200x2 | 228ms | 308ms | 460ms | 308ms | 492ms | 407ms | 408ms |
| desktop | post_detail | /posts/cmpnejuwa000411t0dazcem8h/guest | 200x2 | 436ms | 336ms | 676ms | 648ms | 980ms | 559ms | 560ms |
| mobile | guest_feed | /feed/guest | 200x2 | 132ms | 188ms | 196ms | 188ms | 196ms | 220ms | 222ms |
| mobile | home | / | 200x2 | 130ms | 220ms | 856ms | 244ms | 856ms | 225ms | 226ms |
| mobile | login | /login | 200x2 | 226ms | 292ms | 472ms | 292ms | 472ms | 306ms | 307ms |
| mobile | post_detail | /posts/cmpnejuwa000411t0dazcem8h/guest | 200x2 | 317ms | 304ms | 332ms | 660ms | 660ms | 346ms | 347ms |

## Raw Samples

| profile | target | run | status | responseEnd | FCP | LCP | load | totalGoto | bodyText | finalUrl |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| desktop | home | 1 | 200 | 805ms | 1184ms | 1184ms | 1289ms | 1291ms | 1156 | https://townpet.vercel.app/ |
| desktop | home | 2 | 200 | 556ms | 672ms | 672ms | 666ms | 668ms | 1156 | https://townpet.vercel.app/ |
| desktop | login | 1 | 200 | 355ms | 460ms | 492ms | 637ms | 638ms | 501 | https://townpet.vercel.app/login |
| desktop | login | 2 | 200 | 228ms | 308ms | 308ms | 407ms | 408ms | 501 | https://townpet.vercel.app/login |
| desktop | guest_feed | 1 | 200 | 137ms | 200ms | 228ms | 756ms | 758ms | 1617 | https://townpet.vercel.app/feed/guest |
| desktop | guest_feed | 2 | 200 | 148ms | 216ms | 244ms | 594ms | 595ms | 1617 | https://townpet.vercel.app/feed/guest |
| desktop | post_detail | 1 | 200 | 436ms | 336ms | 648ms | 559ms | 560ms | 977 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| desktop | post_detail | 2 | 200 | 646ms | 676ms | 980ms | 682ms | 684ms | 977 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| mobile | home | 1 | 200 | 774ms | 856ms | 856ms | 885ms | 886ms | 1720 | https://townpet.vercel.app/ |
| mobile | home | 2 | 200 | 130ms | 220ms | 244ms | 225ms | 226ms | 1720 | https://townpet.vercel.app/ |
| mobile | login | 1 | 200 | 226ms | 292ms | 292ms | 306ms | 307ms | 169 | https://townpet.vercel.app/login |
| mobile | login | 2 | 200 | 232ms | 472ms | 472ms | 482ms | 483ms | 169 | https://townpet.vercel.app/login |
| mobile | guest_feed | 1 | 200 | 143ms | 196ms | 196ms | 233ms | 234ms | 1238 | https://townpet.vercel.app/feed/guest |
| mobile | guest_feed | 2 | 200 | 132ms | 188ms | 188ms | 220ms | 222ms | 1238 | https://townpet.vercel.app/feed/guest |
| mobile | post_detail | 1 | 200 | 317ms | 304ms | 660ms | 346ms | 347ms | 645 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| mobile | post_detail | 2 | 200 | 366ms | 332ms | 660ms | 405ms | 406ms | 645 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
