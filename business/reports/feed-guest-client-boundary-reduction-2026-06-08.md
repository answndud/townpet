# `/feed/guest` client bundle 경계 축소 리포트

- 작성일: 2026-06-08
- 기준 환경: local production (`next build` 후 `next start`)
- 목적: `/feed/guest` 초기 script 전송량 256KB의 원인을 찾고, UX 변경 없이 클라이언트 번들에 들어가면 안 되는 서버/검증 의존성을 제거한다.

## 원인

`/feed/guest`의 client reference manifest를 확인했을 때 `guest-feed-page-client` 경계에 266KB급 `f3174bcc81fdebcd.js` chunk가 붙어 있었다. 해당 chunk는 Zod 본체와 다국어 locale 코드였다.

재귀 import graph로 확인한 실제 경로는 아래와 같았다.

```text
guest-feed-page-client
-> feed-infinite-list
-> lost-found-share
-> site-url
-> env
-> zod
```

피드 목록은 분실/목격 게시글의 라벨만 필요했다. 그런데 라벨 함수가 공유 URL/메타데이터 생성 함수와 같은 `lost-found-share` 파일에 있어, 서버 env 검증용 `zod`가 브라우저 초기 chunk로 딸려왔다.

추가로 client route에서 `@prisma/client`의 `PostType` 값을 runtime import하던 경로도 타입 전용 import와 문자열 상수로 바꿨다. 빌드 후 `/feed/guest` client manifest에서 `zod`, `prisma` 문자열이 모두 사라졌다.

## 변경

- `app/src/lib/lost-found-labels.ts`를 추가해 `getLostFoundAlertTypeLabel`, `getLostFoundStatusLabel`을 URL/env 의존 없는 라벨 전용 모듈로 분리했다.
- `feed-infinite-list`는 `lost-found-share` 대신 `lost-found-labels`를 import한다.
- `lost-found-share`는 기존 public API를 유지하도록 라벨 함수를 re-export한다.
- `feed-control-panel`, `guest-feed-page-client`, `post-presenter`, `post-type-groups`의 `PostType` runtime import를 타입 전용 import/문자열 상수로 바꿨다.

## 측정 명령

```bash
PERF_BASE_URL=http://localhost:3000 \
PERF_ASSET_TARGETS=guest_feed,static_probe \
PERF_ASSET_PROFILES=desktop,mobile \
PERF_ASSET_SETTLE_MS=1200 \
PERF_ASSET_OUT=../docs/reports/route-assets-feed-guest-client-boundary-local-2026-06-08.md \
PERF_ASSET_JSON_OUT=../docs/reports/route-assets-feed-guest-client-boundary-local-2026-06-08.json \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
corepack pnpm@9.12.3 -C app perf:assets:local
```

## 전후 비교

| profile | script 수 | script 전송 전 | script 전송 후 | script 절감 | 총 전송 전 | 총 전송 후 | 총 절감 |
|---|---:|---:|---:|---:|---:|---:|---:|
| desktop | 15 -> 13 | 256,112 B | 186,707 B | -69,405 B | 305,592 B | 235,887 B | -69,705 B |
| mobile | 15 -> 13 | 256,112 B | 186,707 B | -69,405 B | 305,592 B | 235,887 B | -69,705 B |

감소율:

- script transfer: 약 27.1% 감소
- total transfer: 약 22.8% 감소

## 해석

- 이번 변경은 DB/query나 UI 구조를 바꾸지 않고, 클라이언트에 들어가면 안 되는 서버 env/validation 의존성을 끊은 성능 개선이다.
- `/feed/guest` route 전용 chunk는 266KB급 Zod chunk 대신 약 41KB route chunk만 남았다.
- Playwright 단발 FCP/LCP는 desktop `76ms -> 128ms`, mobile `40ms -> 60ms`로 이번 샘플에서는 느리게 찍혔지만, local browser 단발 측정이라 전송량 감소 판단의 주 지표로 쓰지 않는다. 반복 browser metric은 별도 작업에서 확인한다.

## 다음 병목 후보

- `/feed/guest`에 아직 남은 공통 chunk 중 `e1fbad3f90ef4b9b.js` 70KB, `64fc92a6d8f259a5.js` 31KB의 성격을 확인한다.
- `guest-feed-page-client`가 전체 피드 UI를 클라이언트에서 소유하는 구조를 줄이고, 서버 렌더링 가능한 header/control/list shell과 실제 interactive list 경계를 분리할 수 있는지 검토한다.
- `/` 문서 41KB 초기 HTML payload도 같은 방식으로 server-only helper와 client boundary가 섞인 부분이 없는지 점검한다.
