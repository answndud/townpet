import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { buildPostDetailMediaRendering } from "@/lib/post-detail-rendering";
import { sanitizePublicGuestIdentity } from "@/lib/public-guest-identity";
import { getCurrentUserIdFromRequest, getCurrentUserRole } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import {
  getPostById,
  listCareApplicationsForPostDetail,
  listCareCompletionFeedbacksForPostDetail,
} from "@/server/queries/post.queries";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
import { jsonError, jsonOk } from "@/server/response";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { ServiceError } from "@/server/services/service-error";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const userId = await getCurrentUserIdFromRequest(request);
    const viewerId = userId ?? undefined;
    const viewerRole = userId ? (await getCurrentUserRole())?.role ?? null : null;
    const canModerate =
      viewerRole === UserRole.ADMIN || viewerRole === UserRole.MODERATOR;
    const post = await getPostById(postId, viewerId);
    if (!post) {
      return jsonError(404, {
        code: "NOT_FOUND",
        message: "게시글을 찾을 수 없습니다.",
      });
    }

    await assertPostReadable(post, viewerId, {
      viewerRole,
      allowModeratorHiddenRead: true,
    });

    const {
      renderedContentHtml,
      renderedContentText,
      renderableImages,
    } = await buildPostDetailMediaRendering(post.content, post.images);
    const relationState =
      userId && userId !== post.authorId
        ? await getUserRelationState(userId, post.authorId)
        : {
            isBlockedByMe: false,
            hasBlockedMe: false,
            isMutedByMe: false,
          };
    const careApplications = await listCareApplicationsForPostDetail({
      postId,
      viewerId: userId,
      canModerate,
    });
    const careCompletionFeedbacks = await listCareCompletionFeedbacksForPostDetail({
      postId,
      viewerId: userId,
      canModerate,
    });

    const sanitizedPost = sanitizePublicGuestIdentity(post as Record<string, unknown> & {
      guestDisplayName?: string | null;
      guestIpDisplay?: string | null;
      guestIpLabel?: string | null;
      guestAuthor?: { displayName?: string | null; ipDisplay?: string | null; ipLabel?: string | null } | null;
    });
    const publicPost = { ...sanitizedPost } as typeof sanitizedPost & { guestAuthor?: unknown };
    delete publicPost.guestAuthor;

    return jsonOk(
      {
        post: {
          ...publicPost,
          images: renderableImages,
          careApplications,
          careCompletionFeedbacks,
          renderedContentHtml,
          renderedContentText,
        },
        viewerId: userId,
        canModerate,
        relationState,
      },
      {
        headers: {
          "cache-control": "no-store",
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
