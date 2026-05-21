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
const HOME_BEST_DAYS = 7;

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

  return !/(테스트|\b(e2e|pw search|pwsearch|test-user|playwright)\b)/u.test(
    searchableText,
  );
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
        limit: HOME_FEED_LIMIT,
        page: 1,
        days: HOME_BEST_DAYS,
        scope: PostScope.GLOBAL,
        excludeTypes: excludedTypes,
        minLikes: 1,
        viewerId: undefined,
      }).catch((error) => {
        if (isPrismaDatabaseUnavailableError(error)) {
          return [];
        }
        throw error;
      }),
      listPosts({
        limit: HOME_FEED_LIMIT,
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

    return jsonOk(
      {
        best: bestPosts
          .filter((post) => isHomePreviewEligible(post as RawHomePost))
          .map((post) => serializeHomePost(post as RawHomePost)),
        latest: latestPosts.items
          .filter((post) => isHomePreviewEligible(post as RawHomePost))
          .map((post) => serializeHomePost(post as RawHomePost)),
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
