"use client";

import Link from "next/link";
import type { PostType } from "@prisma/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FeedPostMetaBadges } from "@/components/posts/feed-post-meta-badges";
import { PostListItemShell } from "@/components/posts/post-list-item-shell";
import type {
  FeedAudienceSourceValue,
  FeedPersonalizationEventValue,
  FeedPersonalizationSurfaceValue,
} from "@/lib/feed-personalization-metrics";
import {
  sendFeedPersonalizationMetric,
} from "@/lib/feed-personalization-tracking";
import { formatKoreanMonthDay } from "@/lib/date-format";
import { postTypeMeta } from "@/lib/post-presenter";
import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";
import { resolveUserDisplayName } from "@/lib/user-display";
import type { ReviewCategory } from "@/lib/review-category";

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedSearchIn = "ALL" | "TITLE_CONTENT" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedReactionType = "LIKE" | "DISLIKE";
type FeedScope = "LOCAL" | "GLOBAL";
type FeedStatus = "ACTIVE" | "HIDDEN" | "DELETED";

export type FeedPostItem = {
  id: string;
  type: PostType;
  scope?: FeedScope;
  status: FeedStatus;
  title: string;
  content: string;
  commentCount: number;
  likeCount: number;
  dislikeCount?: number;
  viewCount: number;
  createdAt: string;
  isOperatorContent?: boolean | null;
  operatorSourceName?: string | null;
  operatorSourceUrl?: string | null;
  operatorLastVerifiedAt?: string | Date | null;
  author: {
    id: string;
    nickname: string | null;
    image?: string | null;
    isFoundingMember?: boolean | null;
  };
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  neighborhood?: {
    id?: string;
    name: string;
    city: string;
    district?: string;
  } | null;
  petType?: {
    id?: string;
    labelKo: string;
    categoryLabelKo: string;
  } | null;
  images: Array<{
    id: string;
    url?: string | null;
  }>;
  adoptionListing?: {
    shelterName?: string | null;
    region?: string | null;
    animalType?: string | null;
    status?: string | null;
  } | null;
  volunteerRecruitment?: {
    shelterName?: string | null;
    region?: string | null;
    volunteerDate?: string | Date | null;
    status?: string | null;
  } | null;
  marketListing?: {
    listingType?: string | null;
    price?: number | null;
    condition?: string | null;
    depositAmount?: number | null;
    rentalPeriod?: string | null;
    status?: string | null;
  } | null;
  lostFoundAlert?: {
    alertType?: string | null;
    petType?: string | null;
    breed?: string | null;
    lastSeenAt?: string | Date | null;
    lastSeenLocation?: string | null;
    status?: string | null;
  } | null;
  careRequest?: {
    careType?: string | null;
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
    locationNote?: string | null;
    petNote?: string | null;
    requirements?: string | null;
    rewardAmount?: number | null;
    isUrgent?: boolean | null;
    status?: string | null;
  } | null;
  isBookmarked?: boolean | null;
  reactions?: Array<{
    type: FeedReactionType;
  }>;
};

type FeedQueryParams = {
  type?: PostType;
  scope: FeedScope;
  petTypeId?: string;
  petTypeIds?: string[];
  reviewCategory?: ReviewCategory;
  q?: string;
  searchIn?: FeedSearchIn;
  sort?: FeedSort;
  days?: 3 | 7 | 30;
  personalized?: boolean;
};

type FeedInfiniteListProps = {
  initialItems: FeedPostItem[];
  initialNextCursor: string | null;
  mode: FeedMode;
  query: FeedQueryParams;
  queryKey: string;
  disableLoadMore?: boolean;
  apiPath?: string;
  preferGuestDetail?: boolean;
  adConfig?: {
    audienceKey: string;
    headline: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    sessionCap: number;
    dailyCap: number;
  };
  personalizationTracking?: {
    surface: FeedPersonalizationSurfaceValue;
    audienceKey?: string | null;
    breedCode?: string | null;
    audienceSource: FeedAudienceSourceValue;
  };
};

const SCROLL_RESTORE_TTL_MS = 30 * 60 * 1000;
const READ_POSTS_STORAGE_KEY = "feed:read-posts:v1";
const MAX_READ_POSTS = 500;

const FEED_POST_ITEM_CLASS_NAME =
  "group flex min-h-[46px] min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#e4e7ec] px-4 py-2 transition-colors hover:bg-[#f8f9ff] last:border-b-0 sm:min-h-[48px] sm:flex-nowrap sm:gap-y-0";
const FEED_AD_CTA_CLASS_NAME =
  "mt-2 inline-flex min-h-10 items-center justify-center rounded-md bg-[#3567b5] px-3 text-xs font-semibold text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

type StoredReadPost = {
  id: string;
  ts: number;
};

