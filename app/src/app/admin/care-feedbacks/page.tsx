import Link from "next/link";
import {
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  CareFeedbackReviewStatus,
  CareRequestStatus,
} from "@prisma/client";

import { updateCareFeedbackReviewAction } from "@/server/actions/post";
import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { CompactPagination } from "@/components/ui/compact-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { createNoIndexPageMetadata } from "@/lib/page-metadata";
import { parsePositivePage } from "@/lib/pagination";
import { requireModeratorPageUser } from "@/server/admin-page-access";
import {
  getCareFeedbackIssueStats,
  listCareFeedbackIssueQueue,
} from "@/server/queries/care-feedback.queries";

export const metadata = createNoIndexPageMetadata({
  title: "돌봄 이슈 신호",
  description: "TownPet 돌봄 완료 피드백과 운영 이슈 신호를 검토합니다.",
  path: "/admin/care-feedbacks",
});

type CareFeedbacksPageProps = {
  searchParams?: Promise<{
    issueType?: string;
    outcome?: string;
    reviewStatus?: string;
    page?: string;
  }>;
};

const issueTypeLabels: Record<CareFeedbackIssueType, string> = {
  NONE: "이슈 없음",
  NO_SHOW: "노쇼/불참",
  SAFETY: "안전 우려",
  PAYMENT_OR_FRAUD: "사기/금전 요구",
  PRIVACY: "개인정보 문제",
  OTHER: "기타",
};

const outcomeLabels: Record<CareFeedbackOutcome, string> = {
  POSITIVE: "좋았어요",
  NEUTRAL: "보통이에요",
  ISSUE: "확인이 필요해요",
};

const reviewStatusLabels: Record<CareFeedbackReviewStatus, string> = {
  PENDING: "대기",
  REVIEWING: "검토중",
  RESOLVED: "해결",
  DISMISSED: "종료",
};

const careRequestStatusLabels: Record<CareRequestStatus, string> = {
  OPEN: "모집중",
  MATCHED: "매칭",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
  CANCELLED: "취소",
};

function formatDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString("ko-KR") : "-";
}

function formatUserLabel(user: { email?: string | null; nickname?: string | null } | null | undefined) {
  return user?.nickname ?? user?.email ?? "-";
}

