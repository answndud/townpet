-- CreateEnum
CREATE TYPE "CareFeedbackReviewStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "CareCompletionFeedback"
ADD COLUMN "reviewStatus" "CareFeedbackReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT;

-- AlterEnum
ALTER TYPE "ModerationActionType" ADD VALUE 'CARE_FEEDBACK_REVIEWED';

-- AddForeignKey
ALTER TABLE "CareCompletionFeedback"
ADD CONSTRAINT "CareCompletionFeedback_reviewedBy_fkey"
FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "CareCompletionFeedback_reviewStatus_createdAt_idx"
ON "CareCompletionFeedback"("reviewStatus", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CareCompletionFeedback_reviewedBy_reviewedAt_idx"
ON "CareCompletionFeedback"("reviewedBy", "reviewedAt");
