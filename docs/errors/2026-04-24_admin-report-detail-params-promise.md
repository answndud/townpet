# 2026-04-24 admin report detail params promise

## Symptom

`/admin/reports/[id]` rendered the admin error state instead of the report detail page.

The dev server logged:

```text
Route "/admin/reports/[id]" used `params.id`. `params` is a Promise and must be unwrapped with `await` or `React.use()` before accessing its properties.
```

## Cause

The page component still typed `params` as a synchronous object and passed `params.id` into `getReportById`. In the current Next.js App Router runtime, dynamic page params are provided as a Promise. The synchronous access produced `undefined`, which then caused Prisma `findUnique` validation to fail.

## Fix

`app/src/app/admin/reports/[id]/page.tsx` now awaits `params`, stores `reportId`, and uses that resolved value for the report query and reset links.

## Verification

- Desktop/mobile screenshots for `/admin/reports/[id]` render the real detail page after the fix.
- `corepack pnpm -C app lint` passed.
- `corepack pnpm -C app typecheck` passed.
