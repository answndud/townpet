import { createHash } from "crypto";

import { runtimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/server/logger";

export {
  togglePostBookmark,
  togglePostReaction,
} from "./post-engagement.service";
export { createPost } from "./post-create.service";
export { deletePost } from "./post-delete.service";
export {
  deleteGuestPost,
  updateGuestPost,
} from "./post-guest-management.service";
export { updateMarketListingStatus } from "./post-market-workflow.service";
export { updatePost } from "./post-update.service";
export {
  cancelCareApplication,
  createCareApplication,
  createCareCompletionFeedback,
  decideCareApplication,
  updateCareFeedbackReview,
  updateCareRequestStatus,
} from "./post-care-workflow.service";

const POST_VIEW_TTL_SECONDS = 60 * 60 * 6;
const postViewStore = new Map<string, number>();
let postViewRedisFailureLoggedAt = 0;

type RegisterPostViewParams = {
  postId: string;
  userId?: string;
  clientIp?: string;
  userAgent?: string;
  ttlSeconds?: number;
};

function buildPostViewFingerprint({
  postId,
  userId,
  clientIp,
  userAgent,
}: RegisterPostViewParams) {
  return createHash("sha256")
    .update(
      `${postId}:${userId ?? "anonymous"}:${clientIp ?? "anonymous"}:${(userAgent ?? "unknown").slice(0, 120)}`,
    )
    .digest("hex");
}

function reserveMemoryPostView(fingerprint: string, ttlMs: number) {
  const now = Date.now();
  const expiresAt = postViewStore.get(fingerprint);
  if (expiresAt && expiresAt > now) {
    return false;
  }

  postViewStore.set(fingerprint, now + ttlMs);

  if (postViewStore.size > 5_000) {
    for (const [key, expireAt] of postViewStore.entries()) {
      if (expireAt <= now) {
        postViewStore.delete(key);
      }
    }
  }

  return true;
}

async function reserveRedisPostView(fingerprint: string, ttlSeconds: number) {
  const endpoint = `${runtimeEnv.upstashRedisRestUrl}/pipeline`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeEnv.upstashRedisRestToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([
      ["SET", `postview:${fingerprint}`, "1", "NX", "EX", ttlSeconds],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash post view request failed: ${response.status}`);
  }

  const payload = (await response.json()) as Array<{
    result?: string | null;
    error?: string;
  }>;

  const commandError = payload.find((item) => item.error);
  if (commandError) {
    throw new Error(`Upstash command error: ${commandError.error}`);
  }

  return payload[0]?.result === "OK";
}

async function reservePostView(fingerprint: string, ttlSeconds: number) {
  if (runtimeEnv.isUpstashConfigured) {
    try {
      return await reserveRedisPostView(fingerprint, ttlSeconds);
    } catch (error) {
      const now = Date.now();
      if (now - postViewRedisFailureLoggedAt > 60_000) {
        postViewRedisFailureLoggedAt = now;
        logger.warn("Redis post view dedupe 실패로 메모리 fallback을 사용합니다.", {
          error: serializeError(error),
        });
      }
    }
  }

  return reserveMemoryPostView(fingerprint, ttlSeconds * 1000);
}

export async function registerPostView({
  postId,
  userId,
  clientIp,
  userAgent,
  ttlSeconds = POST_VIEW_TTL_SECONDS,
}: RegisterPostViewParams) {
  try {
    const fingerprint = buildPostViewFingerprint({
      postId,
      userId,
      clientIp,
      userAgent,
    });
    const shouldCount = await reservePostView(fingerprint, ttlSeconds);
    if (!shouldCount) {
      return false;
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: { increment: 1 },
      },
    });

    return true;
  } catch (error) {
    logger.warn("게시글 조회수 집계에 실패했습니다.", {
      postId,
      error: serializeError(error),
    });
    return false;
  }
}
