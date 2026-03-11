import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { requireModeratorPageUser } from "@/server/admin-page-access";
import { listHospitalReviewFlagLogs } from "@/server/queries/moderation-action.queries";

type HospitalReviewFlagsPageProps = {
  searchParams?: Promise<{ signal?: string; q?: string }>;
};

const signalLabels: Record<string, string> = {
  NEW_ACCOUNT: "신규 계정",
  SAME_HOSPITAL_REPEAT: "동일 병원 반복",
  REVIEW_BURST: "단기간 후기 집중",
};

function summarizeMetaValue(value: unknown) {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "-";
}

export default async function HospitalReviewFlagsPage({
  searchParams,
}: HospitalReviewFlagsPageProps) {
  await requireModeratorPageUser();

  const resolvedParams = (await searchParams) ?? {};
  const signal = resolvedParams.signal?.trim() ?? "ALL";
  const query = resolvedParams.q?.trim() ?? "";

  const logs = await listHospitalReviewFlagLogs({
    signal: signal === "ALL" ? null : signal,
    query: query || null,
    limit: 100,
  });

  const buildLink = (nextSignal: string) => {
    const params = new URLSearchParams();
    params.set("signal", nextSignal);
    if (query) {
      params.set("q", query);
    }
    return `/admin/hospital-review-flags?${params.toString()}`;
  };

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            병원 후기 의심 신호
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            신규 계정 반복 후기, 동일 병원 집중 리뷰, 단기간 burst 신호를 우선 검토합니다.
          </p>
        </header>

        <section className="tp-card flex flex-col gap-3 p-4 text-xs text-[#4f678d]">
          <form className="flex flex-wrap items-center gap-2" action="">
            <input
              name="q"
              defaultValue={query}
              placeholder="병원명/작성자/신호 검색"
              className="tp-input-soft w-full max-w-xs bg-white px-3 py-2 text-xs"
            />
            <button type="submit" className="tp-btn-primary px-3 py-2 text-xs font-semibold">
              검색
            </button>
            {query ? (
              <Link href={buildLink(signal)} className="text-xs text-[#5a7398]">
                초기화
              </Link>
            ) : null}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              신호 필터
            </span>
            {["ALL", ...Object.keys(signalLabels)].map((value) => (
              <Link
                key={value}
                href={buildLink(value)}
                className={`rounded-lg border px-2.5 py-1 transition ${
                  signal === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                {value === "ALL" ? "전체" : signalLabels[value] ?? value}
              </Link>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/reports">신고 큐</Link>
          <Link href="/admin/moderation-logs">모더레이션 로그</Link>
          <Link href="/admin/auth-audits">인증 감사 로그</Link>
        </div>

        <section className="tp-card p-4 sm:p-5">
          {logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-xs text-[#355988]">
                <thead className="border-b border-[#dbe6f6] text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
                  <tr>
                    <th className="py-2">병원</th>
                    <th className="py-2">작성자</th>
                    <th className="py-2">신호</th>
                    <th className="py-2">반복/집중 수치</th>
                    <th className="py-2">대상</th>
                    <th className="py-2">시간</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const metadata = (log.metadata ?? {}) as Record<string, unknown>;
                    const signals = Array.isArray(metadata.signals)
                      ? metadata.signals.filter((value): value is string => typeof value === "string")
                      : [];

                    return (
                      <tr key={log.id} className="border-b border-[#e6edf8]">
                        <td className="py-3 font-semibold text-[#163462]">
                          {summarizeMetaValue(metadata.hospitalName)}
                        </td>
                        <td className="py-3">
                          <div className="text-[#1f3f71]">{log.actor.nickname ?? log.actor.email}</div>
                          <div className="text-[10px] text-[#5a7398]">{log.actor.id}</div>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {signals.length > 0 ? (
                              signals.map((entry) => (
                                <span
                                  key={entry}
                                  className="rounded-full border border-[#cbdcf5] bg-[#f5f9ff] px-2 py-0.5 text-[10px] text-[#315b9a]"
                                >
                                  {signalLabels[entry] ?? entry}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#5a7398]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-[#4f678d]">
                          <div>동일 병원 30일: {summarizeMetaValue(metadata.sameHospitalReviewCount30d)}</div>
                          <div>최근 7일: {summarizeMetaValue(metadata.recentHospitalReviewCount7d)}</div>
                        </td>
                        <td className="py-3">
                          <Link href={`/posts/${log.targetId}`} className="text-[#3567b5]">
                            {log.targetId}
                          </Link>
                        </td>
                        <td className="py-3">{log.createdAt.toLocaleString("ko-KR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="병원 후기 의심 신호가 없습니다"
              description="현재 필터 조건에서 검토할 병원 후기 플래그가 없습니다."
            />
          )}
        </section>
      </main>
    </div>
  );
}
