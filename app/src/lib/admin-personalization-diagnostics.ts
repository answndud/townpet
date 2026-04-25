import type {
  FeedPersonalizationAudienceSummary,
  FeedPersonalizationOverview,
} from "@/server/queries/feed-personalization-metrics.queries";

export type PersonalizationDiagnosticLevel =
  | "normal"
  | "watch"
  | "action"
  | "pending";

export type PersonalizationDiagnostic = {
  id: "data" | "postCtr" | "adCtr" | "audience";
  label: string;
  level: PersonalizationDiagnosticLevel;
  status: string;
  detail: string;
  nextAction: string;
  href: string;
  hrefLabel: string;
};

const MIN_POST_CTR_VIEWS = 200;
const MIN_AD_CTR_IMPRESSIONS = 500;
const MIN_AUDIENCE_CONCENTRATION_VIEWS = 100;

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function getTopAudienceShare(
  topAudienceSummaries: FeedPersonalizationAudienceSummary[],
  totalViewCount: number,
) {
  if (totalViewCount <= 0 || topAudienceSummaries.length === 0) {
    return 0;
  }

  return topAudienceSummaries[0].viewCount / totalViewCount;
}

function buildDataDiagnostic(
  overview: FeedPersonalizationOverview,
): PersonalizationDiagnostic {
  const { viewCount, adImpressionCount } = overview.totals;
  const hasAudienceRows = overview.topAudienceSummaries.length > 0;

  if (viewCount === 0) {
    return {
      id: "data",
      label: "데이터 상태",
      level: "action",
      status: "개인화 조회 없음",
      detail: `${overview.days}일 동안 personalized feed view가 없습니다. 추천 정책보다 계측, 라우팅, 세그먼트 생성을 먼저 확인합니다.`,
      nextAction: "계측과 운영 상태 확인",
      href: "/admin/ops",
      hrefLabel: "Ops 보기",
    };
  }

  if (!hasAudienceRows) {
    return {
      id: "data",
      label: "데이터 상태",
      level: "watch",
      status: "Audience 행 없음",
      detail: "조회는 있으나 audience key 요약이 없습니다. 세그먼트 생성 또는 집계 파이프라인을 확인합니다.",
      nextAction: "품종 사전과 세그먼트 확인",
      href: "/admin/breeds",
      hrefLabel: "품종 사전",
    };
  }

  if (adImpressionCount === 0) {
    return {
      id: "data",
      label: "데이터 상태",
      level: "watch",
      status: "광고 노출 없음",
      detail: "개인화 조회는 있으나 광고 노출이 없습니다. 후보 없음, 비활성 상태, 서빙 계측 문제를 분리합니다.",
      nextAction: "정책과 운영 상태 확인",
      href: "/admin/policies",
      hrefLabel: "정책 설정",
    };
  }

  return {
    id: "data",
    label: "데이터 상태",
    level: "normal",
    status: "판단 가능",
    detail: "개인화 조회, 광고 노출, audience key 요약이 모두 있어 운영 판단을 시작할 수 있습니다.",
    nextAction: "필요 시 정책 후보 검토",
    href: "/admin/policies",
    hrefLabel: "정책 설정",
  };
}

function buildPostCtrDiagnostic(
  overview: FeedPersonalizationOverview,
): PersonalizationDiagnostic {
  const { viewCount, postCtr } = overview.totals;

  if (viewCount < MIN_POST_CTR_VIEWS) {
    return {
      id: "postCtr",
      label: "Feed CTR",
      level: "pending",
      status: "표본 부족",
      detail: `조회 ${viewCount}건입니다. 운영 기준은 최소 ${MIN_POST_CTR_VIEWS}건 이후 판단합니다.`,
      nextAction: "데이터 축적 후 재검토",
      href: "/admin/personalization?days=30",
      hrefLabel: "30일 보기",
    };
  }

  if (postCtr < 0.01) {
    return {
      id: "postCtr",
      label: "Feed CTR",
      level: "action",
      status: "저성과 조치",
      detail: `게시글 CTR ${formatPercent(postCtr)}입니다. surface/source와 최근 정책 변경을 함께 확인합니다.`,
      nextAction: "정책 후보와 Ops 안정성 확인",
      href: "/admin/ops",
      hrefLabel: "Ops 보기",
    };
  }

  if (postCtr < 0.03) {
    return {
      id: "postCtr",
      label: "Feed CTR",
      level: "watch",
      status: "주의 관찰",
      detail: `게시글 CTR ${formatPercent(postCtr)}입니다. 정책값을 올리기 전에 source별 반응을 비교합니다.`,
      nextAction: "정책값 후보 확인",
      href: "/admin/policies",
      hrefLabel: "정책 설정",
    };
  }

  return {
    id: "postCtr",
    label: "Feed CTR",
    level: "normal",
    status: "정상",
    detail: `게시글 CTR ${formatPercent(postCtr)}입니다. 현재 기간 기준으로 정상 범위입니다.`,
    nextAction: "현재 정책 유지",
    href: "/admin/policies",
    hrefLabel: "정책 설정",
  };
}

