# AppShellHeader 피드 메뉴 상호작용 지연 로드 리포트

- 작성일: 2026-06-08
- 기준 환경: local production (`next build` 후 `next start`)
- 목적: 모든 페이지에 공통으로 붙는 `AppShellHeader` client chunk에서 무거운 피드 메뉴 의존성을 초기 로드에서 분리한다.

## 변경 배경

`AppShellHeader`는 root layout에 붙는 공통 client component다. 기존 구조에서는 header가 `FeedHoverMenu`를 정적 import했고, 이 메뉴는 게시판 목록, 관심 동물 저장, 쿠키, server action, `PostType` runtime, taxonomy helper까지 함께 끌고 왔다.

이 때문에 공개 랜딩(`/`)처럼 피드 메뉴를 즉시 열지 않는 페이지도 메뉴 구현 비용을 초기 script로 받았다.

## 변경 내용

- `FeedHoverMenu`를 직접 import하지 않고 `LazyFeedHoverMenu` wrapper로 분리했다.
- 초기 렌더에서는 가벼운 fallback 링크/버튼만 보여준다.
- 사용자가 `게시판` 또는 `관심 동물` 메뉴에 hover, focus, click으로 접근하면 그때 실제 `FeedHoverMenu` chunk를 로드한다.
- 첫 상호작용 메뉴가 바로 열리도록 `FeedHoverMenu`에 `initialOpenMenu`, `initialMobileOpenMenu` prop을 추가했다.
- 기존 인증/알림 위젯의 dynamic import 정책은 유지했다.

## 측정 명령

```bash
corepack pnpm@9.12.3 -C app build

corepack pnpm@9.12.3 -C app start

PERF_BASE_URL=http://localhost:3000 \
PERF_ASSET_TARGETS=home,guest_feed,static_probe \
PERF_ASSET_PROFILES=desktop,mobile \
PERF_ASSET_SETTLE_MS=1200 \
PERF_ASSET_OUT=../docs/reports/route-assets-header-feed-menu-interaction-lazy-local-2026-06-08.md \
PERF_ASSET_JSON_OUT=../docs/reports/route-assets-header-feed-menu-interaction-lazy-local-2026-06-08.json \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
corepack pnpm@9.12.3 -C app perf:assets:local
```

## 초기 기준 대비 최종 수치

초기 기준은 `route-assets-page-static-local-2026-06-08.json`이다.

| route/profile | script 수 | script 전송 전 | script 전송 후 | script 변화 | 전체 전송 전 | 전체 전송 후 | 전체 변화 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` desktop | 12 -> 11 | 173,327 B | 148,212 B | -25,115 B (-14.5%) | 204,709 B | 179,575 B | -25,134 B (-12.3%) |
| `/` mobile | 12 -> 11 | 173,327 B | 148,212 B | -25,115 B (-14.5%) | 204,709 B | 179,575 B | -25,134 B (-12.3%) |
| `/feed/guest` desktop | 15 -> 12 | 256,112 B | 156,727 B | -99,385 B (-38.8%) | 305,592 B | 193,402 B | -112,190 B (-36.7%) |
| `/feed/guest` mobile | 15 -> 12 | 256,112 B | 156,727 B | -99,385 B (-38.8%) | 305,592 B | 193,402 B | -112,190 B (-36.7%) |

`/feed/guest`는 서버 shell 전환 때문에 문서 크기가 커졌으므로 전체 개선을 한 숫자로만 보면 안 된다. 위 `전체 전송`은 측정 스크립트의 resource transfer 합계이며 document body는 별도 열로 기록된다.

## 직전 서버 shell 기준 대비

직전 기준은 `route-assets-feed-guest-server-shell-local-2026-06-08.json`이다.

| route/profile | script 수 | script 전송 전 | script 전송 후 | script 변화 | resource total 전 | resource total 후 | 변화 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/feed/guest` desktop | 13 -> 12 | 180,654 B | 156,727 B | -23,927 B (-13.2%) | 217,329 B | 193,402 B | -23,927 B (-11.0%) |
| `/feed/guest` mobile | 13 -> 12 | 180,654 B | 156,727 B | -23,927 B (-13.2%) | 217,329 B | 193,402 B | -23,927 B (-11.0%) |

## 해석

적용 가치가 있다.

- 공개 랜딩(`/`)은 사용자가 피드 메뉴를 열기 전까지 메뉴 구현 chunk를 받지 않는다.
- `/feed/guest`도 서버 shell 전환 직후보다 script transfer가 13.2% 줄었다.
- fallback은 기존 헤더의 정보 구조를 유지하고, 실제 메뉴는 hover/focus/click 시점에 열린다.

주의할 점:

- 메뉴 첫 상호작용 시 별도 chunk를 로드하므로 아주 느린 네트워크에서는 메뉴 열림이 한 박자 늦을 수 있다.
- 이 지연은 초기 페이지 표시 속도와 메뉴 즉시성 사이의 tradeoff다. 현재 제품에서는 첫 진입 성능이 더 중요하므로 적용한다.

## 검증

- `corepack pnpm@9.12.3 -C app test -- src/components/navigation/app-shell-header-class.test.ts`
- `corepack pnpm@9.12.3 -C app typecheck`
- `corepack pnpm@9.12.3 -C app lint`
- `corepack pnpm@9.12.3 -C app build`
- `corepack pnpm@9.12.3 -C app perf:assets:local`

## 다음 병목 후보

1. route asset 측정에 document body를 포함한 총 전송량을 별도 지표로 추가한다.
2. `/feed/guest`의 커진 server-rendered document/RSC payload를 줄인다.
3. `AppShellHeader` 전체를 route group별 server shell로 나눌 수 있는지 검토한다. root layout만으로는 pathname 구분이 어려워, 적용하려면 route group 재구성이 필요하다.
