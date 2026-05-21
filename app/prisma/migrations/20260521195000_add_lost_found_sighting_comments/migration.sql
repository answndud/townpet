CREATE TYPE "CommentKind" AS ENUM ('GENERAL', 'LOST_FOUND_SIGHTING');

ALTER TABLE "Comment" ADD COLUMN "kind" "CommentKind" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "Comment" ADD COLUMN "sightingLocation" TEXT;
ALTER TABLE "Comment" ADD COLUMN "sightingSeenAt" TIMESTAMP(3);
ALTER TABLE "Comment" ADD COLUMN "sightingImageUrl" TEXT;
ALTER TABLE "Comment" ADD COLUMN "isPrivateSighting" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Comment_postId_kind_createdAt_idx" ON "Comment"("postId", "kind", "createdAt" DESC);

ALTER TYPE "ModerationActionType" ADD VALUE 'LOST_FOUND_STATUS_CHANGED';
