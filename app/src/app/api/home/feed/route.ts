import { PostScope } from "@prisma/client";
import { NextRequest } from "next/server";

import { getPostTypeMeta } from "@/lib/post-presenter";
import { sanitizePublicGuestIdentity } from "@/lib/public-guest-identity";
import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listPosts } from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";

const HOME_FEED_LIMIT = 5;
const HOME_FEED_QUERY_LIMIT = 15;
const HOME_PREVIEW_BLOCKED_TEXT_PATTERN =
  /(테스트|\[샘플|\[pw\b|\[visual smoke\]|샘플·|e2e|visual-smoke|\b(pw search|pwsearch|test-user|playwright|townpet-demo|adoption-demo|demo)\b)/iu;

type RawHomePost = Record<string, unknown> & {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: Date | string;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  isOperatorContent?: boolean | null;
  operatorSourceName?: string | null;
  operatorSourceUrl?: string | null;
  operatorLastVerifiedAt?: Date | string | null;
  author?: {
    nickname?: string | null;
  } | null;
  guestDisplayName?: string | null;
  neighborhood?: {
    name?: string | null;
    district?: string | null;
  } | null;
};

function toPlainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function isHomePreviewEligible(rawPost: RawHomePost) {
  const searchableText = [
    rawPost.title,
    rawPost.content,
    rawPost.author?.nickname ?? "",
    rawPost.guestDisplayName ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return !HOME_PREVIEW_BLOCKED_TEXT_PATTERN.test(searchableText);
}

function serializeHomePosts(rawPosts: RawHomePost[], excludedIds = new Set<string>()) {
  return rawPosts
    .filter(isHomePreviewEligible)
    .filter((rawPost) => !excludedIds.has(rawPost.id))
    .slice(0, HOME_FEED_LIMIT)
    .map(serializeHomePost);
}

function getTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return 0;
  }
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getFeaturedScore(rawPost: RawHomePost) {
  const hasVerifiedOperatorSource = Boolean(
    rawPost.isOperatorContent &&
      rawPost.operatorSourceName?.trim() &&
      rawPost.operatorLastVerifiedAt,
  );
  const operatorScore = hasVerifiedOperatorSource ? 1_000_000 : rawPost.isOperatorContent ? 500_000 : 0;
  const engagementScore =
    rawPost.likeCount * 30 + rawPost.commentCount * 20 + rawPost.viewCount;
  const recencyScore = Math.floor(getTimestamp(rawPost.createdAt) / 86_400_000);

  return operatorScore + engagementScore + recencyScore;
}

function serializeFeaturedHomePosts(rawPosts: RawHomePost[]) {
  return rawPosts
    .filter(isHomePreviewEligible)
    .toSorted((left, right) => {
      const scoreDiff = getFeaturedScore(right) - getFeaturedScore(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return getTimestamp(right.createdAt) - getTimestamp(left.createdAt);
    })
    .slice(0, HOME_FEED_LIMIT)
    .map(serializeHomePost);
}

function serializeHomePost(rawPost: RawHomePost) {
  const post = sanitizePublicGuestIdentity(rawPost) as RawHomePost;
  const neighborhoodParts = [
    post.neighborhood?.district ?? null,
    post.neighborhood?.name ?? null,
  ].filter(Boolean);

  return {
    id: post.id,
    href: `/posts/${post.id}`,
    title: post.title,
    excerpt: truncate(toPlainText(post.content), 86),
    type: post.type,
    typeLabel: getPostTypeMeta(post.type).label,
    createdAt:
      post.createdAt instanceof Date
        ? post.createdAt.toISOString()
        : String(post.createdAt),
    authorName: post.guestDisplayName ?? post.author?.nickname ?? "익명",
    neighborhoodLabel: neighborhoodParts.length > 0 ? neighborhoodParts.join(" ") : null,
    isOperatorContent: Boolean(post.isOperatorContent),
    operatorSourceName: post.operatorSourceName ?? null,
    operatorSourceUrl: post.operatorSourceUrl ?? null,
    operatorLastVerifiedAt:
      post.operatorLastVerifiedAt instanceof Date
        ? post.operatorLastVerifiedAt.toISOString()
        : post.operatorLastVerifiedAt ?? null,
    commentCount: post.commentCount,
    likeCount: post.likeCount,
    viewCount: post.viewCount,
  };
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await enforceRateLimit({
      key: `home-feed:ip:${clientIp}`,
      limit: 60,
      windowMs: 60_000,
      cacheMs: 1_000,
    });

    const excludedTypes = await getGuestReadLoginRequiredPostTypes().catch((error) => {
      if (isPrismaDatabaseUnavailableError(error)) {
        return [];
      }
      throw error;
    });

    const latestPosts = await listPosts({
      limit: HOME_FEED_QUERY_LIMIT,
      page: 1,
      scope: PostScope.GLOBAL,
      sort: "LATEST",
      excludeTypes: excludedTypes,
      viewerId: undefined,
      personalized: false,
    }).catch((error) => {
      if (isPrismaDatabaseUnavailableError(error)) {
        return { items: [], nextCursor: null };
      }
      throw error;
    });

    const latestCandidates = latestPosts.items as RawHomePost[];
    const featured = serializeFeaturedHomePosts(latestCandidates);
    const featuredPostIds = new Set(featured.map((post) => post.id));

    return jsonOk(
      {
        featured,
        latest: serializeHomePosts(latestCandidates, featuredPostIds),
      },
      {
        headers: {
          "cache-control": buildCacheControlHeader(60, 300),
        },
      },
    );
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/home/feed", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "홈 피드를 불러오지 못했습니다.",
    });
  }
}
