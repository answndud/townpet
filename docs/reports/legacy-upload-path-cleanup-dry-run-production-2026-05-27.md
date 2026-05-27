# Legacy Upload Path Cleanup Dry Run

- generatedAt: 2026-05-27T03:03:41.994Z
- mode: dry-run
- target: production DB from Vercel env pull
- pattern: /media/media/uploads/
- limit: 50
- candidateCount: 1
- changedCount: 1

## Preview

### cmm0kczw9000211jw0td3wf71
- title: 이미지 업로드 테스트
- status/type/scope: ACTIVE/FREE_BOARD/GLOBAL
- replacements:
  - /media/media/uploads/1771935012347-5511bddc-bdf9-49cf-9e55-3fae218fd8fb.jpg -> /media/uploads/1771935012347-5511bddc-bdf9-49cf-9e55-3fae218fd8fb.jpg (occurrences=1)
- beforeSnippet: 이미지 업로드1 ![첨부 이미지 1](/media/media/uploads/1771935012347-5511bddc-bdf9-49cf-9e55-3fae218fd8fb.jpg)
- afterSnippet: 이미지 업로드1 ![첨부 이미지 1](/media/uploads/1771935012347-5511bddc-bdf9-49cf-9e55-3fae218fd8fb.jpg)

## Next Step
- This is a dry-run report. No production data was changed.
- Apply must be a separate explicit production mutation step after approval.