function parseReadPosts(raw: string | null): StoredReadPost[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const sanitized = parsed
      .filter(
        (entry): entry is StoredReadPost =>
          Boolean(entry) &&
          typeof entry === "object" &&
          typeof (entry as StoredReadPost).id === "string" &&
          typeof (entry as StoredReadPost).ts === "number" &&
          Number.isFinite((entry as StoredReadPost).ts),
      )
      .sort((a, b) => b.ts - a.ts);

    const unique = new Set<string>();
    const deduped: StoredReadPost[] = [];

    for (const entry of sanitized) {
      if (unique.has(entry.id)) {
        continue;
      }
      unique.add(entry.id);
      deduped.push(entry);
      if (deduped.length >= MAX_READ_POSTS) {
        break;
      }
    }

    return deduped;
  } catch {
    return [];
  }
}

function isDefaultFreeBoardType(type: PostType) {
  return type === "FREE_POST" || type === "FREE_BOARD" || type === "DAILY_SHARE";
}

export function FeedInfiniteList({
  initialItems,
  mode,
  query,
  queryKey,
  preferGuestDetail,
  adConfig,
  personalizationTracking,
}: FeedInfiniteListProps) {
  const items = initialItems;
  const [readPostIds, setReadPostIds] = useState<Set<string>>(() => new Set());
  const restoreDoneRef = useRef(false);
  const scrollStorageKey = useMemo(() => `feed:scroll:${queryKey}`, [queryKey]);
  const showAdSlot = Boolean(adConfig && mode === "ALL" && initialItems.length >= 5);
  const trackedViewKeyRef = useRef<string | null>(null);
  const trackedAdKeyRef = useRef<string | null>(null);
  const isPersonalizedQuery = Boolean(query.personalized);

  useEffect(() => {
    if (typeof window === "undefined" || restoreDoneRef.current) {
      return;
    }

    const raw = window.sessionStorage.getItem(scrollStorageKey);
    if (!raw) {
      restoreDoneRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { y?: number; ts?: number };
      if (
        typeof parsed.y === "number" &&
        Number.isFinite(parsed.y) &&
        typeof parsed.ts === "number" &&
        Date.now() - parsed.ts <= SCROLL_RESTORE_TTL_MS
      ) {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: parsed.y, behavior: "auto" });
        });
      }
    } catch {
      // ignore malformed payload
    }

    restoreDoneRef.current = true;
  }, [scrollStorageKey]);

  const trackPersonalizationEvent = useCallback(
    (
      event: FeedPersonalizationEventValue,
      options?: {
        postId?: string | null;
      },
    ) => {
      if (!isPersonalizedQuery || !personalizationTracking) {
        return;
      }

      void sendFeedPersonalizationMetric({
        surface: personalizationTracking.surface,
        event,
        audienceKey: personalizationTracking.audienceKey,
        breedCode: personalizationTracking.breedCode,
        audienceSource: personalizationTracking.audienceSource,
        postId: options?.postId,
      });
    },
    [isPersonalizedQuery, personalizationTracking],
  );

  useEffect(() => {
    if (!isPersonalizedQuery || !personalizationTracking || items.length === 0) {
      trackedViewKeyRef.current = null;
      return;
    }

    const viewKey = [
      queryKey,
      personalizationTracking.surface,
      personalizationTracking.audienceKey ?? "NONE",
      personalizationTracking.audienceSource,
    ].join("|");

    if (trackedViewKeyRef.current === viewKey) {
      return;
    }

    trackedViewKeyRef.current = viewKey;
    trackPersonalizationEvent("VIEW");
  }, [
    isPersonalizedQuery,
    items.length,
    personalizationTracking,
    queryKey,
    trackPersonalizationEvent,
  ]);

  useEffect(() => {
    if (
      !showAdSlot ||
      !adConfig ||
      !isPersonalizedQuery ||
      !personalizationTracking
    ) {
      trackedAdKeyRef.current = null;
      return;
    }

    const adKey = [
      queryKey,
      adConfig.audienceKey,
      personalizationTracking.surface,
      personalizationTracking.audienceSource,
    ].join("|");

    if (trackedAdKeyRef.current === adKey) {
      return;
    }

    trackedAdKeyRef.current = adKey;
    trackPersonalizationEvent("AD_IMPRESSION");
  }, [
    adConfig,
    isPersonalizedQuery,
    personalizationTracking,
    queryKey,
    showAdSlot,
    trackPersonalizationEvent,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncReadPosts = () => {
      const entries = parseReadPosts(
        window.localStorage.getItem(READ_POSTS_STORAGE_KEY),
      );
      setReadPostIds(new Set(entries.map((entry) => entry.id)));
    };

    syncReadPosts();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== READ_POSTS_STORAGE_KEY) {
        return;
      }
      syncReadPosts();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const markPostAsRead = useCallback((postId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    setReadPostIds((prev) => {
      if (prev.has(postId)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(postId);
      return next;
    });

    const current = parseReadPosts(window.localStorage.getItem(READ_POSTS_STORAGE_KEY));
    const next = [{ id: postId, ts: Date.now() }, ...current.filter((item) => item.id !== postId)]
      .slice(0, MAX_READ_POSTS);
    window.localStorage.setItem(READ_POSTS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let frameId: number | null = null;
    const saveScroll = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        window.sessionStorage.setItem(
          scrollStorageKey,
          JSON.stringify({
            y: window.scrollY,
            ts: Date.now(),
          }),
        );
        frameId = null;
      });
    };

    window.addEventListener("scroll", saveScroll, { passive: true });
    window.addEventListener("pagehide", saveScroll);

    return () => {
      saveScroll();
      window.removeEventListener("scroll", saveScroll);
      window.removeEventListener("pagehide", saveScroll);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [scrollStorageKey]);

  return (
    <>
      <div data-testid="feed-post-list">
        {items.map((post, index) => {
          const meta = postTypeMeta[post.type];
          const isGuestPost = Boolean(post.guestAuthorId || post.guestDisplayName?.trim());
          const authorLabel = isGuestPost
            ? resolvePublicGuestDisplayName(post.guestDisplayName)
            : resolveUserDisplayName(post.author.nickname);
          const authorNode = isGuestPost ? (
            <span className="block truncate">{authorLabel}</span>
          ) : (
            <span className="block min-w-0 truncate">
              <Link
                href={`/users/${post.author.id}`}
                prefetch={false}
                className="block min-w-0 truncate hover:text-[#2f5da4]"
              >
                {authorLabel}
              </Link>
            </span>
          );
          const detailHref = preferGuestDetail ? `/posts/${post.id}/guest` : `/posts/${post.id}`;
          const handlePostClick = () => {
            markPostAsRead(post.id);
            trackPersonalizationEvent("POST_CLICK", {
              postId: post.id,
            });
          };

          return (
            <div key={post.id}>
              {showAdSlot && adConfig && index === 4 ? (
                <article className="border-y border-[#d8e6fb] bg-[linear-gradient(180deg,#eff5ff_0%,#f8fbff_100%)] px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-md border border-[#9abbe9] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#2f5da4]">
                      광고
                    </span>
                    <span className="text-[11px] text-[#55749e]">맞춤 추천</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#163764]">{adConfig.headline}</p>
                  <p className="mt-1 text-xs leading-5 text-[#446792]">{adConfig.description}</p>
                  <Link
                    href={adConfig.ctaHref}
                    prefetch={false}
                    className={FEED_AD_CTA_CLASS_NAME}
                    onClick={() => trackPersonalizationEvent("AD_CLICK")}
                  >
                    {adConfig.ctaLabel}
                  </Link>
                </article>
              ) : null}
              <PostListItemShell
                testId="feed-post-item"
                variant="feed"
                href={detailHref}
                prefetch={false}
                articleClassName={`${FEED_POST_ITEM_CLASS_NAME} ${
                  post.status === "HIDDEN" ? "bg-[#fff7f7]" : ""
                }`}
                topContent={
                  <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                    {!isDefaultFreeBoardType(post.type) || post.status === "HIDDEN" ? (
                      <FeedPostMetaBadges
                        label={meta.label}
                        chipClass={meta.chipClass}
                        status={post.status}
                        className="mb-0 shrink-0 justify-start gap-1 text-[10px] [&_.tp-chip-base]:px-1.5 [&_.tp-chip-base]:py-[2px] [&_.tp-chip-base]:text-[10px]"
                      />
                    ) : null}
                  </div>
                }
                title={
                  <span className="block min-w-0 truncate text-[15px] leading-[1.25]">
                    {post.title}
                  </span>
                }
                titleLinkClassName={`mt-0.5 block min-w-0 truncate text-[13px] font-semibold leading-[1.22] transition sm:text-[13px] ${
                  readPostIds.has(post.id)
                  ? "text-[#98a2b3] hover:text-[#667085]"
                    : "text-[#101828] hover:text-[#4338ca]"
                } visited:text-[#98a2b3]`}
                onTitleClick={() => {
                  handlePostClick();
                }}
                meta={
                  <div className="flex min-w-0 max-w-full items-center justify-start gap-x-1 text-[11px] leading-[1.3] text-[#667085] sm:max-w-[42vw] sm:justify-end">
                    <span className="min-w-0 max-w-[12rem] truncate font-medium text-[#1f3f71]">
                      {authorNode}
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-[#bfd0e4]">·</span>
                    <time dateTime={post.createdAt} className="shrink-0 text-[#58739a]">
                      {formatKoreanMonthDay(post.createdAt)}
                    </time>
                  </div>
                }
                metaClassName="w-full min-w-0 basis-full self-center text-left sm:w-auto sm:shrink-0 sm:basis-auto sm:text-right"
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
