ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

DO $$
BEGIN
  CREATE TYPE "PostReactionType" AS ENUM ('LIKE', 'DISLIKE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PostReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PostReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostReaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PostReaction"
ADD COLUMN IF NOT EXISTS "postId" TEXT,
ADD COLUMN IF NOT EXISTS "userId" TEXT,
ADD COLUMN IF NOT EXISTS "type" "PostReactionType",
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  ALTER TABLE "PostReaction"
    ALTER COLUMN "postId" SET NOT NULL,
    ALTER COLUMN "userId" SET NOT NULL,
    ALTER COLUMN "type" SET NOT NULL,
    ALTER COLUMN "updatedAt" DROP DEFAULT;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PostReaction_postId_userId_key"
ON "PostReaction"("postId", "userId");

CREATE INDEX IF NOT EXISTS "PostReaction_postId_type_idx"
ON "PostReaction"("postId", "type");

CREATE INDEX IF NOT EXISTS "PostReaction_userId_createdAt_idx"
ON "PostReaction"("userId", "createdAt" DESC);

DO $$
BEGIN
  ALTER TABLE "PostReaction"
    ADD CONSTRAINT "PostReaction_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PostReaction"
    ADD CONSTRAINT "PostReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PasswordResetToken"
ADD COLUMN IF NOT EXISTS "userId" TEXT,
ADD COLUMN IF NOT EXISTS "tokenHash" TEXT,
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  ALTER TABLE "PasswordResetToken"
    ALTER COLUMN "userId" SET NOT NULL,
    ALTER COLUMN "tokenHash" SET NOT NULL,
    ALTER COLUMN "expiresAt" SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key"
ON "PasswordResetToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_createdAt_idx"
ON "PasswordResetToken"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx"
ON "PasswordResetToken"("expiresAt");

DO $$
BEGIN
  ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
