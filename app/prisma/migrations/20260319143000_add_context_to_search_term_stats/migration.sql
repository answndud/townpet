DO $$
BEGIN
  CREATE TYPE "SearchTermSearchIn" AS ENUM ('ALL', 'TITLE', 'CONTENT', 'AUTHOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SearchTermStat"
ADD COLUMN "statKey" TEXT,
ADD COLUMN "scope" "PostScope" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN "typeKey" TEXT NOT NULL DEFAULT 'ALL',
ADD COLUMN "searchIn" "SearchTermSearchIn" NOT NULL DEFAULT 'ALL';

UPDATE "SearchTermStat"
SET "statKey" = 'GLOBAL|ALL|ALL|' || encode(convert_to("termNormalized", 'UTF8'), 'hex')
WHERE "statKey" IS NULL;

ALTER TABLE "SearchTermStat"
ALTER COLUMN "statKey" SET NOT NULL;

ALTER TABLE "SearchTermStat"
DROP CONSTRAINT "SearchTermStat_pkey";

ALTER TABLE "SearchTermStat"
ADD CONSTRAINT "SearchTermStat_pkey" PRIMARY KEY ("statKey");

DROP INDEX IF EXISTS "SearchTermStat_count_updatedAt_idx";
DROP INDEX IF EXISTS "SearchTermStat_zeroResultCount_updatedAt_idx";

CREATE INDEX "SearchTermStat_termNormalized_scope_typeKey_searchIn_idx"
ON "SearchTermStat"("termNormalized", "scope", "typeKey", "searchIn");

CREATE INDEX "SearchTermStat_scope_typeKey_searchIn_count_updatedAt_idx"
ON "SearchTermStat"("scope", "typeKey", "searchIn", "count" DESC, "updatedAt" DESC);

CREATE INDEX "SearchTermStat_scope_typeKey_searchIn_zeroResultCount_updatedAt_idx"
ON "SearchTermStat"("scope", "typeKey", "searchIn", "zeroResultCount" DESC, "updatedAt" DESC);
