import Link from "next/link";
import {
  CorrectionRequesterRole,
  CorrectionRequestStatus,
  CorrectionRequestTargetType,
  ReportStatus,
} from "@prisma/client";

import { updateCorrectionRequestAction } from "@/app/admin/corrections/actions";
import { AdminQueueSwitch } from "@/components/admin/admin-queue-switch";
import { EmptyState } from "@/components/ui/empty-state";
import { createNoIndexPageMetadata } from "@/lib/page-metadata";
import { requireModeratorPageUser } from "@/server/admin-page-access";
import {
  getCorrectionRequestQueueSummary,
  listInformationCorrectionRequests,
} from "@/server/queries/correction-request.queries";
import { getReportStats } from "@/server/queries/report.queries";

export const metadata = createNoIndexPageMetadata({
  title: "정보 정정 요청",
  description: "병원과 업체 정보 정정 요청을 검토합니다.",
  path: "/admin/corrections",
});

type AdminCorrectionRequestsPageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
    operatorOnly?: string;
    updated?: string;
  }>;
};

const statusLabels: Record<CorrectionRequestStatus, string> = {
  PENDING: "접수",
  REVIEWING: "검토 중",
  RESOLVED: "처리 완료",
  DISMISSED: "기각",
};

const targetTypeLabels: Record<CorrectionRequestTargetType, string> = {
  HOSPITAL: "동물병원",
  PLACE: "장소/업체",
  POST: "게시글",
  OTHER: "기타",
};

const requesterRoleLabels: Record<CorrectionRequesterRole, string> = {
  BUSINESS_OWNER: "사업자/대표자",
  STAFF: "직원/관계자",
  CUSTOMER: "방문자/보호자",
  PUBLIC_AGENCY: "공공기관/보호기관",
  OTHER: "기타",
};

function isCorrectionRequestStatus(value: string | undefined): value is CorrectionRequestStatus {
  return Boolean(value && Object.values(CorrectionRequestStatus).includes(value as CorrectionRequestStatus));
}

function formatOperatorVerifiedDate(value: Date | null) {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(value);
}

