CREATE TABLE "GuestStepUpNonce" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "fingerprintHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestStepUpNonce_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestStepUpNonce_tokenHash_key" ON "GuestStepUpNonce"("tokenHash");
CREATE INDEX "GuestStepUpNonce_expiresAt_idx" ON "GuestStepUpNonce"("expiresAt");
