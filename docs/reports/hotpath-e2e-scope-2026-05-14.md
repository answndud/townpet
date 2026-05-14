# Hotpath E2E 범위 재선별

작성일: 2026-05-14

## 목적

`quality:check`가 lint, typecheck, unit, production build를 통과한 뒤에도 브라우저에서만 잡히는 클릭/URL/state 회귀가 남을 수 있다.
다만 1인 운영 기준에서는 모든 Playwright spec를 상시 실행하면 비용과 대기 시간이 커진다.

이 문서는 `test:e2e:*` 묶음을 상시 품질 게이트가 아니라 on-demand 유지보수 도구로 분류하고, 어떤 상황에서 어떤 spec를 실행할지 정한다.

## 결론

- 상시 품질 기준은 `corepack pnpm@9.12.3 -C app quality:check`로 유지한다.
- GitHub Actions에서 Playwright browser smoke는 `workflow_dispatch` 수동 실행 전용으로 낮춘다.
- `test:e2e:hotpath`는 “배포 전 또는 기능 회귀 의심 시” 실행하는 on-demand 기능 hotpath 묶음으로 유지한다.
- 최근 추가한 visual smoke 4개는 hotpath script에 합치지 않고, UI/touch target 변경 때 직접 실행한다.
- OAuth real provider 검증은 secrets와 외부 공급자 상태가 필요하므로 별도 workflow로 유지한다.

## 실행 계층

| 계층 | 명령/워크플로우 | 실행 시점 | 포함 범위 | 판단 |
| --- | --- | --- | --- | --- |
| 기본 품질 | `corepack pnpm@9.12.3 -C app quality:check` | 로컬/CI 기본 | lint, typecheck, Vitest, Next build | 상시 |
| 브라우저 smoke | `.github/workflows/browser-smoke.yml` 또는 `pnpm -C app test:e2e:smoke` | 배포 전 수동, 로그인/소셜/에디터 진입 의심 시 | loading skeleton, Kakao/Naver entry, social onboarding, editor toolbar | on-demand |
| 기능 hotpath | `pnpm -C app test:e2e:hotpath` | feed/search/write/comment/report/notification/admin policy 변경 후 | 검색/게시판 필터, 게스트 글 관리, 댓글 auth sync, 알림 필터, 신규 유저 정책, 신고 흐름 | on-demand 유지 |
| 인증 hardening | `pnpm -C app test:e2e:auth` | auth/session/profile/social link 변경 후 | 세션 정규화, suspended login 차단, 소셜 계정 연결/해제 | on-demand 유지 |
| 모바일 visual | 직접 spec 지정 | UI/touch target/layout 변경 후 | feed/search/detail, post create/editor, comment/report, care feedback mobile | on-demand 직접 실행 |
| Care flow | 직접 `e2e/care-request-flow.spec.ts` 지정 | care request 정책/상태 변경 후 | care 작성/지원/완료/피드백/admin queue | on-demand 직접 실행 |
| OAuth real | `.github/workflows/oauth-real-e2e.yml` | OAuth secrets/redirect 변경 후 | Kakao/Naver 실제 redirect | secrets 필요, 별도 유지 |

## 현재 유지할 hotpath script

`test:e2e:hotpath`는 다음 6개 spec를 유지한다.

- `e2e/search-and-board-filtering.spec.ts`
- `e2e/guest-post-management.spec.ts`
- `e2e/post-comment-auth-sync.spec.ts`
- `e2e/notification-filter-controls.spec.ts`
- `e2e/admin-new-user-policy.spec.ts`
- `e2e/report-flow.spec.ts`

유지 이유:

- 과거 feed/search 클릭 필터 회귀를 직접 잡는 범위다.
- guest write/edit/delete, comment auth sync, report create/admin dismiss는 사용자 hotpath와 운영 hotpath를 얇게 연결한다.
- notification filter와 new-user policy는 기능 자체는 작지만 URL/state 저장 회귀가 생기기 쉬워 기능 hotpath에 남긴다.

## hotpath script에 넣지 않을 것

- `feed-search-detail-visual-smoke.spec.ts`
- `post-create-editor-visual-smoke.spec.ts`
- `comment-report-visual-smoke.spec.ts`
- `care-feedback-mobile.spec.ts`

이유:

- visual smoke는 touch target/overflow 회귀 확인용이다.
- 기능 성공 여부보다 layout bounding box를 보는 테스트라 기능 hotpath와 실패 해석이 다르다.
- UI/touch target 변경이 있을 때 직접 4개를 묶어 실행하는 편이 유지 비용이 낮다.

직접 실행 명령:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app exec playwright test \
  e2e/feed-search-detail-visual-smoke.spec.ts \
  e2e/post-create-editor-visual-smoke.spec.ts \
  e2e/comment-report-visual-smoke.spec.ts \
  e2e/care-feedback-mobile.spec.ts \
  --project=chromium
```

## 배포 전 권장 순서

1. `corepack pnpm@9.12.3 -C app quality:check`
2. 변경 범위가 feed/search/write/comment/report/admin policy 중 하나라면 `corepack pnpm@9.12.3 -C app test:e2e:hotpath`
3. 변경 범위가 auth/session/social link라면 `ENABLE_SOCIAL_DEV_LOGIN=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app test:e2e:auth`
4. 변경 범위가 UI/touch target/layout이면 위 visual smoke 4개 직접 실행
5. 배포 후에는 `corepack pnpm@9.12.3 -C app ops:check:health`

## 보류

- 전체 `pnpm -C app test:e2e` 전수 실행:
  - 대규모 refactor, Playwright config 변경, auth/provider 변경처럼 test harness 자체가 흔들릴 때만 실행한다.
- `browser-smoke.yml` push trigger:
  - 1인 운영 기준에서는 main push마다 Playwright를 강제하지 않는다.
  - 필요할 때 Actions에서 수동 실행한다.
