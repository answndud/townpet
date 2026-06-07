import Link from "next/link";
import { AuthAuditAction, PostScope, PostType, ReportStatus, SearchTermSearchIn } from "@prisma/client";
import { z } from "zod";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { createNoIndexPageMetadata } from "@/lib/page-metadata";
import { getPostTypeMeta } from "@/lib/post-presenter";
import { requireAdminPageUser } from "@/server/admin-page-access";
import { getAdminOpsOverview } from "@/server/queries/ops-overview.queries";

export const metadata = createNoIndexPageMetadata({
  title: "운영 Overview",
  description: "TownPet 운영 지표와 위험 신호를 확인합니다.",
  path: "/admin/ops",
});

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

const INITIAL_REGION_CATEGORY_LABELS = {
  hospitals: "병원",
  walks: "산책",
  lost: "분실",
  usedMarket: "중고",
} as const;

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatOptionalDate(value: string | null) {
  if (!value) {
    return "미확인";
  }

  return new Date(value).toLocaleDateString("ko-KR");
}

function formatDayLabel(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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

function formatSearchActionClass(priority: "high" | "medium" | "low") {
  if (priority === "high") {
    return "border-[#f1c7c7] bg-[#fff5f5] text-[#8b2f2f]";
  }
  if (priority === "medium") {
    return "border-[#ead8a4] bg-[#fff9ea] text-[#7f5b0d]";
  }
  return "border-[#cfe6d1] bg-[#f4fbf4] text-[#256342]";
}

function formatCareFeedbackThresholdClass(severity: "ok" | "notice" | "warning") {
  if (severity === "warning") {
    return {
      badge: "border-[#ead8a4] bg-[#fff9ea] text-[#7f5b0d]",
      panel: "border-[#ead8a4] bg-[#fff9ea] text-[#7f5b0d]",
    };
  }
  if (severity === "notice") {
    return {
      badge: "border-[#cfe0f6] bg-[#f4f8ff] text-[#315f9f]",
      panel: "border-[#cfe0f6] bg-[#f4f8ff] text-[#315f9f]",
    };
  }
  return {
    badge: "border-[#cfe6d1] bg-[#f4fbf4] text-[#256342]",
    panel: "border-[#cfe6d1] bg-[#f4fbf4] text-[#256342]",
  };
}

function formatCareFeedbackThresholdLabel(severity: "ok" | "notice" | "warning") {
  if (severity === "warning") {
    return "우선 검토";
  }
  if (severity === "notice") {
    return "확인 필요";
  }
  return "정상";
}

function formatAdminQueueSmokeStatusClass(status: "PASS" | "BLOCKED") {
  return status === "PASS"
    ? "border-[#cfe6d1] bg-[#f4fbf4] text-[#256342]"
    : "border-[#ead8a4] bg-[#fff9ea] text-[#7f5b0d]";
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
  query,
}: {
  searchScope: PostScope;
  searchType?: PostType;
  searchIn: SearchTermSearchIn;
  query?: string;
}) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
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
  return serialized ? `/feed?${serialized}` : "/feed";
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
  const scopeLabel = searchScope === PostScope.LOCAL ? "동네 검색" : "전체 검색";
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
  const careThreshold = overview.careFeedbacks.reviewThresholds;
  const careThresholdClass = formatCareFeedbackThresholdClass(careThreshold.severity);
  const initialRegion = overview.initialRegion;
  const correctionFlow = overview.correctionFlow;
  const lostFoundAcquisition = overview.lostFoundAcquisition;
  const adminQueueSmoke = overview.adminQueueSmoke;
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
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#10284a]">분실/목격 획득 전환</h2>
              <p className="text-xs text-[#5a7398]">
                공개 제보 랜딩, 상세 공유 도구, 목격 댓글 작성까지 이어지는 획득 루프를 봅니다.
              </p>
            </div>
            <p className="text-xs font-semibold text-[#315b9a]">
              최근 {lostFoundAcquisition.days}일
              {lostFoundAcquisition.schemaSyncRequired ? " · schema sync 필요" : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">랜딩 조회</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatCount(lostFoundAcquisition.landingViewCount)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">LOST_FLOW_VIEWED</p>
            </div>
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">CTA 클릭</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatCount(lostFoundAcquisition.ctaClickCount)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">
                랜딩 대비 {formatPercent(lostFoundAcquisition.ctaRate)}
              </p>
            </div>
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">공유 액션</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatCount(lostFoundAcquisition.shareActionClickCount)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">
                패널 대비 {formatPercent(lostFoundAcquisition.shareActionRate)}
              </p>
            </div>
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">목격 댓글 생성</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatCount(lostFoundAcquisition.sightingCreatedCount)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">
                제출 대비 {formatPercent(lostFoundAcquisition.sightingCreatedRate)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
              <h3 className="text-sm font-semibold text-[#1f3f71]">단계별 funnel</h3>
              <div className="mt-3 divide-y divide-[#e4edf8] text-xs">
                {lostFoundAcquisition.stageSummaries.map((stage, index) => (
                  <div
                    key={stage.event}
                    className="grid gap-2 py-2 text-[#4f678d] sm:grid-cols-[48px_1fr_auto_auto]"
                  >
                    <span className="font-semibold text-[#6a7f9f]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="font-semibold text-[#163462]">{stage.label}</span>
                      <span className="mt-0.5 block text-[11px] text-[#6a7f9f]">
                        {stage.description}
                      </span>
                    </span>
                    <span className="font-semibold text-[#163462]">
                      {formatCount(stage.count)}건
                    </span>
                    <span className="text-[#5a7398]">
                      {index === 0 ? "기준" : formatPercent(stage.conversionRate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
                <h3 className="text-sm font-semibold text-[#1f3f71]">유입 source</h3>
                <div className="mt-3 space-y-2 text-xs text-[#4f678d]">
                  {lostFoundAcquisition.sourceSummaries.length > 0 ? (
                    lostFoundAcquisition.sourceSummaries.map((source) => (
                      <div key={source.source} className="flex items-center justify-between gap-3">
                        <span>{source.source}</span>
                        <span className="font-semibold text-[#163462]">
                          {formatCount(source.count)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p>분실/목격 source가 아직 없습니다.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
                <h3 className="text-sm font-semibold text-[#1f3f71]">이벤트 구성</h3>
                <div className="mt-3 space-y-2 text-xs text-[#4f678d]">
                  {lostFoundAcquisition.eventCounts.length > 0 ? (
                    lostFoundAcquisition.eventCounts.map((event) => (
                      <div key={event.event} className="flex items-center justify-between gap-3">
                        <span>{event.label}</span>
                        <span className="font-semibold text-[#163462]">
                          {formatCount(event.count)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p>분실/목격 획득 이벤트가 아직 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tp-card flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#10284a]">초기 지역 운영 지표</h2>
              <p className="text-xs text-[#5a7398]">
                전국 MAU보다 동네별 정보 밀도, 첫 글 전환, 24시간 반응을 먼저 봅니다.
              </p>
            </div>
            <p className="text-xs font-semibold text-[#315b9a]">최근 {initialRegion.days}일</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">첫 글 작성률</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatPercent(initialRegion.firstParticipation.firstPostRate)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">
                신규 {formatCount(initialRegion.firstParticipation.newUserCount)}명 중{" "}
                {formatCount(initialRegion.firstParticipation.firstPostAuthorCount)}명 작성
              </p>
            </div>
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">첫 글 24h 댓글 수신율</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatPercent(initialRegion.firstParticipation.firstPostComment24hRate)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">
                첫 글 {formatCount(initialRegion.firstParticipation.firstPostCount)}건 중{" "}
                {formatCount(initialRegion.firstParticipation.firstPostWithComment24hCount)}건
              </p>
            </div>
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">7일 재방문률</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatPercent(initialRegion.retention.d7ReturnRate)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">
                코호트 {formatCount(initialRegion.retention.cohortUserCount)}명 중{" "}
                {formatCount(initialRegion.retention.returnedUserCount)}명 재행동
              </p>
            </div>
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">카카오 공유 클릭</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatCount(initialRegion.acquisition.kakaoShareClickCount)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">
                템플릿 진입 {formatCount(initialRegion.acquisition.writeTemplateOpenedCount)}건
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#1f3f71]">동네별 콘텐츠 밀도</h3>
                <span className="text-[11px] text-[#6a7f9f]">
                  병원 {formatCount(initialRegion.contentTotals.hospitals)} · 산책{" "}
                  {formatCount(initialRegion.contentTotals.walks)} · 분실{" "}
                  {formatCount(initialRegion.contentTotals.lost)}
                </span>
              </div>
              <div className="mt-3 overflow-x-auto">
                {initialRegion.topNeighborhoods.length > 0 ? (
                  <table className="w-full min-w-[620px] text-left text-xs text-[#355988]">
                    <thead className="border-b border-[#dbe6f6] text-[10px] uppercase tracking-[0.2em] text-[#5b78a1]">
                      <tr>
                        <th className="py-2">동네</th>
                        <th className="py-2">전체</th>
                        <th className="py-2">병원</th>
                        <th className="py-2">산책</th>
                        <th className="py-2">분실</th>
                        <th className="py-2">중고</th>
                        <th className="py-2">빈 카테고리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {initialRegion.topNeighborhoods.map((neighborhood) => (
                        <tr key={neighborhood.neighborhoodId} className="border-b border-[#edf2fb]">
                          <td className="py-3 font-semibold text-[#163462]">{neighborhood.label}</td>
                          <td className="py-3">{formatCount(neighborhood.totalCount)}</td>
                          {Object.entries(INITIAL_REGION_CATEGORY_LABELS).map(([key]) => (
                            <td key={key} className="py-3">
                              {formatCount(
                                neighborhood.categories[
                                  key as keyof typeof INITIAL_REGION_CATEGORY_LABELS
                                ],
                              )}
                            </td>
                          ))}
                          <td className="py-3">
                            {neighborhood.emptyCategoryLabels.length > 0
                              ? neighborhood.emptyCategoryLabels.join(", ")
                              : "없음"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState
                    title="동네별 콘텐츠가 없습니다"
                    description="동네가 지정된 병원, 산책, 분실, 중고 글이 쌓이면 지역 밀도를 볼 수 있습니다."
                  />
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <h3 className="text-sm font-semibold text-[#1f3f71]">분실동물 상태</h3>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#4f678d]">
                  <div className="flex items-center justify-between gap-2">
                    <dt>활성</dt>
                    <dd className="font-semibold text-[#163462]">
                      {formatCount(initialRegion.lostFound.activeCount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>해결</dt>
                    <dd className="font-semibold text-[#163462]">
                      {formatCount(initialRegion.lostFound.resolvedCount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>종료</dt>
                    <dd className="font-semibold text-[#163462]">
                      {formatCount(initialRegion.lostFound.closedCount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt>목격 댓글</dt>
                    <dd className="font-semibold text-[#163462]">
                      {formatCount(initialRegion.lostFound.sightingCommentCount)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
                <h3 className="text-sm font-semibold text-[#1f3f71]">병원/장소 확인 상태</h3>
                <p className="mt-2 text-xs leading-5 text-[#5a7398]">
                  운영자 콘텐츠 {formatCount(initialRegion.operatorContent.totalCount)}건 · 확인일
                  누락 {formatCount(initialRegion.operatorContent.missingVerificationCount)}건 · 가장 오래된
                  확인일 {formatOptionalDate(initialRegion.operatorContent.oldestVerifiedAt)}
                </p>
                <div className="mt-3 space-y-2">
                  {initialRegion.operatorContent.staleItems.length > 0 ? (
                    initialRegion.operatorContent.staleItems.map((item) => (
                      <div key={item.postId} className="rounded-lg border border-[#edf2fb] px-3 py-2 text-xs">
                        <p className="font-semibold text-[#163462]">{item.title}</p>
                        <p className="mt-1 text-[#6a7f9f]">
                          {getPostTypeMeta(item.type).label} · {item.neighborhoodLabel} · 확인{" "}
                          {formatOptionalDate(item.operatorLastVerifiedAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#6a7f9f]">확인할 운영자 콘텐츠가 없습니다.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
                <h3 className="text-sm font-semibold text-[#1f3f71]">획득 이벤트 상위</h3>
                <div className="mt-3 space-y-2 text-xs text-[#4f678d]">
                  {initialRegion.acquisition.eventSummaries.length > 0 ? (
                    initialRegion.acquisition.eventSummaries.map((event) => (
                      <div key={event.event} className="flex items-center justify-between gap-3">
                        <span>{event.label}</span>
                        <span className="font-semibold text-[#163462]">
                          {formatCount(event.count)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p>획득 이벤트가 아직 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tp-card flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#10284a]">정정 요청 전환</h2>
              <p className="text-xs text-[#5a7398]">
                운영자 콘텐츠와 public 정정 요청 화면의 조회, 접수, 접수 후 다음 행동을 확인합니다.
              </p>
            </div>
            <p className="text-xs font-semibold text-[#315b9a]">
              최근 {correctionFlow.days}일
              {correctionFlow.schemaSyncRequired ? " · schema sync 필요" : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">정정 화면 조회</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatCount(correctionFlow.viewCount)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">CORRECTION_FLOW_VIEWED</p>
            </div>
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">정정 요청 접수</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatCount(correctionFlow.submittedCount)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">CORRECTION_REQUEST_SUBMITTED</p>
            </div>
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">접수 전환율</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatPercent(correctionFlow.submitRate)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">접수 / 화면 조회</p>
            </div>
            <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <p className="text-xs text-[#5a7398]">접수 후 CTA</p>
              <p className="mt-2 text-2xl font-bold text-[#10284a]">
                {formatCount(correctionFlow.receiptCtaClickCount)}
              </p>
              <p className="mt-1 text-[11px] text-[#6a7f9f]">
                접수 대비 {formatPercent(correctionFlow.receiptCtaRate)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#1f3f71]">일자별 추세</h3>
              <span className="text-[11px] font-semibold text-[#5a7398]">최근 이벤트 발생일</span>
            </div>
            <div className="mt-3 divide-y divide-[#e4edf8] text-xs">
              {correctionFlow.dailySummaries.length > 0 ? (
                correctionFlow.dailySummaries.map((summary) => (
                  <div
                    key={summary.day}
                    className="grid gap-2 py-2 text-[#4f678d] sm:grid-cols-[0.9fr_1fr_1fr_1fr_1fr]"
                  >
                    <span className="font-semibold text-[#163462]">
                      {formatDayLabel(summary.day)}
                    </span>
                    <span>조회 {formatCount(summary.viewCount)}</span>
                    <span>접수 {formatCount(summary.submittedCount)}</span>
                    <span>전환 {formatPercent(summary.submitRate)}</span>
                    <span>CTA {formatCount(summary.receiptCtaClickCount)}</span>
                  </div>
                ))
              ) : (
                <p className="py-1 text-[#6a7f9f]">일자별 정정 요청 이벤트가 아직 없습니다.</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
              <h3 className="text-sm font-semibold text-[#1f3f71]">이벤트 구성</h3>
              <div className="mt-3 space-y-2 text-xs text-[#4f678d]">
                {correctionFlow.eventCounts.length > 0 ? (
                  correctionFlow.eventCounts.map((event) => (
                    <div key={event.event} className="flex items-center justify-between gap-3">
                      <span>{event.event}</span>
                      <span className="font-semibold text-[#163462]">
                        {formatCount(event.count)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>정정 요청 획득 이벤트가 아직 없습니다.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#dbe6f6] bg-white p-3">
              <h3 className="text-sm font-semibold text-[#1f3f71]">유입 source</h3>
              <div className="mt-3 space-y-2 text-xs text-[#4f678d]">
                {correctionFlow.sourceSummaries.length > 0 ? (
                  correctionFlow.sourceSummaries.map((source) => (
                    <div key={source.source} className="flex items-center justify-between gap-3">
                      <span>{source.source}</span>
                      <span className="font-semibold text-[#163462]">
                        {formatCount(source.count)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>정정 요청 source가 아직 없습니다.</p>
                )}
              </div>
            </div>
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
                <option value={PostScope.GLOBAL}>전체 검색</option>
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
                      <div key={`zero:${term.term}`} className="space-y-2 rounded-lg border border-[#edf2fb] p-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-[#163462]">{term.term}</span>
                          <span>{formatCount(term.zeroResultCount)}회</span>
                        </div>
                        <p className="text-[11px] text-[#6a7f9f]">
                          0건 비율 {formatPercent(term.zeroResultRate)} · 평균 결과{" "}
                          {term.averageResultCount.toFixed(1)}건 · 최근 {term.lastResultCount ?? "-"}건
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${formatSearchActionClass(term.action.priority)}`}
                          >
                            {term.action.label}
                          </span>
                          <Link
                            href={buildSearchHref({
                              searchScope: selectedSearchScope,
                              searchType: selectedSearchType,
                              searchIn: selectedSearchIn,
                              query: term.term,
                            })}
                            className="text-[11px] font-semibold text-[#1f5fae] underline-offset-2 hover:underline"
                          >
                            검색 재현
                          </Link>
                        </div>
                        <p className="text-[11px] leading-5 text-[#6a7f9f]">{term.action.description}</p>
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
                      <div key={`low:${term.term}`} className="space-y-2 rounded-lg border border-[#edf2fb] p-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-[#163462]">{term.term}</span>
                          <span>{term.averageResultCount.toFixed(1)}건</span>
                        </div>
                        <p className="text-[11px] text-[#6a7f9f]">
                          누적 {formatCount(term.count)}회 · 0건 비율 {formatPercent(term.zeroResultRate)} · 최근{" "}
                          {term.lastResultCount ?? "-"}건
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${formatSearchActionClass(term.action.priority)}`}
                          >
                            {term.action.label}
                          </span>
                          <Link
                            href={buildSearchHref({
                              searchScope: selectedSearchScope,
                              searchType: selectedSearchType,
                              searchIn: selectedSearchIn,
                              query: term.term,
                            })}
                            className="text-[11px] font-semibold text-[#1f5fae] underline-offset-2 hover:underline"
                          >
                            검색 재현
                          </Link>
                        </div>
                        <p className="text-[11px] leading-5 text-[#6a7f9f]">{term.action.description}</p>
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
                <Link
                  href="/admin/care-feedbacks"
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3 transition hover:border-amber-300 hover:bg-amber-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-amber-800">돌봄 이슈 신호</p>
                      <p className="mt-2 text-2xl font-bold text-amber-900">
                        {formatCount(overview.careFeedbacks.totalCount)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${careThresholdClass.badge}`}
                    >
                      {formatCareFeedbackThresholdLabel(careThreshold.severity)}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-amber-900">
                    <div className="flex items-center justify-between gap-2">
                      <dt>대기</dt>
                      <dd className="font-semibold">{formatCount(careThreshold.pendingCount)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt>검토 중</dt>
                      <dd className="font-semibold">{formatCount(careThreshold.reviewingCount)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt>해결</dt>
                      <dd className="font-semibold">{formatCount(careThreshold.resolvedCount)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt>종료</dt>
                      <dd className="font-semibold">{formatCount(careThreshold.dismissedCount)}</dd>
                    </div>
                  </dl>
                  <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] ${careThresholdClass.panel}`}>
                    {careThreshold.messages.map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </div>
                </Link>
              </div>
              <div className="mt-3 rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <p className="text-xs text-[#5a7398]">병원 후기 CTR</p>
                <p className="mt-2 text-2xl font-bold text-[#10284a]">
                  {formatPercent(overview.personalization.totals.postCtr)}
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-[#dbe6f6] bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1f3f71]">
                      관리자 큐 smoke 준비
                    </h3>
                    <p className="mt-1 text-xs text-[#5a7398]">
                      운영 신고/정정 큐 인증 smoke 실행 조건
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold ${formatAdminQueueSmokeStatusClass(adminQueueSmoke.status)}`}
                  >
                    {adminQueueSmoke.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[#4f678d] sm:grid-cols-2">
                  <div className="border-t border-[#e4edf8] pt-2">
                    <p className="font-semibold text-[#163462]">필수 환경 변수</p>
                    <p className="mt-1">
                      {adminQueueSmoke.configuredKeys.length} /{" "}
                      {adminQueueSmoke.requiredKeys.length} 설정됨
                    </p>
                  </div>
                  <div className="border-t border-[#e4edf8] pt-2">
                    <p className="font-semibold text-[#163462]">누락 key</p>
                    <p className="mt-1">
                      {adminQueueSmoke.missingKeys.length > 0
                        ? adminQueueSmoke.missingKeys.join(", ")
                        : "없음"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2 border-t border-[#e4edf8] pt-2 text-[11px] text-[#5a7398]">
                  <div>
                    <p className="font-semibold text-[#163462]">원격 인증 smoke</p>
                    <p className="mt-1 break-all">{adminQueueSmoke.command}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#163462]">로컬 fixture smoke</p>
                    <p className="mt-1 leading-5">{adminQueueSmoke.localFixtureNote}</p>
                    <p className="mt-1 break-all">{adminQueueSmoke.localFixtureCommand}</p>
                  </div>
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
