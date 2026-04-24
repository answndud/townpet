import Link from "next/link";
import { AuthAuditAction, PostScope, PostType, ReportStatus, SearchTermSearchIn } from "@prisma/client";
import { z } from "zod";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { getPostTypeMeta } from "@/lib/post-presenter";
import { requireAdminPageUser } from "@/server/admin-page-access";
import { getAdminOpsOverview } from "@/server/queries/ops-overview.queries";

type AdminOpsPageProps = {
  searchParams?: Promise<{
    searchScope?: string;
    searchType?: string;
    searchIn?: string;
  }>;
};

const adminOpsSearchFilterSchema = z.object({
  searchScope: z.nativeEnum(PostScope).optional(),
  searchType: z.nativeEnum(PostType).optional(),
  searchIn: z.nativeEnum(SearchTermSearchIn).optional(),
});

const SEARCH_IN_LABELS: Record<SearchTermSearchIn, string> = {
  ALL: "전체",
  TITLE: "제목",
  CONTENT: "내용",
  AUTHOR: "작성자",
};

const OPS_SEARCH_TYPE_OPTIONS: PostType[] = [
  PostType.HOSPITAL_REVIEW,
  PostType.PLACE_REVIEW,
  PostType.WALK_ROUTE,
  PostType.ADOPTION_LISTING,
  PostType.SHELTER_VOLUNTEER,
  PostType.MARKET_LISTING,
  PostType.LOST_FOUND,
  PostType.QA_QUESTION,
  PostType.FREE_BOARD,
  PostType.PET_SHOWCASE,
];

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

