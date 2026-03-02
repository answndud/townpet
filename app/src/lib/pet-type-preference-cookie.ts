export const PET_TYPE_PREFERENCE_COOKIE = "tp_pet_types";

const CUID_PATTERN = /^c[a-z0-9]{24,}$/i;

export function parsePetTypePreferenceCookie(rawValue?: string | null) {
  if (!rawValue) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      rawValue
        .split(",")
        .map((value) => value.trim())
        .filter((value) => CUID_PATTERN.test(value)),
    ),
  );
}

export function serializePetTypePreferenceCookie(petTypeIds: string[]) {
  return Array.from(new Set(petTypeIds)).join(",");
}
