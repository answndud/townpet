CREATE TABLE "SearchTermDailyMetric" (
    "metricKey" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "scope" "PostScope" NOT NULL DEFAULT 'GLOBAL',
    "typeKey" TEXT NOT NULL DEFAULT 'ALL',
    "searchIn" "SearchTermSearchIn" NOT NULL DEFAULT 'ALL',
    "queryCount" INTEGER NOT NULL DEFAULT 0,
    "zeroResultCount" INTEGER NOT NULL DEFAULT 0,
    "totalResultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchTermDailyMetric_pkey" PRIMARY KEY ("metricKey")
);

CREATE INDEX "SearchTermDailyMetric_scope_typeKey_searchIn_day_idx"
ON "SearchTermDailyMetric"("scope", "typeKey", "searchIn", "day" DESC);

CREATE INDEX "SearchTermDailyMetric_day_idx"
ON "SearchTermDailyMetric"("day" DESC);
