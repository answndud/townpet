-- Track the guest identity that created an upload so a known public URL cannot
-- be attached to another guest's post or profile-owned resource.
ALTER TABLE "UploadAsset"
ADD COLUMN "ownerGuestIpHash" TEXT,
ADD COLUMN "ownerGuestFingerprintHash" TEXT;

CREATE INDEX "UploadAsset_ownerGuestIpHash_status_createdAt_idx"
ON "UploadAsset"("ownerGuestIpHash", "status", "createdAt" DESC);

CREATE INDEX "UploadAsset_ownerGuestFingerprintHash_status_createdAt_idx"
ON "UploadAsset"("ownerGuestFingerprintHash", "status", "createdAt" DESC);

CREATE INDEX "UploadAsset_status_attachedAt_idx"
ON "UploadAsset"("status", "attachedAt" ASC);
