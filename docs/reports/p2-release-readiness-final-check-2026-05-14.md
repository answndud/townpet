# P2 릴리즈 준비 트랙 최종 점검

작성일: 2026-05-14

## 결론

P2 릴리즈 준비 트랙의 active 개발 작업은 현재 기준으로 남아 있지 않다.

현재 상태는 `release-ready candidate`다.
단, 실제 production 배포 판정은 배포 시점의 on-demand 체크를 통과해야 한다.

## 완료된 축

| 축 | 완료 근거 | 상태 |
| --- | --- | --- |
| 기본 품질 게이트 | `quality:check`가 lint/typecheck/Vitest/Next build까지 통과 | 완료 |
| 모바일 touch target | P2-4~P2-20 source/unit sweep, P2-21~P2-26 visual smoke | 완료 |
| 핵심 visual smoke | feed/search/detail, post create/editor, comment/report, care feedback mobile | 완료 |
| hotpath e2e 범위 | `hotpath-e2e-scope-2026-05-14.md`로 상시/on-demand 분류 | 완료 |
| 배포 전 체크 순서 | `배포전_on-demand_체크.md`에 `quality:check -> 변경 범위별 e2e -> 배포 -> ops health` 문서화 | 완료 |
| 운영 루틴 표현 | README, AGENTS, app README가 health-only smoke와 on-demand e2e 기준으로 동기화 | 완료 |

## 현재 남은 조건부 작업

아래는 P2 active 개발 잔여가 아니라, 실제 변경/배포 시점에만 실행하는 조건부 체크다.

| 조건 | 실행 |
| --- | --- |
| 일반 코드 변경 후 배포 전 | `corepack pnpm@9.12.3 -C app quality:check` |
| feed/search/write/comment/report/admin policy 변경 | `corepack pnpm@9.12.3 -C app test:e2e:hotpath` |
| auth/session/social link 변경 | `ENABLE_SOCIAL_DEV_LOGIN=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app test:e2e:auth` |
| UI/touch target/layout 변경 | visual smoke 4개 직접 실행 |
| care request 상태 흐름 변경 | `e2e/care-request-flow.spec.ts` 직접 실행 |
| OAuth provider/redirect/env 변경 | GitHub Actions `oauth-real-e2e` 수동 실행 |
| 배포 완료 후 | `OPS_BASE_URL=https://townpet.vercel.app corepack pnpm@9.12.3 -C app ops:check:health` |

## 의도적 보류

아래는 이번 P2 릴리즈 준비 트랙의 완료 조건에서 제외한다.

- 결제/보험/정산
- 자동 제재 강행
- 카카오맵 deep feature
- 마켓/공동구매 deep feature 확장
- 전체 Playwright 전수 실행
- 실 OAuth 실계정 검증
- production secrets가 필요한 strict/internal health 검증

이 항목들은 필요 조건이 충족되는 별도 작업에서 다룬다.

## 판정

- `PLAN.md` active 작업: 없음
- `PROGRESS.md` active 작업: 없음
- P2 릴리즈 준비 트랙 개발 잔여: 없음
- 다음 작업 성격: 새 개발 사이클을 시작하거나, 실제 배포 시점에 on-demand 체크를 실행

운영자가 지금 배포를 진행하려면 [배포전_on-demand_체크.md](../../business/operations/배포전_on-demand_체크.md)를 따른다.
