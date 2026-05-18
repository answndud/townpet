# TownPet Backend Portfolio Case Study

Last updated: 2026-05-18

## Purpose

TownPet is a service-style backend portfolio project for a pet community product. It is not only a board UI. The backend surface includes authentication, guest safety, structured posting, search, moderation, notifications, admin operations, retention cleanup, health checks, deployment preflight, and regression tests.

## Backend Snapshot

- Runtime app: Next.js App Router in `app/`
- Data layer: Prisma + PostgreSQL
- Validation: Zod schemas under `app/src/lib/validations`
- Write orchestration: services under `app/src/server/services`
- Read models: queries under `app/src/server/queries`
- API routes: 48 App Router route handlers
- Tests: 229 Vitest test files and 25 Playwright specs
- Operations: health, security env preflight, latency snapshot, cleanup and repair scripts

## Domain Model Highlights

The schema models a community product rather than a CRUD demo:

- Identity and access: `User`, `Account`, `Session`, `PasswordResetToken`, `AuthAuditLog`
- Community structure: `Neighborhood`, `Community`, `CommunityCategory`, `UserNeighborhood`
- Content: `Post`, `Comment`, `PostReaction`, `PostBookmark`, `PostImage`
- Structured boards: hospital reviews, walk routes, market listings, care requests, adoption, volunteer, place review, meetup, lost/found, Q&A
- Safety and moderation: `Report`, `ReportAudit`, `UserSanction`, `ModerationActionLog`, `GuestAuthor`, `GuestBan`, `GuestViolation`
- Operations and analytics: `SearchTermStat`, `SearchTermDailyMetric`, `Notification`, `NotificationDelivery`, feed personalization stats and event logs

## Architecture Decisions

### 1. Policy-first service layer

High-risk flows are handled in service modules, not only UI checks. Write paths for posts, comments, reactions, reports, uploads, guest management, sanctions, and moderation actions go through backend policy enforcement.

Evidence:

- `app/src/server/services/posts/*`
- `app/src/server/services/moderation/*`
- `app/src/server/services/auth/*`
- `app/src/server/services/notifications/*`

### 2. Read model separation

List/detail/search/admin screens use query modules so read behavior can be optimized without mixing write-side policy orchestration.

Evidence:

- `app/src/server/queries/posts/*`
- `app/src/server/queries/moderation/*`
- `app/src/server/queries/notifications/*`
- `app/src/server/queries/ops-overview.queries.ts`

### 3. Guest support with explicit safety controls

Guest read/write is product-critical, but guest flows are separated from authenticated write paths and guarded with rate limits, guest hashes, step-up checks, and moderation visibility rules.

Evidence:

- `app/src/server/guest-step-up.ts`
- `app/src/server/services/guest-author.service.ts`
- `app/src/server/services/moderation/guest-safety.service.ts`
- `app/src/server/services/posts/post-guest-management.service.ts`

### 4. Operations are part of the backend

The project includes production-oriented checks instead of only local tests.

Evidence:

- `app/scripts/check-health-endpoint.ts`
- `app/scripts/check-security-env.ts`
- `app/scripts/run-ops-evidence.ts`
- `app/scripts/collect-latency-snapshot.ts`
- `.github/workflows/quality-gate.yml`
- `.github/workflows/ops-smoke-checks.yml`

## Security And Abuse Work

Completed security work includes:

- health response minimization and internal diagnostics token
- CSP strict mode path
- password policy, login lockout, session invalidation
- guest identifier hardening with HMAC pepper
- auth enumeration-safe responses
- production security env preflight
- uploaded image provenance enforcement
- comment response minimization
- admin surface concealment and privileged audit trails
- guest write/read override hardening

Source of truth:

- `business/security/보안_계획.md`
- `business/security/보안_위험_등록부.md`
- `business/security/보안_진행상황.md`

## Reliability And Operations

The backend has a minimal solo-operator routine:

- `corepack pnpm -C app quality:check`
- `corepack pnpm -C app ops:check:health`
- `corepack pnpm -C app db:restore:local`

It also has on-demand tools:

- security env strict check
- Sentry ingestion check
- latency snapshot
- notification cleanup and delivery outbox retry
- auth audit cleanup
- search-term cleanup
- post integrity repair
- guest legacy maintenance

## API Surface

See `business/reports/api-route-inventory.md` for the route map. The most backend-relevant route groups are:

- `/api/auth/*`
- `/api/posts/*`
- `/api/feed/*`
- `/api/search/*`
- `/api/reports/*`
- `/api/admin/*`
- `/api/notifications`
- `/api/upload`
- `/api/health`

## Test Strategy

The project uses layered verification:

- Unit/integration: service, query, validation, script behavior
- API route tests: request parsing, authorization, failure paths
- Playwright: feed/search/auth/report/notification/editor hot paths
- Quality gate: lint, typecheck, Vitest, Next build
- Operations checks: health, security env, latency, Sentry optional smoke

Main command:

```bash
corepack pnpm@9.12.3 -C app quality:check
```

## Current Improvement Targets

These are intentionally small, portfolio-visible next slices:

1. Run the full `quality:check` once after the P1 portfolio slices and archive the result.
2. Keep production evidence reports current after each release candidate.
3. Pause broad post-query extraction unless a future slice has an obvious public behavior contract.

## Interview Talking Points

- Why Local/Global is treated as a policy boundary, not only a UI filter.
- How guest writing can exist without letting abuse bypass moderation.
- Why read models and write services are separated.
- How security env preflight prevented broken production deploys.
- How the project balances solo-operator simplicity with release safety.
- What parts were deliberately postponed: payment, automatic hard sanctions, map-heavy flows, and deep marketplace workflows.

## Known Tradeoffs

- The project has strong breadth, but some backend modules are still large.
- API route methods, adjacent tests, and access/validation/monitoring heuristic labels now have a generated check path; heuristic labels still require human review before they are treated as policy evidence.
- Sentry is optional, so observability is currently health/log/script based unless external secrets are configured.
- Production smoke is intentionally small for solo operation; deeper browser smoke is on-demand.
