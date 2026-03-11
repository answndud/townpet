import {
  ModerationActionType,
  ModerationTargetType,
  PostStatus,
  PostType,
  Prisma,
  ReportStatus,
  ReportTarget,
} from "@prisma/client";

import { isReportablePostType } from "@/lib/post-type-groups";
import { prisma } from "@/lib/prisma";
import {
  calculateReporterTrustWeight,
  summarizeReportModeration,
} from "@/lib/report-moderation";
import { reportCreateSchema } from "@/lib/validations/report";
import { reportBulkActionSchema } from "@/lib/validations/report-bulk";
import { reportUpdateSchema } from "@/lib/validations/report-update";
import {
  bumpFeedCacheVersion,
  bumpPostCommentsCacheVersion,
  bumpPostDetailCacheVersion,
  bumpSearchCacheVersion,
  bumpSuggestCacheVersion,
} from "@/server/cache/query-cache";
import { hasBlockingRelation } from "@/server/queries/user-relation.queries";
import {
  createModerationActionLogs,
  type ModerationActionLogInput,
} from "@/server/moderation-action-log";
import {
  formatSanctionLevelLabel,
  issueNextUserSanction,
} from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";

async function resolvePostReportTarget(
  tx: Prisma.TransactionClient,
  targetId: string,
) {
  return tx.post.findUnique({
    where: { id: targetId },
    select: { id: true, authorId: true, type: true, status: true },
  });
}

async function resolveCommentReportTarget(
  tx: Prisma.TransactionClient,
  targetId: string,
) {
  return tx.comment.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      authorId: true,
      postId: true,
      status: true,
      content: true,
      post: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
}

function toModerationTargetType(targetType: ReportTarget) {
  return targetType === ReportTarget.POST
    ? ModerationTargetType.POST
    : ModerationTargetType.COMMENT;
}

type ResolvedReportTarget = {
  targetType: ReportTarget;
  targetId: string;
  targetUserId: string;
  postTargetId: string | null;
  commentTargetId: string | null;
  postType?: PostType | null;
};

async function resolveReportTarget(
  tx: Prisma.TransactionClient,
  targetType: ReportTarget,
  targetId: string,
): Promise<ResolvedReportTarget | null> {
  if (targetType === ReportTarget.POST) {
    const targetPost = await resolvePostReportTarget(tx, targetId);
    if (!targetPost || targetPost.status !== PostStatus.ACTIVE) {
      return null;
    }

    return {
      targetType,
      targetId,
      targetUserId: targetPost.authorId,
      postTargetId: targetPost.id,
      commentTargetId: null,
      postType: targetPost.type,
    };
  }

  if (targetType === ReportTarget.COMMENT) {
    const targetComment = await resolveCommentReportTarget(tx, targetId);
    if (
      !targetComment ||
      targetComment.status !== PostStatus.ACTIVE ||
      !targetComment.post ||
      targetComment.post.status !== PostStatus.ACTIVE
    ) {
      return null;
    }

    return {
      targetType,
      targetId,
      targetUserId: targetComment.authorId,
      postTargetId: targetComment.postId,
      commentTargetId: targetComment.id,
      postType: null,
    };
  }

  return null;
}

async function listPendingPostModerationSignals(
  tx: Prisma.TransactionClient,
  targetId: string,
) {
  const reports = await tx.report.findMany({
    where: {
      targetType: ReportTarget.POST,
      targetId,
      status: ReportStatus.PENDING,
    },
    select: {
      reporterId: true,
      createdAt: true,
      reason: true,
      reporter: {
        select: {
          createdAt: true,
          emailVerified: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              sanctionsReceived: true,
            },
          },
        },
      },
    },
  });

  return reports.map((report) => ({
    reporterId: report.reporterId,
    createdAt: report.createdAt,
    reason: report.reason,
    reporterTrustWeight: calculateReporterTrustWeight({
      createdAt: report.reporter.createdAt,
      emailVerified: report.reporter.emailVerified,
      postCount: report.reporter._count.posts,
      commentCount: report.reporter._count.comments,
      sanctionCount: report.reporter._count.sanctionsReceived,
    }),
  }));
}

