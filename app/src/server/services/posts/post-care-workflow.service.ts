import {
  CareApplicationStatus,
  CareFeedbackAuthorRole,
  CareFeedbackIssueType,
  CareRequestStatus,
  ModerationActionType,
  ModerationTargetType,
  PostScope,
  PostStatus,
  PostType,
  UserRole,
} from "@prisma/client";

import { moderateContactContent } from "@/lib/contact-policy";
import { findMatchedForbiddenKeywords } from "@/lib/forbidden-keyword-policy";
import { prisma } from "@/lib/prisma";
import {
  careApplicationCreateSchema,
  careApplicationDecisionSchema,
  careCompletionFeedbackSchema,
  careFeedbackReviewUpdateSchema,
  careRequestStatusUpdateSchema,
} from "@/lib/validations/post";
import { logger, serializeError } from "@/server/logger";
import { recordModerationAction } from "@/server/moderation-action-log";
import {
  getForbiddenKeywords,
  getNewUserSafetyPolicy,
} from "@/server/queries/policy.queries";
import { hasBlockingRelation } from "@/server/queries/user-relation.queries";
import {
  notifyCareApplicationCreated,
  notifyCareApplicationDecision,
  notifyCareRequestStatusChanged,
} from "@/server/services/notification.service";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";
import {
  notifyNotificationCacheChange,
  notifyPostCacheChange,
} from "./post-write-support";

type UpdateCareRequestStatusParams = {
  postId: string;
  actorId: string;
  input: unknown;
};

type CreateCareApplicationParams = {
  postId: string;
  applicantId: string;
  input: unknown;
};

type CancelCareApplicationParams = {
  applicationId: string;
  actorId: string;
};

type DecideCareApplicationParams = {
  applicationId: string;
  actorId: string;
  input: unknown;
};

type CreateCareCompletionFeedbackParams = {
  postId: string;
  authorId: string;
  input: unknown;
};

type UpdateCareFeedbackReviewParams = {
  feedbackId: string;
  actorId: string;
  input: unknown;
};

const AUTHOR_CARE_STATUS_TRANSITIONS: Record<CareRequestStatus, CareRequestStatus[]> = {
  [CareRequestStatus.OPEN]: [CareRequestStatus.CANCELLED],
  [CareRequestStatus.MATCHED]: [CareRequestStatus.IN_PROGRESS, CareRequestStatus.CANCELLED],
  [CareRequestStatus.IN_PROGRESS]: [CareRequestStatus.COMPLETED],
  [CareRequestStatus.COMPLETED]: [],
  [CareRequestStatus.CANCELLED]: [],
};

const ACCEPTED_APPLICANT_CARE_STATUS_TRANSITIONS: Record<CareRequestStatus, CareRequestStatus[]> = {
  [CareRequestStatus.OPEN]: [],
  [CareRequestStatus.MATCHED]: [CareRequestStatus.IN_PROGRESS],
  [CareRequestStatus.IN_PROGRESS]: [CareRequestStatus.COMPLETED],
  [CareRequestStatus.COMPLETED]: [],
  [CareRequestStatus.CANCELLED]: [],
};

