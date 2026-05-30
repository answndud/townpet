# PROGRESS.md

## 현재 상태

- active: `성능 90점 이상 하드닝`.
- 현재 작업: public detail 초기 bundle에서 댓글, 분실 공유 도구, 비회원 관리 메뉴, 게스트 action bar를 분리했고 로컬 production 측정 기준 목표치를 통과했다.
- 최근 검증:
  - `corepack pnpm@9.12.3 -C app test -- 'src/app/posts/[id]/guest/page-layout.test.ts' src/components/posts/post-detail-action-accessibility.test.tsx src/components/posts/post-comment-section-client.test.ts`
  - `corepack pnpm@9.12.3 -C app typecheck`
  - `corepack pnpm@9.12.3 -C app lint`
  - `corepack pnpm@9.12.3 -C app build`
  - 로컬 production mobile route asset: public detail total `233KB`, script `190KB`
  - 로컬 production browser: public detail LCP p50 `380ms`, p95 `388ms`
- 다음 액션: main에 성능 하드닝 코드를 푸시한 뒤 production 배포 반영을 기다려 실제 배포 기준으로 재측정하고 `blog/31`, `docs/COMPLETED.md`를 갱신한다.
