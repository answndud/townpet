# PLAN.md

목표: TownPet를 기능/운영/품질 기준에서 출시 가능한 반려 커뮤니티 상태로 끌어올린다.

완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 범위/원칙

- 우선순위: `서비스 안정성 -> 커뮤니티 핵심 기능 -> 재방문/유입 -> 운영 자동화`
- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다.
- 완료 상세와 긴 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append한다.
- Phase 2 보류: 결제/보험/정산, 자동 제재 강행, 카카오맵/마켓/공동구매 deep feature 확장.

## Active

운영 인터럽트 메모:
- `2026-05-12` Vercel deploy blocker였던 security-env build preflight recurrence hardening을 완료했고, 상세 변경/검증은 [COMPLETED.md](./COMPLETED.md)에 기록합니다.
- 현재 active feature work는 아래 `Release Confidence Hardening P1-6`로 복귀합니다.

### Release Confidence Hardening P1-6

- 상태: `in_progress`
- 목표: 거대 컴포넌트와 monolith query/service를 책임 단위로 분해해 회귀 수정 속도와 리뷰 품질을 높인다.
- 대상:
  - `app/src/components/posts/post-detail-client.tsx`
  - `app/src/components/posts/post-comment-thread.tsx`
  - `app/src/components/posts/feed-infinite-list.tsx`
  - `app/src/app/feed/page.tsx`
  - `app/src/server/queries/posts/post.queries.ts`
  - `app/src/server/services/posts/post.service.ts`
- 이미 완료한 큰 경계:
  - `post-create-form`은 상태, 옵션, draft, structured fields, shell, submit orchestration 분리를 완료했다.
  - `post.queries`는 상세 read model, care detail, legacy select, engagement, guest meta, search support, user posts, ranked search, list where/include/args/fallback, post detail fallback 계열 분리를 진행했다.
  - 최근 기준 `post.queries.ts`는 4850줄에서 2299줄까지 축소됐다.
  - `post.service`는 create service, reaction/bookmark engagement service, delete service, guest-management service, market workflow service, care workflow service, update service, write support 분리를 진행했고, 최근 기준 `post.service.ts`는 3210줄에서 156줄까지 축소됐다.
  - `post-detail-client`는 detail type/presenter, primary card/media/actions, detail info panel 분리를 진행했고, 최근 기준 1727줄에서 691줄까지 축소됐다.
  - `post-comment-thread`는 type/presenter, root form, pagination, best comment item 분리를 진행했고, 최근 기준 1135줄에서 894줄까지 축소됐다.
  - `feed/page`는 feed support, item mapping, pagination 분리를 진행했고, 최근 기준 1102줄에서 884줄까지 축소됐다.
  - Vitest config는 Vite 7 ESM 로딩 기준에 맞춰 `.mts`로 전환하고 `vite-tsconfig-paths` 의존성을 제거했다.
- 다음 액션:
  - P1-6 대상 파일 전체 줄 수와 책임 경계를 재점검한다.
  - 남은 과대 파일이 있으면 추가 분리하고, 없으면 P1-6 완료 archive로 정리한다.
- 검증:
  - 변경 slice마다 `post.queries.test.ts`, `post.service.test.ts`, 또는 해당 targeted test
  - `corepack pnpm@9.12.3 -C app typecheck`
  - `corepack pnpm@9.12.3 -C app lint`
  - 필요 시 GitHub `quality-gate`, `browser-smoke`
- 완료 기준:
  - 핵심 파일이 700~900줄 이하 또는 명확한 책임 단위로 줄어든다.
  - public API/result shape가 유지된다.
  - 관련 targeted test와 품질 게이트가 통과한다.

## 다음 작업 후보

- P1-7: 운영 관리자 루틴을 10분 smoke로 고정한다.
- P2-1: client `useEffect` fetch 표면을 정리한다.
- P2-2: production maintenance workflow guard를 강화한다.
- P2-3: UX/error boundary/mobile/accessibility를 보강한다.
