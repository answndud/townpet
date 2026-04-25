"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostType } from "@prisma/client";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { FeedPostMetaBadges } from "@/components/posts/feed-post-meta-badges";
import { PostListItemShell } from "@/components/posts/post-list-item-shell";
import { PostSignalIcons } from "@/components/posts/post-signal-icons";
import type {
  FeedAudienceSourceValue,
  FeedPersonalizationEventValue,
  FeedPersonalizationSurfaceValue,
} from "@/lib/feed-personalization-metrics";
import {
  sendFeedPersonalizationMetric,
} from "@/lib/feed-personalization-tracking";
import { formatKoreanMonthDay } from "@/lib/date-format";
import {
  getPostSignals,
  postTypeMeta,
} from "@/lib/post-presenter";
import {
  buildFeedStatsLabel,
} from "@/lib/feed-list-presenter";
import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";
import { resolveUserDisplayName } from "@/lib/user-display";
import type { ReviewCategory } from "@/lib/review-category";

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedReactionType = "LIKE" | "DISLIKE";
type FeedScope = "LOCAL" | "GLOBAL";
type FeedStatus = "ACTIVE" | "HIDDEN" | "DELETED";

export type FeedPostItem = {
  id: string;
  type: PostType;
  scope: FeedScope;
  status: FeedStatus;
  title: string;
  content: string;
  commentCount: number;
  likeCount: number;
  dislikeCount: number;
  viewCount: number;
  createdAt: string;
  author: {
    id: string;
    nickname: string | null;
    image?: string | null;
  };
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  neighborhood: {
    id: string;
    name: string;
    city: string;
    district: string;
  } | null;
  petType?: {
    id: string;
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

const adoptionStatusLabel: Record<string, string> = {
  OPEN: "입양 가능",
  RESERVED: "상담 중",
  ADOPTED: "입양 완료",
  CLOSED: "마감",
};

const volunteerStatusLabel: Record<string, string> = {
  OPEN: "모집 중",
  FULL: "정원 마감",
  CLOSED: "종료",
  CANCELLED: "취소",
};

const marketTypeLabel: Record<string, string> = {
  SELL: "판매",
  RENT: "대여",
  SHARE: "나눔",
};

const marketConditionLabel: Record<string, string> = {
  NEW: "새상품",
  LIKE_NEW: "거의 새것",
  GOOD: "사용감 적음",
  FAIR: "사용감 있음",
};

const marketStatusLabel: Record<string, string> = {
  AVAILABLE: "거래 가능",
  RESERVED: "예약 중",
  SOLD: "거래 완료",
  CANCELLED: "취소",
};

type StoredReadPost = {
  id: string;
  ts: number;
};

let relativeNowSnapshot: number | null = null;
let relativeNowPrimed = false;
let relativeNowInterval: number | null = null;
const relativeNowListeners = new Set<() => void>();

function emitRelativeNow(next: number) {
  relativeNowSnapshot = next;
}

function refreshRelativeNow() {
  emitRelativeNow(Date.now());
  for (const listener of relativeNowListeners) {
    listener();
  }
}

function subscribeRelativeNow(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  relativeNowListeners.add(onStoreChange);

  if (!relativeNowPrimed) {
    relativeNowPrimed = true;
    queueMicrotask(refreshRelativeNow);
  }

  if (relativeNowInterval === null) {
    relativeNowInterval = window.setInterval(refreshRelativeNow, 60_000);
  }

  const handlePageShow = () => {
    refreshRelativeNow();
  };

  window.addEventListener("pageshow", handlePageShow);
  window.addEventListener("focus", refreshRelativeNow);

  return () => {
    relativeNowListeners.delete(onStoreChange);
    window.removeEventListener("pageshow", handlePageShow);
    window.removeEventListener("focus", refreshRelativeNow);
    if (relativeNowListeners.size === 0 && relativeNowInterval !== null) {
      window.clearInterval(relativeNowInterval);
      relativeNowInterval = null;
    }
  };
}

function formatListDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatKoreanMonthDay(date);
}

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

type FeedStatsLabelProps = {
  createdAt: string;
  viewCount: number;
  likeCount: number;
};

const FeedStatsLabel = memo(function FeedStatsLabel({
  createdAt,
  viewCount,
  likeCount,
}: FeedStatsLabelProps) {
  const relativeNow = useSyncExternalStore(
    subscribeRelativeNow,
    () => relativeNowSnapshot,
    () => null,
  );
  const statsLabel = buildFeedStatsLabel({
    createdAt,
    relativeNow,
    viewCount,
    likeCount,
  });

  return <span className="break-keep text-[#5a759c]">{statsLabel}</span>;
});

function shouldRenderFeedThumbnail(post: FeedPostItem) {
  return typeof post.images[0]?.url === "string" && post.images[0].url.length > 0;
}

const FeedPostThumbnail = memo(function FeedPostThumbnail({
  href,
  title,
  imageUrl,
  onClick,
}: {
  href: string;
  title: string;
  imageUrl: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      className="group/thumb relative block aspect-square overflow-hidden rounded-2xl border border-[#dce7f6] bg-[linear-gradient(145deg,#eef5ff,#f8fbff)] shadow-[0_10px_22px_rgba(16,40,74,0.06)] transition hover:-translate-y-0.5 hover:border-[#bfd4ef]"
      onClick={onClick}
    >
      <Image
        src={imageUrl}
        alt={title}
        fill
        sizes="(min-width: 768px) 104px, 80px"
        className="object-cover transition duration-300 group-hover/thumb:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(180deg,transparent_0%,rgba(16,40,74,0.42)_100%)]" />
      <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center rounded-full border border-white/70 bg-white/88 px-2 py-0.5 text-[10px] font-semibold text-[#315b9a] shadow-[0_4px_10px_rgba(16,40,74,0.08)]">
        사진 글
      </span>
    </Link>
  );
});

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
  const router = useRouter();
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

  useEffect(() => {
    if (preferGuestDetail) {
      const targets = items.slice(0, 3);
      for (const post of targets) {
        router.prefetch(`/posts/${post.id}/guest`);
      }
      return;
    }

    const targets = items.slice(0, 2);
    for (const post of targets) {
      router.prefetch(`/posts/${post.id}`);
    }
  }, [items, preferGuestDetail, router]);

  return (
    <>
      <div className="divide-y divide-[#e7eef9]" data-testid="feed-post-list">
        {items.map((post, index) => {
          const meta = postTypeMeta[post.type];
          const signals = getPostSignals({
            title: post.title,
            content: post.content,
            imageCount: post.images.length,
          });
          const locationLabel = post.neighborhood
            ? `${post.neighborhood.city} ${post.neighborhood.name}`
            : null;
          const petTypeLabel = post.petType
            ? post.petType.categoryLabelKo === post.petType.labelKo
              ? post.petType.labelKo
              : `${post.petType.categoryLabelKo} · ${post.petType.labelKo}`
            : null;
          const adoptionSummary = post.adoptionListing
            ? [
                post.adoptionListing.shelterName,
                post.adoptionListing.region,
                post.adoptionListing.animalType,
                post.adoptionListing.status
                  ? (adoptionStatusLabel[post.adoptionListing.status] ?? post.adoptionListing.status)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : null;
          const volunteerSummary = post.volunteerRecruitment
            ? [
                post.volunteerRecruitment.shelterName,
                post.volunteerRecruitment.region,
                formatListDate(post.volunteerRecruitment.volunteerDate),
                post.volunteerRecruitment.status
                  ? (volunteerStatusLabel[post.volunteerRecruitment.status] ??
                    post.volunteerRecruitment.status)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : null;
          const marketSummary = post.marketListing
            ? [
                post.marketListing.listingType
                  ? (marketTypeLabel[post.marketListing.listingType] ?? post.marketListing.listingType)
                  : null,
                post.marketListing.price !== null && post.marketListing.price !== undefined
                  ? `${post.marketListing.price.toLocaleString()}원`
                  : null,
                post.marketListing.condition
                  ? (marketConditionLabel[post.marketListing.condition] ?? post.marketListing.condition)
                  : null,
                post.marketListing.status
                  ? (marketStatusLabel[post.marketListing.status] ?? post.marketListing.status)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : null;
          const isGuestPost = Boolean(post.guestAuthorId || post.guestDisplayName?.trim());
          const authorLabel = isGuestPost
            ? resolvePublicGuestDisplayName(post.guestDisplayName)
            : resolveUserDisplayName(post.author.nickname);
          const authorNode = isGuestPost ? (
            <span className="block truncate">{authorLabel}</span>
          ) : (
            <Link href={`/users/${post.author.id}`} className="block truncate hover:text-[#2f5da4]">
              {authorLabel}
            </Link>
          );
          const detailHref = preferGuestDetail ? `/posts/${post.id}/guest` : `/posts/${post.id}`;
          const hasThumbnail = shouldRenderFeedThumbnail(post);
          const thumbnailUrl = hasThumbnail ? post.images[0]?.url ?? "" : "";
          const nonThumbnailSignals = hasThumbnail
            ? signals.filter((signal) => signal !== "image")
            : signals;

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
                    className="tp-btn-primary mt-2 inline-flex items-center px-3 py-1 text-xs font-semibold"
                    onClick={() => trackPersonalizationEvent("AD_CLICK")}
                  >
                    {adConfig.ctaLabel}
                  </Link>
                </article>
              ) : null}
              <PostListItemShell
                testId="feed-post-item"
                href={detailHref}
                prefetch={preferGuestDetail ? true : false}
                articleClassName={`group grid items-start gap-x-3 gap-y-1.5 px-3 py-3.5 transition hover:bg-[#fbfdff] sm:px-4 sm:py-4 md:gap-x-4 ${
                  hasThumbnail
                    ? "grid-cols-[minmax(0,1fr)_80px] sm:grid-cols-[minmax(0,1fr)_92px] md:grid-cols-[minmax(0,1fr)_104px] md:items-center"
                    : "grid-cols-1"
                } ${post.status === "HIDDEN" ? "bg-[#fff7f7]" : ""}`}
                topContent={
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <FeedPostMetaBadges
                      label={meta.label}
                      chipClass={meta.chipClass}
                      status={post.status}
                      className="mb-0 justify-start"
                    />
                    {locationLabel || petTypeLabel ? (
                      <span className="truncate text-[12px] font-medium text-[#6280aa]">
                        {[locationLabel, petTypeLabel].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </div>
                }
                title={
                  <span className="overflow-hidden leading-[1.32] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                    {post.title}
                  </span>
                }
                titleSuffix={
                  <>
                    <PostSignalIcons signals={nonThumbnailSignals} />
                    {post.commentCount > 0 ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-[#edf5ff] px-2 py-0.5 text-[11px] font-semibold text-[#2f5da4]">
                        댓글 {post.commentCount}
                      </span>
                    ) : null}
                  </>
                }
                titleLinkClassName={`flex min-w-0 items-center gap-1.5 text-[15px] font-semibold leading-[1.4] transition sm:text-[16px] ${
                  readPostIds.has(post.id)
                    ? "text-[#8c9db8] hover:text-[#7589a8]"
                    : "text-[#163764] hover:text-[#2f5da4]"
                } visited:text-[#8c9db8]`}
                onTitleClick={() => {
                  markPostAsRead(post.id);
                  trackPersonalizationEvent("POST_CLICK", {
                    postId: post.id,
                  });
                }}
                bottomContent={
                  <>
                    {marketSummary || adoptionSummary || volunteerSummary ? (
                      <p className="mt-1 truncate text-[12px] text-[#5d779e]">
                        {marketSummary ?? adoptionSummary ?? volunteerSummary}
                      </p>
                    ) : null}
                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-[#5f789d]">
                      <span className="font-semibold text-[#1f3f71]">{authorNode}</span>
                      <span className="text-[#bfd0e4]">·</span>
                      <FeedStatsLabel
                        createdAt={post.createdAt}
                        viewCount={post.viewCount}
                        likeCount={post.likeCount}
                      />
                    </div>
                  </>
                }
                metaClassName={hasThumbnail ? "min-w-0 self-center" : "hidden"}
                meta={
                  hasThumbnail ? (
                    <FeedPostThumbnail
                      href={detailHref}
                      title={post.title}
                      imageUrl={thumbnailUrl}
                      onClick={() => {
                        markPostAsRead(post.id);
                        trackPersonalizationEvent("POST_CLICK", {
                          postId: post.id,
                        });
                      }}
                    />
                  ) : null
                }
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
