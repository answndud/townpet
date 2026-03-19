import Link from "next/link";
import { AuthAuditAction, ReportStatus } from "@prisma/client";

import { EmptyState } from "@/components/ui/empty-state";
import { requireModeratorPageUser } from "@/server/admin-page-access";
import { getAdminOpsOverview } from "@/server/queries/ops-overview.queries";

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatStateClass(state: "ok" | "warn" | "error" | "degraded") {
  if (state === "ok") {
    return "border-[#cfe6d1] bg-[#f4fbf4] text-[#256342]";
  }
  if (state === "warn") {
    return "border-[#ead8a4] bg-[#fff9ea] text-[#7f5b0d]";
  }
  return "border-[#f1c7c7] bg-[#fff5f5] text-[#8b2f2f]";
}

function normalizeDashboardState(value: string): "ok" | "warn" | "error" | "degraded" {
  if (value === "ok" || value === "warn" || value === "error" || value === "degraded") {
    return value;
  }

  return "warn";
}

const authActionLabels: Record<AuthAuditAction, string> = {
  PASSWORD_SET: "비밀번호 설정",
  PASSWORD_CHANGE: "비밀번호 변경",
  PASSWORD_RESET: "비밀번호 재설정",
  LOGIN_SUCCESS: "로그인 성공",
  LOGIN_FAILURE: "로그인 실패",
  LOGIN_RATE_LIMITED: "로그인 제한",
  REGISTER_SUCCESS: "회원가입 성공",
  REGISTER_REJECTED: "회원가입 거절",
  REGISTER_RATE_LIMITED: "회원가입 제한",
};

