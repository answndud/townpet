# PROGRESS.md

## 현재 상태

- active: `성능 개선 8단계 루프`.
- Phase 1 `성능 기준선 고정` 완료. `perf:baseline`, `perf:browser`, `perf:assets` 기본 target에 `/login`과 hot path를 보강하고 production 기준 server/browser/assets report를 생성했다. 요약은 [performance-phase1-baseline-2026-05-30.md](./reports/performance-phase1-baseline-2026-05-30.md)에 기록했다.
- 다음 작업: Phase 2 `Web Vitals 실사용 수집 MVP`. 개인정보 없이 LCP, INP, CLS, FCP, TTFB를 route 단위로 수집하고 p75/p95를 조회할 수 있게 만든다.
