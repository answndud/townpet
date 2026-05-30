# TownPet Browser Performance Baseline

- generatedAt: 2026-05-30T06:17:47.629Z
- baseUrl: https://townpet.vercel.app
- samplesPerTarget: 2
- settleMsAfterLoad: 1500
- profiles: desktop, mobile
- note: Playwright Chromium 기준 브라우저 navigation/paint/LCP 측정이다.

## Summary

| profile | target | path | status | responseEnd p50 | FCP p50 | FCP p95 | LCP p50 | LCP p95 | load p50 | total goto p50 |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | guest_feed | /feed/guest | 200x2 | 124ms | 192ms | 208ms | 192ms | 208ms | 226ms | 228ms |
| desktop | home | / | 200x2 | 126ms | 192ms | 572ms | 192ms | 572ms | 214ms | 215ms |
| desktop | login | /login | 200x2 | 269ms | 332ms | 392ms | 332ms | 392ms | 334ms | 334ms |
| desktop | post_detail | /posts/cmpnejuwa000411t0dazcem8h/guest | 200x2 | 372ms | 352ms | 488ms | 652ms | 788ms | 509ms | 510ms |
| mobile | guest_feed | /feed/guest | 200x2 | 125ms | 180ms | 188ms | 180ms | 188ms | 211ms | 211ms |
| mobile | home | / | 200x2 | 125ms | 180ms | 188ms | 180ms | 188ms | 218ms | 219ms |
| mobile | login | /login | 200x2 | 230ms | 292ms | 360ms | 292ms | 360ms | 309ms | 310ms |
| mobile | post_detail | /posts/cmpnejuwa000411t0dazcem8h/guest | 200x2 | 307ms | 316ms | 360ms | 680ms | 684ms | 353ms | 354ms |

## Raw Samples

| profile | target | run | status | responseEnd | FCP | LCP | load | totalGoto | bodyText | finalUrl |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| desktop | home | 1 | 200 | 170ms | 572ms | 572ms | 586ms | 588ms | 1156 | https://townpet.vercel.app/ |
| desktop | home | 2 | 200 | 126ms | 192ms | 192ms | 214ms | 215ms | 1156 | https://townpet.vercel.app/ |
| desktop | login | 1 | 200 | 289ms | 392ms | 392ms | 1335ms | 1337ms | 501 | https://townpet.vercel.app/login |
| desktop | login | 2 | 200 | 269ms | 332ms | 332ms | 334ms | 334ms | 501 | https://townpet.vercel.app/login |
| desktop | guest_feed | 1 | 200 | 124ms | 192ms | 192ms | 404ms | 404ms | 1654 | https://townpet.vercel.app/feed/guest |
| desktop | guest_feed | 2 | 200 | 133ms | 208ms | 208ms | 226ms | 228ms | 1654 | https://townpet.vercel.app/feed/guest |
| desktop | post_detail | 1 | 200 | 372ms | 352ms | 652ms | 629ms | 630ms | 1048 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| desktop | post_detail | 2 | 200 | 420ms | 488ms | 788ms | 509ms | 510ms | 1048 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| mobile | home | 1 | 200 | 125ms | 180ms | 180ms | 224ms | 225ms | 1720 | https://townpet.vercel.app/ |
| mobile | home | 2 | 200 | 129ms | 188ms | 188ms | 218ms | 219ms | 1720 | https://townpet.vercel.app/ |
| mobile | login | 1 | 200 | 230ms | 292ms | 292ms | 309ms | 310ms | 169 | https://townpet.vercel.app/login |
| mobile | login | 2 | 200 | 245ms | 360ms | 360ms | 342ms | 343ms | 169 | https://townpet.vercel.app/login |
| mobile | guest_feed | 1 | 200 | 125ms | 188ms | 188ms | 242ms | 243ms | 1269 | https://townpet.vercel.app/feed/guest |
| mobile | guest_feed | 2 | 200 | 128ms | 180ms | 180ms | 211ms | 211ms | 1269 | https://townpet.vercel.app/feed/guest |
| mobile | post_detail | 1 | 200 | 307ms | 316ms | 684ms | 353ms | 354ms | 727 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| mobile | post_detail | 2 | 200 | 312ms | 360ms | 680ms | 401ms | 402ms | 727 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |

