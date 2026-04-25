-- Add structured care request posts.
ALTER TYPE "PostType" ADD VALUE IF NOT EXISTS 'CARE_REQUEST';

CREATE TYPE "CareType" AS ENUM (
  'WALK',
  'FEEDING',
  'VISIT_CARE',
  'HOSPITAL_COMPANION',
  'EMERGENCY_CHECK',
  'ERRAND'
);

CREATE TYPE "CareRequestStatus" AS ENUM (
  'OPEN',
  'MATCHED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TABLE "CareRequest" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "careType" "CareType" NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "locationNote" TEXT,
  "petNote" TEXT,
  "requirements" TEXT,
  "rewardAmount" INTEGER,
  "isUrgent" BOOLEAN NOT NULL DEFAULT false,
  "status" "CareRequestStatus" NOT NULL DEFAULT 'OPEN',

  CONSTRAINT "CareRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareRequest_postId_key" ON "CareRequest"("postId");
CREATE INDEX "CareRequest_careType_status_idx" ON "CareRequest"("careType", "status");
CREATE INDEX "CareRequest_startsAt_idx" ON "CareRequest"("startsAt");
CREATE INDEX "CareRequest_status_isUrgent_startsAt_idx" ON "CareRequest"("status", "isUrgent", "startsAt");

ALTER TABLE "CareRequest"
  ADD CONSTRAINT "CareRequest_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
