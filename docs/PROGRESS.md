# PROGRESS.md

기준일: 2026-04-24
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서를 `docs/` 아래 slim active + archive 구조로 재편했다
- 현재 active cycle은 Impeccable 디자인 개선 workflow Phase 2 준비다
- 최근 완료 작업 상세와 과거 검증 로그는 [COMPLETED.md](./COMPLETED.md)로 이동했다

## 열린 blocker
- `corepack pnpm -C app design:detect`: Phase 1 범위 밖 기존 anti-pattern 5건(`globals.css` side border, content/media `bg-black`)이 남아 exit 2.
- `corepack pnpm -C app build`: 필수 로컬 env(`AUTH_SECRET_OR_NEXTAUTH_SECRET_WEAK`, `GUEST_HASH_PEPPER`, `UPSTASH_REDIS_REST_URL_AND_TOKEN_PAIR`, `RESEND_API_KEY`) 누락으로 page data collection 단계에서 실패.

## 직전 검증
- checkpoint commit `896e6df`를 생성하고 `origin/codex/editor-stabilization-finish`에 push했다.
- Phase 1 public entry 구조 정리 완료: `/feed/guest`, `/feed`, `/search/guest`, `/search`.
- 변경 요약: mobile header touch target 44px 계열로 확대, feed control nested surface 축소, public search hero 밀도 조정, empty state를 좌측 정렬 제품 상태로 변경.
- screenshot evidence: `/tmp/townpet-impeccable-phase1/feed-guest-{desktop,mobile}.png`, `/tmp/townpet-impeccable-phase1/search-guest-{desktop,mobile}.png`.
- 통과: `corepack pnpm -C app exec vitest run src/components/navigation/app-shell-header-class.test.ts src/components/posts/feed-control-panel.test.tsx src/components/ui/empty-state.test.tsx`, `corepack pnpm -C app lint`(기존 warning 5개), `corepack pnpm -C app typecheck`.

## 다음 액션
1. Phase 1 변경분 commit/push
2. Phase 2 시작 전 `$impeccable harden`, `$impeccable clarify`, `$impeccable onboard` 관련 문서 재확인
3. `/boards/adoption`, `/posts/new`, `/notifications`, 공통 error/loading 상태를 한 화면군씩 hardening

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