export default async function AdminCorrectionRequestsPage({
  searchParams,
}: AdminCorrectionRequestsPageProps) {
  await requireModeratorPageUser();
  const params = (await searchParams) ?? {};
  const status = isCorrectionRequestStatus(params.status) ? params.status : "ALL";
  const query = params.q?.trim() ?? "";
  const operatorOnly = params.operatorOnly === "1";

  const [requests, reportStats, correctionSummary] = await Promise.all([
    listInformationCorrectionRequests({
      status,
      query: query || null,
      operatorOnly,
      limit: 100,
    }),
    getReportStats(7),
    getCorrectionRequestQueueSummary(),
  ]);

  const buildFilterHref = (nextStatus: string) => {
    const nextParams = new URLSearchParams();
    nextParams.set("status", nextStatus);
    if (query) {
      nextParams.set("q", query);
    }
    if (operatorOnly) {
      nextParams.set("operatorOnly", "1");
    }
    return `/admin/corrections?${nextParams.toString()}`;
  };

  const buildOperatorOnlyHref = (nextOperatorOnly: boolean) => {
    const nextParams = new URLSearchParams();
    nextParams.set("status", status);
    if (query) {
      nextParams.set("q", query);
    }
    if (nextOperatorOnly) {
      nextParams.set("operatorOnly", "1");
    }
    return `/admin/corrections?${nextParams.toString()}`;
  };

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            정보 정정 요청
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            병원, 장소, 게시글 정정 요청을 접수 상태부터 처리 완료까지 기록합니다.
          </p>
          {params.updated ? (
            <p className="mt-3 rounded-xl border border-[#b8d7c3] bg-[#f2fbf5] px-3 py-2 text-sm text-[#245338]">
              정정 요청 처리 상태를 저장했습니다.
            </p>
          ) : null}
        </header>

        <section className="tp-card flex flex-col gap-3 p-4 text-xs text-[#4f678d]">
          <form className="flex flex-wrap items-center gap-2" action="">
            <input type="hidden" name="status" value={status} />
            {operatorOnly ? <input type="hidden" name="operatorOnly" value="1" /> : null}
            <input
              name="q"
              defaultValue={query}
              placeholder="대상명/요청자/이메일/글 ID 검색"
              className="tp-input-soft w-full max-w-sm bg-white px-3 py-2 text-xs"
            />
            <button type="submit" className="tp-btn-primary px-3 py-2 text-xs font-semibold">
              검색
            </button>
            {query ? (
              <Link href={buildFilterHref(status)} className="text-xs text-[#5a7398]">
                초기화
              </Link>
            ) : null}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              상태 필터
            </span>
            {["ALL", ...Object.values(CorrectionRequestStatus)].map((value) => (
              <Link
                key={value}
                href={buildFilterHref(value)}
                className={`rounded-lg border px-2.5 py-1 transition ${
                  status === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                {value === "ALL" ? "전체" : statusLabels[value as CorrectionRequestStatus]}
              </Link>
            ))}
            <Link
              href={buildOperatorOnlyHref(!operatorOnly)}
              className={`rounded-lg border px-2.5 py-1 transition ${
                operatorOnly
                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                  : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
              }`}
            >
              운영자 콘텐츠만
            </Link>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/reports">신고 큐</Link>
          <Link href="/admin/hospital-review-flags">병원 후기 의심 신호</Link>
          <Link href="/admin/moderation-logs">모더레이션 로그</Link>
        </div>

        <AdminQueueSwitch
          current="corrections"
          reportPendingCount={reportStats.statusCounts[ReportStatus.PENDING]}
          reportCriticalCount={null}
          correctionActiveCount={correctionSummary.activeCount}
          correctionOperatorCount={correctionSummary.operatorPendingCount}
        />

        <section className="tp-card p-4 sm:p-5">
          {requests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-xs text-[#355988]">
                <thead className="border-b border-[#dbe6f6] text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
                  <tr>
                    <th className="py-2">대상</th>
                    <th className="py-2">요청자</th>
                    <th className="py-2">요청 내용</th>
                    <th className="py-2">상태 처리</th>
                    <th className="py-2">접수/처리</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const isOperatorLinked = Boolean(request.post?.isOperatorContent);
                    const verifiedDate = formatOperatorVerifiedDate(
                      request.post?.operatorLastVerifiedAt ?? null,
                    );

                    return (
                      <tr key={request.id} className="align-top border-b border-[#e6edf8]">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-[#163462]">{request.targetName}</div>
                          <div className="mt-1 text-[11px] text-[#5a7398]">
                            {targetTypeLabels[request.targetType]} · {statusLabels[request.status]}
                          </div>
                          {request.post ? (
                            <div className="mt-2 grid gap-2">
                              {isOperatorLinked ? (
                                <div className="grid gap-2 border-t border-[#dbe6f6] pt-2 text-[11px] leading-5 text-[#526d96]">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-[#c9d8ee] bg-[#f8fbff] px-2 py-0.5 font-semibold text-[#315b9a]">
                                      운영자 정리 글 제보
                                    </span>
                                    <span>{request.post.operatorSourceName ?? "출처 미기록"}</span>
                                    <span>확인 {verifiedDate ?? "미기록"}</span>
                                  </div>
                                  <dl className="grid gap-1 text-[11px] text-[#5a7398]">
                                    <div className="flex gap-2">
                                      <dt className="shrink-0 font-semibold text-[#315b9a]">확인</dt>
                                      <dd>공식 출처와 요청 근거를 먼저 대조합니다.</dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="shrink-0 font-semibold text-[#315b9a]">기록</dt>
                                      <dd>수정 여부, 반영 위치, 기각 사유를 처리 메모에 남깁니다.</dd>
                                    </div>
                                  </dl>
                                </div>
                              ) : null}
                              <Link href={`/posts/${request.post.id}`} className="inline-flex text-[#3567b5]">
                                연결 글
                              </Link>
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-[#1f3f71]">{request.requesterName}</div>
                          <div className="mt-1 text-[#5a7398]">{request.requesterEmail}</div>
                          <div className="mt-1 text-[#5a7398]">
                            {requesterRoleLabels[request.requesterRole]}
                            {request.organizationName ? ` · ${request.organizationName}` : ""}
                          </div>
                          {request.requesterPhone ? (
                            <div className="mt-1 text-[#5a7398]">{request.requesterPhone}</div>
                          ) : null}
                        </td>
                        <td className="max-w-md py-3 pr-4">
                          <p className="whitespace-pre-wrap text-[#355988]">{request.requestedChange}</p>
                          {request.evidenceUrl ? (
                            <a
                              href={request.evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex text-[#3567b5]"
                            >
                              근거 URL 열기
                            </a>
                          ) : null}
                        </td>
                        <td className="w-[260px] py-3 pr-4">
                          <form action={updateCorrectionRequestAction} className="grid gap-2">
                            <input type="hidden" name="requestId" value={request.id} />
                            <select
                              name="status"
                              defaultValue={request.status}
                              className="tp-input-soft bg-white px-2.5 py-2 text-xs"
                            >
                              {Object.values(CorrectionRequestStatus).map((value) => (
                                <option key={value} value={value}>
                                  {statusLabels[value]}
                                </option>
                              ))}
                            </select>
                            <textarea
                              name="resolution"
                              defaultValue={request.resolution ?? ""}
                              placeholder={
                                isOperatorLinked
                                  ? "출처 확인, 반영 내용, 기각 사유를 남겨 주세요."
                                  : "처리 메모"
                              }
                              className="tp-input-soft min-h-20 bg-white px-2.5 py-2 text-xs leading-5"
                              maxLength={1000}
                            />
                            <button type="submit" className="tp-btn-soft min-h-9 px-3 text-xs font-semibold">
                              처리 저장
                            </button>
                          </form>
                        </td>
                        <td className="py-3 text-[#5a7398]">
                          <div>{request.createdAt.toLocaleString("ko-KR")}</div>
                          {request.resolver ? (
                            <div className="mt-2">
                              처리자: {request.resolver.nickname ?? request.resolver.email}
                            </div>
                          ) : null}
                          {request.resolvedAt ? (
                            <div className="mt-1">{request.resolvedAt.toLocaleString("ko-KR")}</div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="정정 요청이 없습니다"
              description="현재 필터 조건에서 검토할 정보 정정 요청이 없습니다."
            />
          )}
        </section>
      </main>
    </div>
  );
}
