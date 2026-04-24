# 2026-04-24 search result telemetry null type

## Symptom

Final browser spot-check on `/search/guest?q=강아지` showed a console error:

```text
Failed to load resource: the server responded with a status of 400 (Bad Request)
```

The dev server showed the failing request was `POST /api/search/log`.

## Cause

`SearchResultTelemetry` sent `type: null` for guest search result telemetry when no post type filter was selected. The `/api/search/log` contract accepts an optional `type`, but not a literal `null`, so Zod rejected the payload.

## Fix

`buildSearchResultTelemetryPayload` now omits optional `scope` and `type` fields when they are not set, while preserving normalized query, result stage, result count, and `searchIn`.

## Verification

- `corepack pnpm -C app exec vitest run src/components/posts/search-result-telemetry.test.ts src/app/api/search/log/route.test.ts` passed.
- Browser spot-check on `/search/guest?q=강아지` passed with `consoleErrors: []`.
- `corepack pnpm -C app design:detect` passed.
- `corepack pnpm -C app quality:check` passed, 193 files / 926 tests.
- Local inline env `corepack pnpm -C app build` passed.
