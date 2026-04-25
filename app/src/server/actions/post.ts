"use server";

import { MarketStatus, PostReactionType } from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { enforceAuthenticatedWriteRateLimit } from "@/server/authenticated-write-throttle";
import {
  createPost,
  deletePost,
  togglePostBookmark,
  togglePostReaction,
  updateMarketListingStatus,
  updatePost,
} from "@/server/services/post.service";
import { logger, serializeError } from "@/server/logger";
import { getClientIp } from "@/server/request-context";
import { ServiceError } from "@/server/services/service-error";
import { requireCurrentUser } from "@/server/auth";

type PostActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };
type PostReactionInput = "LIKE" | "DISLIKE" | null;

type PostReactionActionResult =
  | {
      ok: true;
      likeCount: number;
      dislikeCount: number;
      reaction: PostReactionInput | null;
    }
  | { ok: false; code: string; message: string };

type PostBookmarkActionResult =
  | {
      ok: true;
      bookmarked: boolean;
    }
  | { ok: false; code: string; message: string };

type MarketListingStatusActionResult =
  | {
      ok: true;
      changed: boolean;
      status: MarketStatus;
      previousStatus: MarketStatus;
    }
  | { ok: false; code: string; message: string };

function revalidateFeedPage() {
  revalidatePath("/feed");
}

function revalidatePostDetailPage(postId: string) {
  revalidatePath(`/posts/${postId}`);
}

export async function createPostAction(
  input: unknown,
  options?: { clientFingerprint?: string | null },
): Promise<PostActionResult> {
  try {
    const user = await requireCurrentUser();
    const requestHeaders = await headers();
    await enforceAuthenticatedWriteRateLimit({
      scope: "post:create",
      userId: user.id,
      ip: getClientIp(requestHeaders),
      clientFingerprint: options?.clientFingerprint ?? null,
    });

    await createPost({ authorId: user.id, input });
    revalidateFeedPage();
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function deletePostAction(postId: string): Promise<PostActionResult> {
  try {
    const user = await requireCurrentUser();
    await deletePost({ postId, authorId: user.id });
    revalidateFeedPage();
    revalidatePostDetailPage(postId);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function updatePostAction(
  postId: string,
  input: unknown,
): Promise<PostActionResult> {
  try {
    const user = await requireCurrentUser();
    await updatePost({ postId, authorId: user.id, input });
    revalidateFeedPage();
    revalidatePostDetailPage(postId);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function togglePostReactionAction(
  postId: string,
  type: PostReactionInput,
): Promise<PostReactionActionResult> {
  try {
    if (type !== null && type !== "LIKE" && type !== "DISLIKE") {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: "반응 값이 올바르지 않습니다.",
      };
    }

    const user = await requireCurrentUser();
    const result = await togglePostReaction({
      postId,
      userId: user.id,
      type: type as PostReactionType | null,
    });
    revalidatePostDetailPage(postId);

    return {
      ok: true,
      likeCount: result.likeCount,
      dislikeCount: result.dislikeCount,
      reaction: result.reaction,
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }
    logger.error("togglePostReactionAction 실패", {
      postId,
      type,
      error: serializeError(error),
    });

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function togglePostBookmarkAction(
  postId: string,
  bookmarked: boolean,
): Promise<PostBookmarkActionResult> {
  try {
    if (typeof bookmarked !== "boolean") {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: "북마크 값이 올바르지 않습니다.",
      };
    }

    const user = await requireCurrentUser();
    const result = await togglePostBookmark({
      postId,
      userId: user.id,
      bookmarked,
    });
    revalidateFeedPage();
    revalidatePostDetailPage(postId);
    revalidatePath("/bookmarks");

    return {
      ok: true,
      bookmarked: result.bookmarked,
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    logger.error("togglePostBookmarkAction 실패", {
      postId,
      bookmarked,
      error: serializeError(error),
    });

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function updateMarketListingStatusAction(
  postId: string,
  status: MarketStatus,
): Promise<MarketListingStatusActionResult> {
  try {
    const user = await requireCurrentUser();
    const result = await updateMarketListingStatus({
      postId,
      actorId: user.id,
      input: { status },
    });
    revalidateFeedPage();
    revalidatePostDetailPage(postId);

    return {
      ok: true,
      changed: result.changed,
      status: result.status,
      previousStatus: result.previousStatus,
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    logger.error("updateMarketListingStatusAction 실패", {
      postId,
      status,
      error: serializeError(error),
    });

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}
