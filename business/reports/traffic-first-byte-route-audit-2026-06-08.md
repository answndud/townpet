# 첫 바이트 라우트 점검 리포트

- 작성일: `2026-06-08`
- 기준 데이터: `traffic-spike-local-2026-06-08`, `traffic-spike-phase-breakdown-2026-06-08`
- 목적: spike에서 p99가 커진 구간이 page body 전송인지, route 첫 바이트 작업인지, 서버 queueing인지 좁힌다.

## 라우트별 점검 결과

| 경로 | Next.js 상태 | 서버 작업 | 첫 바이트 후보 |
| --- | --- | --- | --- |
| `/` | ISR, `revalidate = 300` | `getHomeFeedPayload()`가 guest read 정책과 최신 feed를 조회하고 홈 preview를 직렬화한다. | ISR 재생성 시점, `getHomeFeedPayload` DB read, middleware security header 적용 |
| `/feed/guest` | `dynamic = "force-static"` | 서버에서는 정적 shell을 반환하고, 실제 feed data는 client가 `/api/feed/guest`로 가져온다. | DB/page render보다 로컬 Next/Node queueing, middleware/security header work 가능성이 더 크다. |
| `/api/feed/guest` | 동적 API route | query param validation, feed policy, `listPosts`/`listBestPosts`, image URL 정규화, optional timing 처리 | query/serialization tail 후보는 있으나 spike p95는 안정적이다. |
| root layout/header | client header 포함 | `/` 같은 public acquisition path는 viewer/communities fetch를 건너뛴다. `/feed/guest`의 header fetch는 hydration 이후 실행된다. | 첫 바이트 원인으로 보기 어렵다. |
| middleware | HTML/API 공통 | request id, security headers, CORS, redirect/rewrite, session cookie가 있을 때만 JWT decode | guest no-cookie traffic에서는 JWT decode가 없지만, security header와 local queueing 증폭은 남는다. |

## 핵심 판단

- `/feed/guest`는 정적 shell이므로 첫 바이트 spike를 DB query 병목으로 단정하면 안 된다.
- `/`는 정적 shell이 아니라 ISR + 홈 feed preview 조회가 있으므로, production에서도 p99가 반복되면 `getHomeFeedPayload` timing을 추가해야 한다.
- 이번 spike의 page route body p99는 약 `80ms` 수준이라 큰 HTML/body 전송이 1차 병목은 아니다.
- API route도 header-led spike가 있으므로, 로컬 동시성 100에서 서버 큐가 밀리는 패턴을 우선 가설로 둔다.

## 다음 개선 후보

1. `/`의 `getHomeFeedPayload()`에 server timing 또는 debug timing을 추가해 ISR 재생성/DB read/직렬화 시간을 분리한다.
2. `PERF_TRAFFIC_TARGETS=home,guest_feed_page,guest_feed_api`만 대상으로 phase-aware spike를 한 번 더 실행해 noise를 줄인다.
3. production/preview에서는 heavy ACK 없이 `baseline`까지만 반복하고, spike는 로컬 또는 preview 전용 환경에서만 실행한다.
4. production에서도 `/` first-byte p99가 반복되면 홈 feed preview를 client-delayed API로 분리할지 검토한다.