export default async function AdminOpsPage() {
  await requireModeratorPageUser();
  const overview = await getAdminOpsOverview();

  const cacheState = normalizeDashboardState(overview.health.checks.cache.state);
  const databaseState = normalizeDashboardState(overview.health.checks.database.state);
  const rateLimitState = normalizeDashboardState(overview.health.checks.rateLimit.status);
  const controlPlaneState = normalizeDashboardState(overview.health.checks.controlPlane.state);
  const pgTrgmState = normalizeDashboardState(overview.health.checks.search?.pgTrgm.state ?? "warn");
  const controlPlaneChecks =
    "checks" in overview.health.checks.controlPlane ? overview.health.checks.controlPlane.checks : [];
  const dailySummaries = overview.personalization.dailySummaries.slice(-7);

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            Ops 대시보드
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            시스템 상태, 검색 품질, 신고 적체, 인증 실패, 개인화 반응을 한 화면에서 확인합니다.
          </p>
          <p className="mt-3 text-xs text-[#5a7398]">
            마지막 스냅샷 {new Date(overview.health.timestamp).toLocaleString("ko-KR")}
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className={`rounded-2xl border p-4 ${formatStateClass(overview.health.status)}`}>
            <p className="text-[11px] uppercase tracking-[0.22em]">서비스 상태</p>
            <p className="mt-2 text-2xl font-bold">{overview.health.status.toUpperCase()}</p>
            <p className="mt-1 text-xs">uptime {formatCount(overview.health.uptimeSec)}초</p>
          </article>
          <article className={`rounded-2xl border p-4 ${formatStateClass(databaseState)}`}>
            <p className="text-[11px] uppercase tracking-[0.22em]">Database</p>
            <p className="mt-2 text-2xl font-bold">{databaseState.toUpperCase()}</p>
            <p className="mt-1 text-xs">{overview.health.checks.database.message ?? "database connected"}</p>
          </article>
          <article className={`rounded-2xl border p-4 ${formatStateClass(rateLimitState)}`}>
            <p className="text-[11px] uppercase tracking-[0.22em]">Rate limit</p>
            <p className="mt-2 text-2xl font-bold">{rateLimitState.toUpperCase()}</p>
            <p className="mt-1 text-xs">{overview.health.checks.rateLimit.backend}</p>
          </article>
          <article className={`rounded-2xl border p-4 ${formatStateClass(controlPlaneState)}`}>
            <p className="text-[11px] uppercase tracking-[0.22em]">Control plane</p>
            <p className="mt-2 text-2xl font-bold">{controlPlaneState.toUpperCase()}</p>
            <p className="mt-1 text-xs">
              {controlPlaneChecks.length} checks
            </p>
          </article>
          <article className={`rounded-2xl border p-4 ${formatStateClass(cacheState)}`}>
            <p className="text-[11px] uppercase tracking-[0.22em]">Cache / Search</p>
            <p className="mt-2 text-2xl font-bold">{overview.health.checks.cache.backend}</p>
            <p className="mt-1 text-xs">
              cache {cacheState} · pg_trgm {pgTrgmState}
            </p>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="tp-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[#10284a]">검색 품질 신호</h2>
                <p className="text-xs text-[#5a7398]">
                  최근 누적 검색어 기준 인기어와 결과 부족 검색어를 같이 봅니다.
                </p>
              </div>
              <Link href="/search" className="text-xs text-[#3567b5]">
                검색 열기
              </Link>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <h3 className="text-sm font-semibold text-[#1f3f71]">인기 검색어</h3>
                <div className="mt-3 space-y-2 text-xs text-[#4f678d]">
                  {overview.search.popularTerms.length > 0 ? (
                    overview.search.popularTerms.map((term) => (
                      <div key={`popular:${term.term}`} className="flex items-center justify-between gap-3">
                        <span className="font-medium text-[#163462]">{term.term}</span>
                        <span>{formatCount(term.count)}회</span>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="검색 통계가 없습니다"
                      description="검색 로그가 쌓이면 인기 검색어가 여기에 표시됩니다."
                    />
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
                <h3 className="text-sm font-semibold text-[#1f3f71]">0건 비중 높은 검색어</h3>
                <div className="mt-3 space-y-2 text-xs text-[#4f678d]">
                  {overview.search.zeroResultTerms.length > 0 ? (
                    overview.search.zeroResultTerms.map((term) => (
                      <div key={`zero:${term.term}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-[#163462]">{term.term}</span>
                          <span>{formatCount(term.zeroResultCount)}회</span>
                        </div>
                        <p className="text-[11px] text-[#6a7f9f]">
                          평균 결과 {term.averageResultCount.toFixed(1)}건 · 최근 {term.lastResultCount ?? "-"}건
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="0건 검색어가 없습니다"
                      description="검색 결과 telemetry가 쌓이면 여기서 실패 검색을 바로 확인할 수 있습니다."
                    />
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
                <h3 className="text-sm font-semibold text-[#1f3f71]">결과 부족 검색어</h3>
                <div className="mt-3 space-y-2 text-xs text-[#4f678d]">
                  {overview.search.lowResultTerms.length > 0 ? (
                    overview.search.lowResultTerms.map((term) => (
                      <div key={`low:${term.term}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-[#163462]">{term.term}</span>
                          <span>{term.averageResultCount.toFixed(1)}건</span>
                        </div>
                        <p className="text-[11px] text-[#6a7f9f]">
                          누적 {formatCount(term.count)}회 · 최근 {term.lastResultCount ?? "-"}건
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="결과 부족 검색어가 없습니다"
                      description="평균 결과가 낮은 검색어가 쌓이면 여기서 개선 우선순위를 잡을 수 있습니다."
                    />
                  )}
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-4">
            <article className="tp-card p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-[#10284a]">인증/어뷰징 24시간</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                  <p className="text-xs text-[#5a7398]">전체 인증 이벤트</p>
                  <p className="mt-2 text-2xl font-bold text-[#10284a]">
                    {formatCount(overview.authAudit.totalEvents)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#dbe6f6] bg-[#fff8ea] p-3">
                  <p className="text-xs text-[#7f5b0d]">로그인 실패/제한</p>
                  <p className="mt-2 text-2xl font-bold text-[#7f5b0d]">
                    {formatCount(
                      overview.authAudit.actionCounts[AuthAuditAction.LOGIN_FAILURE] +
                        overview.authAudit.actionCounts[AuthAuditAction.LOGIN_RATE_LIMITED],
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(overview.authAudit.actionCounts)
                  .filter(([, count]) => count > 0)
                  .slice(0, 6)
                  .map(([action, count]) => (
                    <div key={action} className="rounded-xl border border-[#e4ecf8] p-3 text-xs text-[#4f678d]">
                      <p className="font-semibold text-[#163462]">
                        {authActionLabels[action as AuthAuditAction]}
                      </p>
                      <p className="mt-1">{formatCount(count)}건</p>
                    </div>
                  ))}
              </div>
              <div className="mt-4 space-y-2 text-xs text-[#4f678d]">
                {overview.authAudit.topFailureReasons.length > 0 ? (
                  overview.authAudit.topFailureReasons.map((item) => (
                    <div key={item.reasonCode} className="flex items-center justify-between gap-2">
                      <span>{item.reasonCode}</span>
                      <span>{formatCount(item.count)}건</span>
                    </div>
                  ))
                ) : (
                  <p>최근 상위 실패 사유가 없습니다.</p>
                )}
              </div>
            </article>

            <article className="tp-card p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-[#10284a]">운영 큐 요약</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                  <p className="text-xs text-[#5a7398]">미처리 신고</p>
                  <p className="mt-2 text-2xl font-bold text-[#10284a]">
                    {formatCount(overview.reports.statusCounts[ReportStatus.PENDING])}
                  </p>
                </div>
                <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                  <p className="text-xs text-[#5a7398]">평균 처리시간</p>
                  <p className="mt-2 text-2xl font-bold text-[#10284a]">
                    {overview.reports.averageResolutionHours
                      ? `${overview.reports.averageResolutionHours.toFixed(1)}h`
                      : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                  <p className="text-xs text-[#5a7398]">병원 후기 CTR</p>
                  <p className="mt-2 text-2xl font-bold text-[#10284a]">
                    {formatPercent(overview.personalization.totals.postCtr)}
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs text-[#355988]">
                  <thead className="border-b border-[#dbe6f6] text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
                    <tr>
                      <th className="py-2">날짜</th>
                      <th className="py-2">조회</th>
                      <th className="py-2">게시글 CTR</th>
                      <th className="py-2">광고 CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySummaries.map((summary) => (
                      <tr key={summary.date} className="border-b border-[#e6edf8]">
                        <td className="py-3 font-semibold text-[#163462]">{summary.date}</td>
                        <td className="py-3">{formatCount(summary.viewCount)}</td>
                        <td className="py-3">{formatPercent(summary.postCtr)}</td>
                        <td className="py-3">{formatPercent(summary.adCtr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/reports">신고 큐</Link>
          <Link href="/admin/auth-audits">인증 감사 로그</Link>
          <Link href="/admin/personalization">개인화 지표</Link>
          <Link href="/admin/hospital-review-flags">병원 후기 의심 신호</Link>
          <Link href="/admin/breeds">품종 사전</Link>
        </div>
      </main>
    </div>
  );
}
