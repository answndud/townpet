CREATE TABLE "AcquisitionEventStat" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "surface" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'NONE',
    "targetId" TEXT NOT NULL DEFAULT 'NONE',
    "source" TEXT NOT NULL DEFAULT 'NONE',
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionEventStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcquisitionEventStat_day_surface_event_targetType_targetId_s_key" ON "AcquisitionEventStat"("day", "surface", "event", "targetType", "targetId", "source");
CREATE INDEX "AcquisitionEventStat_day_surface_event_idx" ON "AcquisitionEventStat"("day" DESC, "surface", "event");
CREATE INDEX "AcquisitionEventStat_event_day_idx" ON "AcquisitionEventStat"("event", "day" DESC);
CREATE INDEX "AcquisitionEventStat_targetType_targetId_day_idx" ON "AcquisitionEventStat"("targetType", "targetId", "day" DESC);
