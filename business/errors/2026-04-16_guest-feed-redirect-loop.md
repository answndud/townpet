# 2026-04-16 guest-feed-redirect-loop

## 증상

- 배포 환경에서 `/feed` 진입 시 페이지가 반복 새로고침되는 것처럼 보였다.
- HTML 응답에 `NEXT_REDIRECT;replace;/feed;307;`와 `__next-page-redirect` 메타가 포함됐다.

## 원인

- `app/src/app/feed/guest/page.tsx`를 canonical `/feed` redirect 전용 페이지로 바꾼 뒤, production 응답에서 `/feed` 본문에도 동일 redirect 메타가 섞여 나왔다.
- 로컬 dev에서는 재현되지 않았지만, 배포 환경에서는 guest feed redirect가 `/feed` 렌더 트리에 섞이며 self-redirect loop처럼 동작했다.

## 수정

- `app/src/app/feed/guest/page.tsx`를 redirect 페이지에서 원래의 guest client entry로 복구했다.
- `app/src/components/posts/guest-feed-page-client.tsx`를 복구해 guest feed 초기 로딩과 API fetch를 다시 담당하게 했다.
- redirect 헬퍼 `app/src/lib/posts/guest-feed-route.ts`와 해당 테스트는 제거했다.

## 회귀 방지

- `app/src/app/feed/guest/page.test.tsx`를 추가해 guest page가 redirect를 던지지 않고 로딩 셸을 렌더하는지 확인한다.

## 검증

- `corepack pnpm -C app exec vitest run src/app/feed/guest/page.test.tsx`
- `corepack pnpm -C app typecheck`
- 로컬 `curl http://localhost:3000/feed` 응답에 self redirect 메타가 없는지 확인
