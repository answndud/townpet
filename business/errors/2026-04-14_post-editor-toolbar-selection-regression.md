# 2026-04-14 post editor toolbar selection regression

## 증상
- 글자 크기 선택 시 선택 영역 대신 `텍스트` placeholder가 본문에 삽입됐다.
- 색상 선택이 선택 텍스트에 적용되지 않았다.
- `인용`, `글머리`, `번호` 명령이 무반응처럼 보였다.

## 영향 범위
- `/posts/new`
- `/posts/[id]/edit`

## 원인
- 426에서 툴바를 개편하면서 toolbar action이 실행될 때 editor `focus()`를 먼저 호출했다.
- 이 시점의 `selectionchange`가 기존 텍스트 selection을 collapsed caret로 덮어썼고, 이후 서식/블록 명령은 원래 선택 범위가 아니라 깨진 caret 기준으로 실행됐다.
- inline size/color helper는 collapsed range일 때 placeholder `텍스트`를 삽입하도록 돼 있어 증상이 더 크게 보였다.

## 수정
- 저장된 selection을 우선 복원하는 공용 helper를 `app/src/lib/editor-inline-image.ts`에 추가했다.
- create/edit toolbar command는 `focus()` 전에 저장된 selection을 복원하는 공용 helper를 사용하도록 변경했다.
- inline size/color는 실제 선택 영역이 있을 때만 적용하고, collapsed range에서는 placeholder를 생성하지 않도록 막았다.
- Playwright 회귀 스펙 `app/e2e/post-editor-toolbar.spec.ts`를 추가했다.

## 검증
- `corepack pnpm -C app lint src/components/posts/post-create-form.tsx src/components/posts/post-detail-edit-form.tsx src/lib/editor-inline-image.ts e2e/post-editor-toolbar.spec.ts`
- `corepack pnpm -C app typecheck`
- `open -a Docker`
- `docker compose -f /Users/alex/project/townpet/docker-compose.yml up -d postgres`
- `corepack pnpm -C app db:push`
- `corepack pnpm -C app exec playwright install chromium`
- `corepack pnpm -C app test:e2e -- e2e/post-editor-toolbar.spec.ts --project=chromium`
  - `3 passed`

## 재발 방지
- toolbar action이 editor selection을 사용하는 경우 `focus()`보다 selection restore가 먼저 고려돼야 한다.
- placeholder 삽입 같은 fallback은 selection이 없는 상태에서 기본 동작으로 두지 않는다.
- browser-specific command는 Playwright 회귀로 유지한다.
