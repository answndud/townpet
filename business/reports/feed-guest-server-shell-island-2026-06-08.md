# `/feed/guest` 서버 shell / client island 전환 리포트

- 작성일: 2026-06-08
- 기준 환경: local production (`next build` 후 `next start`)
- 목적: `/feed/guest`의 page-wide client fetch 구조를 줄이고, 서버가 첫 응답에 실제 피드 shell을 포함하도록 바꿀 수 있는지 검증한다.

## 변경 배경

직전 상태의 `/feed/guest`는 page 자체가 정적 shell이고, 브라우저에서 `GuestFeedPageClient`가 `/api/feed/guest`를 다시 호출해 목록 데이터를 채웠다.

이 구조는 HTML이 가볍다는 장점이 있지만, 사용자가 보는 실제 목록은 클라이언트 JS 실행과 API fetch 이후에야 나타난다. 또한 header/control/search/list shell까지 하나의 client component가 소유해 client boundary가 불필요하게 컸다.

## 변경 내용

- `/api/feed/guest`의 조회/직렬화 로직을 `buildGuestFeedPageServiceResult()`로 추출했다.
- `/feed/guest/page.tsx`가 서버에서 guest feed payload를 직접 만들고, header/control/search/list shell을 서버 컴포넌트로 렌더링하게 했다.
- `FeedInfiniteList`만 client island로 남겨 추가 페이지 로딩과 목록 상호작용을 담당하게 했다.
- `buildGuestFeedHref()`를 client page 컴포넌트 밖의 `lib/posts/guest-feed-href.ts`로 이동했다.
- 기존 `guest-feed-page-client.tsx`는 제거했다.
- guest feed 서비스가 업로드 mutation/delete 서비스 전체를 import하지 않도록 `upload-renderable-assets.ts`를 추가했다.
  - 이 분리는 local production 측정 중 불필요한 `runtimeEnv` import가 page render 경로에 들어오는 문제를 피하기 위한 것이다.

## 측정 명령

```bash
corepack pnpm@9.12.3 -C app build

corepack pnpm@9.12.3 -C app start

PERF_BASE_URL=http://localhost:3000 \
PERF_ASSET_TARGETS=guest_feed,static_probe \
PERF_ASSET_PROFILES=desktop,mobile \
PERF_ASSET_SETTLE_MS=1200 \
PERF_ASSET_OUT=../docs/reports/route-assets-feed-guest-server-shell-local-2026-06-08.md \
PERF_ASSET_JSON_OUT=../docs/reports/route-assets-feed-guest-server-shell-local-2026-06-08.json \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
corepack pnpm@9.12.3 -C app perf:assets:local
```

비교 기준은 직전 리포트 `route-assets-feed-guest-client-boundary-local-2026-06-08.json`이다.

## 전후 비교

| profile | script 전송 전 | script 전송 후 | script 변화 | fetch 전송 전 | fetch 전송 후 | fetch 변화 | 문서 크기 전 | 문서 크기 후 | 문서 변화 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | 186,707 B | 180,654 B | -6,053 B (-3.2%) | 17,110 B | 4,624 B | -12,486 B (-73.0%) | 26,355 B | 80,761 B | +54,406 B (+206.4%) |
| mobile | 186,707 B | 180,654 B | -6,053 B (-3.2%) | 17,110 B | 4,624 B | -12,486 B (-73.0%) | 26,355 B | 80,761 B | +54,406 B (+206.4%) |

| profile | 전체 전송 전 | 전체 전송 후 | 전체 변화 | 문서 응답 전 | 문서 응답 후 | FCP 전 | FCP 후 |
|---|---:|---:|---:|---:|---:|---:|---:|
| desktop | 235,887 B | 217,329 B | -18,558 B (-7.9%) | 56ms | 200ms | 128ms | 216ms |
| mobile | 235,887 B | 217,329 B | -18,558 B (-7.9%) | 7ms | 38ms | 60ms | 68ms |

주의: 위 `전체 전송`은 측정 스크립트의 resource transfer 합계이며 document body는 별도 열로 기록된다. 문서까지 포함하면 초기 응답 body 자체는 커졌다.

## 해석

이번 변경은 순수 byte 기준의 명백한 승리는 아니다.

좋아진 점:

- page-wide client fetch가 사라져 `/api/feed/guest` 초기 fetch 비용이 크게 줄었다.
- script transfer가 약 6KB 줄었다.
- 첫 HTML/RSC 응답에 실제 피드 목록 shell이 포함돼 검색엔진/공유/비 JS fallback 관점이 좋아졌다.
- 피드 shell의 책임이 server component로 이동해 이후 client island를 더 작게 만들 수 있는 구조가 생겼다.

나빠진 점 또는 비용:

- 서버가 첫 문서에 피드 데이터를 포함하므로 document bytes가 약 54KB 증가했다.
- `/feed/guest`가 dynamic server-rendered route가 되어 첫 문서 응답 시간이 증가했다.
- local 단발 FCP는 desktop `128ms -> 216ms`, mobile `60ms -> 68ms`로 느리게 찍혔다.

따라서 이 작업의 의미는 “즉시 FCP를 크게 줄인 개선”이 아니라, “클라이언트 fetch 의존을 줄이고 서버 shell 구조로 전환한 기반 개선”이다. 이후 최적화는 커진 문서/RSC payload를 줄이는 방향으로 이어져야 한다.

## 적용 판단

적용한다.

이유:

- 게스트 피드는 public acquisition/SEO 성격이 강하고, 첫 응답에 실제 목록이 들어가는 구조가 제품적으로 더 맞다.
- API fetch 이후에 목록이 뜨던 구조보다 목록 HTML/RSC가 서버 응답에 포함되는 구조가 관찰과 튜닝이 쉽다.
- client boundary를 없애는 기반이 마련돼 다음 작업에서 root header client shell, list island, document payload를 더 직접적으로 줄일 수 있다.

단, 이 변경만으로 “속도 100점”이라고 보지는 않는다. 문서 크기와 dynamic TTFB 증가를 다음 병목으로 잡는다.

## 다음 병목 후보

1. root `AppShellHeader`를 server shell + viewer/auth client island로 분리한다.
   - 모든 page에 공통으로 붙는 client shell 비용을 줄일 가능성이 가장 크다.
2. `/feed/guest`의 server-rendered 문서 payload를 줄인다.
   - 목록 item markup, 이미지 필드, operator meta, 중복 RSC props를 점검한다.
3. 측정 스크립트에 “문서 포함 총 전송량”과 “feed list visible timing”을 추가한다.
   - 현재 `totalTransferBytes`는 document body와 별도라, 서버 shell 전환의 tradeoff를 한 숫자로 보기 어렵다.

## 검증

- `corepack pnpm@9.12.3 -C app typecheck`
- `corepack pnpm@9.12.3 -C app test -- src/app/feed/guest/page.test.tsx src/components/posts/guest-feed-page-client.test.ts`
- `corepack pnpm@9.12.3 -C app lint`
- `corepack pnpm@9.12.3 -C app build`
- `corepack pnpm@9.12.3 -C app perf:assets:local`