function canAuthorTransitionCareStatus(from: CareRequestStatus, to: CareRequestStatus) {
  return AUTHOR_CARE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

function canAcceptedApplicantTransitionCareStatus(from: CareRequestStatus, to: CareRequestStatus) {
  return ACCEPTED_APPLICANT_CARE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

function canModerateCareStatus(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.MODERATOR;
}

export async function updateCareRequestStatus({
  postId,
  actorId,
  input,
}: UpdateCareRequestStatusParams) {
  const parsed = careRequestStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("돌봄 요청 상태 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true },
  });
  if (!actor) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  if (actor.role === UserRole.USER) {
    await assertUserInteractionAllowed(actor.id);
  }

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      status: true,
      title: true,
      type: true,
      careRequest: {
        select: {
          id: true,
          careType: true,
          status: true,
          applications: {
            where: { status: CareApplicationStatus.ACCEPTED },
            select: {
              id: true,
              applicantId: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (existing.type !== PostType.CARE_REQUEST || !existing.careRequest) {
    throw new ServiceError("돌봄 요청 글을 찾을 수 없습니다.", "CARE_REQUEST_NOT_FOUND", 404);
  }

  const previousStatus = existing.careRequest.status;
  const nextStatus = parsed.data.status;
  if (previousStatus === nextStatus) {
    return {
      changed: false,
      previousStatus,
      status: nextStatus,
    };
  }

  const isAuthor = existing.authorId === actor.id;
  const isModerator = canModerateCareStatus(actor.role);
  const acceptedApplication = existing.careRequest.applications?.[0] ?? null;
  const isAcceptedApplicant = acceptedApplication?.applicantId === actor.id;
  if (!isAuthor && !isModerator && !isAcceptedApplicant) {
    throw new ServiceError("돌봄 요청 상태 변경 권한이 없습니다.", "FORBIDDEN", 403);
  }

  if (
    !isModerator &&
    isAuthor &&
    !canAuthorTransitionCareStatus(previousStatus, nextStatus)
  ) {
    throw new ServiceError("허용되지 않는 돌봄 요청 상태 변경입니다.", "INVALID_CARE_STATUS_TRANSITION", 400);
  }

  if (
    !isModerator &&
    !isAuthor &&
    isAcceptedApplicant &&
    !canAcceptedApplicantTransitionCareStatus(previousStatus, nextStatus)
  ) {
    throw new ServiceError("허용되지 않는 돌봄 요청 상태 변경입니다.", "INVALID_CARE_STATUS_TRANSITION", 400);
  }

  const updated = await prisma.careRequest.update({
    where: { postId },
    data: { status: nextStatus },
    select: {
      careType: true,
      startsAt: true,
      endsAt: true,
      locationNote: true,
      petNote: true,
      requirements: true,
      rewardAmount: true,
      isUrgent: true,
      status: true,
    },
  });

  await recordModerationAction({
    actorId: actor.id,
    action: ModerationActionType.CARE_STATUS_CHANGED,
    targetType: ModerationTargetType.POST,
    targetId: existing.id,
    targetUserId: existing.authorId,
    metadata: {
      previousStatus,
      nextStatus,
      actorRole: actor.role,
      actorScope: isModerator
        ? "MODERATOR"
        : isAcceptedApplicant && !isAuthor
          ? "ACCEPTED_APPLICANT"
          : "AUTHOR",
      careType: existing.careRequest.careType,
      acceptedApplicationId: acceptedApplication?.id ?? null,
    },
  });

  const notificationRecipients = [
    existing.authorId,
    acceptedApplication?.applicantId ?? null,
  ].filter((userId): userId is string => Boolean(userId));
  for (const recipientUserId of Array.from(new Set(notificationRecipients))) {
    try {
      await notifyCareRequestStatusChanged({
        recipientUserId,
        actorId: actor.id,
        postId: existing.id,
        postTitle: existing.title,
        status: nextStatus,
      });
    } catch (error) {
      logger.warn("돌봄 요청 상태 변경 알림 생성에 실패했습니다.", {
        postId,
        actorId: actor.id,
        recipientUserId,
        error: serializeError(error),
      });
    }
  }
  notifyNotificationCacheChange(notificationRecipients);
  notifyPostCacheChange();
  return {
    changed: true,
    previousStatus,
    status: updated.status,
    careRequest: updated,
  };
}

export async function createCareApplication({
  postId,
  applicantId,
  input,
}: CreateCareApplicationParams) {
  const parsed = careApplicationCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("돌봄 지원 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const [applicant, newUserSafetyPolicy] = await Promise.all([
    prisma.user.findUnique({
      where: { id: applicantId },
      select: { id: true, role: true, createdAt: true },
    }),
    getNewUserSafetyPolicy(),
  ]);
  if (!applicant) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  await assertUserInteractionAllowed(applicant.id);

  let message = parsed.data.message ?? null;
  if (message) {
    const contactPolicy = moderateContactContent({
      text: message,
      role: applicant.role,
      accountCreatedAt: applicant.createdAt,
      blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
    });
    if (contactPolicy.blocked) {
      throw new ServiceError(
        contactPolicy.message ?? "연락처가 포함된 지원 메시지는 현재 계정으로 작성할 수 없습니다.",
        "CONTACT_RESTRICTED_FOR_NEW_USER",
        403,
      );
    }
    message = contactPolicy.sanitizedText;

    const forbiddenKeywords = await getForbiddenKeywords();
    const matchedForbiddenKeywords = findMatchedForbiddenKeywords(message, forbiddenKeywords);
    if (matchedForbiddenKeywords.length > 0) {
      throw new ServiceError(
        `금칙어가 포함되어 돌봄 지원을 저장할 수 없습니다. (${matchedForbiddenKeywords
          .slice(0, 3)
          .join(", ")})`,
        "FORBIDDEN_KEYWORD_DETECTED",
        400,
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        title: true,
        type: true,
        scope: true,
        status: true,
        neighborhoodId: true,
        careRequest: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!post || post.status !== PostStatus.ACTIVE) {
      throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
    }

    if (post.type !== PostType.CARE_REQUEST || !post.careRequest) {
      throw new ServiceError("돌봄 요청 글을 찾을 수 없습니다.", "CARE_REQUEST_NOT_FOUND", 404);
    }

    if (post.authorId === applicantId) {
      throw new ServiceError("내 돌봄 요청에는 지원할 수 없습니다.", "CARE_APPLICATION_SELF", 400);
    }

    if (post.careRequest.status !== CareRequestStatus.OPEN) {
      throw new ServiceError("모집 중인 돌봄 요청에만 지원할 수 있습니다.", "CARE_REQUEST_NOT_OPEN", 400);
    }

    if (post.scope === PostScope.LOCAL) {
      const primaryNeighborhood = await tx.userNeighborhood.findFirst({
        where: { userId: applicantId, isPrimary: true },
        select: { neighborhoodId: true },
      });
      if (!primaryNeighborhood) {
        throw new ServiceError("대표 동네를 설정해 주세요.", "NEIGHBORHOOD_REQUIRED", 400);
      }
      if (!post.neighborhoodId || post.neighborhoodId !== primaryNeighborhood.neighborhoodId) {
        throw new ServiceError("다른 동네 돌봄 요청에는 지원할 수 없습니다.", "FORBIDDEN", 403);
      }
    }

    const existingApplication = await tx.careApplication.findFirst({
      where: {
        careRequestId: post.careRequest.id,
        applicantId,
      },
      select: { id: true },
    });
    if (existingApplication) {
      throw new ServiceError("이미 지원한 돌봄 요청입니다.", "CARE_APPLICATION_ALREADY_EXISTS", 409);
    }

    if (await hasBlockingRelation(applicantId, post.authorId)) {
      throw new ServiceError("차단 관계에서는 돌봄 요청에 지원할 수 없습니다.", "USER_BLOCK_RELATION", 403);
    }

    const application = await tx.careApplication.create({
      data: {
        careRequestId: post.careRequest.id,
        applicantId,
        message,
      },
      include: {
        applicant: { select: { id: true, nickname: true, image: true } },
      },
    });

    return { application, post };
  });

  try {
    await notifyCareApplicationCreated({
      recipientUserId: result.post.authorId,
      actorId: applicantId,
      postId: result.post.id,
      applicationId: result.application.id,
      postTitle: result.post.title,
      message: result.application.message,
    });
    notifyNotificationCacheChange([result.post.authorId]);
  } catch (error) {
    logger.warn("돌봄 지원 생성 알림에 실패했습니다.", {
      postId,
      applicantId,
      error: serializeError(error),
    });
  }

  notifyPostCacheChange();
  return result.application;
}

export async function cancelCareApplication({
  applicationId,
  actorId,
}: CancelCareApplicationParams) {
  await assertUserInteractionAllowed(actorId);

  const application = await prisma.careApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicantId: true,
      status: true,
      careRequest: {
        select: {
          postId: true,
          post: {
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  if (!application || application.careRequest.post.status === PostStatus.DELETED) {
    throw new ServiceError("돌봄 지원을 찾을 수 없습니다.", "CARE_APPLICATION_NOT_FOUND", 404);
  }
  if (application.applicantId !== actorId) {
    throw new ServiceError("돌봄 지원 취소 권한이 없습니다.", "FORBIDDEN", 403);
  }
  if (application.status !== CareApplicationStatus.PENDING) {
    throw new ServiceError("대기 중인 돌봄 지원만 취소할 수 있습니다.", "INVALID_CARE_APPLICATION_STATUS", 400);
  }

  const updated = await prisma.careApplication.update({
    where: { id: applicationId },
    data: { status: CareApplicationStatus.CANCELLED },
    include: {
      applicant: { select: { id: true, nickname: true, image: true } },
    },
  });

  notifyPostCacheChange();
  return updated;
}

export async function decideCareApplication({
  applicationId,
  actorId,
  input,
}: DecideCareApplicationParams) {
  const parsed = careApplicationDecisionSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("돌봄 지원 결정 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true },
  });
  if (!actor) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }
  if (actor.role === UserRole.USER) {
    await assertUserInteractionAllowed(actor.id);
  }

  const nextStatus = parsed.data.status;
  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.careApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        applicantId: true,
        message: true,
        status: true,
        careRequestId: true,
        careRequest: {
          select: {
            id: true,
            status: true,
            post: {
              select: {
                id: true,
                title: true,
                authorId: true,
                status: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!application || application.careRequest.post.status === PostStatus.DELETED) {
      throw new ServiceError("돌봄 지원을 찾을 수 없습니다.", "CARE_APPLICATION_NOT_FOUND", 404);
    }

    const isAuthor = application.careRequest.post.authorId === actor.id;
    const isModerator = canModerateCareStatus(actor.role);
    if (!isAuthor && !isModerator) {
      throw new ServiceError("돌봄 지원 결정 권한이 없습니다.", "FORBIDDEN", 403);
    }

    if (application.status !== CareApplicationStatus.PENDING) {
      throw new ServiceError("대기 중인 돌봄 지원만 결정할 수 있습니다.", "INVALID_CARE_APPLICATION_STATUS", 400);
    }

    if (
      nextStatus === CareApplicationStatus.ACCEPTED &&
      application.careRequest.status !== CareRequestStatus.OPEN
    ) {
      throw new ServiceError("모집 중인 돌봄 요청만 수락할 수 있습니다.", "CARE_REQUEST_NOT_OPEN", 400);
    }

    const now = new Date();
    const updated = await tx.careApplication.update({
      where: { id: application.id },
      data: {
        status: nextStatus,
        decidedAt: now,
        decidedBy: actor.id,
      },
      include: {
        applicant: { select: { id: true, nickname: true, image: true } },
      },
    });

    if (nextStatus === CareApplicationStatus.ACCEPTED) {
      await tx.careRequest.update({
        where: { id: application.careRequestId },
        data: { status: CareRequestStatus.MATCHED },
      });
      await tx.careApplication.updateMany({
        where: {
          careRequestId: application.careRequestId,
          id: { not: application.id },
          status: CareApplicationStatus.PENDING,
        },
        data: {
          status: CareApplicationStatus.DECLINED,
          decidedAt: now,
          decidedBy: actor.id,
        },
      });
    }

    return { application: updated, post: application.careRequest.post };
  });

  try {
    await notifyCareApplicationDecision({
      recipientUserId: result.application.applicantId,
      actorId: actor.id,
      postId: result.post.id,
      applicationId: result.application.id,
      postTitle: result.post.title,
      status: nextStatus,
    });
    notifyNotificationCacheChange([result.application.applicantId]);
  } catch (error) {
    logger.warn("돌봄 지원 결정 알림에 실패했습니다.", {
      applicationId,
      actorId,
      error: serializeError(error),
    });
  }

  notifyPostCacheChange();
  return result.application;
}

export async function createCareCompletionFeedback({
  postId,
  authorId,
  input,
}: CreateCareCompletionFeedbackParams) {
  const parsed = careCompletionFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("돌봄 완료 피드백 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const [author, newUserSafetyPolicy] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, role: true, createdAt: true },
    }),
    getNewUserSafetyPolicy(),
  ]);
  if (!author) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  await assertUserInteractionAllowed(author.id);

  let comment = parsed.data.comment ?? null;
  if (comment) {
    const contactPolicy = moderateContactContent({
      text: comment,
      role: author.role,
      accountCreatedAt: author.createdAt,
      blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
    });
    if (contactPolicy.blocked) {
      throw new ServiceError(
        contactPolicy.message ?? "연락처가 포함된 피드백은 현재 계정으로 작성할 수 없습니다.",
        "CONTACT_RESTRICTED_FOR_NEW_USER",
        403,
      );
    }
    comment = contactPolicy.sanitizedText;

    const forbiddenKeywords = await getForbiddenKeywords();
    const matchedForbiddenKeywords = findMatchedForbiddenKeywords(comment, forbiddenKeywords);
    if (matchedForbiddenKeywords.length > 0) {
      throw new ServiceError(
        `금칙어가 포함되어 돌봄 피드백을 저장할 수 없습니다. (${matchedForbiddenKeywords
          .slice(0, 3)
          .join(", ")})`,
        "FORBIDDEN_KEYWORD_DETECTED",
        400,
      );
    }
  }

  const feedback = await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        status: true,
        type: true,
        careRequest: {
          select: {
            id: true,
            status: true,
            applications: {
              where: { status: CareApplicationStatus.ACCEPTED },
              select: { id: true, applicantId: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
    }
    if (post.type !== PostType.CARE_REQUEST || !post.careRequest) {
      throw new ServiceError("돌봄 요청 글을 찾을 수 없습니다.", "CARE_REQUEST_NOT_FOUND", 404);
    }
    if (post.careRequest.status !== CareRequestStatus.COMPLETED) {
      throw new ServiceError("완료된 돌봄 요청에만 피드백을 남길 수 있습니다.", "CARE_REQUEST_NOT_COMPLETED", 400);
    }

    const acceptedApplication = post.careRequest.applications?.[0] ?? null;
    const isRequester = post.authorId === authorId;
    const isCaregiver = acceptedApplication?.applicantId === authorId;
    if (!isRequester && !isCaregiver) {
      throw new ServiceError("돌봄 완료 피드백 작성 권한이 없습니다.", "FORBIDDEN", 403);
    }

    const existingFeedback = await tx.careCompletionFeedback.findUnique({
      where: {
        careRequestId_authorId: {
          careRequestId: post.careRequest.id,
          authorId,
        },
      },
      select: { id: true },
    });
    if (existingFeedback) {
      throw new ServiceError("이미 돌봄 완료 피드백을 남겼습니다.", "CARE_FEEDBACK_ALREADY_EXISTS", 409);
    }

    return tx.careCompletionFeedback.create({
      data: {
        careRequestId: post.careRequest.id,
        careApplicationId: acceptedApplication?.id ?? null,
        authorId,
        authorRole: isRequester
          ? CareFeedbackAuthorRole.REQUESTER
          : CareFeedbackAuthorRole.CAREGIVER,
        outcome: parsed.data.outcome,
        issueType: parsed.data.issueType ?? CareFeedbackIssueType.NONE,
        wouldRepeat: parsed.data.wouldRepeat ?? null,
        comment,
      },
      include: {
        author: { select: { id: true, nickname: true, image: true } },
      },
    });
  });

  notifyPostCacheChange();
  return feedback;
}

export async function updateCareFeedbackReview({
  feedbackId,
  actorId,
  input,
}: UpdateCareFeedbackReviewParams) {
  const parsed = careFeedbackReviewUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("돌봄 이슈 검토 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true },
  });
  if (!actor) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }
  if (!canModerateCareStatus(actor.role)) {
    throw new ServiceError("돌봄 이슈 검토 권한이 없습니다.", "FORBIDDEN", 403);
  }

  const existing = await prisma.careCompletionFeedback.findUnique({
    where: { id: feedbackId },
    select: {
      id: true,
      issueType: true,
      reviewStatus: true,
      reviewNote: true,
      careRequest: {
        select: {
          id: true,
          post: {
            select: {
              id: true,
              authorId: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!existing || existing.careRequest.post.status === PostStatus.DELETED) {
    throw new ServiceError("돌봄 완료 피드백을 찾을 수 없습니다.", "CARE_FEEDBACK_NOT_FOUND", 404);
  }
  if (existing.issueType === CareFeedbackIssueType.NONE) {
    throw new ServiceError("이슈가 없는 피드백은 검토 큐에서 처리할 수 없습니다.", "CARE_FEEDBACK_NOT_ISSUE", 400);
  }

  const reviewNote = parsed.data.reviewNote ?? null;
  const reviewedAt = new Date();
  const updated = await prisma.careCompletionFeedback.update({
    where: { id: feedbackId },
    data: {
      reviewStatus: parsed.data.reviewStatus,
      reviewNote,
      reviewedAt,
      reviewedBy: actor.id,
    },
    include: {
      reviewer: { select: { id: true, email: true, nickname: true } },
    },
  });

  await recordModerationAction({
    actorId: actor.id,
    action: ModerationActionType.CARE_FEEDBACK_REVIEWED,
    targetType: ModerationTargetType.POST,
    targetId: existing.careRequest.post.id,
    targetUserId: existing.careRequest.post.authorId,
    metadata: {
      feedbackId: existing.id,
      careRequestId: existing.careRequest.id,
      issueType: existing.issueType,
      previousStatus: existing.reviewStatus,
      nextStatus: parsed.data.reviewStatus,
      previousNotePresent: Boolean(existing.reviewNote),
      nextNotePresent: Boolean(reviewNote),
      actorRole: actor.role,
    },
  });

  return updated;
}