export default async function CareFeedbacksPage({ searchParams }: CareFeedbacksPageProps) {
  const user = await requireModeratorPageUser();
  const resolvedParams = (await searchParams) ?? {};
  const issueTypeParam = resolvedParams.issueType ?? "ALL";
  const outcomeParam = resolvedParams.outcome ?? "ALL";
  const reviewStatusParam = resolvedParams.reviewStatus ?? "ALL";
  const issueType =
    issueTypeParam === "ALL" ||
    Object.values(CareFeedbackIssueType).includes(issueTypeParam as CareFeedbackIssueType)
      ? (issueTypeParam as CareFeedbackIssueType | "ALL")
      : "ALL";
  const outcome =
    outcomeParam === "ALL" ||
    Object.values(CareFeedbackOutcome).includes(outcomeParam as CareFeedbackOutcome)
      ? (outcomeParam as CareFeedbackOutcome | "ALL")
      : "ALL";
  const reviewStatus =
    reviewStatusParam === "ALL" ||
    Object.values(CareFeedbackReviewStatus).includes(reviewStatusParam as CareFeedbackReviewStatus)
      ? (reviewStatusParam as CareFeedbackReviewStatus | "ALL")
      : "ALL";
  const currentPage = parsePositivePage(resolvedParams.page);

  const [feedbackPage, stats] = await Promise.all([
    listCareFeedbackIssueQueue({ issueType, outcome, reviewStatus, page: currentPage }),
    getCareFeedbackIssueStats(),
  ]);
  const hasActiveFilter = issueType !== "ALL" || outcome !== "ALL" || reviewStatus !== "ALL";
  const emptyStateCopy = hasActiveFilter
    ? {
        title: "현재 조건에 맞는 신호가 없습니다",
        description: "필터를 줄이거나 전체 상태로 돌아가 다른 돌봄 이슈 신호를 확인하세요.",
      }
    : {
        title: "돌봄 이슈 신호가 없습니다",
        description: "완료 피드백에서 이슈가 선택되면 이 큐에 표시됩니다.",
      };

  const buildLink = (
    nextIssueType: CareFeedbackIssueType | "ALL",
    nextOutcome: CareFeedbackOutcome | "ALL",
    nextReviewStatus: CareFeedbackReviewStatus | "ALL",
    nextPage = 1,
  ) => {
    const params = new URLSearchParams();
    if (nextIssueType !== "ALL") {
      params.set("issueType", nextIssueType);
    }
    if (nextOutcome !== "ALL") {
      params.set("outcome", nextOutcome);
    }
    if (nextReviewStatus !== "ALL") {
      params.set("reviewStatus", nextReviewStatus);
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    const serialized = params.toString();
    return serialized ? `/admin/care-feedbacks?${serialized}` : "/admin/care-feedbacks";
  };

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
              돌봄 이슈 신호
            </h1>
            <p className="mt-2 text-sm text-[#4f678d]">
              완료 피드백의 비공개 이슈 신호를 확인합니다. 신고 큐와 분리해 자동 제재 없이 검토합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:min-w-[560px]">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-700">전체</p>
              <p className="mt-1 text-lg font-bold text-amber-900">{stats.totalCount}</p>
            </div>
            <div className="rounded-lg border border-[#d8e4f6] bg-white px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b78a1]">대기</p>
              <p className="mt-1 text-lg font-bold text-[#10284a]">
                {stats.reviewStatusCounts[CareFeedbackReviewStatus.PENDING]}
              </p>
            </div>
            {[
              CareFeedbackIssueType.NO_SHOW,
              CareFeedbackIssueType.SAFETY,
              CareFeedbackIssueType.PAYMENT_OR_FRAUD,
            ].map((type) => (
              <div key={type} className="rounded-lg border border-[#d8e4f6] bg-white px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b78a1]">
                  {issueTypeLabels[type]}
                </p>
                <p className="mt-1 text-lg font-bold text-[#10284a]">{stats.issueCounts[type]}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link className="inline-flex min-h-10 items-center" href="/admin/ops">
            Ops 대시보드
          </Link>
          <Link className="inline-flex min-h-10 items-center" href="/admin/reports">
            신고 큐
          </Link>
          <Link className="inline-flex min-h-10 items-center" href="/admin/moderation-logs">
            모더레이션 로그
          </Link>
          <Link
            className="inline-flex min-h-10 items-center"
            href="/admin/hospital-review-flags"
          >
            병원 후기 의심 신호
          </Link>
        </div>

        <section className="tp-card flex flex-col gap-3 p-4 text-xs text-[#4f678d]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              이슈 필터
            </span>
            {[
              "ALL",
              ...Object.values(CareFeedbackIssueType).filter(
                (type) => type !== CareFeedbackIssueType.NONE,
              ),
            ].map((value) => (
              <Link
                key={value}
                href={buildLink(value as CareFeedbackIssueType | "ALL", outcome, reviewStatus, 1)}
                className={`inline-flex min-h-10 items-center rounded-lg border px-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bb8ff] ${
                  issueType === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                {value === "ALL" ? "전체" : issueTypeLabels[value as CareFeedbackIssueType]}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              결과 필터
            </span>
            {["ALL", ...Object.values(CareFeedbackOutcome)].map((value) => (
              <Link
                key={value}
                href={buildLink(issueType, value as CareFeedbackOutcome | "ALL", reviewStatus, 1)}
                className={`inline-flex min-h-10 items-center rounded-lg border px-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bb8ff] ${
                  outcome === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                {value === "ALL" ? "전체" : outcomeLabels[value as CareFeedbackOutcome]}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              처리 상태
            </span>
            {["ALL", ...Object.values(CareFeedbackReviewStatus)].map((value) => (
              <Link
                key={value}
                href={buildLink(issueType, outcome, value as CareFeedbackReviewStatus | "ALL", 1)}
                className={`inline-flex min-h-10 items-center rounded-lg border px-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8bb8ff] ${
                  reviewStatus === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                {value === "ALL" ? "전체" : reviewStatusLabels[value as CareFeedbackReviewStatus]}
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#5a7398]">
          <span>
            페이지 {feedbackPage.page} / {feedbackPage.totalPages} · 현재 {feedbackPage.items.length}건 표시 · 누적{" "}
            {feedbackPage.totalCount}건
          </span>
          {feedbackPage.totalPages > 1 ? (
            <CompactPagination
              ariaLabel="돌봄 이슈 신호 페이지 이동"
              currentPage={feedbackPage.page}
              totalPages={feedbackPage.totalPages}
              makeHref={(page) => buildLink(issueType, outcome, reviewStatus, page)}
              className="w-full sm:w-auto"
            />
          ) : null}
        </section>

        <section className="tp-card overflow-hidden">
          {feedbackPage.items.length > 0 ? (
            <>
            <div data-testid="care-feedback-mobile-list" className="flex flex-col divide-y divide-[#e6edf8] md:hidden">
              {feedbackPage.items.map((feedback) => (
                <article key={feedback.id} className="flex flex-col gap-3 p-4 text-xs text-[#355988]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/posts/${feedback.careRequest.post.id}`}
                        className="inline-flex min-h-10 items-center break-words text-sm font-semibold leading-5 text-[#163462] hover:text-[#2f5da4]"
                      >
                        {feedback.careRequest.post.title}
                      </Link>
                      <p className="mt-1 text-[11px] text-[#6a7f9f]">
                        {careRequestStatusLabels[feedback.careRequest.status]} ·{" "}
                        {formatDateTime(feedback.careRequest.startsAt)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-800">
                      {issueTypeLabels[feedback.issueType]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#dbe6f6] bg-[#f8fbff] p-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b78a1]">결과</p>
                      <p className="mt-1 font-semibold text-[#163462]">
                        {outcomeLabels[feedback.outcome]}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b78a1]">처리</p>
                      <p className="mt-1 font-semibold text-[#163462]">
                        {reviewStatusLabels[feedback.reviewStatus]}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b78a1]">작성자</p>
                      <p className="mt-1 font-semibold text-[#163462]">
                        {formatUserLabel(feedback.author)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b78a1]">지원자</p>
                      <p className="mt-1 font-semibold text-[#163462]">
                        {formatUserLabel(feedback.careApplication?.applicant)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#5b78a1]">피드백 메모</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 leading-5 text-[#355988]">
                      {feedback.comment ?? "메모 없음"}
                    </p>
                  </div>

                  <form
                    action={async (formData) => {
                      "use server";
                      await updateCareFeedbackReviewAction(feedback.id, {
                        reviewStatus: formData.get("reviewStatus"),
                        reviewNote: formData.get("reviewNote"),
                      });
                    }}
                    className="rounded-lg border border-[#dbe6f6] bg-white p-3"
                  >
                    <label className="block text-[11px] font-semibold text-[#4f678d]">
                      처리 상태
                      <select
                        name="reviewStatus"
                        defaultValue={feedback.reviewStatus}
                        className="mt-1 min-h-10 w-full rounded-lg border border-[#cbdcf5] bg-white px-2 text-xs text-[#163462]"
                      >
                        {Object.values(CareFeedbackReviewStatus).map((status) => (
                          <option key={status} value={status}>
                            {reviewStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-2 block text-[11px] font-semibold text-[#4f678d]">
                      운영자 메모
                      <textarea
                        name="reviewNote"
                        defaultValue={feedback.reviewNote ?? ""}
                        maxLength={1000}
                        rows={3}
                        className="mt-1 min-h-24 w-full rounded-lg border border-[#cbdcf5] bg-white px-2 py-2 text-xs text-[#163462]"
                        placeholder="확인한 내용과 다음 조치를 남깁니다"
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-[#6a7f9f]">
                        {formatDateTime(feedback.reviewedAt)} · 담당{" "}
                        {formatUserLabel(feedback.reviewer)}
                      </p>
                      <button type="submit" className="tp-btn-primary inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs">
                        저장
                      </button>
                    </div>
                  </form>
                </article>
              ))}
            </div>
            <div data-testid="care-feedback-desktop-table" className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1120px] text-left text-xs text-[#355988]">
                <thead className="border-b border-[#dbe6f6] bg-[#f6f9ff] text-[10px] uppercase tracking-[0.18em] text-[#5b78a1]">
                  <tr>
                    <th className="px-3 py-2.5">돌봄 요청</th>
                    <th className="px-3 py-2.5">이슈</th>
                    <th className="px-3 py-2.5">결과</th>
                    <th className="px-3 py-2.5">처리</th>
                    <th className="px-3 py-2.5">작성자</th>
                    <th className="px-3 py-2.5">요청자/지원자</th>
                    <th className="px-3 py-2.5">메모</th>
                    <th className="px-3 py-2.5">시간</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackPage.items.map((feedback) => (
                    <tr key={feedback.id} className="border-b border-[#e6edf8] align-top">
                      <td className="px-3 py-3">
                        <Link
                          href={`/posts/${feedback.careRequest.post.id}`}
                          className="font-semibold text-[#163462] hover:text-[#2f5da4]"
                        >
                          {feedback.careRequest.post.title}
                        </Link>
                        <p className="mt-1 text-[11px] text-[#6a7f9f]">
                          {careRequestStatusLabels[feedback.careRequest.status]} ·{" "}
                          {formatDateTime(feedback.careRequest.startsAt)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-800">
                          {issueTypeLabels[feedback.issueType]}
                        </span>
                      </td>
                      <td className="px-3 py-3">{outcomeLabels[feedback.outcome]}</td>
                      <td className="min-w-[260px] px-3 py-3">
                        <form
                          action={async (formData) => {
                            "use server";
                            await updateCareFeedbackReviewAction(feedback.id, {
                              reviewStatus: formData.get("reviewStatus"),
                              reviewNote: formData.get("reviewNote"),
                            });
                          }}
                          className="flex flex-col gap-2"
                        >
                          <select
                            name="reviewStatus"
                            defaultValue={feedback.reviewStatus}
                            className="min-h-10 rounded-lg border border-[#cbdcf5] bg-white px-2 text-xs text-[#163462]"
                          >
                            {Object.values(CareFeedbackReviewStatus).map((status) => (
                              <option key={status} value={status}>
                                {reviewStatusLabels[status]}
                              </option>
                            ))}
                          </select>
                          <textarea
                            name="reviewNote"
                            defaultValue={feedback.reviewNote ?? ""}
                            maxLength={1000}
                            rows={2}
                            className="min-h-20 rounded-lg border border-[#cbdcf5] bg-white px-2 py-2 text-xs text-[#163462]"
                            placeholder="운영자 메모"
                          />
                          <button type="submit" className="tp-btn-primary inline-flex min-h-10 items-center justify-center self-start rounded-lg px-3 text-xs">
                            저장
                          </button>
                        </form>
                        <p className="mt-2 text-[11px] text-[#6a7f9f]">
                          {reviewStatusLabels[feedback.reviewStatus]} ·{" "}
                          {formatDateTime(feedback.reviewedAt)}
                        </p>
                        {feedback.reviewer ? (
                          <p className="mt-1 text-[11px] text-[#6a7f9f]">
                            담당: {formatUserLabel(feedback.reviewer)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[#163462]">{formatUserLabel(feedback.author)}</p>
                        <p className="mt-1 text-[11px] text-[#6a7f9f]">{feedback.authorRole}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p>요청자: {formatUserLabel(feedback.careRequest.post.author)}</p>
                        <p className="mt-1">
                          지원자: {formatUserLabel(feedback.careApplication?.applicant)}
                        </p>
                      </td>
                      <td className="max-w-[320px] px-3 py-3">
                        <p className="whitespace-pre-wrap leading-5">
                          {feedback.comment ?? "메모 없음"}
                        </p>
                      </td>
                      <td className="px-3 py-3">{formatDateTime(feedback.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <div className="p-8">
              <EmptyState
                title={emptyStateCopy.title}
                description={emptyStateCopy.description}
              />
            </div>
          )}
        </section>

        <AdminSectionNav role={user.role} />
      </main>
    </div>
  );
}
