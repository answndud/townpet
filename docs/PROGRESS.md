# PROGRESS.md

## 현재 상태

- active: `성능 개선 8단계 루프`.
- 현재 작업: Phase 2 `Web Vitals 실사용 수집 MVP`.
- 목표: 개인정보 없이 LCP, INP, CLS, FCP, TTFB를 route 단위로 수집하고 p75/p95를 조회할 수 있게 만든다.
- 다음 액션: root layout에 Web Vitals reporter를 연결하고, read-only summary query/report와 회귀 테스트를 추가한다.
