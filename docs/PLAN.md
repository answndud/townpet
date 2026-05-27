# PLAN.md

목표: TownPet를 기능/운영/품질/속도 기준에서 실제 유저 획득이 가능한 동네 반려생활 정보 서비스 상태로 유지한다.

완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 범위/원칙

- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다.
- 완료 상세와 긴 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append한다.
- 새 작업을 시작할 때는 코드보다 먼저 이 문서에 새 phase를 추가한다.
- 지역을 하나로 제한하지 않는다. `/`과 public acquisition UI에는 사용자가 선택하지 않은 특정 지역명을 기본값처럼 노출하지 않는다.
- 보류 범위: 결제/보험/정산, 자동 제재 강행, 카카오맵/마켓/공동구매 deep feature 확장.

## Active

### 다음 세션 실행 계획 | 운영 증거 기반 다음 개선 루프

상태: 계획 수립 완료, 구현 미착수.

목표:
- 최신 `main` production 상태를 다시 측정하고, 실제 사용자-facing 화면에서 남은 밀도/CTA/보조 surface 문제를 확인한 뒤, 다음 제품 개발 phase를 근거 있게 선정한다.
- 한 번에 여러 화면군을 고치지 않고, 측정 -> audit -> 좁은 UX 개선 -> 다음 기능 선정 순서로 진행한다.

공통 원칙:
- 코드보다 문서를 먼저 갱신한다.
- 기존 디자인 시스템과 현재 compact 기준을 우선한다.
- 지역을 하나로 제한하지 않는다. `/`과 public acquisition UI에는 사용자가 선택하지 않은 특정 지역명을 기본값처럼 노출하지 않는다.
- 운영 DB 변경, production 게시/수정/삭제는 read-only audit 또는 별도 승인/명시 confirmation 없이 실행하지 않는다.
- 각 phase 종료 시 `docs/PROGRESS.md`에 결과를 기록하고, 완료된 phase는 `docs/COMPLETED.md`로 archive한다.

#### Phase 0. 세션 재개 체크포인트

목표:
- 이전 세션의 문서/배포 상태와 현재 worktree를 확인하고, 다음 작업을 안전하게 시작한다.

대상:
- [docs/HANDOFF.md](./HANDOFF.md)
- [docs/PLAN.md](./PLAN.md)
- [docs/PROGRESS.md](./PROGRESS.md)
- [docs/COMPLETED.md](./COMPLETED.md)
- `git status`, 최신 `main`, Vercel/health 상태

수정 범위:
- 문서가 stale하면 `PLAN/PROGRESS`만 최소 갱신한다.

하지 않을 것:
- 앱 코드 수정
- production 데이터 변경
- 새 기능 착수

완료 기준:
- 현재 branch, clean/dirty 상태, 최신 commit, production health 상태를 확인한다.
- stale한 계획이 있으면 시작 전에 정리한다.

검증 명령:
- `git status --short`
- `git log --oneline -5`
- `curl -sS -i https://townpet.vercel.app/api/health`

#### Phase 1. 최신 main 배포 후 production 성능 재측정

목표:
- 최신 `main`/production 기준으로 홈, 피드, 검색, 상세의 서버 응답/API/browser 성능을 다시 측정하고 최근 compact UI 변경이나 문서 배포 이후 regressions가 없는지 확인한다.

대상 화면/route:
- `/`
- `/feed/guest`
- `/search/guest`
- public post detail smoke targets
- 필요 시 `/api/home/feed`, `/api/feed/guest`, `/api/search`

사용할 skill:
- `release-readiness`
- `quality-gate`

수정 범위:
- 우선 측정과 report 작성만 한다.
- 반복되는 outlier나 명확한 regression이 확인될 때만 별도 phase로 원인 분석을 승격한다.

하지 않을 것:
- 성능 수치 하나만 보고 즉시 대형 리팩터링
- 캐시/DB/index 변경을 같은 phase에서 바로 적용
- production 데이터 변경

완료 기준:
- production health 통과.
- route별 baseline/API/browser 측정 report 생성.
- regression 여부와 다음 액션을 `PROGRESS.md`에 기록.