function buildAdCtrDiagnostic(
  overview: FeedPersonalizationOverview,
): PersonalizationDiagnostic {
  const { adImpressionCount, adCtr } = overview.totals;

  if (adImpressionCount < MIN_AD_CTR_IMPRESSIONS) {
    return {
      id: "adCtr",
      label: "Ad CTR",
      level: "pending",
      status: "표본 부족",
      detail: `광고 노출 ${adImpressionCount}건입니다. 운영 기준은 최소 ${MIN_AD_CTR_IMPRESSIONS}건 이후 판단합니다.`,
      nextAction: "데이터 축적 후 재검토",
      href: "/admin/personalization?days=30",
      hrefLabel: "30일 보기",
    };
  }

  if (adCtr < 0.0015 || adCtr > 0.04) {
    return {
      id: "adCtr",
      label: "Ad CTR",
      level: "action",
      status: "광고 조치",
      detail: `광고 CTR ${formatPercent(adCtr)}입니다. 소재, 라벨, 빈도 cap, 계측 오류를 확인합니다.`,
      nextAction: "광고와 정책 분리 확인",
      href: "/admin/policies",
      hrefLabel: "정책 설정",
    };
  }

  if (adCtr < 0.003 || adCtr > 0.025) {
    return {
      id: "adCtr",
      label: "Ad CTR",
      level: "watch",
      status: "주의 관찰",
      detail: `광고 CTR ${formatPercent(adCtr)}입니다. 추천 랭킹 가중치가 아니라 소재와 세그먼트 적합성을 봅니다.`,
      nextAction: "운영 기준 확인",
      href: "/admin/policies",
      hrefLabel: "정책 설정",
    };
  }

  return {
    id: "adCtr",
    label: "Ad CTR",
    level: "normal",
    status: "정상",
    detail: `광고 CTR ${formatPercent(adCtr)}입니다. 광고 신호는 커뮤니티 랭킹과 분리해 유지합니다.`,
    nextAction: "현재 기준 유지",
    href: "/admin/policies",
    hrefLabel: "정책 설정",
  };
}

function buildAudienceDiagnostic(
  overview: FeedPersonalizationOverview,
): PersonalizationDiagnostic {
  const { viewCount } = overview.totals;
  const topAudienceShare = getTopAudienceShare(
    overview.topAudienceSummaries,
    viewCount,
  );
  const topAudience = overview.topAudienceSummaries[0]?.audienceKey ?? "-";

  if (
    viewCount < MIN_AUDIENCE_CONCENTRATION_VIEWS ||
    overview.topAudienceSummaries.length === 0
  ) {
    return {
      id: "audience",
      label: "Audience 쏠림",
      level: "pending",
      status: "표본 부족",
      detail: `조회 ${viewCount}건입니다. 쏠림 판단은 audience 조회 ${MIN_AUDIENCE_CONCENTRATION_VIEWS}건 이후에 합니다.`,
      nextAction: "데이터 축적 후 재검토",
      href: "/admin/personalization?days=30",
      hrefLabel: "30일 보기",
    };
  }

  if (topAudienceShare > 0.5) {
    return {
      id: "audience",
      label: "Audience 쏠림",
      level: "action",
      status: "편향 조치",
      detail: `${topAudience} share가 ${formatPercent(topAudienceShare)}입니다. 품종 사전과 세그먼트 override를 확인합니다.`,
      nextAction: "품종 사전 확인",
      href: "/admin/breeds",
      hrefLabel: "품종 사전",
    };
  }

  if (topAudienceShare > 0.35) {
    return {
      id: "audience",
      label: "Audience 쏠림",
      level: "watch",
      status: "주의 관찰",
      detail: `${topAudience} share가 ${formatPercent(topAudienceShare)}입니다. exploration 확대 후보로 남깁니다.`,
      nextAction: "세그먼트 확인",
      href: "/admin/breeds",
      hrefLabel: "품종 사전",
    };
  }

  return {
    id: "audience",
    label: "Audience 쏠림",
    level: "normal",
    status: "정상",
    detail: `상위 audience share가 ${formatPercent(topAudienceShare)}입니다. 현재 기간 기준으로 쏠림 위험은 낮습니다.`,
    nextAction: "현재 기준 유지",
    href: "/admin/breeds",
    hrefLabel: "품종 사전",
  };
}

export function buildPersonalizationDiagnostics(
  overview: FeedPersonalizationOverview,
): PersonalizationDiagnostic[] {
  return [
    buildDataDiagnostic(overview),
    buildPostCtrDiagnostic(overview),
    buildAdCtrDiagnostic(overview),
    buildAudienceDiagnostic(overview),
  ];
}
