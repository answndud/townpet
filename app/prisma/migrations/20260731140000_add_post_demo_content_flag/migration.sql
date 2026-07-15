ALTER TABLE "Post"
ADD COLUMN "isDemoContent" BOOLEAN NOT NULL DEFAULT false;

-- Only mark the explicitly owned demo account domains used by the seed jobs.
-- Normal user content containing words such as "테스트" remains public.
UPDATE "Post" AS post
SET "isDemoContent" = true
FROM "User" AS author
WHERE author.id = post."authorId"
  AND (
    LOWER(author.email) LIKE '%@demo.townpet.co.kr'
    OR LOWER(author.email) LIKE '%@townpet.dev'
  );

CREATE INDEX "Post_isDemoContent_scope_status_createdAt_idx"
ON "Post" ("isDemoContent", "scope", "status", "createdAt" DESC);
