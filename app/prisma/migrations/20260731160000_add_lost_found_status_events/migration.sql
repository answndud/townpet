CREATE TABLE "LostFoundStatusEvent" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" "LostFoundStatus",
    "toStatus" "LostFoundStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LostFoundStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LostFoundStatusEvent_alertId_createdAt_idx" ON "LostFoundStatusEvent"("alertId", "createdAt" DESC);
CREATE INDEX "LostFoundStatusEvent_actorId_createdAt_idx" ON "LostFoundStatusEvent"("actorId", "createdAt" DESC);

ALTER TABLE "LostFoundStatusEvent" ADD CONSTRAINT "LostFoundStatusEvent_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "LostFoundAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LostFoundStatusEvent" ADD CONSTRAINT "LostFoundStatusEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
