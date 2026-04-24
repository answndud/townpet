import Link from "next/link";
import { ReportStatus } from "@prisma/client";

import { ReportActions } from "@/components/admin/report-actions";
import { getReportReasonLabel } from "@/lib/report-reason";
import { getReportTargetLabel, isSupportedReportTarget } from "@/lib/report-target";
import { requireModeratorPageUser } from "@/server/admin-page-access";
import { listReportAudits } from "@/server/queries/report-audit.queries";
import { getReportById } from "@/server/queries/report.queries";
import { listUsersByIds } from "@/server/queries/user.queries";

type ReportDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ q?: string; order?: string }>;
};

const statusLabels: Record<ReportStatus, string> = {
  PENDING: "대기",
  RESOLVED: "승인",
  DISMISSED: "기각",
};

export default async function ReportDetailPage({ params, searchParams }: ReportDetailPageProps) {
  await requireModeratorPageUser();

  const resolvedParams = await params;
  const reportId = resolvedParams.id;
  const report = await getReportById(reportId);

  if (!report) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-10 sm:px-6">
          <p className="text-sm text-[#4f678d]">신고를 찾을 수 없습니다.</p>
          <Link href="/admin/reports" className="text-xs text-[#5a7398]">
            신고 큐로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const query = resolvedSearchParams.q?.trim() ?? "";
  const order = resolvedSearchParams.order === "asc" ? "asc" : "desc";
  const audits = await listReportAudits({
    reportId: report.id,
    query: query || undefined,
    order,
  });

  const targetUserIds =
    report.targetUserId && !report.post ? [report.targetUserId] : [];
  const targetUsers = await listUsersByIds(targetUserIds);
  const targetUser = targetUsers[0];

  const resolverIds = report.resolvedBy ? [report.resolvedBy] : [];
  const resolvers = await listUsersByIds(resolverIds);
  const resolver = resolvers[0];

  const formatDateTime = (date: Date | null) =>
    date ? date.toLocaleString("ko-KR") : "-";

  const statusBadgeClass =
    report.status === ReportStatus.PENDING
      ? "border-amber-300 bg-amber-50 text-amber-700"
      : report.status === ReportStatus.RESOLVED
        ? "border-[#3567b5] bg-[#3567b5] text-white"
        : "border-rose-300 bg-rose-50 text-rose-700";

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
              신고 상세
            </h1>
            <p className="mt-2 text-sm text-[#4f678d]">
              신고 대상, 사유, 처리 이력을 확인하고 판정합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-lg border px-3 py-1.5 font-semibold ${statusBadgeClass}`}>
              {statusLabels[report.status]}
            </span>
            <span className="rounded-lg border border-[#d8e4f6] bg-white px-3 py-1.5 text-[#355988]">
              {getReportTargetLabel(report.targetType)}
            </span>
            <span className="rounded-lg border border-[#d8e4f6] bg-white px-3 py-1.5 text-[#355988]">
              {formatDateTime(report.createdAt)}
            </span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <section className="tp-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#5b78a1]">신고 개요</p>
                  <h2 className="mt-2 text-lg font-semibold text-[#153a6a]">
                    {getReportReasonLabel(report.reason)}
                  </h2>
                </div>
                <Link href="/admin/reports" className="tp-btn-soft tp-btn-xs">
                  큐로 돌아가기
                </Link>
              </div>

              <dl className="mt-5 grid gap-3 text-sm text-[#355988] sm:grid-cols-2">
                <div className="rounded-lg border border-[#d8e4f6] bg-[#f8fbff] p-3">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-[#5b78a1]">신고 ID</dt>
                  <dd className="mt-1 break-all font-semibold text-[#163462]">{report.id}</dd>
                </div>
                <div className="rounded-lg border border-[#d8e4f6] bg-[#f8fbff] p-3">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-[#5b78a1]">신고자</dt>
                  <dd className="mt-1 font-semibold text-[#163462]">
                    {report.reporter.nickname ?? report.reporter.email}
                  </dd>
                </div>
                <div className="rounded-lg border border-[#d8e4f6] bg-white p-3">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-[#5b78a1]">대상 ID</dt>
                  <dd className="mt-1 break-all text-[#355988]">{report.targetId}</dd>
                </div>
                <div className="rounded-lg border border-[#d8e4f6] bg-white p-3">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-[#5b78a1]">처리 시간</dt>
                  <dd className="mt-1 text-[#355988]">{formatDateTime(report.resolvedAt)}</dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-[#e1e9f5] pt-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">신고 설명</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#355988]">
                  {report.description ?? "신고자가 추가 설명을 남기지 않았습니다."}
                </p>
              </div>
            </section>

            <section className="tp-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[#153a6a]">대상 정보</h2>
              <div className="mt-4 text-sm text-[#355988]">
                {report.post ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-[#d8e4f6] bg-[#f8fbff] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-[#cbdcf5] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
                        게시글
                      </span>
                      <span className="rounded-md border border-[#cbdcf5] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
                        {report.post.status}
                      </span>
                    </div>
                    <Link href={`/posts/${report.post.id}`} className="font-semibold text-[#163462] hover:text-[#2f5da4]">
                      {report.post.title}
                    </Link>
                    <span className="text-xs text-[#5a7398]">게시글로 이동</span>
                  </div>
                ) : report.comment ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-[#d8e4f6] bg-[#f8fbff] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-[#cbdcf5] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
                        댓글
                      </span>
                      <span className="rounded-md border border-[#cbdcf5] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
                        {report.comment.status}
                      </span>
                    </div>
                    <p className="font-semibold text-[#163462]">{report.comment.content}</p>
                    {report.comment.post ? (
                      <Link
                        href={`/posts/${report.comment.post.id}#comment-${report.comment.id}`}
                        className="text-xs text-[#5a7398] hover:text-[#2f5da4]"
                      >
                        상위 게시글: {report.comment.post.title}
                      </Link>
                    ) : null}
                  </div>
                ) : !isSupportedReportTarget(report.targetType) && targetUser ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-[#d8e4f6] bg-[#f8fbff] p-4">
                    <span className="w-fit rounded-md border border-[#cbdcf5] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
                      legacy 대상
                    </span>
                    <span className="text-sm font-semibold text-[#163462]">
                      {targetUser.nickname ?? targetUser.email}
                    </span>
                    <span className="text-xs text-[#5a7398]">현재 운영 범위 밖의 신고 대상입니다.</span>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#d8e4f6] bg-[#f8fbff] p-4">
                    현재 운영 범위 밖의 신고 대상입니다.
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="tp-card h-fit p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#153a6a]">처리 작업</h2>
              <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass}`}>
                {statusLabels[report.status]}
              </span>
            </div>
            <p className="mt-2 text-xs leading-6 text-[#5a7398]">
              승인하면 단계적 제재를 함께 적용할 수 있습니다. 기각은 신고만 닫습니다.
            </p>
            <div className="mt-4">
              <ReportActions
                reportId={report.id}
                status={report.status}
                redirectTo="/admin/reports?updated=1"
              />
            </div>
            <dl className="mt-5 grid gap-2 border-t border-[#e1e9f5] pt-4 text-xs text-[#4f678d]">
              <div className="flex items-center justify-between gap-3">
                <dt>처리자</dt>
                <dd className="text-right font-semibold text-[#163462]">
                  {resolver?.nickname ?? resolver?.email ?? report.resolvedBy ?? "-"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt>처리 메모</dt>
                <dd className="max-w-[220px] text-right text-[#355988]">{report.resolution ?? "미처리"}</dd>
              </div>
            </dl>
          </aside>
        </div>

        <section className="tp-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">처리 이력</h2>
          <form className="mt-4 flex flex-wrap items-center gap-2 text-xs" action="">
            <input
              name="q"
              defaultValue={query}
              placeholder="처리자/메모/ID 검색"
              className="tp-input-soft w-full max-w-xs bg-white px-3 py-2 text-xs"
            />
            <select
              name="order"
              defaultValue={order}
              className="tp-btn-soft px-3 py-2 text-xs"
            >
              <option value="desc">최신순</option>
              <option value="asc">오래된순</option>
            </select>
            <button
              type="submit"
              className="border border-[#3567b5] bg-[#3567b5] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
            >
              검색
            </button>
            {query ? (
              <Link href={`/admin/reports/${reportId}`} className="text-xs text-[#5a7398]">
                초기화
              </Link>
            ) : null}
          </form>

          <div className="mt-4 text-sm text-[#355988]">
            {audits.length > 0 ? (
              <div className="flex flex-col gap-3">
                {audits.map((audit) => (
                  <div key={audit.id} className="rounded-lg border border-[#dbe6f6] bg-[#f8fbff] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                          audit.status === ReportStatus.PENDING
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : audit.status === ReportStatus.RESOLVED
                              ? "border-[#3567b5] bg-[#3567b5] text-white"
                              : "border-rose-300 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {statusLabels[audit.status]}
                      </span>
                      <span>{audit.resolution ?? "메모 없음"}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#5a7398]">
                      <span>
                        {audit.resolver?.nickname ??
                          audit.resolver?.email ??
                          audit.resolvedBy ??
                          "-"}
                      </span>
                      <span>{formatDateTime(audit.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[#5a7398]">이력 없음</span>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
