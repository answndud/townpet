# 2026-04-14 public read DB outage fallbacks

## Summary
- Source issue: Sentry `7410432423`
- Symptom: `PrismaClientInitializationError` from `prisma.siteSetting.findUnique()` caused `/feed` SSR and related public read surfaces to return 500 when the Neon/Postgres pooler was unreachable.
- Scope: guest read policy lookup, public feed, guest feed API, guest search, sitemap, post metadata generation.

## Root Cause
- [policy.queries.ts](/Users/alex/project/townpet/app/src/server/queries/policy.queries.ts) read `guest_read_login_required_types` during public feed render.
- That lookup previously treated schema drift as recoverable, but not DB initialization failures.
- When Neon/Postgres was unreachable, the policy read threw before the rest of the page could apply its existing degraded-mode behavior.

## Fix
- Added [prisma-database-error.ts](/Users/alex/project/townpet/app/src/server/prisma-database-error.ts) to centralize `PrismaClientInitializationError` detection.
- Changed guest read policy lookup to fail closed with `DEFAULT_LOGIN_REQUIRED_POST_TYPES`.
- Added degraded fallbacks on public read surfaces:
  - [feed/page.tsx](/Users/alex/project/townpet/app/src/app/feed/page.tsx)
  - [feed/guest/route.ts](/Users/alex/project/townpet/app/src/app/api/feed/guest/route.ts)
  - [search/page.tsx](/Users/alex/project/townpet/app/src/app/search/page.tsx)
  - [search/guest/route.ts](/Users/alex/project/townpet/app/src/app/api/search/guest/route.ts)
  - [sitemap.ts](/Users/alex/project/townpet/app/src/app/sitemap.ts)
  - [posts/[id]/page.tsx](/Users/alex/project/townpet/app/src/app/posts/[id]/page.tsx)
  - [posts/[id]/guest/page.tsx](/Users/alex/project/townpet/app/src/app/posts/[id]/guest/page.tsx)

## Regression Coverage
- [prisma-database-error.test.ts](/Users/alex/project/townpet/app/src/server/prisma-database-error.test.ts)
- [policy.queries.test.ts](/Users/alex/project/townpet/app/src/server/queries/policy.queries.test.ts)
- [search/guest/route.test.ts](/Users/alex/project/townpet/app/src/app/api/search/guest/route.test.ts)
- [sitemap.test.ts](/Users/alex/project/townpet/app/src/app/sitemap.test.ts)

## Verification
- `corepack pnpm -C app lint ...`
- `corepack pnpm -C app test -- src/server/prisma-database-error.test.ts src/server/queries/policy.queries.test.ts src/app/api/search/guest/route.test.ts src/app/sitemap.test.ts`
- `corepack pnpm -C app typecheck`
- `git diff --check`

## Remaining Risk
- This change prevents policy and metadata reads from taking down public read surfaces first.
- Routes that require live DB content still cannot serve full data during a real outage; they now degrade instead of crashing in the covered paths.