type BulkSanctionCandidate = {
  reportId: string;
  targetUserId: string;
  targetId: string;
};

async function issueBulkSanctions({
  reports,
  moderatorId,
  resolution,
}: {
  reports: BulkSanctionCandidate[];
  moderatorId: string;
  resolution?: string;
}) {
  const reportsByUser = new Map<
    string,
    { anchorReportId: string; targetId: string; reportCount: number }
  >();

  for (const report of reports) {
    if (report.targetUserId === moderatorId) {
      continue;
    }

    const existing = reportsByUser.get(report.targetUserId);
    if (existing) {
      existing.reportCount += 1;
      continue;
    }

    reportsByUser.set(report.targetUserId, {
      anchorReportId: report.reportId,
      targetId: report.targetId,
      reportCount: 1,
    });
  }

  const sanctionResults = await Promise.all(
    Array.from(reportsByUser.entries()).map(async ([targetUserId, value]) => {
      const sanction = await issueNextUserSanction({
        userId: targetUserId,
        moderatorId,
        reason:
          resolution?.trim() ||
          `신고 ${value.reportCount}건 일괄 승인에 따른 단계적 제재 (대상 ${value.targetId})`,
        sourceReportId: value.anchorReportId,
      });

      return sanction;
    }),
  );

  const appliedSanctions = sanctionResults.filter(
    (result): result is NonNullable<typeof result> => Boolean(result),
  );
  return {
    count: appliedSanctions.length,
    labels: Array.from(
      new Set(appliedSanctions.map((sanction) => formatSanctionLevelLabel(sanction.level))),
    ),
  };
}

type CreateReportParams = {
  reporterId: string;
  input: unknown;
};

export async function createReport({ reporterId, input }: CreateReportParams) {
  const parsed = reportCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("신고 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existing = await prisma.report.findFirst({
    where: {
      reporterId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
    },
  });

  if (existing) {
    throw new ServiceError("이미 신고한 대상입니다.", "DUPLICATE_REPORT", 409);
  }

  let shouldBumpCache = false;
  const report = await prisma.$transaction(async (tx) => {
    const resolvedTarget = await resolveReportTarget(
      tx,
      parsed.data.targetType,
      parsed.data.targetId,
    );

    if (!resolvedTarget) {
      throw new ServiceError("신고 대상을 찾을 수 없습니다.", "REPORT_TARGET_NOT_FOUND", 404);
    }
    if (
      resolvedTarget.targetType === ReportTarget.POST &&
      resolvedTarget.postType &&
      !isReportablePostType(resolvedTarget.postType)
    ) {
      throw new ServiceError(
        "운영 관리 게시글은 신고할 수 없습니다.",
        "REPORT_DISABLED_FOR_POST_TYPE",
        403,
      );
    }
    if (resolvedTarget.targetUserId === reporterId) {
      throw new ServiceError("자기 자신은 신고할 수 없습니다.", "INVALID_TARGET", 400);
    }
    if (await hasBlockingRelation(reporterId, resolvedTarget.targetUserId)) {
      throw new ServiceError(
        "차단 관계에서는 신고를 접수할 수 없습니다.",
        "USER_BLOCK_RELATION",
        403,
      );
    }

    const report = await tx.report.create({
      data: {
        reporterId,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        postTargetId: resolvedTarget.postTargetId,
        commentTargetId: resolvedTarget.commentTargetId,
        targetUserId: resolvedTarget.targetUserId,
        reason: parsed.data.reason,
        description: parsed.data.description,
        status: ReportStatus.PENDING,
      },
    });

    if (parsed.data.targetType === ReportTarget.POST) {
      const moderationSignals = await listPendingPostModerationSignals(tx, parsed.data.targetId);
      const moderationSummary = summarizeReportModeration(moderationSignals);

      if (moderationSummary.shouldAutoHide) {
        await tx.post.update({
          where: { id: parsed.data.targetId },
          data: { status: PostStatus.HIDDEN },
        });
        shouldBumpCache = true;
      }
    }

    return report;
  });
  if (shouldBumpCache) {
    void bumpFeedCacheVersion().catch(() => undefined);
    void bumpPostCommentsCacheVersion().catch(() => undefined);
    void bumpSearchCacheVersion().catch(() => undefined);
    void bumpSuggestCacheVersion().catch(() => undefined);
    void bumpPostDetailCacheVersion().catch(() => undefined);
  }
  return report;
}

