# 2026-05-24 | post detail missing upload images

## Symptom

- Production feed smoke에서 오래된 업로드 이미지가 404를 내는 문제가 먼저 발견됐다.
- 피드 목록은 `07cb736`에서 방어했지만, 게시글 상세에는 별도 위험이 남아 있었다.
- 본문에 `![첨부 이미지](/media/media/uploads/...)`처럼 오래된 중복 proxy 경로가 있거나, `/media/uploads/*`가 더 이상 blob/local 파일로 존재하지 않으면 상세 화면에서 깨진 이미지 요청 또는 갤러리 숨김이 발생할 수 있었다.

## Cause

- 상세 화면은 본문에 이미지 마크다운 토큰이 있으면 `PostDetailMediaGallery`를 숨겼다.
- `renderLiteMarkdown`는 업로드 URL이 실제로 renderable한지 확인하지 않고 trusted upload URL이면 `<img>`로 렌더링했다.
- 오래된 중복 경로는 `<img>`로 렌더되지 않지만 이미지 토큰으로는 감지되어, 본문 이미지도 갤러리도 안정적으로 보여주지 못하는 상태가 될 수 있었다.

## Fix

- `renderLiteMarkdown`에 `renderableUploadPathnames` 옵션을 추가해 확인된 업로드만 `<img>`로 렌더링한다.
- 상세 렌더링 공용 helper가 본문 이미지 URL과 `PostImage` URL을 함께 수집한 뒤, blob-backed asset 또는 실제 local public 파일만 renderable로 판단한다.
- 상세 API, 본문 refresh API, 비회원 상세 페이지가 같은 상세 렌더링 helper를 사용한다.
- 클라이언트 상세 카드는 원본 마크다운 토큰 여부가 아니라 실제 렌더된 HTML의 `<img>` 여부로 inline image 존재를 판단한다.

## Verification

- `corepack pnpm@9.12.3 -C app test -- src/lib/markdown-lite.test.ts src/lib/post-detail-rendering.test.ts 'src/app/api/posts/[id]/detail/route.test.ts' 'src/app/api/posts/[id]/content/route.test.ts'`
- `corepack pnpm@9.12.3 -C app typecheck`
- `git diff --check`