검증 명령:
- `OPS_BASE_URL=https://townpet.vercel.app COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app ops:check:health`
- 기존 성능 측정 script를 `app/package.json`에서 확인 후 실행
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app typecheck`

스크린샷/확인 지점:
- 홈 첫 viewport desktop/mobile
- guest feed 첫 list viewport desktop/mobile
- public detail 대표 target desktop/mobile

#### Phase 2. 상세 화면 남은 non-primary auxiliary surface audit

목표:
- 상세 화면에서 primary content가 아닌 보조 영역이 아직 과한 card/surface, nested border, 큰 padding, 중복 CTA를 만들고 있는지 전체 board type 기준으로 점검한다.

대상 화면/route:
- `FREE_BOARD` 상세
- `LOST_FOUND` 상세
- `MARKET_LISTING` 상세
- `WALK_ROUTE` 상세
- `HOSPITAL_REVIEW` auth/local 상세
- `CARE_REQUEST` auth/local 상세

사용할 skill:
- `impeccable`
- 필요 시 `$audit`, `$polish`에 해당하는 repo-local Impeccable workflow

수정 범위:
- audit report 우선.
- 같은 화면군 안에서 확실한 low-risk surface/padding/copy 개선만 수행.
- 상세 화면 primary card, 댓글, 미디어, workflow panel의 기존 compact 기준을 깨지 않는다.

하지 않을 것:
- 상세 정보 구조나 권한 정책 변경
- 댓글/신고/거래/돌봄 기능 로직 변경
- board type별 전체 redesign

완료 기준:
- board type별 remaining issue가 P0/P1/P2/P3로 정리된다.
- 수정이 필요한 경우 한 화면군 또는 한 auxiliary 영역만 고친다.
- public/auth-local detail visual smoke 결과를 남긴다.

검증 명령:
- `PUPPETEER_SKIP_DOWNLOAD=1 COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast`
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app lint`
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app typecheck`
- 필요 시 `OPS_BASE_URL=https://townpet.vercel.app AUTH_LOCAL_DETAIL_SMOKE_CONFIRM=PUBLISH_AUTH_LOCAL_DETAIL_SMOKE_FIXTURES COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app ops:check:detail-visual`

스크린샷/확인 지점:
- 각 board detail desktop/mobile
- 댓글 시작 지점
- 상세 하단 action/workflow 영역
- auth/local guest gate 화면

#### Phase 3. 첫 7개 운영자 정리 글 화면 문구/밀도/CTA 점검

목표:
- production에 게시된 첫 7개 운영자 정리 글이 실제 사용자에게 과장된 인기 콘텐츠처럼 보이지 않고, 정보 출처/정정 요청/다음 행동 CTA가 자연스럽게 보이는지 확인한다.

대상:
- `/`
- `/feed/guest`
- `/search/guest`
- 첫 7개 운영자 정리 글 상세
- 운영자 콘텐츠 출처/최종 확인일/정정 요청 CTA

사용할 skill:
- `impeccable`
- `release-readiness`

수정 범위:
- 화면 문구, spacing, CTA placement, source metadata presentation.
- 운영자 글 본문 자체 수정은 production 데이터 변경이므로 별도 승인 또는 안전한 운영 절차가 있을 때만 진행한다.

하지 않을 것:
- 운영자 글을 새로 게시/삭제
- production DB 직접 수정
- 추천/랭킹 알고리즘 재작성

완료 기준:
- 홈/피드/검색/상세에서 운영자 콘텐츠가 사용자 글과 구분되지만 과도하게 튀지 않는다.
- `먼저 확인할 글`/featured 표현이 실제 기준과 맞는지 확인한다.
- 필요한 UI 수정과 검증 결과를 `PROGRESS.md`에 기록한다.

검증 명령:
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app test -- <관련 테스트>`
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app lint`
- `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app typecheck`
- `PUPPETEER_SKIP_DOWNLOAD=1 COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast`

스크린샷/확인 지점:
- 홈 Live board desktop/mobile
- guest feed 운영자 글 row desktop/mobile
- search guest 운영자 글 result desktop/mobile
- 운영자 글 상세 source/CTA 영역

#### Phase 4. 실제 사용자-facing 제품 개발 항목 재선정

목표:
- 측정과 audit 결과를 바탕으로 다음 기능 개발 phase를 하나만 선정한다.

후보:
- 실제 사용자 onboarding/지역 선택 흐름 강화
- 운영자 콘텐츠에서 사용자 제보/정정 요청으로 이어지는 acquisition loop 강화
- 분실/목격/병원/산책 중 하나의 핵심 vertical 완성도 강화
- 관리자 운영 큐에서 실제 운영 반복 작업을 줄이는 개선

사용할 skill:
- `cycle-kickoff`
- 필요 시 `feature-implement`, `policy-abuse-gate`, `test-plan`

수정 범위:
- 이 phase에서는 구현보다 PRD-lite/phase plan 작성이 우선이다.
- 선정된 하나의 흐름만 다음 active phase로 승격한다.

하지 않을 것:
- 여러 제품 기능 동시 착수
- 결제/보험/정산
- 자동 제재 강행
- 카카오맵/마켓/공동구매 deep feature 확장

완료 기준:
- `PLAN.md`에 다음 구현 phase가 하나만 active로 남는다.
- 나머지 후보는 `다음 작업 후보`로 되돌린다.
- 완료 기준, 검증 명령, screenshot 지점이 적힌다.

검증 명령:
- 문서 변경만 있으면 `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app docs:refresh`
- `node scripts/refresh-docs-index.mjs --check`
- `git diff --check`

## 다음 작업 후보

- Phase 1~4 완료 후 새로 정한다.
