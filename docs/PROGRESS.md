# PROGRESS.md

## 현재 상태

- 현재 active 계획: [PLAN.md](./PLAN.md)의 `P0 성능 측정과 속도 개선 루프`.
- `마케팅 피드백 기반 제품 획득 루프 재정렬`은 성능 baseline/개선 이후 재개한다.
- 최근 완료 archive: [COMPLETED.md](./COMPLETED.md)의 `2026-05-21 | Production 성능 baseline 측정 하네스 추가`.

## 다음 액션

- `P0-Perf-2. / 홈을 빠른 shell + 캐시 인기글 구조로 전환`부터 진행한다.
- 첫 화면에서 DB/인증/개인화 의존을 줄이고, 인기글/최신글은 캐시 또는 lazy fetch로 붙인다.
- 개선 전후 수치를 `docs/reports`에 남기고, 최종 정리본은 `blog/29-성능개선-측정과-최적화-기록.md`로 작성한다.
