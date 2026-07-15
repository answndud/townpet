CREATE TYPE "UploadAssetVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

ALTER TABLE "UploadAsset"
ADD COLUMN "visibility" "UploadAssetVisibility" NOT NULL DEFAULT 'PUBLIC';
