import { NextRequest } from "next/server";

import { getCurrentUser } from "@/server/auth";
import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getPostById } from "@/server/queries/post.queries";
import { jsonError, jsonOk } from "@/server/response";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { ServiceError } from "@/server/services/service-error";

const HIDDEN_POST_STATS_KEYS = new Set(["likeCount", "dislikeCount", "commentCount", "viewCount"]);

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const user = await getCurrentUser();
    const post = await getPostById(postId, user?.id);
    if (!post) {
      return jsonError(404, {
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      });
    }

    await assertPostReadable(post, user?.id);

    const restPost = Object.fromEntries(
      Object.entries(post).filter(([key]) => !HIDDEN_POST_STATS_KEYS.has(key)),
    );

    return jsonOk(
      {
        post: {
          ...restPost,
        },
        viewerId: user?.id ?? null,
      },
      {
        headers: {
          "cache-control": user ? "no-store" : buildCacheControlHeader(30, 300),
        },
      },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "GET /api/posts/[id]/detail", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
