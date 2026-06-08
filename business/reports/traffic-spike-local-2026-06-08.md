# 로컬 트래픽 spike 요약

- 생성일: `2026-06-08`
- 기준 URL: `http://localhost:3000`
- 서버: `next build` + `next start`
- 프로파일: `spike`
- 측정 시간(ms): `15000`
- 동시성: `100`
- 최대 요청 수: `5000` load 구간 기준
- 실제 load 요청 수: `5000`
- 측정 대상: `home`, `guest_feed_page`, `popular_guest_feed_page`, `lost_found_page`, `guest_feed_api`, `home_feed_api`
- 제외 대상: `health`
  - 이유: 로컬 production health는 운영 secret 누락 때문에 degraded가 될 수 있지만, 앱 hot path의 DB/cache 동작은 측정 가능했다.

## 요약

| 대상 | 요청 수 | RPS | 오류율 | p50 | p95 | p99 | 최대 | 목표 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| home | 684 | 45.60 | 0.00% | 133.0ms | 201.2ms | 1320.1ms | 2722.5ms | PASS |
| guest_feed_page | 985 | 65.67 | 0.00% | 132.4ms | 196.3ms | 1111.5ms | 2853.0ms | PASS |
| popular_guest_feed_page | 633 | 42.20 | 0.00% | 133.6ms | 208.0ms | 1087.3ms | 2624.4ms | PASS |
| lost_found_page | 676 | 45.07 | 0.00% | 132.4ms | 196.9ms | 1018.4ms | 2895.2ms | PASS |
| guest_feed_api | 1352 | 90.13 | 0.00% | 89.4ms | 136.3ms | 710.5ms | 2728.1ms | PASS |
| home_feed_api | 670 | 44.67 | 0.00% | 64.3ms | 113.6ms | 440.3ms | 2732.6ms | PASS |

## stress 대비 spike 증폭

| 대상 | stress p99 | spike p99 | 증폭 | spike 최대 | 해석 |
| --- | ---: | ---: | ---: | ---: | --- |
| home | 109.5ms | 1320.1ms | 12.1x | 2722.5ms | 순간 동시성에서 tail이 1초대로 증폭된다. |
| guest_feed_page | 105.5ms | 1111.5ms | 10.5x | 2853.0ms | 순간 동시성에서 tail이 1초대로 증폭된다. |
| popular_guest_feed_page | 109.3ms | 1087.3ms | 9.9x | 2624.4ms | 순간 동시성에서 tail이 1초대로 증폭된다. |
| lost_found_page | 109.1ms | 1018.4ms | 9.3x | 2895.2ms | 순간 동시성에서 tail이 1초대로 증폭된다. |
| guest_feed_api | 76.0ms | 710.5ms | 9.3x | 2728.1ms | 증폭은 있으나 아직 1초 미만이다. |
| home_feed_api | 61.1ms | 440.3ms | 7.2x | 2732.6ms | 증폭은 있으나 아직 1초 미만이다. |

## 해석

- spike 프로파일에서도 모든 요청은 `200`이고 오류율은 `0%`였다. 기능적 가용성은 깨지지 않았다.
- 그러나 p99는 유의미하게 변했다. 동시성 100에서 page route p99가 `1s`를 넘었고, API route는 상대적으로 낮았다.
- `home`이 가장 높은 p99인 `1320.1ms`를 기록했다. `guest_feed_page`, `popular_guest_feed_page`, `lost_found_page`도 약 `1.0-1.1s` 구간이었다.
- `guest_feed_api`는 첫 병목으로 보기 어렵다. spike에서도 p99 `710.5ms`, 오류율 `0%`였다.
- 다음 조사는 DB 인덱스 변경이 아니라 HTML render, body transfer, 서버 프로세스 queueing을 분리하는 방식으로 진행해야 한다.

## 병목 후보

- 1순위: 동시성 100에서 page route tail 증폭. 특히 `/`와 `/feed/guest`를 본다.
- 2순위: 초기 포화 wave의 로컬 Node/Next 서버 queueing.
- 아직 입증되지 않은 것: DB query saturation. `guest_feed_api` p95는 `140ms` 아래, `home_feed_api` p95는 `115ms` 아래였다.

## 다음 작업

- traffic 리포트에 header/body phase timing을 추가해 first-byte와 본문 전송을 분리한다.
- 그 다음 `/`와 `/feed/guest`의 static/dynamic 상태, middleware/header work, first-byte work를 점검한다.
