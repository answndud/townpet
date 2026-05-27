# Legacy Upload Path Cleanup Apply

- target: production DB from Vercel env pull
- generatedAt: 2026-05-27T03:17:48.297Z
- mode: apply
- pattern: /media/media/uploads/
- limit: 50
- candidateCount: 1
- plannedCount: 1
- updatedCount: 1
- skippedStaleCount: 0

## Applied Items

### cmm0kczw9000211jw0td3wf71
- applyStatus: UPDATED
- title: 이미지 업로드 테스트
- status/type/scope: ACTIVE/FREE_BOARD/GLOBAL
- replacements:
  - /media/media/uploads/1771935012347-5511bddc-bdf9-49cf-9e55-3fae218fd8fb.jpg -> /media/uploads/1771935012347-5511bddc-bdf9-49cf-9e55-3fae218fd8fb.jpg (occurrences=1)
- beforeSnippet: 이미지 업로드1 ![첨부 이미지 1](/media/media/uploads/1771935012347-5511bddc-bdf9-49cf-9e55-3fae218fd8fb.jpg)
- afterSnippet: 이미지 업로드1 ![첨부 이미지 1](/media/uploads/1771935012347-5511bddc-bdf9-49cf-9e55-3fae218fd8fb.jpg)

## Verification
- Re-run `db:audit:legacy-upload-paths` after apply. Expected remaining count: 0.
