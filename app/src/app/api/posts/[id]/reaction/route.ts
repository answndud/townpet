import { NextRequest } from "next/server";

import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { jsonError, jsonOk } from "@/server/response";
import { findViewerPostReaction } from "@/server/queries/post.queries";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserIdFromRequest(request);
    if (!userId) {
      return jsonError(401, {
        code: "AUTH_REQUIRED",
        message: "로그인이 필요합니다.",
      });
    }

    const { id: postId } = await params;
    const reaction = await findViewerPostReaction({ postId, userId });

    return jsonOk({ reaction });
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/posts/[id]/reaction", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
