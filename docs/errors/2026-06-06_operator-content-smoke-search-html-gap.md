# Operator content smoke search HTML gap

- Date: 2026-06-06
- Status: fixed
- Surface: `app/scripts/check-operator-content-public-smoke.ts`

## Problem

The operator content public smoke checked search by fetching `/search/guest` HTML and looking for the first operator post title. That legacy route now converges to `/feed/guest`, so the check could pass or fail based on page shell rendering instead of the actual search result contract.

## Fix

- Validate search results through `/api/search/guest?q=<title>&searchIn=TITLE&limit=10`.
- Keep `/search/guest` only as a legacy shell convergence check.
- Add regression coverage where the legacy HTML contains the title but the search API returns no matching item; the smoke now blocks.

## Verification

- `./node_modules/.bin/vitest run scripts/check-operator-content-public-smoke.test.ts`
- `./node_modules/.bin/eslint scripts/check-operator-content-public-smoke.ts scripts/check-operator-content-public-smoke.test.ts`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `OPS_BASE_URL=https://townpet.vercel.app ./node_modules/.bin/tsx scripts/check-operator-content-public-smoke.ts`
