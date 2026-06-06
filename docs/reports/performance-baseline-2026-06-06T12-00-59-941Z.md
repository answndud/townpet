# TownPet Performance Baseline

- generatedAt: 2026-06-06T12:00:59.941Z
- baseUrl: https://townpet.vercel.app
- samplesPerTarget: 10
- pauseMs: 200
- slowThresholdMs: 1000
- note: Node fetch 기반 서버/다운로드 측정이며, 브라우저 FCP/LCP/hydration 측정은 별도 Playwright 단계에서 추가한다.

## Summary

| target | path | status | redirects | p50 header | p95 header | p50 total | p95 total | first total | warm p50 total | p50 bytes | slow |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| post_detail | /posts/cmpnejuwa000411t0dazcem8h/guest | 200x10 | 0 | 244ms | 3101ms | 356ms | 6323ms | 6323ms | 356ms | 53,287B | 1 |

## Raw Samples

| target | run | status | redirected | header | total | bytes | cache | age | finalUrl |
|---|---:|---:|---:|---:|---:|---:|---|---:|---|
| post_detail | 1 | 200 | no | 3101ms | 6323ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 2 | 200 | no | 516ms | 587ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 3 | 200 | no | 284ms | 356ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 4 | 200 | no | 244ms | 310ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 5 | 200 | no | 463ms | 525ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 6 | 200 | no | 228ms | 297ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 7 | 200 | no | 219ms | 420ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 8 | 200 | no | 463ms | 530ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 9 | 200 | no | 222ms | 290ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |
| post_detail | 10 | 200 | no | 228ms | 306ms | 53,287B | MISS | 0 | https://townpet.vercel.app/posts/cmpnejuwa000411t0dazcem8h/guest |

## Next Measurement

- Add browser performance trace for FCP/LCP/hydration and route transition timing.
- Re-run this exact baseline command after `/` shell/feed/comment optimizations.
- Use the same `samplesPerTarget`, target URL set, and base URL for before/after comparison.

