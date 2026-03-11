CREATE TYPE "ModerationTargetType" AS ENUM ('POST', 'COMMENT', 'USER');

CREATE TYPE "ModerationActionType" AS ENUM (
  'REPORT_RESOLVED',
  'REPORT_DISMISSED',
  'TARGET_HIDDEN',
  'TARGET_UNHIDDEN',
  'SANCTION_ISSUED',
  'HOSPITAL_REVIEW_FLAGGED'
);

CREATE TABLE "ModerationActionLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" "ModerationActionType" NOT NULL,
  "targetType" "ModerationTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "reportId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ModerationActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModerationActionLog_actorId_createdAt_idx"
ON "ModerationActionLog"("actorId", "createdAt" DESC);

CREATE INDEX "ModerationActionLog_targetType_targetId_createdAt_idx"
ON "ModerationActionLog"("targetType", "targetId", "createdAt" DESC);

CREATE INDEX "ModerationActionLog_targetUserId_createdAt_idx"
ON "ModerationActionLog"("targetUserId", "createdAt" DESC);

CREATE INDEX "ModerationActionLog_reportId_createdAt_idx"
ON "ModerationActionLog"("reportId", "createdAt" DESC);

CREATE INDEX "ModerationActionLog_action_createdAt_idx"
ON "ModerationActionLog"("action", "createdAt" DESC);

ALTER TABLE "ModerationActionLog"
ADD CONSTRAINT "ModerationActionLog_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationActionLog"
ADD CONSTRAINT "ModerationActionLog_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ModerationActionLog"
ADD CONSTRAINT "ModerationActionLog_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "Report"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
