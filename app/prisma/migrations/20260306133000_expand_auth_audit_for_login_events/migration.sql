DO $$
BEGIN
  CREATE TYPE "AuthAuditAction" AS ENUM ('PASSWORD_SET', 'PASSWORD_CHANGE', 'PASSWORD_RESET');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "AuthAuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_SUCCESS';
ALTER TYPE "AuthAuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_FAILURE';
ALTER TYPE "AuthAuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_RATE_LIMITED';

CREATE TABLE IF NOT EXISTS "AuthAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "identifierHash" TEXT,
    "identifierLabel" TEXT,
    "action" "AuthAuditAction" NOT NULL,
    "reasonCode" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuthAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "AuthAuditLog"
ADD COLUMN IF NOT EXISTS "identifierHash" TEXT,
ADD COLUMN IF NOT EXISTS "identifierLabel" TEXT,
ADD COLUMN IF NOT EXISTS "reasonCode" TEXT;

DO $$
BEGIN
  ALTER TABLE "AuthAuditLog" ALTER COLUMN "userId" DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "AuthAuditLog_userId_createdAt_idx"
ON "AuthAuditLog"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AuthAuditLog_identifierHash_createdAt_idx"
ON "AuthAuditLog"("identifierHash", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AuthAuditLog_action_createdAt_idx"
ON "AuthAuditLog"("action", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AuthAuditLog_ipAddress_createdAt_idx"
ON "AuthAuditLog"("ipAddress", "createdAt" DESC);
