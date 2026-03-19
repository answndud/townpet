ALTER TABLE "SearchTermStat"
ADD COLUMN "lastResultCount" INTEGER,
ADD COLUMN "totalResultCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "zeroResultCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "SearchTermStat_zeroResultCount_updatedAt_idx"
ON "SearchTermStat"("zeroResultCount" DESC, "updatedAt" DESC);
