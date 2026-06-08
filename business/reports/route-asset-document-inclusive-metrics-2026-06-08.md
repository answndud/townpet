# route asset 문서 포함 전송량과 피드 표시 시점 측정 리포트

- 작성일: 2026-06-08
- 기준 환경: local production (`next start`, 직전 build 산출물)
- 목적: 서버 shell 전환 이후 `resource total`만으로는 보이지 않던 document body 비용과 피드 목록 표시 시점을 함께 기록한다.

## 변경 내용

`app/scripts/measure-route-assets.ts`에 아래 지표를 추가했다.

- `documentIncludedTransferBytes`
  - `documentBytes + totalTransferBytes`
  - 기존 `totalTransferBytes`는 `performance.getEntriesByType("resource")` 합계라 HTML/RSC document body를 포함하지 않았다.
- `targetVisibleMs`
  - target별 선택자가 화면에 표시된 시점이다.
  - 기본 `guest_feed` target에는 `#feed-list`를 지정했다.
  - server-rendered 요소를 observer가 놓치는 경우를 대비해 Playwright locator fallback을 추가했다.

Markdown 표의 `전체 전송` 명칭도 `resource 총전송`으로 바꿔 document 포함 여부를 명확히 했다.

## 측정 명령

```bash
PERF_BASE_URL=http://localhost:3000 \
PERF_ASSET_TARGETS=home,guest_feed,static_probe \
PERF_ASSET_PROFILES=desktop,mobile \
PERF_ASSET_SETTLE_MS=1200 \
PERF_ASSET_OUT=../docs/reports/route-assets-document-inclusive-local-2026-06-08.md \
PERF_ASSET_JSON_OUT=../docs/reports/route-assets-document-inclusive-local-2026-06-08.json \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
corepack pnpm@9.12.3 -C app perf:assets:local
```

## 결과

| route/profile | 문서 크기 | resource 총전송 | 문서 포함 총전송 | 목표 표시 | FCP | script 전송 | fetch 전송 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` desktop | 40KB | 175KB | 215KB | - | 176ms | 145KB | - |
| `/` mobile | 40KB | 175KB | 215KB | - | 88ms | 145KB | - |
| `/feed/guest` desktop | 75KB | 189KB | 264KB | 614ms | 280ms | 153KB | 5KB |
| `/feed/guest` mobile | 75KB | 189KB | 264KB | 125ms | 80ms | 153KB | 5KB |

## 해석

이전 리포트에서 `/feed/guest`는 resource total 기준으로 약 193KB까지 줄었다. 하지만 문서 body를 포함하면 실제 첫 navigation에서 받는 총량은 약 264KB다.

따라서 서버 shell 전환 이후의 다음 병목은 “JS resource”보다 아래 쪽에 있다.

- `/feed/guest` document/RSC payload 75KB
- 서버 응답 시간 변동
- feed list visible timing의 desktop 편차

특히 desktop `targetVisibleMs` 614ms는 단발 측정값이라 절대값으로 확정하면 안 된다. 다만 이제 같은 지표를 반복 측정할 수 있으므로, 다음 최적화부터는 `script/resource total`만 보지 않고 “문서 포함 총량 + 목록 표시 시점”을 함께 비교할 수 있다.

## 다음 작업 판단

다음 최적화는 `/feed/guest`의 server-rendered payload를 줄이는 방향이 맞다.

우선 확인할 항목:

1. `FeedPostItem` 직렬화 payload에서 초기 목록에 필요 없는 필드가 RSC로 중복 전달되는지 확인한다.
2. 목록 item markup에서 이미지, 운영자 메타, lost-found/market/adoption 세부 필드가 모든 글에 과하게 붙는지 확인한다.
3. `FeedInfiniteList` client props를 더 작게 줄일 수 있는지 확인한다.

## 검증

- `corepack pnpm@9.12.3 -C app test -- scripts/measure-route-assets.test.ts`
- `corepack pnpm@9.12.3 -C app typecheck`
- `corepack pnpm@9.12.3 -C app lint -- scripts/measure-route-assets.ts scripts/measure-route-assets.test.ts`
- local production asset snapshot 생성
