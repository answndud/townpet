import type { PostType } from "@prisma/client";

export const PRIMARY_POST_TYPES: PostType[] = [
  "FREE_BOARD",
  "QA_QUESTION",
  "HOSPITAL_REVIEW",
  "PLACE_REVIEW",
  "WALK_ROUTE",
  "LOST_FOUND",
  "MEETUP",
  "MARKET_LISTING",
  "CARE_REQUEST",
  "ADOPTION_LISTING",
  "SHELTER_VOLUNTEER",
];

export const SECONDARY_POST_TYPES: PostType[] = [
  "PRODUCT_REVIEW",
  "PET_SHOWCASE",
];

export const FILTERABLE_POST_TYPES: PostType[] = [
  ...PRIMARY_POST_TYPES,
  ...SECONDARY_POST_TYPES,
];

export const FREE_BOARD_POST_TYPES: ReadonlyArray<PostType> = [
  "FREE_BOARD",
  "FREE_POST",
  "DAILY_SHARE",
];

export const ADMIN_ONLY_POST_TYPES: ReadonlyArray<PostType> = [
  "ADOPTION_LISTING",
];

export const NON_REPORTABLE_POST_TYPES: ReadonlyArray<PostType> = [
  "ADOPTION_LISTING",
];

const POST_TYPE_GROUPS: ReadonlyArray<ReadonlyArray<PostType>> = [
  ["FREE_BOARD", "FREE_POST", "DAILY_SHARE"],
  ["QA_QUESTION", "QA_ANSWER"],
  ["HOSPITAL_REVIEW"],
  ["PLACE_REVIEW", "PRODUCT_REVIEW"],
  ["WALK_ROUTE"],
  ["MEETUP"],
  ["MARKET_LISTING"],
  ["CARE_REQUEST"],
  ["ADOPTION_LISTING"],
  ["SHELTER_VOLUNTEER"],
  ["LOST_FOUND"],
  ["PET_SHOWCASE"],
];

export function getEquivalentPostTypes(type: PostType): PostType[] {
  const grouped = POST_TYPE_GROUPS.find((group) => group.includes(type));
  return grouped ? [...grouped] : [type];
}

export function isFreeBoardPostType(type: PostType) {
  return FREE_BOARD_POST_TYPES.includes(type);
}

export function isAdminOnlyPostType(type: PostType) {
  return ADMIN_ONLY_POST_TYPES.includes(type);
}

export function isReportablePostType(type: PostType) {
  return !NON_REPORTABLE_POST_TYPES.includes(type);
}

export function expandExcludedPostTypes(types: PostType[]): PostType[] {
  const expanded = new Set<PostType>();
  for (const type of types) {
    for (const equivalent of getEquivalentPostTypes(type)) {
      expanded.add(equivalent);
    }
  }
  return [...expanded];
}
