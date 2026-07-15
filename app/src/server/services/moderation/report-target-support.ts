import {
  ModerationTargetType,
  PostStatus,
  PostType,
  Prisma,
  ReportStatus,
  ReportTarget,
} from "@prisma/client";

import { calculateReporterTrustWeight } from "@/lib/report-moderation";
import {
  formatSanctionLevelLabel,
  issueNextUserSanction,
} from "@/server/services/sanction.service";

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
      post: { select: { id: true, status: true } },
    },
  });
}

export function toModerationTargetType(targetType: ReportTarget) {
  return targetType === ReportTarget.POST
    ? ModerationTargetType.POST
    : ModerationTargetType.COMMENT;
}

export type ResolvedReportTarget = {
  targetType: ReportTarget;
  targetId: string;
  targetUserId: string;
  postTargetId: string | null;
  commentTargetId: string | null;
  postType?: PostType | null;
};

export async function resolveReportTarget(
  tx: Prisma.TransactionClient,
  targetType: ReportTarget,
  targetId: string,
): Promise<ResolvedReportTarget | null> {
  if (targetType === ReportTarget.POST) {
    const targetPost = await resolvePostReportTarget(tx, targetId);
    if (!targetPost || targetPost.status !== PostStatus.ACTIVE) return null;
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
    ) return null;

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

export async function listPendingPostModerationSignals(
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
          _count: { select: { posts: true, comments: true, sanctionsReceived: true } },
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

export type BulkSanctionCandidate = {
  reportId: string;
  targetUserId: string;
  targetId: string;
};

export async function issueBulkSanctions({
  reports,
  moderatorId,
  resolution,
}: {
  reports: BulkSanctionCandidate[];
  moderatorId: string;
  resolution?: string;
}) {
  const reportsByUser = new Map<string, { anchorReportId: string; targetId: string; reportCount: number }>();

  for (const report of reports) {
    if (report.targetUserId === moderatorId) continue;
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
    Array.from(reportsByUser.entries()).map(async ([targetUserId, value]) =>
      issueNextUserSanction({
        userId: targetUserId,
        moderatorId,
        reason:
          resolution?.trim() ||
          `신고 ${value.reportCount}건 일괄 승인에 따른 단계적 제재 (대상 ${value.targetId})`,
        sourceReportId: value.anchorReportId,
      }),
    ),
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
