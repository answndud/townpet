-- UserPetTypePreference was a user-personalization feature, not board taxonomy.
-- Keep the historical migration intact and remove the legacy table only here.
DROP TABLE IF EXISTS "UserPetTypePreference";
