# PROGRESS.md

기준일: 2026-04-24
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서를 `docs/` 아래 slim active + archive 구조로 재편했다
- 현재 active cycle은 Impeccable 디자인 개선 workflow Phase 4 준비다
- 최근 완료 작업 상세와 과거 검증 로그는 [COMPLETED.md](./COMPLETED.md)로 이동했다

## 열린 blocker
- `corepack pnpm -C app design:detect`: Phase 3 이후 기존 anti-pattern 1건(`globals.css` blockquote side border)이 남아 exit 2.
- `corepack pnpm -C app build`: 필수 로컬 env(`AUTH_SECRET_OR_NEXTAUTH_SECRET_WEAK`, `GUEST_HASH_PEPPER`, `UPSTASH_REDIS_REST_URL_AND_TOKEN_PAIR`, `RESEND_API_KEY`) 누락으로 page data collection 단계에서 실패.
- Phase 4 admin density 개선: 현재 로컬 DB/admin seed 세션이 없어 `/admin/ops`, `/admin/reports` 화면 evidence를 신뢰성 있게 확보할 수 없음.

## 직전 검증
- checkpoint commit `896e6df`를 생성하고 `origin/codex/editor-stabilization-finish`에 push했다.
- Phase 1 public entry 구조 정리 완료 후 commit `f479001`을 원격에 push했다.
- Phase 2 DB unavailable 화면군 완료: `/boards/adoption`, `/posts/new`.
- 변경 요약: Prisma DB unavailable을 generic error 대신 `ServiceUnavailableState`로 복구 가능한 상태로 표시하고, 모바일에서 제목 줄바꿈이 깨지지 않도록 copy를 짧게 정리했다.
- screenshot evidence: `/tmp/townpet-impeccable-phase2/adoption-unavailable-{desktop,mobile}.png`, `/tmp/townpet-impeccable-phase2/post-new-unavailable-{desktop,mobile}.png`.
- 통과: `corepack pnpm -C app exec vitest run src/components/ui/service-unavailable-state.test.tsx`, `corepack pnpm -C app lint`(기존 warning 5개), `corepack pnpm -C app typecheck`.
- Phase 3 detector slice 완료 후 commit `0bdc471`을 원격에 push했다. `linkified-content`와 `post-detail-media-gallery`의 pure black overlay 4건 제거.
- 통과: `corepack pnpm -C app exec vitest run src/components/posts/post-detail-media-gallery.test.tsx`, `corepack pnpm -C app lint`(기존 warning 5개), `corepack pnpm -C app typecheck`.
- `corepack pnpm -C app design:detect`는 5건에서 1건으로 감소했다.

## 다음 액션
1. 로컬 DB 복구: `corepack pnpm -C app db:restore:local`
2. admin 계정/세션으로 `/admin/ops`, `/admin/reports` desktop/mobile screenshot 확보
3. Phase 4 시작 전 `$impeccable distill`, `$impeccable layout`, `$impeccable audit`, `$impeccable adapt` 관련 문서 재확인

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
