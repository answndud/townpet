-- Ensure Post.dislikeCount exists for reaction aggregates
ALTER TABLE "Post"
ADD COLUMN IF NOT EXISTS "dislikeCount" INTEGER NOT NULL DEFAULT 0;
