# 2026-06-08 lost-found alert seed mismatch

## 증상

- 로컬 `/feed/guest?type=LOST_FOUND`에 `LOST_FOUND` 타입 글이 보이지만 일부 상세 페이지에는 분실/목격 공유 도구와 목격 제보 폼이 활성화되지 않았다.
- 원인은 글 타입만 `LOST_FOUND`이고 `LostFoundAlert` 관계가 없는 레거시 seed 데이터였다.

## 원인

- `seed-board-posts.ts`와 `seed-search-cases.ts`가 분실/목격 샘플 글을 만들 때 구조화 alert 관계를 함께 생성하지 않았다.
- 이후 작성/상세 로직은 `LostFoundAlert` 존재를 기준으로 공유/목격 기능을 안전하게 활성화하므로, 타입과 구조화 데이터가 불일치한 샘플 글에서 기능 기대가 어긋났다.

## 수정

- 분실/목격 seed 글에 `LostFoundAlert` 구조화 데이터를 추가했다.
- seed 재실행 시 기존 레거시 글도 `upsert`로 alert를 보정하도록 했다.
- `db:repair:post-integrity`에 alert 누락 분실/목격 글 repair를 추가했다.

## 검증

- targeted tests: `seed-lost-found-alerts`, `post-integrity.service`, `repair-post-integrity`, `seed-entrypoints` 통과.
- 로컬 repair apply 후 active `LOST_FOUND` 중 `LostFoundAlert` 누락 0건 확인.
