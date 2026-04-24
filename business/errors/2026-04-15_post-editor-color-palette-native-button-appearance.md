# 2026-04-15 post editor color palette native button appearance

## 증상
- 글자색 submenu 레이아웃은 보이지만, 각 색 타일이 실제 색상칩이 아니라 흰색 pill 버튼처럼 렌더링됐다.
- 사용자가 기대한 1:1 정사각형 palette가 아니라 둥근 직사각형 모양으로 보였다.

## 원인
- 색상 타일이 `<button>` 기본 appearance를 그대로 사용하고 있었다.
- 일부 브라우저에서는 inline `background-color`보다 네이티브 버튼 외형이 먼저 드러나서 색상이 눌려 보였고, 기본 높이도 유지돼 정사각형 비율이 깨졌다.

## 수정
- `app/src/app/globals.css`
  - swatch 버튼에 `appearance: none`과 `-webkit-appearance: none`을 추가했다.
  - `aspect-ratio: 1 / 1`, `height: auto`, `padding: 0`을 적용해 1:1 정사각형 컬러칩으로 고정했다.
  - `background-clip: padding-box`를 추가해 inline `background-color`가 버튼 내부에 안정적으로 보이게 했다.

## 회귀 방지
- `app/src/app/globals-css.test.ts`
  - `appearance: none`과 `aspect-ratio: 1 / 1` 규칙이 유지되는지 스모크 테스트를 추가했다.

## 검증
- `corepack pnpm -C app typecheck`
- `corepack pnpm -C app exec vitest run src/app/globals-css.test.ts`
