# `/feed/guest` 목록 payload 축소 리포트

- 날짜: 2026-06-08
- 범위: `/feed/guest` 초기 목록 item 직렬화 payload
- 목적: 서버 shell 전환 뒤 커진 문서/RSC payload에서 목록 렌더에 필요 없는 필드를 줄인다.

## 변경 내용

- 목록 본문 signal helper `buildFeedSignalContent`를 추가했다.
  - 짧은 본문은 그대로 유지한다.
  - 긴 본문은 앞 240자만 내려보낸다.
  - 링크/인스타그램/X 감지에 필요한 URL은 최대 12개까지 보존한다.
- guest/member feed item 직렬화에서 목록 UI가 사용하지 않는 필드를 제거했다.
  - `scope`, `dislikeCount`, `isBookmarked`, `reactions`, `author.image`, `operatorSourceUrl`
  - `neighborhood.id/district`, `petType.id`
- 기본값이 `null` 또는 `false`인 선택 필드는 필요한 경우에만 내려보내도록 바꿨다.
- API 회귀 테스트에 guest feed item payload가 무거운 필드를 다시 포함하지 않는다는 검증을 추가했다.

## 측정 조건

```bash
corepack pnpm@9.12.3 -C app build

PERF_BASE_URL=http://localhost:3000 \
PERF_ASSET_PROFILES=desktop,mobile \
PERF_ASSET_TARGETS=home,guest_feed \
PERF_ASSET_SETTLE_MS=500 \
PERF_ASSET_OUT=../docs/reports/route-assets-feed-item-payload-trim-local-2026-06-08.md \
PERF_ASSET_JSON_OUT=../docs/reports/route-assets-feed-item-payload-trim-local-2026-06-08.json \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
corepack pnpm@9.12.3 -C app perf:assets:local
```

비교 기준은 `docs/reports/route-assets-document-inclusive-local-2026-06-08.json`이다.

## 결과

| 라우트 | 프로파일 | 지표 | 이전 | 이후 | 변화 |
| --- | --- | --- | ---: | ---: | ---: |
| `/feed/guest` | desktop/mobile | 문서 크기 | 76,542B | 71,065B | -5,477B (-7.2%) |
| `/feed/guest` | desktop/mobile | 문서 포함 총전송 | 269,944B | 264,467B | -5,477B (-2.0%) |
| `/feed/guest` | desktop/mobile | resource 총전송 | 193,402B | 193,402B | 0B |
| `/feed/guest` | desktop/mobile | script 전송 | 156,727B | 156,727B | 0B |
| `/` | desktop/mobile | 문서 포함 총전송 | 220,259B | 220,287B | +28B |

## 해석

- 이번 작업은 JS bundle을 줄이는 작업이 아니라 서버가 초기에 내려보내는 목록 데이터 payload를 줄인 작업이다.
- 로컬 seed 데이터의 본문이 짧아 `content` trim 효과는 작았고, 실제 감소분은 주로 미사용 필드와 `null/false` 필드 제거에서 나왔다.
- `/feed/guest` 문서 크기는 약 5.5KB 줄었지만, 전체 resource 총전송은 변하지 않았다.
- target visible 시간은 desktop `614ms -> 469ms`, mobile `125ms -> 111ms`로 개선됐지만 단일 로컬 샘플이라 보조 신호로만 본다.

## 검증

- `corepack pnpm@9.12.3 -C app test -- src/lib/feed-list-presenter.test.ts src/app/api/feed/guest/route.test.ts src/app/feed/guest/page.test.tsx src/components/posts/feed-infinite-list.test.tsx`
- `corepack pnpm@9.12.3 -C app typecheck`
- `corepack pnpm@9.12.3 -C app lint -- src/lib/feed-list-presenter.ts src/lib/feed-list-presenter.test.ts src/app/feed/feed-page-items.ts src/app/api/feed/guest/route.test.ts src/server/services/posts/guest-feed-page.service.ts src/components/posts/feed-infinite-list.tsx`
- `corepack pnpm@9.12.3 -C app build`

## 남은 개선 후보

- `/feed/guest` resource 총전송 189KB 대부분은 공통 JS/CSS bundle이다.
- 다음 단계는 root header/app shell 공통 chunk, feed client island 경계, `/` 문서 markup 중 하나를 별도 작업으로 줄여야 한다.
