import { PostScope } from "@prisma/client";
import { NextRequest } from "next/server";

import { getPostTypeMeta } from "@/lib/post-presenter";
import { sanitizePublicGuestIdentity } from "@/lib/public-guest-identity";
import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listBestPosts, listPosts } from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";

const HOME_FEED_LIMIT = 5;
const HOME_FEED_QUERY_LIMIT = 15;
const HOME_BEST_DAYS = 7;
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

    const [bestPosts, latestPosts] = await Promise.all([
      listBestPosts({
        limit: HOME_FEED_QUERY_LIMIT,
        page: 1,
        days: HOME_BEST_DAYS,
        scope: PostScope.GLOBAL,
        excludeTypes: excludedTypes,
        minLikes: 0,
        viewerId: undefined,
      }).catch((error) => {
        if (isPrismaDatabaseUnavailableError(error)) {
          return [];
        }
        throw error;
      }),
      listPosts({
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
      }),
    ]);

    const serializedBestPosts = serializeHomePosts(bestPosts as RawHomePost[]);
    const bestPostIds = new Set(serializedBestPosts.map((post) => post.id));

    return jsonOk(
      {
        best: serializedBestPosts,
        latest: serializeHomePosts(latestPosts.items as RawHomePost[], bestPostIds),
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
