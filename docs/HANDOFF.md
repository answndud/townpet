# Handoff

## Goal

다음 세션은 현재 세션을 삭제해도 이어받을 수 있게 `docs/PLAN.md`의 `다음 세션 실행 계획 | 운영 증거 기반 다음 개선 루프`를 Phase 0부터 진행한다.

정의상 완료는 측정/audit/UX 점검 결과를 `docs/PROGRESS.md`에 기록하고, 완료된 phase를 `docs/COMPLETED.md`로 archive한 뒤 active plan을 정리하는 것이다.

## Current State

- Branch: `main`.
- Latest pushed commit at handoff creation: `f574628 Document operations verification loop`.
- Worktree was clean before this handoff plan edit.
- `docs/PLAN.md` now contains a next-session active plan with Phase 0~4.
- Previous active implementation work was closed. Before this handoff, `PLAN.md` had `현재 active 작업 없음`.
- Latest blog documentation was updated through `blog/30-운영-검증-문서화-루프.md`.
- Latest known production deployment for `f574628`: `https://townpet-7lknbpxm0-jmoon0227-9736s-projects.vercel.app`, Vercel Ready, alias health returned 200.
- GitHub `docs-quality` for `f574628` succeeded.

## Key Decisions

- Do not start with a feature build. Start with Phase 0 checkpoint, then production performance remeasurement.
- Do not limit the product to one region. `/` and public acquisition UI must not show a user-unselected district as a default.
- Do not change production data without explicit read-only audit, confirmation, and documentation.
- Keep UI work narrow: one screen group or one auxiliary surface per phase.
- Existing compact UI and design-system patterns take priority over new visual systems.

## Files And Entry Points

- Active plan: [docs/PLAN.md](./PLAN.md)
- Latest progress: [docs/PROGRESS.md](./PROGRESS.md)
- Completed archive: [docs/COMPLETED.md](./COMPLETED.md)
- Blog operations loop: [blog/30-운영-검증-문서화-루프.md](../blog/30-운영-검증-문서화-루프.md)
- Operations checklist: [business/operations/배포전_on-demand_체크.md](../business/operations/배포전_on-demand_체크.md)
- Detail visual smoke report: [docs/reports/detail-visual-smoke-2026-05-27T03-58-08-197Z.md](./reports/detail-visual-smoke-2026-05-27T03-58-08-197Z.md)

Important commands:

```bash
git status --short
git log --oneline -5
curl -sS -i https://townpet.vercel.app/api/health
OPS_BASE_URL=https://townpet.vercel.app COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app ops:check:health
PUPPETEER_SKIP_DOWNLOAD=1 COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast
COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app lint
COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app typecheck
```

## Known Problems

- Unknown: whether any newer commits/deployments exist after this handoff. Verify first.
- Production performance browser measurement previously depended on repo-local Playwright browser availability. If browser binaries are missing, record the blocker instead of installing global tools.
- Auth/local detail visual smoke needs the required production auth env/test account context and explicit confirmation.
- Vercel CLI may not be globally installed. Use `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 dlx vercel ...` if needed.

## Next Steps

1. Run Phase 0 from [docs/PLAN.md](./PLAN.md): confirm worktree, latest commit, production health, and stale docs.
2. If stale, update `PLAN/PROGRESS` before code changes.
3. Run Phase 1 production performance remeasurement and save a report under `docs/reports/`.
4. Based on Phase 1, either record no regression or create a narrow follow-up phase.
5. Continue Phase 2 only after Phase 1 is documented.

## Validation

Already completed before this handoff request:

- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app docs:refresh`
- `node scripts/refresh-docs-index.mjs --check`
- `git diff --check`
- GitHub `docs-quality` success for `f574628`
- `https://townpet.vercel.app/api/health` returned 200

Completed for this handoff edit before commit:

- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app docs:refresh`
- `node scripts/refresh-docs-index.mjs --check`
- `git diff --check`

Next session should still re-run Phase 0 because commits/deployments may have changed after this handoff was written.