type UpdateReportParams = {
  reportId: string;
  input: unknown;
  moderatorId: string;
};

export async function updateReport({
  reportId,
  input,
  moderatorId,
}: UpdateReportParams) {
  const parsed = reportUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("처리 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  let shouldBumpCache = false;
  const transactionResult = await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({
      where: { id: reportId },
      include: {
        post: {
          select: { id: true, authorId: true },
        },
        comment: {
          select: { id: true, authorId: true, postId: true },
        },
      },
    });

    if (!report) {
      throw new ServiceError("신고를 찾을 수 없습니다.", "REPORT_NOT_FOUND", 404);
    }

    if (report.status !== ReportStatus.PENDING) {
      throw new ServiceError("이미 처리된 신고입니다.", "REPORT_ALREADY_PROCESSED", 409);
    }

    const updated = await tx.report.update({
      where: { id: reportId },
      data: {
        status: parsed.data.status,
        resolution: parsed.data.resolution,
        resolvedAt: new Date(),
        resolvedBy: moderatorId,
      },
    });

    await tx.reportAudit.create({
      data: {
        reportId: report.id,
        status: parsed.data.status,
        resolution: parsed.data.resolution,
        resolvedBy: moderatorId,
      },
    });

    const targetUserId =
      report.targetUserId ?? report.post?.authorId ?? report.comment?.authorId ?? null;
    const moderationLogs: ModerationActionLogInput[] = [
      {
        actorId: moderatorId,
        action:
          parsed.data.status === ReportStatus.RESOLVED
            ? ModerationActionType.REPORT_RESOLVED
            : ModerationActionType.REPORT_DISMISSED,
        targetType: toModerationTargetType(report.targetType),
        targetId: report.targetId,
        targetUserId,
        reportId: report.id,
        metadata: {
          resolution: parsed.data.resolution ?? null,
          postId: report.comment?.postId ?? report.post?.id ?? null,
        },
      },
    ];

    if (
      report.targetType === ReportTarget.POST &&
      report.post &&
      parsed.data.status === ReportStatus.DISMISSED
    ) {
      await tx.post.update({
        where: { id: report.targetId },
        data: { status: PostStatus.ACTIVE },
      });
      shouldBumpCache = true;
      moderationLogs.push({
        actorId: moderatorId,
        action: ModerationActionType.TARGET_UNHIDDEN,
        targetType: ModerationTargetType.POST,
        targetId: report.targetId,
        targetUserId,
        reportId: report.id,
        metadata: {
          sourceAction: "DISMISS",
          postId: report.targetId,
        },
      });
    }

    await createModerationActionLogs({
      delegate: tx.moderationActionLog,
      inputs: moderationLogs,
    });

    return {
      updated,
      targetUserId,
    };
  });

  if (
    parsed.data.status === ReportStatus.RESOLVED &&
    parsed.data.applySanction &&
    transactionResult.targetUserId &&
    transactionResult.targetUserId !== moderatorId
  ) {
    const sanction = await issueNextUserSanction({
      userId: transactionResult.targetUserId,
      moderatorId,
      reason:
        parsed.data.resolution?.trim() || "신고 승인에 따른 단계적 제재",
      sourceReportId: reportId,
    });

    if (sanction) {
      return {
        ...transactionResult.updated,
        sanctionLevel: sanction.level,
        sanctionLabel: formatSanctionLevelLabel(sanction.level),
      };
    }
  }

  if (shouldBumpCache) {
    void bumpFeedCacheVersion().catch(() => undefined);
    void bumpPostCommentsCacheVersion().catch(() => undefined);
    void bumpSearchCacheVersion().catch(() => undefined);
    void bumpSuggestCacheVersion().catch(() => undefined);
    void bumpPostDetailCacheVersion().catch(() => undefined);
  }

  return transactionResult.updated;
}

