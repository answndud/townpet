# `/` 초기 문서 payload 축소 리포트

- 날짜: 2026-06-08
- 범위: public home(`/`) server-rendered feed preview
- 목적: 홈 첫 화면 전환에 직접 필요하지 않은 HTML/RSC payload를 줄인다.

## 변경 내용

- 홈 피드 preview 노출 수를 컬럼당 최대 4개에서 3개로 줄였다.
- 홈 피드 item 직렬화에서 preview에 쓰지 않는 필드를 제거했다.
  - `excerpt`, `type`, `viewCount`
  - `operatorSourceName`, `operatorSourceUrl`, `operatorLastVerifiedAt`
- 홈 preview 행에서 모바일 전용 excerpt와 조회수 텍스트를 제거했다.
- 운영자 글은 상세 출처 문구 대신 `운영자 정리` 짧은 표시만 유지했다.
- 빈 상태 action note를 제거해 링크 중심의 가벼운 fallback으로 줄였다.

## 측정 조건

```bash
corepack pnpm@9.12.3 -C app build

PERF_BASE_URL=http://localhost:3000 \
PERF_ASSET_PROFILES=desktop,mobile \
PERF_ASSET_TARGETS=home,guest_feed \
PERF_ASSET_SETTLE_MS=500 \
PERF_ASSET_OUT=../docs/reports/route-assets-home-payload-trim-local-2026-06-08.md \
PERF_ASSET_JSON_OUT=../docs/reports/route-assets-home-payload-trim-local-2026-06-08.json \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
corepack pnpm@9.12.3 -C app perf:assets:local
```

비교 기준은 `docs/reports/route-assets-feed-item-payload-trim-local-2026-06-08.json`이다.

## 결과

| 라우트 | 프로파일 | 지표 | 이전 | 이후 | 변화 |
| --- | --- | --- | ---: | ---: | ---: |
| `/` | desktop/mobile | 문서 크기 | 40,712B | 38,077B | -2,635B (-6.5%) |
| `/` | desktop/mobile | 문서 포함 총전송 | 220,287B | 217,652B | -2,635B (-1.2%) |
| `/` | desktop/mobile | resource 총전송 | 179,575B | 179,575B | 0B |
| `/` | desktop/mobile | script 전송 | 148,212B | 148,212B | 0B |
| `/feed/guest` | desktop/mobile | 문서 포함 총전송 | 264,467B | 264,467B | 0B |

## 해석

- 이번 작업은 홈 static document/RSC payload만 줄인 변경이다.
- JS/CSS bundle에는 영향이 없으므로 resource 총전송량은 변하지 않았다.
- 홈 landing CTA, 관심 주제, 공개 글 preview는 유지했다.
- 단일 로컬 샘플에서 FCP와 문서 응답 시간은 큰 변화가 없었다. 이번 작업의 성공 지표는 문서 크기 감소로 본다.

## 검증

- `corepack pnpm@9.12.3 -C app test -- src/app/page.test.tsx src/components/home/home-feed-preview.test.tsx src/app/api/home/feed/route.test.ts`
- `corepack pnpm@9.12.3 -C app typecheck`
- `corepack pnpm@9.12.3 -C app lint -- src/app/page.tsx src/app/page.test.tsx src/components/home/home-feed-preview.tsx src/components/home/home-feed-preview.test.tsx src/server/queries/home-feed.queries.ts src/app/api/home/feed/route.test.ts`
- `corepack pnpm@9.12.3 -C app build`
- Playwright 모바일 smoke: `/`에서 `우리 동네 반려생활 정보`, `전체 피드`, `지금 올라온 글` 표시 확인

## 남은 개선 후보

- `/`의 남은 resource 총전송 175KB 대부분은 공통 JS/CSS bundle이다.
- 다음 성능 절감은 root `AppShellHeader` route group 분리 또는 공통 client shell 축소가 더 효과적이다.
