CREATE TABLE IF NOT EXISTS "UserPetTypePreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "petTypeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPetTypePreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserPetTypePreference_userId_petTypeId_key"
  ON "UserPetTypePreference"("userId", "petTypeId");

CREATE INDEX IF NOT EXISTS "UserPetTypePreference_userId_idx"
  ON "UserPetTypePreference"("userId");

CREATE INDEX IF NOT EXISTS "UserPetTypePreference_petTypeId_idx"
  ON "UserPetTypePreference"("petTypeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPetTypePreference_userId_fkey'
  ) THEN
    ALTER TABLE "UserPetTypePreference"
      ADD CONSTRAINT "UserPetTypePreference_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPetTypePreference_petTypeId_fkey'
  ) THEN
    ALTER TABLE "UserPetTypePreference"
      ADD CONSTRAINT "UserPetTypePreference_petTypeId_fkey"
      FOREIGN KEY ("petTypeId") REFERENCES "Community"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
