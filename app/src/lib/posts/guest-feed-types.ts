import type { PostType } from "@prisma/client";

import type { FeedPostItem } from "@/components/posts/feed-infinite-list";
import type { ReviewCategory } from "@/lib/review-category";

export type FeedMode = "ALL" | "BEST";
export type FeedSort = "LATEST" | "LIKE" | "COMMENT";
export type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
export type FeedDensity = "DEFAULT" | "ULTRA";
export type FeedPeriod = 3 | 7 | 30;
export type BestDay = 3 | 7 | 30;

export type GuestFeedGate = {
  view: "gate";
  gate: {
    title: string;
    description: string;
    primaryLink: string;
    primaryLabel: string;
    secondaryLink: string;
    secondaryLabel: string;
  };
};

export type GuestFeedView = {
  view: "feed";
  feed: {
    mode: FeedMode;
    type: PostType | null;
    reviewBoard: boolean;
    reviewCategory: ReviewCategory | null;
    petTypeId: string | null;
    petTypeIds: string[];
    query: string;
    selectedSort: FeedSort;
    selectedSearchIn: FeedSearchIn;
    density: FeedDensity;
    bestDays: BestDay;
    periodDays: FeedPeriod | null;
    isGuestTypeBlocked: boolean;
    feedTitle: string;
    totalPages: number;
    resolvedPage: number;
    feedQueryKey: string;
    items: FeedPostItem[];
    nextCursor: string | null;
  };
};

export type GuestFeedPayload = GuestFeedGate | GuestFeedView;

export type GuestFeedResponse =
  | { ok: true; data: GuestFeedPayload; meta?: Record<string, unknown> }
  | { ok: false; error: { code: string; message: string } };
