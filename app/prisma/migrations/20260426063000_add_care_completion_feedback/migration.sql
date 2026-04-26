-- CreateEnum
CREATE TYPE "CareFeedbackAuthorRole" AS ENUM ('REQUESTER', 'CAREGIVER');

-- CreateEnum
CREATE TYPE "CareFeedbackOutcome" AS ENUM ('POSITIVE', 'NEUTRAL', 'ISSUE');

-- CreateEnum
CREATE TYPE "CareFeedbackIssueType" AS ENUM ('NONE', 'NO_SHOW', 'SAFETY', 'PAYMENT_OR_FRAUD', 'PRIVACY', 'OTHER');

-- CreateTable
CREATE TABLE "CareCompletionFeedback" (
    "id" TEXT NOT NULL,
    "careRequestId" TEXT NOT NULL,
    "careApplicationId" TEXT,
    "authorId" TEXT NOT NULL,
    "authorRole" "CareFeedbackAuthorRole" NOT NULL,
    "outcome" "CareFeedbackOutcome" NOT NULL,
    "issueType" "CareFeedbackIssueType" NOT NULL DEFAULT 'NONE',
    "wouldRepeat" BOOLEAN,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareCompletionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareCompletionFeedback_careRequestId_authorId_key" ON "CareCompletionFeedback"("careRequestId", "authorId");

-- CreateIndex
CREATE INDEX "CareCompletionFeedback_careRequestId_authorRole_idx" ON "CareCompletionFeedback"("careRequestId", "authorRole");

-- CreateIndex
CREATE INDEX "CareCompletionFeedback_careApplicationId_idx" ON "CareCompletionFeedback"("careApplicationId");

-- CreateIndex
CREATE INDEX "CareCompletionFeedback_issueType_createdAt_idx" ON "CareCompletionFeedback"("issueType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CareCompletionFeedback_authorId_createdAt_idx" ON "CareCompletionFeedback"("authorId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CareCompletionFeedback" ADD CONSTRAINT "CareCompletionFeedback_careRequestId_fkey" FOREIGN KEY ("careRequestId") REFERENCES "CareRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCompletionFeedback" ADD CONSTRAINT "CareCompletionFeedback_careApplicationId_fkey" FOREIGN KEY ("careApplicationId") REFERENCES "CareApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCompletionFeedback" ADD CONSTRAINT "CareCompletionFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
