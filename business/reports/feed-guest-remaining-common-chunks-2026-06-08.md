# `/feed/guest` 잔여 공통 chunk 분석 리포트

- 작성일: 2026-06-08
- 기준 환경: local production (`next build` 후 `next start`)
- 목적: 직전 작업 후 `/feed/guest`에 남은 큰 client chunk가 추가로 줄일 수 있는 앱 dependency인지, Next/App Router 기본 비용인지 분리한다.

## 현재 chunk 구성

`app/.next/server/app/feed/guest/page_client-reference-manifest.js` 기준:

| chunk | 대략 크기 | 성격 | 판단 |
|---|---:|---|---|
| `e1fbad3f90ef4b9b.js` | 약 70KB transfer | React/공통 런타임 계열 | 앱 코드에서 직접 제거하기 어려운 공통 비용 |
| `64fc92a6d8f259a5.js` | 약 31KB transfer | Next/App Router navigation 계열 | App Router client boundary 기본 비용 |
| `eb622a45a6e1dd0c.js` | 약 21KB transfer | layout 공통 client module 묶음 일부 | header/web-vitals/error/Link와 공유 |
| `9f0a78c58700dc11.js` 계열 | 약 18KB transfer | layout 공통 client module 묶음 일부 | header/web-vitals/scroll/error/Link와 공유 |
| `92af9e54135de2c4.js` | 약 13KB transfer | `/feed/guest` route 전용 chunk | `guest-feed-page-client`와 feed list 경계 |

직전 작업에서 제거한 266KB급 Zod chunk는 더 이상 `/feed/guest` manifest에 없다. `zod`, `@prisma/client` runtime 문자열도 manifest에서 사라진 상태다.

## 실험 1: Web Vitals reporter opt-in 동적 로드

시도:

- root layout의 `WebVitalsReporter`를 서버 slot + dynamic import 형태로 바꿔 기본 환경에서 제외하려고 했다.
- `isWebVitalsTelemetryEnabled()`도 명시 opt-in으로 바꾸는 실험을 했다.

결과:

- Next client reference manifest에는 여전히 `web-vitals-reporter`가 남았다.
- route asset transfer는 `+29B` 수준으로 오히려 미세 증가했다.

판단:

- 성능 이득이 없고 운영 계측 정책만 바뀌므로 적용하지 않는다.
- 실제 Web Vitals 기본 수집 정책 변경은 성능 최적화가 아니라 운영 정책 변경으로 별도 판단해야 한다.

## 실험 2: root `ScrollToTopButton` 제거

시도:

- root layout에서 고정 `ScrollToTopButton`을 제거해 모든 페이지에 붙는 client component를 줄이는 실험을 했다.

결과:

| 기준 | script transfer | total transfer | 변화 |
|---|---:|---:|---:|
| 직전 기준 | 186,707 B | 235,887 B | - |
| 제거 실험 | 186,362 B | 235,542 B | -345 B |

판단:

- 절감량이 345B로 작다.
- 모바일/긴 피드에서 바로 위로 이동하는 보조 UX를 제거할 만큼의 이득이 아니다.
- 따라서 적용하지 않고 유지한다.

## 결론

현재 `/feed/guest`의 남은 큰 chunk는 대부분 Next/App Router, React runtime, root layout client shell의 공통 비용이다. 직전의 Zod/Prisma runtime 제거처럼 “작은 import 분리로 큰 절감”이 가능한 저위험 후보는 더 발견되지 않았다.

추가로 의미 있는 절감을 만들려면 단순 helper 분리가 아니라 구조 변경이 필요하다.

## 다음 후보

1. `guest-feed-page-client`를 더 작게 쪼갠다.
   - header/control/search/list shell은 server component로 렌더한다.
   - 무한 스크롤, read-state, personalization metric만 작은 client island로 남긴다.
2. root `AppShellHeader`를 server shell + auth/viewer client island로 분리한다.
   - 현재는 header 전체가 client component라 모든 route에 공통 client 비용을 만든다.
   - 단, active nav, viewer shell fetch, 알림/로그아웃 동작이 얽혀 있어 별도 설계가 필요하다.
3. 실제 사용자 체감 기준은 local asset 단발 측정보다 production 저강도 WebPage/Lighthouse/Web Vitals 표본으로 검증한다.

## 보류한 변경

- Web Vitals reporter opt-in 정책 변경: 성능 이득 없음.
- root ScrollToTopButton 제거: 절감량 345B로 UX 손실 대비 이득 부족.
