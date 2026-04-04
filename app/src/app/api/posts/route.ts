import { NextRequest } from "next/server";
import { PostScope } from "@prisma/client";
import { z } from "zod";

import { isLoginRequiredPostType } from "@/lib/post-access";
import { FEED_PAGE_SIZE } from "@/lib/feed";
import { sanitizePublicGuestIdentityList } from "@/lib/public-guest-identity";
import { postListSchema, toPostListInput } from "@/lib/validations/post";
import { countPosts, listPosts } from "@/server/queries/post.queries";
import { enforceAuthenticatedWriteRateLimit } from "@/server/authenticated-write-throttle";
import { getCurrentUserId, hasSessionCookieFromRequest } from "@/server/auth";
import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { assertGuestStepUp } from "@/server/guest-step-up";
import {
  getGuestPostPolicy,
  getGuestReadLoginRequiredPostTypes,
} from "@/server/queries/policy.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { createPost } from "@/server/services/post.service";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const currentUserId = hasSessionCookieFromRequest(request)
      ? await getCurrentUserId()
      : null;
    const viewerId = currentUserId ?? undefined;
    const rateKey = currentUserId ? `feed:user:${currentUserId}` : `feed:ip:${clientIp}`;
    const loginRequiredTypesPromise = currentUserId
      ? Promise.resolve([])
      : getGuestReadLoginRequiredPostTypes();
    await enforceRateLimit({
      key: rateKey,
      limit: 30,
      windowMs: 60_000,
      cacheMs: 1_000,
    });
    const loginRequiredTypes = await loginRequiredTypesPromise;
    const { searchParams } = new URL(request.url);
    const petTypeQueryValues = searchParams
      .getAll("petType")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const parsedPetTypes = z.array(z.string().cuid()).max(50).safeParse(petTypeQueryValues);
    if (!parsedPetTypes.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }
    const petTypeIds = Array.from(new Set(parsedPetTypes.data));

    const parsed = postListSchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: FEED_PAGE_SIZE,
      type: searchParams.get("type") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
      petType: petTypeIds[0] ?? undefined,
      review: searchParams.get("review") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      searchIn: searchParams.get("searchIn") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      days: searchParams.get("period") ?? searchParams.get("days") ?? undefined,
      personalized: searchParams.get("personalized") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const listInput = toPostListInput(parsed.data);
    const { petTypeId, ...listSchemaInput } = listInput;

    if (!currentUserId && isLoginRequiredPostType(listInput.type, loginRequiredTypes)) {
      return jsonError(401, {
        code: "AUTH_REQUIRED",
        message: "선택한 카테고리는 로그인 후 이용할 수 있습니다.",
      });
    }

    const scope = listInput.scope ?? PostScope.GLOBAL;
    const currentPage =
      typeof listInput.page === "number" && listInput.page > 0 ? listInput.page : 1;
    let neighborhoodId: string | undefined;

      if (scope === PostScope.LOCAL) {
      if (!currentUserId) {
        return jsonError(401, {
          code: "AUTH_REQUIRED",
          message: "로컬 피드는 로그인 후 이용할 수 있습니다.",
        });
      }

      const userWithNeighborhoods = await getUserWithNeighborhoods(currentUserId);
      const primaryNeighborhood = userWithNeighborhoods?.neighborhoods.find(
        (item) => item.isPrimary,
      );

      if (!primaryNeighborhood) {
        return jsonError(400, {
          code: "NEIGHBORHOOD_REQUIRED",
          message: "로컬 피드를 보려면 대표 동네를 설정해 주세요.",
        });
      }

      neighborhoodId = primaryNeighborhood.neighborhood.id;
    }

    const totalCount = await countPosts({
      ...listSchemaInput,
      scope,
      petTypeId,
      petTypeIds,
      excludeTypes: currentUserId ? undefined : loginRequiredTypes,
      neighborhoodId,
      viewerId,
    });
    const totalPages = Math.max(1, Math.ceil(totalCount / FEED_PAGE_SIZE));
    const resolvedPage = Math.min(currentPage, totalPages);

    const data = await listPosts({
      ...listSchemaInput,
      page: resolvedPage,
      limit: FEED_PAGE_SIZE,
      scope,
      petTypeId,
      petTypeIds,
      excludeTypes: currentUserId ? undefined : loginRequiredTypes,
      neighborhoodId,
      viewerId,
      personalized: listInput.personalized && Boolean(currentUserId),
    });
    const canCache =
      !currentUserId &&
      scope === PostScope.GLOBAL &&
      !listInput.cursor &&
      !listInput.personalized &&
      resolvedPage === 1;
    return jsonOk({
      ...data,
      items: sanitizePublicGuestIdentityList(
        data.items as Array<Record<string, unknown> & {
          guestDisplayName?: string | null;
          guestIpDisplay?: string | null;
          guestIpLabel?: string | null;
          guestAuthor?: { displayName?: string | null; ipDisplay?: string | null; ipLabel?: string | null } | null;
        }>,
      ).map((item) => {
        const publicItem = { ...item } as typeof item & { guestAuthor?: unknown };
        delete publicItem.guestAuthor;
        return publicItem;
      }),
      page: resolvedPage,
      totalPages,
      totalCount,
    }, {
      headers: {
        "cache-control": canCache ? buildCacheControlHeader(30, 300) : "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "GET /api/posts", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientIp = getClientIp(request);
    const userId = await getCurrentUserId();

    if (userId) {
      const clientFingerprint = request.headers.get("x-client-fingerprint")?.trim() || undefined;
      await enforceAuthenticatedWriteRateLimit({
        scope: "post:create",
        userId,
        ip: clientIp,
        clientFingerprint,
      });
      const post = await createPost({ authorId: userId, input: body });
      return jsonOk(post, { status: 201 });
    }

    const guestFingerprint = request.headers.get("x-guest-fingerprint")?.trim() || undefined;
    const guestRateKey = `posts:guest:ip:${clientIp}:fp:${guestFingerprint ?? "none"}`;
    const guestPostPolicy = await getGuestPostPolicy();

    await enforceRateLimit({
      key: `${guestRateKey}:10m`,
      limit: guestPostPolicy.postRateLimit10m,
      windowMs: 10 * 60_000,
    });
    await enforceRateLimit({
      key: `${guestRateKey}:1h`,
      limit: guestPostPolicy.postRateLimit1h,
      windowMs: 60 * 60_000,
    });
    await enforceRateLimit({
      key: `${guestRateKey}:24h`,
      limit: guestPostPolicy.postRateLimit24h,
      windowMs: 24 * 60 * 60_000,
    });
    await assertGuestStepUp({
      scope: "post:create",
      ip: clientIp,
      fingerprint: guestFingerprint,
      token: request.headers.get("x-guest-step-up-token"),
      proof: request.headers.get("x-guest-step-up-proof"),
    });

    const post = await createPost({
      input: body,
      guestIdentity: {
        ip: clientIp,
        fingerprint: guestFingerprint,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    });
    return jsonOk(post, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/posts", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
