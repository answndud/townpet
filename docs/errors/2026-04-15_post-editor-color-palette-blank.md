# 2026-04-15 post editor color palette blank

## 증상
- 게시글 작성/수정 에디터에서 `글자색` submenu는 열리지만, 상단 색상 swatch 영역이 빈 흰 박스로 보였다.

## 원인
- SunEditor 기본 color picker는 `float`와 `max-content`에 기대는 레이아웃을 사용한다.
- 현재 TownPet 에디터 스킨/브라우저 조합에서는 이 기본 레이아웃이 안정적으로 보이지 않아, palette 영역이 비어 보이는 상태가 발생했다.

## 수정
- `app/src/app/globals.css`
  - `.se-list-inner`를 column layout으로 정리했다.
  - `.se-color-pallet`을 6열 grid로 강제했다.
  - swatch 버튼 높이, border, shadow를 명시해 흰색 tile까지 보이도록 보정했다.
  - 입력 폼 영역도 palette 아래에 안정적으로 배치되도록 submenu form spacing을 정리했다.

## 회귀 방지
- `app/src/app/globals-css.test.ts`
  - color palette grid와 form group selector가 유지되는지 스모크 테스트를 추가했다.

## 검증
- `corepack pnpm -C app typecheck`
- `corepack pnpm -C app exec vitest run src/app/globals-css.test.ts`
- E2E는 로컬 PostgreSQL(`localhost:5432`) 미기동으로 이번 턴에 확인하지 못했다.
