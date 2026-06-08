import { NextRequest } from "next/server";
import { PostStatus, PostType } from "@prisma/client";
import { z } from "zod";

import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { logger } from "@/server/logger";
import { getPostById } from "@/server/queries/post.queries";
import { jsonError, jsonOk } from "@/server/response";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { ServiceError } from "@/server/services/service-error";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const shareActionSchema = z.object({
  action: z.enum(["LINK_COPY", "KAKAO_TEXT_COPY", "POSTER_OPEN", "POSTER_DOWNLOAD"]),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsed = shareActionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_SHARE_ACTION",
        message: "공유 액션이 올바르지 않습니다.",
      });
    }

    const userId = await getCurrentUserIdFromRequest(request);
    const post = await getPostById(id, userId ?? undefined);
    if (!post || post.type !== PostType.LOST_FOUND || post.status !== PostStatus.ACTIVE) {
      return jsonError(404, {
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      });
    }

    await assertPostReadable(post, userId ?? undefined);

    logger.info("lost-found share action", {
      postId: post.id,
      action: parsed.data.action,
      userId: userId ?? null,
    });

    return jsonOk({ recorded: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/posts/[id]/share", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
