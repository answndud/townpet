import type { BoardScope, CommonBoardType, PostType } from "@prisma/client";

const BOARD_SCOPE = {
  COMMON: "COMMON",
  COMMUNITY: "COMMUNITY",
} as const satisfies Record<BoardScope, BoardScope>;

const COMMON_BOARD_TYPE = {
  HOSPITAL: "HOSPITAL",
  LOST_FOUND: "LOST_FOUND",
  MARKET: "MARKET",
  ADOPTION: "ADOPTION",
  VOLUNTEER: "VOLUNTEER",
} as const satisfies Record<CommonBoardType, CommonBoardType>;

export const COMMON_BOARD_NAV_ITEMS = [
  { key: "adoption", label: "입양", href: "/boards/adoption" },
  { key: "lost-found", label: "분실/목격", href: "/lost-found" },
  { key: "hospital", label: "동물병원 후기", href: "/feed/guest?type=HOSPITAL_REVIEW" },
  { key: "walk", label: "동네 산책코스", href: "/feed/guest?type=WALK_ROUTE" },
  { key: "meetup", label: "동네 모임", href: "/feed/guest?type=MEETUP" },
  { key: "market", label: "중고거래", href: "/feed/guest?type=MARKET_LISTING" },
  { key: "care", label: "돌봄", href: "/feed/guest?type=CARE_REQUEST" },
  { key: "volunteer", label: "봉사", href: "/feed/guest?type=SHELTER_VOLUNTEER" },
] as const;

export const COMMON_BOARD_POST_TYPES = [
  "HOSPITAL_REVIEW",
  "LOST_FOUND",
  "MARKET_LISTING",
  "ADOPTION_LISTING",
  "SHELTER_VOLUNTEER",
] as const;

export const COMMON_BOARD_TYPE_BY_POST_TYPE: Record<
  (typeof COMMON_BOARD_POST_TYPES)[number],
  CommonBoardType
> = {
  HOSPITAL_REVIEW: COMMON_BOARD_TYPE.HOSPITAL,
  LOST_FOUND: COMMON_BOARD_TYPE.LOST_FOUND,
  MARKET_LISTING: COMMON_BOARD_TYPE.MARKET,
  ADOPTION_LISTING: COMMON_BOARD_TYPE.ADOPTION,
  SHELTER_VOLUNTEER: COMMON_BOARD_TYPE.VOLUNTEER,
};

const DEDICATED_BOARD_PATH_BY_POST_TYPE: Partial<Record<PostType, string>> = {
  ADOPTION_LISTING: "/boards/adoption",
};

type CommonBoardPostType = keyof typeof COMMON_BOARD_TYPE_BY_POST_TYPE;

export function isCommonBoardPostType(type: PostType): type is CommonBoardPostType {
  return Object.prototype.hasOwnProperty.call(COMMON_BOARD_TYPE_BY_POST_TYPE, type);
}

export function resolveBoardByPostType(type: PostType) {
  if (isCommonBoardPostType(type)) {
    return {
      boardScope: BOARD_SCOPE.COMMON,
      commonBoardType: COMMON_BOARD_TYPE_BY_POST_TYPE[type],
    } as const;
  }

  return {
    boardScope: BOARD_SCOPE.COMMUNITY,
    commonBoardType: null,
  } as const;
}

export function isAnimalTagsRequiredCommonBoardPostType(type: PostType) {
  return type === "HOSPITAL_REVIEW";
}

export function getDedicatedBoardPathByPostType(type?: PostType | null) {
  if (!type) {
    return null;
  }

  return DEDICATED_BOARD_PATH_BY_POST_TYPE[type] ?? null;
}

type FeedHrefOptions = {
  basePath?: "/feed" | "/feed/guest";
};

export function resolveViewerFeedBasePath(isAuthenticated: boolean) {
  return isAuthenticated ? "/feed" : "/feed/guest";
}

export function buildFeedHref(
  params: Record<string, string | null | undefined>,
  options: FeedHrefOptions = {},
) {
  const basePath = options.basePath ?? "/feed";
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (!value) {
      continue;
    }

    search.set(key, value);
  }

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function buildBoardListingHref(
  type?: PostType | null,
  options: FeedHrefOptions = {},
) {
  const basePath = options.basePath ?? "/feed";
  if (!type) {
    return basePath;
  }

  return getDedicatedBoardPathByPostType(type) ?? buildFeedHref({ type, page: "1" }, options);
}
