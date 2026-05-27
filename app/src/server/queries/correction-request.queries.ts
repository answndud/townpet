import { CorrectionRequestStatus, PostStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { canGuestReadPost } from "@/lib/post-access";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";

export const CORRECTION_REQUEST_LIST_LIMIT_DEFAULT = 100;
export const CORRECTION_REQUEST_LIST_LIMIT_MAX = 200;

type ListCorrectionRequestOptions = {
  status?: CorrectionRequestStatus | "ALL" | null;
  query?: string | null;
  operatorOnly?: boolean;
  limit?: number;
};

export async function listInformationCorrectionRequests({
  status,
  query,
  operatorOnly = false,
  limit,
}: ListCorrectionRequestOptions = {}) {
  const trimmedQuery = query?.trim();
  const safeLimit = Math.min(
    Math.max(limit ?? CORRECTION_REQUEST_LIST_LIMIT_DEFAULT, 1),
    CORRECTION_REQUEST_LIST_LIMIT_MAX,
  );

  const where: Prisma.InformationCorrectionRequestWhereInput = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(operatorOnly ? { post: { isOperatorContent: true } } : {}),
    ...(trimmedQuery
      ? {
          OR: [
            { targetName: { contains: trimmedQuery, mode: "insensitive" } },
            { organizationName: { contains: trimmedQuery, mode: "insensitive" } },
            { requesterName: { contains: trimmedQuery, mode: "insensitive" } },
            { requesterEmail: { contains: trimmedQuery, mode: "insensitive" } },
            { requestedChange: { contains: trimmedQuery, mode: "insensitive" } },
            { postId: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.informationCorrectionRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    take: safeLimit,
    include: {
      post: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          isOperatorContent: true,
          operatorSourceName: true,
          operatorLastVerifiedAt: true,
        },
      },
      requester: { select: { id: true, email: true, nickname: true } },
      resolver: { select: { id: true, email: true, nickname: true } },
    },
  });
}

export async function getCorrectionRequestPostContext(postId: string | null | undefined) {
  const trimmedPostId = postId?.trim();
  if (!trimmedPostId) {
    return null;
  }

  const post = await prisma.post.findFirst({
    where: {
      id: trimmedPostId,
      status: PostStatus.ACTIVE,
    },
    select: {
      id: true,
      title: true,
      type: true,
      scope: true,
      isOperatorContent: true,
      operatorSourceName: true,
      operatorLastVerifiedAt: true,
    },
  });

  if (!post) {
    return null;
  }

  if (post.isOperatorContent) {
    return post;
  }

  const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();
  return canGuestReadPost({
    scope: post.scope,
    type: post.type,
    loginRequiredTypes,
  })
    ? post
    : null;
}

export async function getCorrectionRequestQueueSummary() {
  const [pendingCount, reviewingCount, operatorPendingCount] = await Promise.all([
    prisma.informationCorrectionRequest.count({
      where: { status: CorrectionRequestStatus.PENDING },
    }),
    prisma.informationCorrectionRequest.count({
      where: { status: CorrectionRequestStatus.REVIEWING },
    }),
    prisma.informationCorrectionRequest.count({
      where: {
        status: { in: [CorrectionRequestStatus.PENDING, CorrectionRequestStatus.REVIEWING] },
        post: { isOperatorContent: true },
      },
    }),
  ]);

  return {
    pendingCount,
    reviewingCount,
    activeCount: pendingCount + reviewingCount,
    operatorPendingCount,
  };
}