function OpsStatusItem({
  label,
  value,
  detail,
  state,
}: {
  label: string;
  value: string;
  detail: string;
  state: "ok" | "warn" | "error" | "degraded";
}) {
  return (
    <div className="grid gap-1 border-t border-[#dce7f7] py-3 sm:border-t-0 sm:border-l sm:px-4 sm:py-0 sm:first:border-l-0 sm:first:pl-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5b78a1]">
          {label}
        </p>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${formatStateClass(state)}`}>
          {value}
        </span>
      </div>
      <p className="truncate text-xs text-[#5a7398]">{detail}</p>
    </div>
  );
}

function buildOpsHref({
  searchScope,
  searchType,
  searchIn,
}: {
  searchScope?: PostScope;
  searchType?: PostType;
  searchIn?: SearchTermSearchIn;
}) {
  const params = new URLSearchParams();
  if (searchScope === PostScope.LOCAL) {
    params.set("searchScope", PostScope.LOCAL);
  }
  if (searchType) {
    params.set("searchType", searchType);
  }
  if (searchIn && searchIn !== SearchTermSearchIn.ALL) {
    params.set("searchIn", searchIn);
  }

  const serialized = params.toString();
  return serialized ? `/admin/ops?${serialized}` : "/admin/ops";
}

function buildSearchHref({
  searchScope,
  searchType,
  searchIn,
}: {
  searchScope: PostScope;
  searchType?: PostType;
  searchIn: SearchTermSearchIn;
}) {
  const params = new URLSearchParams();
  if (searchScope === PostScope.LOCAL) {
    params.set("scope", PostScope.LOCAL);
  }
  if (searchType) {
    params.set("type", searchType);
  }
  if (searchIn !== SearchTermSearchIn.ALL) {
    params.set("searchIn", searchIn);
  }

  const serialized = params.toString();
  return serialized ? `/search?${serialized}` : "/search";
}

function describeSearchContext({
  searchScope,
  searchType,
  searchIn,
}: {
  searchScope: PostScope;
  searchType?: PostType;
  searchIn: SearchTermSearchIn;
}) {
  const scopeLabel = searchScope === PostScope.LOCAL ? "동네 검색" : "전역 검색";
  const typeLabel = searchType ? getPostTypeMeta(searchType).label : "전체 글 유형";
  const searchInLabel = SEARCH_IN_LABELS[searchIn];
  return `${scopeLabel} · ${typeLabel} · ${searchInLabel}`;
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

export default async function AdminOpsPage({ searchParams }: AdminOpsPageProps) {
  const user = await requireAdminPageUser();
  const resolvedParams = (await searchParams) ?? {};
  const parsedFilters = adminOpsSearchFilterSchema.safeParse({
    searchScope: resolvedParams.searchScope ?? undefined,
    searchType: resolvedParams.searchType ?? undefined,
    searchIn: resolvedParams.searchIn ?? undefined,
  });
  const selectedSearchScope =
    parsedFilters.data?.searchScope === PostScope.LOCAL ? PostScope.LOCAL : PostScope.GLOBAL;
  const selectedSearchType = parsedFilters.data?.searchType;
  const selectedSearchIn = parsedFilters.data?.searchIn ?? SearchTermSearchIn.ALL;
  const overview = await getAdminOpsOverview({
    searchContext: {
      scope: selectedSearchScope,
      type: selectedSearchType,
      searchIn: selectedSearchIn,
    },
  });

  const cacheState = normalizeDashboardState(overview.health.checks.cache.state);
  const databaseState = normalizeDashboardState(overview.health.checks.database.state);
  const rateLimitState = normalizeDashboardState(overview.health.checks.rateLimit.status);
  const controlPlaneState = normalizeDashboardState(overview.health.checks.controlPlane.state);
  const pgTrgmState = normalizeDashboardState(overview.health.checks.search?.pgTrgm.state ?? "warn");
  const controlPlaneChecks =
    "checks" in overview.health.checks.controlPlane ? overview.health.checks.controlPlane.checks : [];
  const dailySummaries = overview.personalization.dailySummaries.slice(-7);
  const searchContextLabel = describeSearchContext({
    searchScope: selectedSearchScope,
    searchType: selectedSearchType,
    searchIn: selectedSearchIn,
  });

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
        <section className="rounded-xl border border-[#d9e5f7] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="tp-eyebrow">운영 관리</p>
              <h1 className="mt-2 text-xl font-semibold text-[#10284a] sm:text-2xl">
                Ops 대시보드
              </h1>
              <p className="mt-2 max-w-[760px] text-sm leading-6 text-[#4f678d]">
                시스템 상태, 검색 품질, 신고 적체, 인증 실패, 개인화 반응을 확인합니다.
              </p>
            </div>
            <p className="text-xs text-[#5a7398]">
              스냅샷 {new Date(overview.health.timestamp).toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="mt-4 grid gap-0 sm:grid-cols-2 lg:grid-cols-5">
            <OpsStatusItem
              label="서비스"
              value={overview.health.status.toUpperCase()}
              detail={`uptime ${formatCount(overview.health.uptimeSec)}초`}
              state={overview.health.status}
            />
            <OpsStatusItem
              label="Database"
              value={databaseState.toUpperCase()}
              detail={overview.health.checks.database.message ?? "database connected"}
              state={databaseState}
            />
            <OpsStatusItem
              label="Rate limit"
              value={rateLimitState.toUpperCase()}
              detail={overview.health.checks.rateLimit.backend}
              state={rateLimitState}
            />
            <OpsStatusItem
              label="Control"
              value={controlPlaneState.toUpperCase()}
              detail={`${controlPlaneChecks.length} checks`}
              state={controlPlaneState}
            />
            <OpsStatusItem
              label="Cache/Search"
              value={overview.health.checks.cache.backend}
              detail={`cache ${cacheState} · pg_trgm ${pgTrgmState}`}
              state={cacheState}
            />
          </div>
        </section>

        <section className="tp-card flex flex-col gap-4 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#10284a]">검색 품질 필터</h2>
            <p className="text-xs text-[#5a7398]">
              현재 문맥: {searchContextLabel}
            </p>
          </div>
          <form method="get" className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end">
            <label className="flex flex-col gap-1 text-xs text-[#4f678d]">
              검색 범위
              <select
                name="searchScope"
                defaultValue={selectedSearchScope}
                className="rounded-xl border border-[#d3def1] bg-white px-3 py-2 text-sm text-[#163462]"
              >
                <option value={PostScope.GLOBAL}>전역 검색</option>
                <option value={PostScope.LOCAL}>동네 검색</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#4f678d]">
              글 유형
              <select
                name="searchType"
                defaultValue={selectedSearchType ?? ""}
                className="rounded-xl border border-[#d3def1] bg-white px-3 py-2 text-sm text-[#163462]"
              >
                <option value="">전체 글 유형</option>
                {OPS_SEARCH_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {getPostTypeMeta(type).label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#4f678d]">
              검색 위치
              <select
                name="searchIn"
                defaultValue={selectedSearchIn}
                className="rounded-xl border border-[#d3def1] bg-white px-3 py-2 text-sm text-[#163462]"
              >
                {Object.values(SearchTermSearchIn).map((searchIn) => (
                  <option key={searchIn} value={searchIn}>
                    {SEARCH_IN_LABELS[searchIn]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-xl border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5ca3]"
            >
              필터 적용
            </button>
            <Link
              href={buildOpsHref({})}
              className="rounded-xl border border-[#d3def1] bg-white px-4 py-2 text-center text-sm font-semibold text-[#315b9a] transition hover:bg-[#f5f9ff]"
            >
              초기화
            </Link>
          </form>
        </section>

        <section className="tp-card flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#10284a]">최근 7일 검색 추이</h2>
              <p className="text-xs text-[#5a7398]">
                현재 문맥 기준 일자별 검색량과 0건 비율을 빠르게 확인합니다.
              </p>
            </div>
            <Link
              href={buildSearchHref({
                searchScope: selectedSearchScope,
                searchType: selectedSearchType,
                searchIn: selectedSearchIn,
              })}
              className="text-xs font-semibold text-[#3567b5]"
            >
              검색 열기
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            {overview.search.dailyMetrics.map((metric) => (
              <article
                key={metric.date}
                className="rounded-2xl border border-[#dbe6f6] bg-[#f8fbff] p-4 text-xs text-[#4f678d]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5b78a1]">
                  {metric.date.slice(5)}
                </p>
                <p className="mt-3 text-lg font-semibold text-[#163462]">
                  {formatCount(metric.queryCount)}건
                </p>
                <p className="mt-1">0건 {formatCount(metric.zeroResultCount)}건</p>
                <p className="mt-1">0건 비율 {formatPercent(metric.zeroResultRate)}</p>
                <p className="mt-1">평균 결과 {metric.averageResultCount.toFixed(1)}건</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="tp-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[#10284a]">검색 품질 신호</h2>
                <p className="text-xs text-[#5a7398]">
                  현재 문맥 기준 인기어와 zero-result, low-result 검색어를 같이 봅니다.
                </p>
              </div>
              <Link
                href={buildSearchHref({
                  searchScope: selectedSearchScope,
                  searchType: selectedSearchType,
                  searchIn: selectedSearchIn,
                })}
                className="text-xs text-[#3567b5]"
              >
                검색 열기
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <p className="text-xs text-[#5a7398]">누적 검색 수</p>
                <p className="mt-2 text-2xl font-bold text-[#10284a]">
                  {formatCount(overview.search.summary.totalQueryCount)}
                </p>
              </div>
              <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <p className="text-xs text-[#5a7398]">0건 비율</p>
                <p className="mt-2 text-2xl font-bold text-[#10284a]">
                  {formatPercent(overview.search.summary.zeroResultRate)}
                </p>
              </div>
              <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <p className="text-xs text-[#5a7398]">추적 키워드</p>
                <p className="mt-2 text-2xl font-bold text-[#10284a]">
                  {formatCount(overview.search.summary.trackedTermCount)}
                </p>
              </div>
              <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <p className="text-xs text-[#5a7398]">0건 누적</p>
                <p className="mt-2 text-2xl font-bold text-[#10284a]">
                  {formatCount(overview.search.summary.totalZeroResultCount)}
                </p>
              </div>
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
                      description="선택한 문맥에 검색 로그가 쌓이면 인기 검색어가 여기에 표시됩니다."
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
                      description="선택한 문맥에 실패 검색이 쌓이면 여기서 바로 확인할 수 있습니다."
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

        <AdminSectionNav role={user.role} />
      </main>
    </div>
  );
}
