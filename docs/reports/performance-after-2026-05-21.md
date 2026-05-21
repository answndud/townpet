# TownPet Performance Improvement Summary

- generatedAt: `2026-05-21`
- scope: `/`, `/feed`, `/feed/guest`, comment mutation UX, public route assets, DB readiness
- rule: framework and database replacement were explicitly out of scope. Next.js and PostgreSQL stayed in place.

## Baseline Evidence

| area | evidence | key numbers |
| --- | --- | --- |
| production server fetch | `performance-baseline-2026-05-21T02-23-06-258Z.md` | `/` first total `333ms`, `/feed` first total `311ms`, `/feed/guest` first total `120ms`, `/api/health` first total `355ms` |
| production browser | `performance-browser-baseline-2026-05-21T02-23-07-878Z.md` | desktop FCP/LCP: `/` `632/632ms`, `/feed` `424/424ms`, `/feed/guest` `236/248ms` |
| local browser after home shell | `performance-browser-baseline-2026-05-21T02-33-01-945Z.md` | desktop FCP/LCP: `/` `124/124ms`, `/feed` `908/908ms`, `/feed/guest` `416/416ms` |
| route assets after chunk split | `performance-route-assets-2026-05-21T02-51-45-079Z.md` | local production `/feed/guest`: script transfer `173KB`, CSS transfer `79KB`, FCP/LCP `56/56ms` |
| DB readiness | `performance-db-readiness-2026-05-21T03-06-07-505Z.md` | production header path showed `icn1` edge and `icn1 -> sin1` API runtime signals; main query surfaces had static index coverage |

## Applied Changes

| change | purpose | result |
| --- | --- | --- |
| `/` static fast shell | remove redirect-to-feed and avoid DB-bound first HTML | `/` became static shell with immediate product CTA and delayed feed preview |
| delayed home feed preview | avoid blocking first paint on feed data | home can render even when local DB is down; feed preview falls back safely |
| header community fetch moved client-side | remove server DB dependency from root layout | root layout no longer waits for `listCommunityNavItems(50)` |
| feed first-page count skip | reduce first page read path | `ALL` first page can render from `listPosts` + `nextCursor` without `countPosts` |
| default personalization context lazy | avoid hidden personalization reads on normal feed | audience/pet/recent engagement reads run only for explicit personalized feed |
| comment pending preview | improve perceived mutation latency | UI reacts immediately and rolls back on failure |
| comment duplicate refresh removal | avoid full route refresh after comment API reload | detail page uses comment section reload when available |
| auth-only header chunk split | keep guest initial route lighter | `AuthControls` and `NotificationBell` load dynamically after viewer state requires them |
| DB readiness harness | separate region/pooling/index questions from code tuning | slow query top candidates and `EXPLAIN` commands are documented |

## Important Findings

- The reported 10s delay was not reproduced as a constant server HTML TTFB problem in the short production samples.
- Browser and cold-start effects still matter, so the project now measures server fetch, browser paint, route asset transfer, and DB readiness separately.
- Current static coverage shows the main feed/search/comment/report surfaces already have relevant index signals.
- Production DB provider region and pooler status cannot be proven from repo files or local env; this remains a dashboard/runtime configuration check.

## Remaining Work

1. Run the same measurements after the latest `main` deployment is live.
2. Confirm production DB provider region and whether the runtime `DATABASE_URL` uses a serverless pooler.
3. Run the documented `EXPLAIN (ANALYZE, BUFFERS)` statements against production-like data before adding migrations.
4. Add a real post detail path to browser and asset measurements with `PERF_POST_ID` or `PERF_POST_PATH`.
5. Keep the next product work focused on regional acquisition pages only after the performance story is documented.
