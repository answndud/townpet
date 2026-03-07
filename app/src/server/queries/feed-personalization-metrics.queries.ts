import {
  FeedAudienceSource,
  FeedPersonalizationEvent,
  FeedPersonalizationSurface,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type FeedPersonalizationSurfaceSummary = {
  surface: FeedPersonalizationSurface;
  viewCount: number;
  postClickCount: number;
  postCtr: number;
  adImpressionCount: number;
  adClickCount: number;
  adCtr: number;
};

export type FeedAudienceSourceSummary = {
  source: FeedAudienceSource;
  viewCount: number;
  postClickCount: number;
  postCtr: number;
  adImpressionCount: number;
  adClickCount: number;
  adCtr: number;
};

export type FeedPersonalizationDailySummary = {
  date: string;
  viewCount: number;
  postClickCount: number;
  postCtr: number;
  adImpressionCount: number;
  adClickCount: number;
  adCtr: number;
};

export type FeedPersonalizationAudienceSummary = {
  audienceKey: string;
  breedCode: string;
  viewCount: number;
  postClickCount: number;
  postCtr: number;
  adImpressionCount: number;
  adClickCount: number;
  adCtr: number;
};

export type FeedPersonalizationOverview = {
  days: number;
  totals: {
    viewCount: number;
    postClickCount: number;
    postCtr: number;
    adImpressionCount: number;
    adClickCount: number;
    adCtr: number;
  };
  surfaceSummaries: FeedPersonalizationSurfaceSummary[];
  sourceSummaries: FeedAudienceSourceSummary[];
  dailySummaries: FeedPersonalizationDailySummary[];
  topAudienceSummaries: FeedPersonalizationAudienceSummary[];
};

type MetricAccumulator = {
  viewCount: number;
  postClickCount: number;
  adImpressionCount: number;
  adClickCount: number;
};

function createMetricAccumulator(): MetricAccumulator {
  return {
    viewCount: 0,
    postClickCount: 0,
    adImpressionCount: 0,
    adClickCount: 0,
  };
}

function addMetricCount(
  target: MetricAccumulator,
  event: FeedPersonalizationEvent,
  count: number,
) {
  switch (event) {
    case FeedPersonalizationEvent.VIEW:
      target.viewCount += count;
      break;
    case FeedPersonalizationEvent.POST_CLICK:
      target.postClickCount += count;
      break;
    case FeedPersonalizationEvent.AD_IMPRESSION:
      target.adImpressionCount += count;
      break;
    case FeedPersonalizationEvent.AD_CLICK:
      target.adClickCount += count;
      break;
  }
}

function finalizeAccumulator(input: MetricAccumulator) {
  const postCtr =
    input.viewCount > 0 ? input.postClickCount / input.viewCount : 0;
  const adCtr =
    input.adImpressionCount > 0
      ? input.adClickCount / input.adImpressionCount
      : 0;

  return {
    ...input,
    postCtr,
    adCtr,
  };
}

function getStartDay(days: number) {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - (days - 1));
  return day;
}

export async function getFeedPersonalizationOverview(
  days = 14,
): Promise<FeedPersonalizationOverview> {
  const startDay = getStartDay(days);
  const rows = await prisma.feedPersonalizationStat.findMany({
    where: {
      day: { gte: startDay },
    },
    orderBy: [{ day: "asc" }, { surface: "asc" }, { event: "asc" }],
  });

  const totalAccumulator = createMetricAccumulator();
  const surfaceMap = new Map<FeedPersonalizationSurface, MetricAccumulator>();
  const sourceMap = new Map<FeedAudienceSource, MetricAccumulator>();
  const dailyMap = new Map<string, MetricAccumulator>();
  const audienceMap = new Map<string, MetricAccumulator & { breedCode: string }>();

  for (let index = 0; index < days; index += 1) {
    const day = new Date(startDay);
    day.setUTCDate(startDay.getUTCDate() + index);
    dailyMap.set(day.toISOString().slice(0, 10), createMetricAccumulator());
  }

  for (const row of rows) {
    addMetricCount(totalAccumulator, row.event, row.count);

    const surfaceSummary = surfaceMap.get(row.surface) ?? createMetricAccumulator();
    addMetricCount(surfaceSummary, row.event, row.count);
    surfaceMap.set(row.surface, surfaceSummary);

    const sourceSummary = sourceMap.get(row.audienceSource) ?? createMetricAccumulator();
    addMetricCount(sourceSummary, row.event, row.count);
    sourceMap.set(row.audienceSource, sourceSummary);

    const dailyKey = row.day.toISOString().slice(0, 10);
    const dailySummary = dailyMap.get(dailyKey) ?? createMetricAccumulator();
    addMetricCount(dailySummary, row.event, row.count);
    dailyMap.set(dailyKey, dailySummary);

    if (row.audienceKey !== "NONE") {
      const audienceSummary = audienceMap.get(row.audienceKey) ?? {
        ...createMetricAccumulator(),
        breedCode: row.breedCode,
      };
      addMetricCount(audienceSummary, row.event, row.count);
      if (audienceSummary.breedCode === "NONE" && row.breedCode !== "NONE") {
        audienceSummary.breedCode = row.breedCode;
      }
      audienceMap.set(row.audienceKey, audienceSummary);
    }
  }

  return {
    days,
    totals: finalizeAccumulator(totalAccumulator),
    surfaceSummaries: Object.values(FeedPersonalizationSurface).map((surface) => ({
      surface,
      ...finalizeAccumulator(surfaceMap.get(surface) ?? createMetricAccumulator()),
    })),
    sourceSummaries: Object.values(FeedAudienceSource).map((source) => ({
      source,
      ...finalizeAccumulator(sourceMap.get(source) ?? createMetricAccumulator()),
    })),
    dailySummaries: Array.from(dailyMap.entries()).map(([date, accumulator]) => ({
      date,
      ...finalizeAccumulator(accumulator),
    })),
    topAudienceSummaries: Array.from(audienceMap.entries())
      .map(([audienceKey, accumulator]) => ({
        audienceKey,
        breedCode: accumulator.breedCode,
        ...finalizeAccumulator(accumulator),
      }))
      .sort((left, right) => {
        const leftEngagement = left.postClickCount + left.adClickCount;
        const rightEngagement = right.postClickCount + right.adClickCount;
        if (rightEngagement !== leftEngagement) {
          return rightEngagement - leftEngagement;
        }
        return right.viewCount + right.adImpressionCount - (left.viewCount + left.adImpressionCount);
      })
      .slice(0, 10),
  };
}
