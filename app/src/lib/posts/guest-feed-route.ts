import { shouldStripFeedPageParam } from "@/lib/feed";

export type GuestFeedSearchParams = Record<string, string | string[] | undefined>;

function appendValues(params: URLSearchParams, key: string, value: string | string[]) {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item.length > 0) {
        params.append(key, item);
      }
    }
    return;
  }

  if (value.length > 0) {
    params.set(key, value);
  }
}

export function buildGuestFeedRedirectHref(searchParams: GuestFeedSearchParams) {
  const params = new URLSearchParams();
  const rawPetTypeValues = searchParams.petType;
  const petTypeValues = Array.isArray(rawPetTypeValues)
    ? rawPetTypeValues
    : typeof rawPetTypeValues === "string"
      ? [rawPetTypeValues]
      : [];
  const hasPetType = petTypeValues.some((value) => value.trim().length > 0);
  const legacyCommunityId =
    typeof searchParams.communityId === "string" ? searchParams.communityId.trim() : "";

  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null || key === "communityId" || key === "scope") {
      continue;
    }
    if (key === "page") {
      const pageValue = Array.isArray(value) ? value[0] ?? "" : value;
      if (shouldStripFeedPageParam({ page: pageValue })) {
        continue;
      }
    }
    appendValues(params, key, value);
  }

  if (legacyCommunityId.length > 0 && !hasPetType) {
    params.set("petType", legacyCommunityId);
  }

  const serialized = params.toString();
  return serialized ? `/feed?${serialized}` : "/feed";
}
