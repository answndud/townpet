import Link from "next/link";
import { ReportReason, ReportStatus, ReportTarget } from "@prisma/client";

import { ReportQueueTable } from "@/components/admin/report-queue-table";
import { buildPaginationWindow, parsePositivePage } from "@/lib/pagination";
import {
  calculateReporterTrustWeight,
  getReportQueuePriorityLabel,
  getReportQueuePriorityOrder,
  summarizeReportModeration,
} from "@/lib/report-moderation";
import { getReportReasonLabel, reportReasonOptions } from "@/lib/report-reason";
import { ReportUpdateBanner } from "@/components/admin/report-update-banner";
import {
  SUPPORTED_REPORT_TARGETS,
  getReportTargetLabel,
  isSupportedReportTarget,
} from "@/lib/report-target";
import { requireModeratorPageUser } from "@/server/admin-page-access";
import { listReportAuditsByReportIds } from "@/server/queries/report-audit.queries";
import { getReportStats, listReportsPage } from "@/server/queries/report.queries";
import { listRecentSanctions } from "@/server/queries/sanction.queries";
import { listUsersByIds } from "@/server/queries/user.queries";
import { formatSanctionLevelLabel } from "@/server/services/sanction.service";

type ReportsPageProps = {
  searchParams?: Promise<{ status?: string; target?: string; updated?: string; page?: string }>;
};

