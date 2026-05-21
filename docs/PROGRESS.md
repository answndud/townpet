# PROGRESS.md

## 현재 상태

- 현재 active 계획: [PLAN.md](./PLAN.md)의 `P0 성능 측정과 속도 개선 루프`.
- `마케팅 피드백 기반 제품 획득 루프 재정렬`은 성능 baseline/개선 이후 재개한다.
- 최근 완료 archive: [COMPLETED.md](./COMPLETED.md)의 `2026-05-21 | 홈 빠른 shell과 지연 피드 preview 전환`.

## 다음 액션

- `P0-Perf-3. /feed query 경량화`부터 진행한다.
- 첫 페이지 count query 제거, 게스트/회원 서버 경로 분리, 기본 feed의 personalization 지연 여부를 검토한다.
- 개선 전후 수치를 `docs/reports`에 남기고, 최종 정리본은 `blog/29-성능개선-측정과-최적화-기록.md`로 작성한다.
