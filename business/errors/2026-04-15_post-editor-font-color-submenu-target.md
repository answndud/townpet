# 2026-04-15 post editor font color submenu target

## 증상
- 게시글 작성/수정 에디터에서 `글자색` 버튼을 눌러도 색상 팔레트가 열리지 않았다.

## 원인
- `fontColor` 툴바 아이콘을 커스텀 SVG로 바꾸면서 실제 클릭 타깃이 `button`이 아니라 내부 `svg/path/circle` 노드로 분산됐다.
- SunEditor와 로컬 selection 복원 훅이 모두 툴바 버튼 기준으로 동작하는 경로가 있어, 결과적으로 색상 submenu 오픈이 불안정해졌다.

## 수정
- `app/src/components/posts/post-body-rich-editor.tsx`
  - `fontColor` 아이콘을 SVG 대신 HTML swatch grid markup으로 교체했다.
- `app/src/app/globals.css`
  - `.tp-se-font-color-icon`과 자식 노드에 `pointer-events: none`을 적용해 클릭이 항상 상위 `button[data-command="fontColor"]`로 귀속되게 했다.

## 회귀 방지
- `app/src/app/globals-css.test.ts`
  - 새 글자색 아이콘 클래스와 `pointer-events: none` CSS가 유지되는지 스모크 테스트를 추가했다.

## 검증
- `corepack pnpm -C app typecheck`
- `corepack pnpm -C app test -- src/app/globals-css.test.ts`
- `corepack pnpm -C app test:e2e -- e2e/post-editor-toolbar.spec.ts --project=chromium -g "applies font size and color to selected text without inserting placeholder text"` 시도
  - 로컬 PostgreSQL(`localhost:5432`) 미기동으로 E2E는 재현/검증이 막혔다.
