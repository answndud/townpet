ALTER TYPE "ReportTarget" ADD VALUE IF NOT EXISTS 'COMMENT';

ALTER TABLE "Report"
  ADD COLUMN "postTargetId" TEXT,
  ADD COLUMN "commentTargetId" TEXT;

UPDATE "Report"
SET "postTargetId" = "targetId"
WHERE "targetType"::text = 'POST';

ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_targetId_fkey";

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_postTargetId_fkey"
    FOREIGN KEY ("postTargetId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Report_commentTargetId_fkey"
    FOREIGN KEY ("commentTargetId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Report_postTargetId_idx" ON "Report"("postTargetId");
CREATE INDEX "Report_commentTargetId_idx" ON "Report"("commentTargetId");
