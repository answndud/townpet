# Legacy Upload Path Audit

- generatedAt: 2026-05-24T12:06:34.053Z
- mode: read-only
- target: local DB from `app/.env`
- pattern: `/media/media/uploads/`
- limit: 20
- postContents: 0
- postImages: 0
- commentContents: 0

## Post Content Samples

- No post content samples.

## Post Image Samples

- No post image samples.

## Comment Content Samples

- No comment content samples.

## Production Audit Status

- Production direct DB env was not available in this Codex session.
- Checked `/tmp/townpet-production.env`, `/tmp/townpet-vercel-link`, process env, and local Vercel CLI availability without printing secrets.
- No production DB mutation was attempted.

## Next Step

- Re-run the same read-only command against production when `DATABASE_URL` is available outside the repo:

```bash
LEGACY_UPLOAD_PATH_AUDIT_CONFIRM=LEGACY_UPLOAD_PATH_AUDIT \
LEGACY_UPLOAD_PATH_AUDIT_LIMIT=50 \
corepack pnpm@9.12.3 -C app db:audit:legacy-upload-paths
```

- If any count is non-zero, create a separate cleanup plan with dry-run output and explicit approval.
