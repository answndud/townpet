# PROGRESS.md

## 현재 상태

- 현재 active 계획: [PLAN.md](./PLAN.md)의 `P0 성능 측정과 속도 개선 루프`.
- `마케팅 피드백 기반 제품 획득 루프 재정렬`은 성능 baseline/개선 이후 재개한다.
- 최근 완료 archive: [COMPLETED.md](./COMPLETED.md)의 `2026-05-21 | feed 첫 페이지 count query와 기본 개인화 context 지연`.

## 다음 액션

- `P0-Perf-4. 댓글 작성 체감 속도 개선`부터 진행한다.
- 댓글 작성 후 전체 refetch/revalidation 범위를 확인하고, 가능한 경우 optimistic/pending UI와 부분 append로 체감 지연을 줄인다.
- 개선 전후 수치를 `docs/reports`에 남기고, 최종 정리본은 `blog/29-성능개선-측정과-최적화-기록.md`로 작성한다.