const statusLabels: Record<ReportStatus, string> = {
  PENDING: "대기",
  RESOLVED: "승인",
  DISMISSED: "기각",
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireModeratorPageUser();

  const resolvedParams = (await searchParams) ?? {};
  const statusParam = resolvedParams.status ?? ReportStatus.PENDING;
  const status =
    statusParam === "ALL" || Object.values(ReportStatus).includes(statusParam as ReportStatus)
      ? (statusParam as ReportStatus | "ALL")
      : ReportStatus.PENDING;
  const targetParam = resolvedParams.target ?? "ALL";
  const targetType =
    targetParam === "ALL" || isSupportedReportTarget(targetParam)
      ? (targetParam as ReportTarget | "ALL")
      : "ALL";
  const showUpdated = resolvedParams.updated === "1";
  const currentPage = parsePositivePage(resolvedParams.page);

  const [reportPage, stats, sanctions] = await Promise.all([
    listReportsPage({ status, targetType, page: currentPage }),
    getReportStats(7),
    listRecentSanctions(15),
  ]);

  const reportIds = reportPage.items.map((report) => report.id);
  const audits = await listReportAuditsByReportIds(reportIds);
  const auditMap = new Map<string, typeof audits>();
  for (const audit of audits) {
    const existing = auditMap.get(audit.reportId) ?? [];
    existing.push(audit);
    auditMap.set(audit.reportId, existing);
  }

  const resolvedByIds = Array.from(
    new Set(
      reportPage.items
        .map((report) => report.resolvedBy)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const resolvers = await listUsersByIds(resolvedByIds);
  const resolverMap = new Map(resolvers.map((resolver) => [resolver.id, resolver]));

  const formatResolvedAt = (date: Date | null) =>
    date ? date.toLocaleString("ko-KR") : "-";

  const moderationMap = new Map<
    string,
    ReturnType<typeof summarizeReportModeration>
  >();
  const moderationSignalsByTarget = new Map<
    string,
    Array<{
      reporterId: string;
      createdAt: Date;
      reason: ReportReason;
      reporterTrustWeight: number;
    }>
  >();
  for (const report of reportPage.items) {
    const key = `${report.targetType}:${report.targetId}`;
    const existingSignals = moderationSignalsByTarget.get(key) ?? [];
    existingSignals.push({
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
    });
    moderationSignalsByTarget.set(key, existingSignals);
  }

  for (const [key, signals] of moderationSignalsByTarget.entries()) {
    moderationMap.set(key, summarizeReportModeration(signals));
  }

  const reportRows = reportPage.items
    .map((report) => {
      const moderationKey = `${report.targetType}:${report.targetId}`;
      const moderation =
        moderationMap.get(moderationKey) ?? summarizeReportModeration([]);
      const targetTitle =
        report.targetType === ReportTarget.COMMENT
          ? report.comment?.content?.slice(0, 60) || report.targetId
          : report.post?.title ?? report.targetId;
      const targetHref =
        report.targetType === ReportTarget.COMMENT
          ? report.comment?.postId
            ? `/posts/${report.comment.postId}#comment-${report.comment.id}`
            : undefined
          : report.post
            ? `/posts/${report.post.id}`
            : undefined;

      const auditsForReport = auditMap.get(report.id) ?? [];

      return {
        id: report.id,
        targetType: report.targetType,
        targetTitle,
        targetHref,
        status: report.status,
        reason: getReportReasonLabel(report.reason),
        description: report.description ?? null,
        reporterLabel: report.reporter.nickname ?? report.reporter.email,
        resolution: report.resolution ?? null,
        resolvedByLabel: report.resolvedBy
          ? resolverMap.get(report.resolvedBy)?.nickname ??
            resolverMap.get(report.resolvedBy)?.email ??
            report.resolvedBy
          : null,
        resolvedAtLabel: formatResolvedAt(report.resolvedAt),
        priority: moderation.priority,
        priorityLabel: getReportQueuePriorityLabel(moderation.priority),
        signalSummary: moderation.signalLabels,
        weightedScoreLabel: moderation.weightedScore.toFixed(2),
        createdAtMs: report.createdAt.getTime(),
        audits: auditsForReport.map((audit) => ({
          id: audit.id,
          status: audit.status,
          resolution: audit.resolution ?? null,
          resolverLabel:
            audit.resolver?.nickname ??
            audit.resolver?.email ??
            audit.resolvedBy ??
            "-",
          createdAt: formatResolvedAt(audit.createdAt),
        })),
      };
    })
    .sort((left, right) => {
      const priorityDiff =
        getReportQueuePriorityOrder(right.priority) -
        getReportQueuePriorityOrder(left.priority);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return right.createdAtMs - left.createdAtMs;
    });

  const moderationSummaries = Array.from(moderationMap.values());
  const criticalPendingCount = moderationSummaries.filter(
    (summary) => summary.priority === "CRITICAL",
  ).length;
  const highPendingCount = moderationSummaries.filter(
    (summary) => summary.priority === "HIGH",
  ).length;

  const buildLink = (
    nextStatus: ReportStatus | "ALL",
    nextTarget: ReportTarget | "ALL",
    nextPage = 1,
  ) => {
    const params = new URLSearchParams();
    params.set("status", nextStatus);
    if (nextTarget !== "ALL") {
      params.set("target", nextTarget);
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    return `/admin/reports?${params.toString()}`;
  };

  const averageResolutionLabel = stats.averageResolutionHours
    ? `${stats.averageResolutionHours.toFixed(1)}시간`
    : "-";

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
              신고 큐
            </h1>
            <p className="mt-2 text-sm text-[#4f678d]">
              대기 신고를 우선순위와 대상별로 빠르게 판정합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:min-w-[520px]">
            <div className="rounded-lg border border-[#d8e4f6] bg-white px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b78a1]">대기</p>
              <p className="mt-1 text-lg font-bold text-[#10284a]">
                {stats.statusCounts[ReportStatus.PENDING]}
              </p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-rose-700">긴급</p>
              <p className="mt-1 text-lg font-bold text-rose-800">{criticalPendingCount}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-700">높음</p>
              <p className="mt-1 text-lg font-bold text-amber-800">{highPendingCount}</p>
            </div>
            <div className="rounded-lg border border-[#d8e4f6] bg-white px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b78a1]">평균</p>
              <p className="mt-1 text-lg font-bold text-[#10284a]">{averageResolutionLabel}</p>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/ops">Ops 대시보드</Link>
          <Link href="/admin/moderation-logs">모더레이션 로그</Link>
          <Link href="/admin/moderation/direct">직접 모더레이션</Link>
          <Link href="/admin/hospital-review-flags">병원 후기 의심 신호</Link>
          <Link href="/admin/auth-audits">인증 감사 로그</Link>
        </div>

        {showUpdated ? (
          <ReportUpdateBanner message="신고 처리 결과가 반영되었습니다." />
        ) : null}

        <section className="tp-card flex flex-col gap-3 p-4 text-xs text-[#4f678d]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              상태 필터
            </span>
            {["ALL", ...Object.values(ReportStatus)].map((value) => (
              <Link
                key={value}
                href={buildLink(value as ReportStatus | "ALL", targetType, 1)}
                className={`inline-flex min-h-9 items-center rounded-lg border px-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bb8ff] ${
                  status === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                {value === "ALL" ? "전체" : statusLabels[value as ReportStatus]}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              타입 필터
            </span>
            {["ALL", ...SUPPORTED_REPORT_TARGETS].map((value) => (
              <Link
                key={value}
                href={buildLink(status, value as ReportTarget | "ALL", 1)}
                className={`inline-flex min-h-9 items-center rounded-lg border px-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bb8ff] ${
                  targetType === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                {value === "ALL" ? "전체" : getReportTargetLabel(value)}
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#5a7398]">
          <span>
            페이지 {reportPage.page} / {reportPage.totalPages} · 현재 {reportRows.length}건 표시 · 누적{" "}
            {reportPage.totalCount}건
          </span>
          {reportPage.totalPages > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={buildLink(status, targetType, Math.max(1, reportPage.page - 1))}
                aria-disabled={reportPage.page <= 1}
                className={`inline-flex items-center rounded-lg ${
                  reportPage.page <= 1 ? "tp-btn-disabled pointer-events-none" : "tp-btn-soft"
                } tp-btn-xs transition`}
              >
                이전
              </Link>
              {buildPaginationWindow(reportPage.page, reportPage.totalPages).map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={buildLink(status, targetType, pageNumber)}
                  className={`inline-flex min-w-8 items-center justify-center rounded-lg ${
                    pageNumber === reportPage.page ? "tp-btn-primary" : "tp-btn-soft"
                  } tp-btn-xs transition`}
                >
                  {pageNumber}
                </Link>
              ))}
              <Link
                href={buildLink(
                  status,
                  targetType,
                  Math.min(reportPage.totalPages, reportPage.page + 1),
                )}
                aria-disabled={reportPage.page >= reportPage.totalPages}
                className={`inline-flex items-center rounded-lg ${
                  reportPage.page >= reportPage.totalPages
                    ? "tp-btn-disabled pointer-events-none"
                    : "tp-btn-soft"
                } tp-btn-xs transition`}
              >
                다음
              </Link>
            </div>
          ) : null}
        </section>

        <ReportQueueTable reports={reportRows} />

        <section className="tp-card p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">처리 상태</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-[#5a7398]">전체</dt>
                  <dd className="mt-1 text-lg font-bold text-[#10284a]">{stats.totalCount}</dd>
                </div>
                <div>
                  <dt className="text-[#5a7398]">승인</dt>
                  <dd className="mt-1 text-lg font-bold text-[#10284a]">
                    {stats.statusCounts[ReportStatus.RESOLVED]}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#5a7398]">기각</dt>
                  <dd className="mt-1 text-lg font-bold text-[#10284a]">
                    {stats.statusCounts[ReportStatus.DISMISSED]}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="border-t border-[#e1e9f5] pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">사유 분포</p>
              <div className="mt-2 flex flex-col gap-1.5 text-xs text-[#4f678d]">
              {reportReasonOptions.map((reason) => (
                <div key={reason} className="flex items-center justify-between">
                  <span>{getReportReasonLabel(reason)}</span>
                  <span className="font-semibold text-[#163462]">
                    {stats.reasonCounts[reason]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[#e1e9f5] pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">대상 분포</p>
            <div className="mt-2 flex flex-col gap-1.5 text-xs text-[#4f678d]">
              {Object.entries(stats.targetCounts).map(([target, count]) => (
                isSupportedReportTarget(target) ? (
                  <div key={target} className="flex items-center justify-between">
                    <span>{getReportTargetLabel(target)}</span>
                    <span className="font-semibold text-[#163462]">{count}</span>
                  </div>
                ) : null
              ))}
            </div>
          </div>
          <div className="border-t border-[#e1e9f5] pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">
              최근 {stats.dailyCounts.length}일
            </p>
            <div className="mt-2 flex flex-col gap-1.5 text-xs text-[#4f678d]">
              {stats.dailyCounts.map((entry) => (
                <div key={entry.date} className="flex items-center justify-between">
                  <span>{entry.date.slice(5)}</span>
                  <span className="font-semibold text-[#163462]">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
          </div>
        </section>

        <section className="tp-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#153a6a]">최근 제재 이력</h2>
            <span className="text-[11px] text-[#5a7398]">
              단계적 제재 흐름: 경고 → 7일 정지 → 30일 정지 → 영구 정지
            </span>
          </div>
          {sanctions.length === 0 ? (
            <p className="mt-3 text-xs text-[#5a7398]">아직 기록된 제재가 없습니다.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-[#f6f9ff] text-[10px] uppercase tracking-[0.16em] text-[#5b78a1]">
                  <tr>
                    <th className="px-3 py-2">대상 사용자</th>
                    <th className="px-3 py-2">제재 단계</th>
                    <th className="px-3 py-2">사유</th>
                    <th className="px-3 py-2">처리자</th>
                    <th className="px-3 py-2">신고 ID</th>
                    <th className="px-3 py-2">만료</th>
                    <th className="px-3 py-2">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {sanctions.map((sanction) => (
                    <tr key={sanction.id} className="border-t border-[#e1e9f5] text-[#27466f]">
                      <td className="px-3 py-2">
                        {sanction.user.nickname ?? sanction.user.email}
                      </td>
                      <td className="px-3 py-2 font-semibold text-[#163462]">
                        {formatSanctionLevelLabel(sanction.level)}
                      </td>
                      <td className="max-w-[260px] truncate px-3 py-2" title={sanction.reason}>
                        {sanction.reason}
                      </td>
                      <td className="px-3 py-2">
                        {sanction.moderator.nickname ?? sanction.moderator.email}
                      </td>
                      <td className="px-3 py-2">
                        {sanction.sourceReportId ? (
                          <Link
                            href={`/admin/reports/${sanction.sourceReportId}`}
                            className="text-[#2f5da4] hover:underline"
                          >
                            {sanction.sourceReportId}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {sanction.expiresAt
                          ? sanction.expiresAt.toLocaleString("ko-KR")
                          : "없음"}
                      </td>
                      <td className="px-3 py-2">{sanction.createdAt.toLocaleString("ko-KR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/ops">Ops 대시보드</Link>
          <Link href="/admin/breeds">품종 사전</Link>
          <Link href="/admin/policies">운영 정책 설정</Link>
          <Link href="/admin/moderation-logs">모더레이션 로그</Link>
          <Link href="/admin/auth-audits">인증 로그</Link>
          <Link href="/admin/personalization">개인화 지표</Link>
        </div>
      </main>
    </div>
  );
}
