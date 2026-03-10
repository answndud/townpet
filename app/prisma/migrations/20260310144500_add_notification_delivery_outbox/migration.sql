-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "deliveryId" TEXT;

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "NotificationType" NOT NULL,
    "entityType" "NotificationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_deliveryId_key" ON "Notification"("deliveryId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_userId_status_createdAt_idx" ON "NotificationDelivery"("userId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_scheduledAt_createdAt_idx" ON "NotificationDelivery"("status", "scheduledAt", "createdAt" DESC);
