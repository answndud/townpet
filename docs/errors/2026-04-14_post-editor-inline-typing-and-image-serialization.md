# 2026-04-14 post editor inline typing and image serialization

## 증상
- 글자 크기나 색상을 선택 텍스트에 적용한 뒤 문단 끝을 다시 클릭하면 다음 입력도 같은 서식 span 안으로 들어가 `18px로 계속 써지는` 것처럼 보였다.
- 링크/인용/글머리/번호/이미지 업로드도 selection을 잃는 순간 무반응 또는 잘못된 위치 삽입으로 이어질 수 있었다.
- 이미지 업로드 후 저장한 게시글에서 같은 이미지 markdown token이 인접 중복으로 저장되어 상세 페이지에 이미지 수가 실제보다 늘어났다.

## 재현
1. 게시글 작성 화면에서 본문 텍스트를 입력한다.
2. 텍스트 일부를 선택해 `18` 또는 색상을 적용한다.
3. 문단 끝을 다시 클릭하고 입력을 이어간다.
4. 이미지를 2장 업로드한 뒤 저장하면 상세 페이지에서 본문 이미지 수가 기대보다 많아질 수 있다.

## 원인
- inline 서식 적용은 선택 영역을 span으로 감싼 뒤 caret을 단순히 `setStartAfter(span)`로만 이동시켰다. 문단 끝에서는 브라우저가 다시 클릭 시 styled span 내부 끝으로 caret을 넣을 수 있어 다음 입력이 같은 span 안으로 이어졌다.
- 툴바는 global `selectionchange`에만 의존해 selection을 기억했다. select, color input, 이미지 라벨처럼 focus를 먼저 가져가는 컨트롤은 interaction 시작 시 selection을 명시적으로 캡처하지 않아 취약했다.
- editor root의 plain text/inlines를 block 단위로 직렬화하지 않아 text와 image insertion DOM이 submit 시 섞였고, 같은 이미지 token이 인접 중복으로 저장될 수 있었다.

## 수정
- `app/src/lib/editor-inline-image.ts`
  - styled node 뒤 plain typing 위치를 보장하는 helper 추가
  - image insertion을 block tag 직접 삽입 대신 `br + img + br` 기반으로 정리
- `app/src/components/posts/post-create-form.tsx`
- `app/src/components/posts/post-detail-edit-form.tsx`
  - 버튼/셀렉트/컬러 피커/이미지 액션 시작 시 selection 즉시 캡처
  - 크기/색상 적용 직후 toolbar 상태를 새 caret 기준으로 재동기화
- `app/src/components/posts/post-editor-toolbar-controls.tsx`
  - select/label/input도 selection capture 경로를 타도록 연결
- `app/src/lib/editor-content-serializer.ts`
  - root inline content를 paragraph 단위로 직렬화
- `app/src/lib/editor-image-markup.ts`
  - 인접한 동일 이미지 token collapse helper 추가

## 회귀 테스트
- `corepack pnpm -C app exec vitest run src/lib/editor-image-markup.test.ts`
- `corepack pnpm -C app test:e2e -- e2e/post-editor-toolbar.spec.ts --project=chromium`
- `corepack pnpm -C app test:e2e -- e2e/image-upload-flow.spec.ts --project=chromium`

## 재발 방지
- selection을 잃을 수 있는 툴바 컨트롤은 `selectionchange`만 믿지 말고 interaction 시작 시점 snapshot을 남긴다.
- contenteditable root의 raw DOM을 그대로 저장하지 말고 paragraph/image block 경계를 직렬화 레이어에서 명시적으로 복원한다.
- 이미지 token 중복은 markup normalization에서 한 번 더 잡아, DOM 편차가 바로 저장 버그로 이어지지 않게 한다.
