-- CreateEnum
CREATE TYPE "CorrectionRequestTargetType" AS ENUM ('HOSPITAL', 'PLACE', 'POST', 'OTHER');

-- CreateEnum
CREATE TYPE "CorrectionRequestStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CorrectionRequesterRole" AS ENUM ('BUSINESS_OWNER', 'STAFF', 'CUSTOMER', 'PUBLIC_AGENCY', 'OTHER');

-- AlterEnum
ALTER TYPE "ModerationTargetType" ADD VALUE IF NOT EXISTS 'CORRECTION_REQUEST';

-- AlterEnum
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'CORRECTION_REQUEST_REVIEWED';

-- CreateTable
CREATE TABLE "InformationCorrectionRequest" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT,
    "postId" TEXT,
    "targetType" "CorrectionRequestTargetType" NOT NULL,
    "targetName" TEXT NOT NULL,
    "requesterRole" "CorrectionRequesterRole" NOT NULL,
    "organizationName" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" CITEXT NOT NULL,
    "requesterPhone" TEXT,
    "requestedChange" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" "CorrectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "clientIpHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InformationCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InformationCorrectionRequest_status_createdAt_idx" ON "InformationCorrectionRequest"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "InformationCorrectionRequest_targetType_targetName_idx" ON "InformationCorrectionRequest"("targetType", "targetName");

-- CreateIndex
CREATE INDEX "InformationCorrectionRequest_postId_createdAt_idx" ON "InformationCorrectionRequest"("postId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "InformationCorrectionRequest_requesterEmail_createdAt_idx" ON "InformationCorrectionRequest"("requesterEmail", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "InformationCorrectionRequest_resolvedBy_resolvedAt_idx" ON "InformationCorrectionRequest"("resolvedBy", "resolvedAt");

-- AddForeignKey
ALTER TABLE "InformationCorrectionRequest" ADD CONSTRAINT "InformationCorrectionRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InformationCorrectionRequest" ADD CONSTRAINT "InformationCorrectionRequest_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InformationCorrectionRequest" ADD CONSTRAINT "InformationCorrectionRequest_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