type BulkUpdateReportsParams = {
  input: unknown;
  moderatorId: string;
};

export async function bulkUpdateReports({ input, moderatorId }: BulkUpdateReportsParams) {
  const parsed = reportBulkActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("일괄 처리 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const { reportIds, action, resolution } = parsed.data;
  let shouldBumpCache = false;
  const result = await prisma.$transaction(async (tx) => {
    const reports = await tx.report.findMany({
      where: { id: { in: reportIds } },
      select: {
        id: true,
        status: true,
        targetType: true,
        targetId: true,
        targetUserId: true,
        post: {
          select: { authorId: true },
        },
        comment: {
          select: {
            id: true,
            authorId: true,
            postId: true,
            status: true,
          },
        },
      },
    });

    if (reports.length === 0) {
      throw new ServiceError("처리할 신고가 없습니다.", "REPORT_NOT_FOUND", 404);
    }

    const alreadyProcessed = reports.filter((report) => report.status !== ReportStatus.PENDING);
    if (alreadyProcessed.length > 0) {
      throw new ServiceError("이미 처리된 신고가 포함되어 있습니다.", "REPORT_ALREADY_PROCESSED", 409);
    }

    const unsupportedReports = reports.filter(
      (report) =>
        report.targetType !== ReportTarget.POST &&
        report.targetType !== ReportTarget.COMMENT,
    );
    if (unsupportedReports.length > 0) {
      throw new ServiceError(
        "현재 운영 범위 밖의 신고 대상이 포함되어 있습니다.",
        "UNSUPPORTED_REPORT_TARGET",
        409,
      );
    }

    const now = new Date();
    const status =
      action === "RESOLVE" || action === "HIDE_TARGET"
        ? ReportStatus.RESOLVED
        : ReportStatus.DISMISSED;

    await tx.report.updateMany({
      where: { id: { in: reportIds } },
      data: {
        status,
        resolution,
        resolvedAt: now,
        resolvedBy: moderatorId,
      },
    });

    await tx.reportAudit.createMany({
      data: reports.map((report) => ({
        reportId: report.id,
        status,
        resolution,
        resolvedBy: moderatorId,
      })),
    });

    const moderationLogs: ModerationActionLogInput[] = reports.flatMap((report) => {
      const targetType = toModerationTargetType(report.targetType);
      const targetUserId =
        report.targetUserId ?? report.post?.authorId ?? report.comment?.authorId ?? null;
      const postId =
        report.comment?.postId ??
        (report.targetType === ReportTarget.POST ? report.targetId : null);
      const entries: ModerationActionLogInput[] = [
        {
          actorId: moderatorId,
          action:
            status === ReportStatus.RESOLVED
              ? ModerationActionType.REPORT_RESOLVED
              : ModerationActionType.REPORT_DISMISSED,
          targetType,
          targetId: report.targetId,
          targetUserId,
          reportId: report.id,
          metadata: {
            bulk: true,
            sourceAction: action,
            resolution: resolution ?? null,
            postId,
          },
        },
      ];

      if (action === "HIDE_TARGET") {
        entries.push({
          actorId: moderatorId,
          action: ModerationActionType.TARGET_HIDDEN,
          targetType,
          targetId: report.targetId,
          targetUserId,
          reportId: report.id,
          metadata: {
            bulk: true,
            sourceAction: action,
            resolution: resolution ?? null,
            postId,
          },
        });
      }

      if (
        action === "UNHIDE_TARGET" ||
        (action === "DISMISS" && report.targetType === ReportTarget.POST)
      ) {
        entries.push({
          actorId: moderatorId,
          action: ModerationActionType.TARGET_UNHIDDEN,
          targetType,
          targetId: report.targetId,
          targetUserId,
          reportId: report.id,
          metadata: {
            bulk: true,
            sourceAction: action,
            resolution: resolution ?? null,
            postId,
          },
        });
      }

      return entries;
    });

    const postTargetIds = reports
      .filter((report) => report.targetType === ReportTarget.POST)
      .map((report) => report.targetId);
    const commentTargets = reports.flatMap((report) =>
      report.targetType === ReportTarget.COMMENT && report.comment ? [report.comment] : [],
    );

    if (postTargetIds.length > 0) {
      if (action === "HIDE_TARGET") {
        await tx.post.updateMany({
          where: { id: { in: postTargetIds } },
          data: { status: PostStatus.HIDDEN },
        });
      }

      if (action === "UNHIDE_TARGET" || action === "DISMISS") {
        await tx.post.updateMany({
          where: { id: { in: postTargetIds } },
          data: { status: PostStatus.ACTIVE },
        });
      }

      if (action === "HIDE_TARGET" || action === "UNHIDE_TARGET" || action === "DISMISS") {
        shouldBumpCache = true;
      }
    }

    if (commentTargets.length > 0 && (action === "HIDE_TARGET" || action === "UNHIDE_TARGET")) {
      const commentIds = commentTargets.map((comment) => comment.id);
      await tx.comment.updateMany({
        where: { id: { in: commentIds } },
        data: {
          status: action === "HIDE_TARGET" ? PostStatus.DELETED : PostStatus.ACTIVE,
        },
      });

      const affectedPostIds = Array.from(new Set(commentTargets.map((comment) => comment.postId)));
      const activeComments = await tx.comment.findMany({
        where: {
          postId: { in: affectedPostIds },
          status: PostStatus.ACTIVE,
        },
        select: {
          postId: true,
        },
      });
      const activeCountByPostId = new Map<string, number>();
      for (const postId of affectedPostIds) {
        activeCountByPostId.set(postId, 0);
      }
      for (const comment of activeComments) {
        activeCountByPostId.set(comment.postId, (activeCountByPostId.get(comment.postId) ?? 0) + 1);
      }

      await Promise.all(
        affectedPostIds.map((postId) =>
          tx.post.update({
            where: { id: postId },
            data: {
              commentCount: activeCountByPostId.get(postId) ?? 0,
            },
          }),
        ),
      );
      shouldBumpCache = true;
    }

    await createModerationActionLogs({
      delegate: tx.moderationActionLog,
      inputs: moderationLogs,
    });

    return {
      count: reports.length,
      status,
      sanctionCandidates: reports
        .map((report) => ({
          reportId: report.id,
          targetId: report.targetId,
          targetUserId: report.targetUserId ?? report.post?.authorId ?? report.comment?.authorId ?? "",
        }))
        .filter((report): report is BulkSanctionCandidate => Boolean(report.targetUserId)),
    };
  });

  let sanctionSummary: { count: number; labels: string[] } | undefined;
  if (action === "RESOLVE" && parsed.data.applySanction) {
    sanctionSummary = await issueBulkSanctions({
      reports: result.sanctionCandidates,
      moderatorId,
      resolution,
    });
  }

  if (shouldBumpCache) {
    void bumpFeedCacheVersion().catch(() => undefined);
    void bumpPostCommentsCacheVersion().catch(() => undefined);
    void bumpSearchCacheVersion().catch(() => undefined);
    void bumpSuggestCacheVersion().catch(() => undefined);
    void bumpPostDetailCacheVersion().catch(() => undefined);
  }

  return {
    count: result.count,
    status: result.status,
    sanctionCount: sanctionSummary?.count ?? 0,
    sanctionLabels: sanctionSummary?.labels ?? [],
  };
}
