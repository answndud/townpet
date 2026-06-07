# TownPet Browser Performance Baseline

- generatedAt: 2026-06-07T08:45:39.638Z
- baseUrl: https://townpet.vercel.app
- samplesPerTarget: 3
- settleMsAfterLoad: 3500
- profiles: desktop, mobile
- note: Playwright Chromium 기준 브라우저 navigation/paint/LCP 측정이다.

## Summary

| profile | target | path | status | responseEnd p50 | FCP p50 | FCP p95 | LCP p50 | LCP p95 | load p50 | total goto p50 |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | guest_feed | /feed/guest | 200x3 | 129ms | 196ms | 196ms | 196ms | 196ms | 197ms | 198ms |
| desktop | home | / | 200x3 | 129ms | 208ms | 260ms | 208ms | 260ms | 213ms | 214ms |
| mobile | guest_feed | /feed/guest | 200x3 | 128ms | 176ms | 180ms | 176ms | 180ms | 207ms | 208ms |
| mobile | home | / | 200x3 | 135ms | 188ms | 212ms | 188ms | 212ms | 195ms | 197ms |

## Raw Samples

| profile | target | run | status | responseEnd | FCP | LCP | load | totalGoto | bodyText | finalUrl |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| desktop | home | 1 | 200 | 169ms | 260ms | 260ms | 263ms | 268ms | 1157 | https://townpet.vercel.app/ |
| desktop | home | 2 | 200 | 129ms | 200ms | 200ms | 213ms | 214ms | 1157 | https://townpet.vercel.app/ |
| desktop | home | 3 | 200 | 129ms | 208ms | 208ms | 203ms | 204ms | 1157 | https://townpet.vercel.app/ |
| desktop | guest_feed | 1 | 200 | 129ms | 196ms | 196ms | 241ms | 242ms | 1618 | https://townpet.vercel.app/feed/guest |
| desktop | guest_feed | 2 | 200 | 126ms | 192ms | 192ms | 194ms | 195ms | 1618 | https://townpet.vercel.app/feed/guest |
| desktop | guest_feed | 3 | 200 | 132ms | 196ms | 196ms | 197ms | 198ms | 1618 | https://townpet.vercel.app/feed/guest |
| mobile | home | 1 | 200 | 138ms | 212ms | 212ms | 218ms | 219ms | 1721 | https://townpet.vercel.app/ |
| mobile | home | 2 | 200 | 131ms | 184ms | 184ms | 195ms | 197ms | 1721 | https://townpet.vercel.app/ |
| mobile | home | 3 | 200 | 135ms | 188ms | 188ms | 194ms | 195ms | 1721 | https://townpet.vercel.app/ |
| mobile | guest_feed | 1 | 200 | 126ms | 176ms | 176ms | 209ms | 210ms | 1239 | https://townpet.vercel.app/feed/guest |
| mobile | guest_feed | 2 | 200 | 132ms | 180ms | 180ms | 195ms | 196ms | 1239 | https://townpet.vercel.app/feed/guest |
| mobile | guest_feed | 3 | 200 | 128ms | 176ms | 176ms | 207ms | 208ms | 1239 | https://townpet.vercel.app/feed/guest |
