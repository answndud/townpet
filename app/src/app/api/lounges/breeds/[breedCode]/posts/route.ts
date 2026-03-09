import { NextRequest } from "next/server";
import { PostScope } from "@prisma/client";

import { FEED_PAGE_SIZE } from "@/lib/feed";
import {
  breedCodeParamSchema,
  breedLoungePostListSchema,
} from "@/lib/validations/lounge";
import { getCurrentUserId, hasSessionCookieFromRequest } from "@/server/auth";
import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { countPosts, listPosts } from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";

type RouteContext = {
  params: Promise<{ breedCode?: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { breedCode: rawBreedCode } = await context.params;
    const parsedBreedCode = breedCodeParamSchema.safeParse(rawBreedCode);
    if (!parsedBreedCode.success) {
      return jsonError(400, {
        code: "INVALID_BREED_CODE",
        message: "품종 코드 형식이 올바르지 않습니다.",
      });
    }

    const clientIp = getClientIp(request);
    const currentUserId = hasSessionCookieFromRequest(request)
      ? await getCurrentUserId()
      : null;
    const viewerId = currentUserId ?? undefined;
    await enforceRateLimit({
      key: currentUserId ? `breed-lounge:user:${currentUserId}` : `breed-lounge:ip:${clientIp}`,
      limit: 30,
      windowMs: 60_000,
      cacheMs: 1_000,
    });

    const loginRequiredTypes = currentUserId ? [] : await getGuestReadLoginRequiredPostTypes();
    const { searchParams } = new URL(request.url);
    const parsed = breedLoungePostListSchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      searchIn: searchParams.get("searchIn") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      days: searchParams.get("period") ?? searchParams.get("days") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      personalized: searchParams.get("personalized") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    if (!currentUserId && parsed.data.type && loginRequiredTypes.includes(parsed.data.type)) {
      return jsonError(401, {
        code: "AUTH_REQUIRED",
        message: "선택한 카테고리는 로그인 후 이용할 수 있습니다.",
      });
    }

    const currentPage =
      typeof parsed.data.page === "number" && parsed.data.page > 0 ? parsed.data.page : 1;
    const totalCount = await countPosts({
      type: parsed.data.type,
      scope: PostScope.GLOBAL,
      q: parsed.data.q,
      searchIn: parsed.data.searchIn,
      days: parsed.data.days,
      excludeTypes: currentUserId ? undefined : loginRequiredTypes,
      viewerId,
      authorBreedCode: parsedBreedCode.data,
    });
    const totalPages = Math.max(1, Math.ceil(totalCount / FEED_PAGE_SIZE));
    const resolvedPage = Math.min(currentPage, totalPages);

    const data = await listPosts({
      cursor: parsed.data.cursor,
      page: resolvedPage,
      limit: FEED_PAGE_SIZE,
      type: parsed.data.type,
      scope: PostScope.GLOBAL,
      q: parsed.data.q,
      searchIn: parsed.data.searchIn,
      sort: parsed.data.sort,
      days: parsed.data.days,
      excludeTypes: currentUserId ? undefined : loginRequiredTypes,
      viewerId,
      personalized: Boolean(currentUserId) && parsed.data.personalized,
      authorBreedCode: parsedBreedCode.data,
    });

    const canCache =
      !currentUserId &&
      !parsed.data.cursor &&
      !parsed.data.personalized &&
      resolvedPage === 1;
    return jsonOk({
      ...data,
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

    await monitorUnhandledError(error, {
      route: "GET /api/lounges/breeds/[breedCode]/posts",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
