# TownPet Browser Performance Baseline

- generatedAt: 2026-05-27T01:16:57.383Z
- baseUrl: https://townpet.vercel.app
- samplesPerTarget: 3
- settleMsAfterLoad: 800
- profiles: desktop, mobile
- note: Playwright Chromium 기준 브라우저 navigation/paint/LCP 측정이다.

## Summary

| profile | target | path | status | responseEnd p50 | FCP p50 | FCP p95 | LCP p50 | LCP p95 | load p50 | total goto p50 |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | feed | /feed | 200x3 | 242ms | 320ms | 748ms | 320ms | 748ms | 342ms | 343ms |
| desktop | guest_feed | /feed/guest | 200x3 | 136ms | 216ms | 236ms | 216ms | 236ms | 235ms | 236ms |
| desktop | home | / | 200x3 | 139ms | 256ms | 1424ms | 256ms | 1424ms | 213ms | 214ms |
| mobile | feed | /feed | 200x3 | 235ms | 308ms | 340ms | 308ms | 340ms | 338ms | 339ms |
| mobile | guest_feed | /feed/guest | 200x3 | 140ms | 200ms | 212ms | 204ms | 212ms | 253ms | 255ms |
| mobile | home | / | 200x3 | 134ms | 196ms | 200ms | 196ms | 200ms | 224ms | 225ms |

## Raw Samples

| profile | target | run | status | responseEnd | FCP | LCP | load | totalGoto | bodyText | finalUrl |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| desktop | home | 1 | 200 | 783ms | 1424ms | 1424ms | 1597ms | 1599ms | 420 | https://townpet.vercel.app/ |
| desktop | home | 2 | 200 | 136ms | 200ms | 200ms | 213ms | 214ms | 798 | https://townpet.vercel.app/ |
| desktop | home | 3 | 200 | 139ms | 256ms | 256ms | 211ms | 212ms | 798 | https://townpet.vercel.app/ |
| desktop | feed | 1 | 200 | 660ms | 748ms | 748ms | 941ms | 942ms | 1234 | https://townpet.vercel.app/feed/guest |
| desktop | feed | 2 | 200 | 242ms | 320ms | 320ms | 342ms | 343ms | 1234 | https://townpet.vercel.app/feed/guest |
| desktop | feed | 3 | 200 | 232ms | 308ms | 308ms | 327ms | 328ms | 1234 | https://townpet.vercel.app/feed/guest |
| desktop | guest_feed | 1 | 200 | 136ms | 216ms | 216ms | 235ms | 236ms | 1234 | https://townpet.vercel.app/feed/guest |
| desktop | guest_feed | 2 | 200 | 136ms | 212ms | 212ms | 230ms | 231ms | 1234 | https://townpet.vercel.app/feed/guest |
| desktop | guest_feed | 3 | 200 | 138ms | 236ms | 236ms | 361ms | 362ms | 1234 | https://townpet.vercel.app/feed/guest |
| mobile | home | 1 | 200 | 136ms | 196ms | 196ms | 210ms | 211ms | 1332 | https://townpet.vercel.app/ |
| mobile | home | 2 | 200 | 133ms | 200ms | 200ms | 226ms | 227ms | 1332 | https://townpet.vercel.app/ |
| mobile | home | 3 | 200 | 134ms | 196ms | 196ms | 224ms | 225ms | 1332 | https://townpet.vercel.app/ |
| mobile | feed | 1 | 200 | 226ms | 284ms | 284ms | 312ms | 313ms | 1015 | https://townpet.vercel.app/feed/guest |
| mobile | feed | 2 | 200 | 235ms | 340ms | 340ms | 348ms | 349ms | 1015 | https://townpet.vercel.app/feed/guest |
| mobile | feed | 3 | 200 | 242ms | 308ms | 308ms | 338ms | 339ms | 1015 | https://townpet.vercel.app/feed/guest |
| mobile | guest_feed | 1 | 200 | 140ms | 192ms | 204ms | 253ms | 255ms | 1015 | https://townpet.vercel.app/feed/guest |
| mobile | guest_feed | 2 | 200 | 140ms | 212ms | 212ms | 288ms | 289ms | 1015 | https://townpet.vercel.app/feed/guest |
| mobile | guest_feed | 3 | 200 | 129ms | 200ms | 200ms | 226ms | 227ms | 1015 | https://townpet.vercel.app/feed/guest |
