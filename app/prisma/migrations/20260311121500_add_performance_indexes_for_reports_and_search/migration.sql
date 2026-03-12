CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Post_scope_status_best_order_idx"
ON "Post" (
  "scope",
  "status",
  "likeCount" DESC,
  "commentCount" DESC,
  "viewCount" DESC,
  "createdAt" DESC,
  "id" DESC
);

CREATE INDEX IF NOT EXISTS "Report_status_targetType_createdAt_idx"
ON "Report" ("status", "targetType", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Report_resolvedAt_idx"
ON "Report" ("resolvedAt");

CREATE INDEX IF NOT EXISTS "HospitalReview_hospitalName_trgm_idx"
ON "HospitalReview" USING GIN ("hospitalName" gin_trgm_ops)
WHERE "hospitalName" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "HospitalReview_treatmentType_trgm_idx"
ON "HospitalReview" USING GIN ("treatmentType" gin_trgm_ops)
WHERE "treatmentType" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "PlaceReview_placeName_trgm_idx"
ON "PlaceReview" USING GIN ("placeName" gin_trgm_ops)
WHERE "placeName" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "PlaceReview_placeType_trgm_idx"
ON "PlaceReview" USING GIN ("placeType" gin_trgm_ops)
WHERE "placeType" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "PlaceReview_address_trgm_idx"
ON "PlaceReview" USING GIN ("address" gin_trgm_ops)
WHERE "address" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "WalkRoute_routeName_trgm_idx"
ON "WalkRoute" USING GIN ("routeName" gin_trgm_ops)
WHERE "routeName" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "AdoptionListing_shelterName_trgm_idx"
ON "AdoptionListing" USING GIN ("shelterName" gin_trgm_ops)
WHERE "shelterName" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "AdoptionListing_region_trgm_idx"
ON "AdoptionListing" USING GIN ("region" gin_trgm_ops)
WHERE "region" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "AdoptionListing_animalType_trgm_idx"
ON "AdoptionListing" USING GIN ("animalType" gin_trgm_ops)
WHERE "animalType" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "AdoptionListing_breed_trgm_idx"
ON "AdoptionListing" USING GIN ("breed" gin_trgm_ops)
WHERE "breed" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "AdoptionListing_ageLabel_trgm_idx"
ON "AdoptionListing" USING GIN ("ageLabel" gin_trgm_ops)
WHERE "ageLabel" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "AdoptionListing_sizeLabel_trgm_idx"
ON "AdoptionListing" USING GIN ("sizeLabel" gin_trgm_ops)
WHERE "sizeLabel" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "VolunteerRecruitment_shelterName_trgm_idx"
ON "VolunteerRecruitment" USING GIN ("shelterName" gin_trgm_ops)
WHERE "shelterName" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "VolunteerRecruitment_region_trgm_idx"
ON "VolunteerRecruitment" USING GIN ("region" gin_trgm_ops)
WHERE "region" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "VolunteerRecruitment_volunteerType_trgm_idx"
ON "VolunteerRecruitment" USING GIN ("volunteerType" gin_trgm_ops)
WHERE "volunteerType" IS NOT NULL;
