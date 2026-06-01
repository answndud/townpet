import { Prisma, type PostType } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";

export type FeedMode = "ALL" | "BEST";
export type FeedSort = "LATEST" | "LIKE" | "COMMENT";
export type FeedSearchIn = "ALL" | "TITLE_CONTENT" | "TITLE" | "CONTENT" | "AUTHOR";
export type FeedPersonalized = "0" | "1";
export type FeedDensity = "DEFAULT" | "ULTRA";
export type HomePageProps = {
  searchParams?: Promise<{
    type?: PostType;
    scope?: "LOCAL" | "GLOBAL";
    petType?: string | string[];
    communityId?: string;
    q?: string;
    mode?: string;
    days?: string;
    period?: string;
    sort?: string;
    searchIn?: string;
    review?: string;
    personalized?: string;
    perf?: string;
    page?: string;
    density?: string;
    debugDelayMs?: string;
  }>;
};

const BEST_DAY_OPTIONS = [3, 7, 30] as const;
const FEED_PERIOD_OPTIONS = [3, 7, 30] as const;
const MAX_DEBUG_DELAY_MS = 5_000;

export type BestDay = (typeof BEST_DAY_OPTIONS)[number];
export type FeedPeriod = (typeof FEED_PERIOD_OPTIONS)[number];

export function extractPreferredPetTypeIds(user: unknown) {
  if (!user || typeof user !== "object") {
    return [];
  }

  const preferredPetTypes = (user as { preferredPetTypes?: unknown }).preferredPetTypes;
  if (!Array.isArray(preferredPetTypes)) {
    return [];
  }

  return preferredPetTypes
    .map((item) =>
      item && typeof item === "object"
        ? (item as { petTypeId?: string | null }).petTypeId
        : null,
    )
    .filter((petTypeId): petTypeId is string => typeof petTypeId === "string");
}

export async function maybeDebugDelay(value?: string) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return;
  }

  const delayMs = Math.min(MAX_DEBUG_DELAY_MS, Math.floor(numeric));
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function toFeedMode(value?: string): FeedMode {
  return value === "BEST" ? "BEST" : "ALL";
}

export function toBestDay(value?: string): BestDay {
  const numeric = Number(value);
  return BEST_DAY_OPTIONS.includes(numeric as BestDay)
    ? (numeric as BestDay)
    : 7;
}

export function toFeedPeriod(value?: string): FeedPeriod | null {
  const numeric = Number(value);
  return FEED_PERIOD_OPTIONS.includes(numeric as FeedPeriod)
    ? (numeric as FeedPeriod)
    : null;
}

export function toFeedSort(value?: string): FeedSort {
  if (value === "LIKE" || value === "COMMENT") {
    return value;
  }
  return "LATEST";
}

export function toFeedSearchIn(value?: string): FeedSearchIn {
  if (value === "TITLE_CONTENT" || value === "TITLE" || value === "CONTENT" || value === "AUTHOR") {
    return value;
  }
  return "ALL";
}

export function toFeedPersonalized(value?: string): FeedPersonalized {
  return value === "1" ? "1" : "0";
}

export function toFeedDensity(value?: string): FeedDensity {
  return value === "ULTRA" ? "ULTRA" : "DEFAULT";
}

export function isMissingAudienceSegmentQueryError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2021" && error.code !== "P2022") {
    return false;
  }

  const tableName = String(error.meta?.table ?? "");
  const columnName = String(error.meta?.column ?? "");
  return (
    tableName.includes("UserAudienceSegment") ||
    columnName.includes("UserAudienceSegment")
  );
}

export const getGuestFeedContext = unstable_cache(
  async () => {
    const [loginRequiredTypes] = await Promise.all([getGuestReadLoginRequiredPostTypes()]);

    return {
      loginRequiredTypes,
    };
  },
  ["feed-guest-context"],
  { revalidate: 60 },
);
