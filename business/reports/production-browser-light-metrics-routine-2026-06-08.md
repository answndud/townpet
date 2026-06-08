# production 저강도 browser metric 루틴 리포트

- 날짜: 2026-06-08
- 범위: production synthetic browser metric
- 목적: local spike/stress 결과와 실제 배포 체감 성능을 분리한다.

## 변경 내용

- `perf:browser:production-light` 스크립트를 추가했다.
- 기본값은 production에 매우 낮은 요청만 보낸다.
  - 대상: `/`, `/feed/guest`
  - 프로파일: mobile
  - 샘플: 대상별 1회
  - 총 browser visit: 2회
- 총 browser visit이 기본 `6`회를 넘으면 실행을 차단한다.
- 더 큰 production browser run은 아래 ACK 없이는 실행되지 않는다.

```bash
PROD_BROWSER_METRICS_ACK=ALLOW_PRODUCTION_BROWSER_METRICS_HEAVY_RUN
```

- internal token이 있으면 remote Web Vitals summary도 함께 조회한다.
- token이 없거나 `PROD_BROWSER_METRICS_WEB_VITALS=0`이면 Web Vitals summary는 건너뛴다.
- 기존 `measure-browser-performance` markdown 출력도 한국어 제목/표로 바꿨다.

## 실행 방법

기본 저강도 실행:

```bash
OPS_BASE_URL=https://townpet.vercel.app \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
pnpm -C app perf:browser:production-light
```

Web Vitals summary 포함:

```bash
OPS_BASE_URL=https://townpet.vercel.app \
OPS_HEALTH_INTERNAL_TOKEN=<HEALTH_INTERNAL_TOKEN> \
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers \
pnpm -C app perf:browser:production-light
```

## 실제 실행 결과

이번 작업 중 기본값으로 2회 실행했다.

### 1차 실행

| route | status | FCP | LCP | load | total goto |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 200 | 1,384ms | 1,384ms | 1,589ms | 1,590ms |
| `/feed/guest` | 200 | 1,132ms | 1,132ms | 1,465ms | 1,466ms |

### 2차 실행

| route | status | FCP | LCP | load | total goto |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 200 | 256ms | 256ms | 280ms | 282ms |
| `/feed/guest` | 200 | 652ms | 652ms | 970ms | 971ms |

## 해석

- 두 실행 모두 production budget 안에 들어왔다.
  - `/` production mobile LCP 목표: `<= 1500ms`
  - `/feed/guest` production mobile LCP 목표: `<= 1800ms`
- 1차와 2차 차이가 커서, 단발 synthetic browser 결과는 cold/warm 상태 영향을 강하게 받는 것으로 본다.
- 이 루틴은 부하 한계 측정용이 아니라 배포 후 사용자 체감 수준의 이상 징후 확인용이다.
- local spike에서 보인 queueing 현상을 production에 그대로 강하게 재현하려고 하면 안 된다.

## 검증

- `corepack pnpm@9.12.3 -C app test -- scripts/run-production-browser-metrics.test.ts scripts/measure-browser-performance.test.ts scripts/ops-doc-scripts-consistency.test.ts`
- `corepack pnpm@9.12.3 -C app typecheck`
- `corepack pnpm@9.12.3 -C app lint -- scripts/run-production-browser-metrics.ts scripts/run-production-browser-metrics.test.ts scripts/measure-browser-performance.ts scripts/measure-browser-performance.test.ts scripts/ops-doc-scripts-consistency.test.ts`
- `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers corepack pnpm@9.12.3 -C app perf:browser:production-light`

## 남은 판단

- 실제 유저가 생긴 뒤에는 `perf:web-vitals:remote` 또는 이 루틴의 Web Vitals summary를 우선한다.
- synthetic browser 결과가 budget을 넘는 route만 단일 target으로 재측정한다.
- production stress/spike는 계속 기본 금지로 유지한다.
