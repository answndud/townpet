CREATE TYPE "FeedPersonalizationSurface" AS ENUM ('FEED', 'BREED_LOUNGE');

CREATE TYPE "FeedPersonalizationEvent" AS ENUM (
  'VIEW',
  'POST_CLICK',
  'AD_IMPRESSION',
  'AD_CLICK'
);

CREATE TYPE "FeedAudienceSource" AS ENUM ('SEGMENT', 'PET', 'NONE');

CREATE TABLE "FeedPersonalizationStat" (
  "id" TEXT NOT NULL,
  "day" TIMESTAMP(3) NOT NULL,
  "surface" "FeedPersonalizationSurface" NOT NULL,
  "event" "FeedPersonalizationEvent" NOT NULL,
  "audienceKey" TEXT NOT NULL DEFAULT 'NONE',
  "breedCode" TEXT NOT NULL DEFAULT 'NONE',
  "audienceSource" "FeedAudienceSource" NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FeedPersonalizationStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeedPersonalizationStat_day_surface_event_audienceKey_breedC_key"
ON "FeedPersonalizationStat"("day", "surface", "event", "audienceKey", "breedCode", "audienceSource");

CREATE INDEX "FeedPersonalizationStat_day_surface_event_idx"
ON "FeedPersonalizationStat"("day", "surface", "event");

CREATE INDEX "FeedPersonalizationStat_event_updatedAt_idx"
ON "FeedPersonalizationStat"("event", "updatedAt" DESC);

CREATE INDEX "FeedPersonalizationStat_audienceKey_day_event_idx"
ON "FeedPersonalizationStat"("audienceKey", "day", "event");
