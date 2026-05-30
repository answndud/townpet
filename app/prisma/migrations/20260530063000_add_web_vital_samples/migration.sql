-- CreateEnum
CREATE TYPE "WebVitalMetric" AS ENUM ('LCP', 'INP', 'CLS', 'FCP', 'TTFB');

-- CreateEnum
CREATE TYPE "WebVitalRating" AS ENUM ('GOOD', 'NEEDS_IMPROVEMENT', 'POOR');

-- CreateTable
CREATE TABLE "WebVitalSample" (
    "id" TEXT NOT NULL,
    "metric" "WebVitalMetric" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" "WebVitalRating" NOT NULL,
    "route" TEXT NOT NULL,
    "navigationType" TEXT NOT NULL DEFAULT 'unknown',
    "deviceType" TEXT NOT NULL DEFAULT 'unknown',
    "connectionType" TEXT NOT NULL DEFAULT 'unknown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebVitalSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebVitalSample_metric_route_createdAt_idx" ON "WebVitalSample"("metric", "route", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WebVitalSample_route_createdAt_idx" ON "WebVitalSample"("route", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WebVitalSample_createdAt_metric_idx" ON "WebVitalSample"("createdAt" DESC, "metric");
