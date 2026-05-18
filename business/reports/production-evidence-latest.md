# Production Evidence Latest

Date: 2026-05-18

## Scope

Solo-operator production smoke for TownPet.

This evidence intentionally uses the reduced 1인 운영 path documented in `business/operations/운영_문서_안내.md`: public health only, no browser smoke, no production test data, no external OAuth account flow.

## Result

- Status: `PASS`
- Base URL: `https://townpet.vercel.app`
- Profile: `solo`
- Command: `OPS_BASE_URL=https://townpet.vercel.app corepack pnpm@9.12.3 -C app ops:evidence:solo`
- Local evidence file: `docs/reports/ops-evidence-2026-05-18T07-11-40-233Z.md`
- Evidence file tracking: ignored by git as local evidence

## Health Evidence

- Endpoint: `https://townpet.vercel.app/api/health`
- HTTP status: `200`
- Payload status: `ok`
- Payload timestamp: `2026-05-18T07:11:43.599Z`
- Elapsed: `2922ms`
- Runner step: `health`
- Runner status: `PASS`
- Runner duration: `3518ms`

## Release Readiness Judgment

- Solo health smoke: `PASS`
- Full strict release readiness: `not asserted`

Unknowns not covered by this solo evidence:

- Internal health diagnostics, because no `OPS_HEALTH_INTERNAL_TOKEN` was used.
- `pg_trgm` requirement check, because internal health was not requested.
- Strict security env preflight against production secrets, because solo profile intentionally skips it.
- Browser smoke and real OAuth account checks, because those are on-demand checks only.

## Follow-up

- For everyday solo operation, this is enough to confirm production is alive.
- For release-candidate or incident checks involving env, DB extension, auth, or browser behavior, run the relevant on-demand checks from `business/operations/배포전_on-demand_체크.md`.
