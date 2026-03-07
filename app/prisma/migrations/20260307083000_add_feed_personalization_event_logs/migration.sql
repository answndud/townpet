CREATE TABLE "FeedPersonalizationEventLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT,
  "surface" "FeedPersonalizationSurface" NOT NULL,
  "event" "FeedPersonalizationEvent" NOT NULL,
  "audienceKey" TEXT NOT NULL DEFAULT 'NONE',
  "breedCode" TEXT NOT NULL DEFAULT 'NONE',
  "audienceSource" "FeedAudienceSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FeedPersonalizationEventLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeedPersonalizationEventLog_userId_createdAt_idx"
ON "FeedPersonalizationEventLog"("userId", "createdAt" DESC);

CREATE INDEX "FeedPersonalizationEventLog_userId_event_createdAt_idx"
ON "FeedPersonalizationEventLog"("userId", "event", "createdAt" DESC);

CREATE INDEX "FeedPersonalizationEventLog_postId_createdAt_idx"
ON "FeedPersonalizationEventLog"("postId", "createdAt" DESC);

CREATE INDEX "FeedPersonalizationEventLog_audienceKey_createdAt_idx"
ON "FeedPersonalizationEventLog"("audienceKey", "createdAt" DESC);

CREATE INDEX "FeedPersonalizationEventLog_breedCode_createdAt_idx"
ON "FeedPersonalizationEventLog"("breedCode", "createdAt" DESC);

ALTER TABLE "FeedPersonalizationEventLog"
ADD CONSTRAINT "FeedPersonalizationEventLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedPersonalizationEventLog"
ADD CONSTRAINT "FeedPersonalizationEventLog_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
