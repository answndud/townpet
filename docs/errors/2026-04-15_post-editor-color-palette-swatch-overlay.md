# 2026-04-15 게시글 에디터 색상 팔레트가 빈 버튼처럼 보이던 문제

## 증상
- 게시글 작성/수정 에디터에서 글자색 palette 레이아웃은 열리지만, 개별 swatch가 실제 색 대신 흰 버튼처럼 보였다.
- 기존 palette 색 수가 12개뿐이라 사용자가 기대한 예시 수준의 다단 색상 선택과도 차이가 컸다.

## 원인
- SunEditor는 각 색 타일을 `button`의 inline `background-color`로만 그린다.
- 일부 브라우저/스타일 조합에서는 버튼 네이티브 외형과 프로젝트 CSS override가 겹치며 inline 배경이 충분히 드러나지 않았다.
- palette 데이터도 너무 작아 예시 이미지 같은 8x8 grid 경험을 만들지 못했다.

## 수정
- `app/src/lib/post-editor-color-palette.ts`에 64색(8열) palette를 분리하고 SunEditor 옵션에서 이를 사용하도록 변경했다.
- 같은 파일의 `syncSunEditorColorSwatches`로 각 `button[data-value]`에 `data-tp-swatch`를 남기고, 실제 `.tp-se-color-swatch-fill` child node를 주입해 색을 inline background로 직접 그리도록 바꿨다.
- `app/src/app/globals.css`에서 swatch 버튼 본체 배경은 숨기고, child node가 실제 색 타일을 그리도록 바꿨다.
- hover/active/focus 상태도 button box-shadow 기준으로 다시 그려 square swatch가 깨지지 않게 했다.

## 회귀 방지
- `app/src/lib/post-editor-color-palette.test.ts`에서 palette 크기(64색)와 swatch decoration helper를 검증한다.
- `app/src/app/globals-css.test.ts`에서 8열 grid, `data-tp-swatch`, child swatch 스타일 문자열 존재를 확인한다.

## 검증
- `corepack pnpm -C app typecheck`
- `corepack pnpm -C app exec vitest run src/lib/post-editor-color-palette.test.ts src/app/globals-css.test.ts`
