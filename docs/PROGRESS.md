# PROGRESS.md

## 현재 상태

- 작업: `Release Confidence Hardening P1-6`
- 상태: `in_progress`
- 현재 초점: `post.queries.ts`의 남은 orchestration/fallback 경계를 작은 module로 분리한다.

## 변경/탐색한 파일

- 최근 변경:
  - `app/src/server/queries/posts/post-list-search-document-fallback.ts`
  - `app/src/server/queries/posts/post-ranked-search-hydration.ts`
  - `app/src/server/queries/posts/post-ranked-search-document-fallback.ts`
  - `app/src/server/queries/posts/post-list-fetch-fallback.ts`
  - `app/src/server/queries/posts/post.queries.ts`
- 최근 결과:
  - `post.queries.ts`를 4850줄에서 2412줄까지 축소했다.
  - `post-create-form`은 298줄 수준까지 축소해 현재 P1-6의 첫 큰 경계를 완료했다.

## 직전 검증

- `corepack pnpm@9.12.3 -C app exec vitest run src/server/queries/post.queries.test.ts` PASS
- `corepack pnpm@9.12.3 -C app typecheck` PASS
- `corepack pnpm@9.12.3 -C app lint` PASS
- GitHub Actions `docs-quality`, `quality-gate`, `browser-smoke` PASS

## Blocker

- 현재 known blocker 없음.

## 다음 액션

1. `listRankedSearchPosts`의 cache/run orchestration 경계를 분리한다.
2. 어렵거나 결합이 크면 post detail fallback 경계를 먼저 분리한다.
3. public API/result shape를 유지하고 targeted test, `typecheck`, `lint`를 실행한다.
