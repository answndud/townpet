# public header wrapper / app header lazy 분리 리포트

- 날짜: 2026-06-08
- 범위: root `AppShellHeader`
- 목적: `/`과 public acquisition 라우트가 앱 전체 header client 로직을 초기 chunk로 받는 비용을 줄인다.

## 변경 내용

- 기존 `AppShellHeader`를 작은 pathname wrapper로 축소했다.
- 공개 acquisition 라우트는 wrapper 안의 `PublicAcquisitionHeader`만 렌더한다.
  - 대상: `/`, `/guides/*`, `/campaigns/neighborhood-map`, `/towns/*`
- 앱용 header 본체는 `AppShellInteractiveHeader`로 분리했다.
  - viewer shell fetch
  - community fetch
  - auth/logout controls
  - notification bell
  - feed hover menu lazy island
- `ssr:false`는 사용하지 않았다.
  - 공개 홈의 초기 JS는 줄이되, 앱 라우트 header SSR을 잃지 않기 위한 선택이다.

## 측정 조건

```bash
corepack pnpm@9.12.3 -C app build

PERF_BASE_URL=http://localhost:3000 \
PERF_ASSET_PROFILES=desktop,mobile \
PERF_ASSET_TARGETS=home,guest_feed \
PERF_ASSET_SETTLE_MS=500 \
PERF_ASSET_OUT=../docs/reports/route-assets-public-header-wrapper-local-2026-06-08.md \
PERF_ASSET_JSON_OUT=../docs/reports/route-assets-public-header-wrapper-local-2026-06-08.json \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
corepack pnpm@9.12.3 -C app perf:assets:local
```

비교 기준은 `docs/reports/route-assets-home-payload-trim-local-2026-06-08.json`이다.

## 결과

| 라우트 | 프로파일 | 지표 | 이전 | 이후 | 변화 |
| --- | --- | --- | ---: | ---: | ---: |
| `/` | desktop/mobile | script 전송 | 148,212B | 146,511B | -1,701B (-1.1%) |
| `/` | desktop/mobile | resource 총전송 | 179,575B | 177,874B | -1,701B (-0.9%) |
| `/` | desktop/mobile | 문서 포함 총전송 | 217,652B | 215,951B | -1,701B (-0.8%) |
| `/feed/guest` | desktop/mobile | script 전송 | 156,727B | 155,026B | -1,701B (-1.1%) |
| `/feed/guest` | desktop/mobile | CSS 전송 | 31,363B | 34,408B | +3,045B (+9.7%) |
| `/feed/guest` | desktop/mobile | resource 총전송 | 193,402B | 194,746B | +1,344B (+0.7%) |

## 해석

- 공개 홈의 초기 script/resource 전송은 작게 줄었다.
- 앱 라우트는 app header를 별도 chunk로 나누면서 script는 줄었지만 CSS split 비용이 더 커져 총전송이 약 1.3KB 늘었다.
- route group을 실제로 나누지 않고 root client wrapper만 쓰는 방식에서는 효과가 작다.
- 이 변경은 공개 acquisition 페이지의 초기 chunk를 가볍게 하는 최소 변경으로는 유효하지만, 성능 점프를 만들 정도는 아니다.
- 다음 큰 절감은 root layout에서 header를 완전히 빼고 route group별 layout으로 분리하는 구조 변경이 필요하다.

## 검증

- `corepack pnpm@9.12.3 -C app test -- src/components/navigation/app-shell-header-class.test.ts src/app/page.test.tsx src/app/feed/guest/page.test.tsx`
- `corepack pnpm@9.12.3 -C app typecheck`
- `corepack pnpm@9.12.3 -C app lint -- src/components/navigation/app-shell-header.tsx src/components/navigation/app-shell-interactive-header.tsx src/components/navigation/app-shell-header-class.test.ts`
- `corepack pnpm@9.12.3 -C app build`
- Playwright smoke:
  - `/` 공개 header `header-login-link-home` 표시
  - `/feed/guest` 앱 header `header-login-link-mobile`, `게시판` trigger 표시

## 남은 개선 후보

- route group layout 분리:
  - public acquisition group은 static/server header만 사용
  - app group은 interactive header 사용
  - root layout은 `html/body`와 공통 provider만 유지
- 단, route 이동이 많고 경로 보존 검증 비용이 높으므로 별도 대형 작업으로 분리한다.
