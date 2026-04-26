-- CreateEnum
CREATE TYPE "CareApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CARE_APPLICATION_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'CARE_APPLICATION_DECIDED';

-- AlterEnum
ALTER TYPE "NotificationEntityType" ADD VALUE 'CARE_APPLICATION';

-- CreateTable
CREATE TABLE "CareApplication" (
    "id" TEXT NOT NULL,
    "careRequestId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "message" TEXT,
    "status" "CareApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareApplication_careRequestId_applicantId_key" ON "CareApplication"("careRequestId", "applicantId");

-- CreateIndex
CREATE INDEX "CareApplication_applicantId_createdAt_idx" ON "CareApplication"("applicantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CareApplication_careRequestId_status_createdAt_idx" ON "CareApplication"("careRequestId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CareApplication_decidedBy_decidedAt_idx" ON "CareApplication"("decidedBy", "decidedAt");

-- AddForeignKey
ALTER TABLE "CareApplication" ADD CONSTRAINT "CareApplication_careRequestId_fkey" FOREIGN KEY ("careRequestId") REFERENCES "CareRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareApplication" ADD CONSTRAINT "CareApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareApplication" ADD CONSTRAINT "CareApplication_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
