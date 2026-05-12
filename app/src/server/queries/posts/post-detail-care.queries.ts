import { CareApplicationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  CareApplicationDetailItem,
  CareCompletionFeedbackDetailItem,
} from "./post-detail-read-model";

export async function listCareApplicationsForPostDetail(params: {
  postId: string;
  viewerId?: string | null;
  canModerate?: boolean;
}): Promise<CareApplicationDetailItem[]> {
  if (!params.viewerId) {
    return [];
  }

  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    select: {
      authorId: true,
      careRequest: { select: { id: true } },
    },
  });
  if (!post?.careRequest) {
    return [];
  }

  const canSeeAll = params.canModerate || post.authorId === params.viewerId;
  return prisma.careApplication.findMany({
    where: {
      careRequestId: post.careRequest.id,
      ...(canSeeAll ? {} : { applicantId: params.viewerId }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      applicantId: true,
      message: true,
      status: true,
      decidedAt: true,
      createdAt: true,
      applicant: {
        select: { id: true, nickname: true, image: true },
      },
    },
  });
}

export async function listCareCompletionFeedbacksForPostDetail(params: {
  postId: string;
  viewerId?: string | null;
  canModerate?: boolean;
}): Promise<CareCompletionFeedbackDetailItem[]> {
  if (!params.viewerId) {
    return [];
  }

  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    select: {
      authorId: true,
      careRequest: {
        select: {
          id: true,
          applications: {
            where: { status: CareApplicationStatus.ACCEPTED },
            select: { applicantId: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!post?.careRequest) {
    return [];
  }

  const acceptedApplicantId = post.careRequest.applications[0]?.applicantId ?? null;
  const canSeeFeedbacks =
    params.canModerate ||
    post.authorId === params.viewerId ||
    acceptedApplicantId === params.viewerId;
  if (!canSeeFeedbacks) {
    return [];
  }

  return prisma.careCompletionFeedback.findMany({
    where: { careRequestId: post.careRequest.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      authorId: true,
      authorRole: true,
      outcome: true,
      issueType: true,
      wouldRepeat: true,
      comment: true,
      createdAt: true,
      author: {
        select: { id: true, nickname: true, image: true },
      },
    },
  });
}
