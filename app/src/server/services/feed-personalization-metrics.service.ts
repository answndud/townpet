import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeFeedAudienceDimension } from "@/lib/feed-personalization-metrics";
import type { FeedPersonalizationMetricInput } from "@/lib/validations/feed-personalization";

type RecordFeedPersonalizationMetricResult =
  | { ok: true; recorded: true }
  | { ok: false; reason: "SCHEMA_SYNC_REQUIRED" };

type RecordFeedPersonalizationMetricInput = FeedPersonalizationMetricInput & {
  userId?: string | null;
};

function getFeedPersonalizationStatDelegate() {
  return (
    prisma as typeof prisma & {
      feedPersonalizationStat?: {
        upsert: (typeof prisma.feedPersonalizationStat)["upsert"];
      };
    }
  ).feedPersonalizationStat;
}

function getFeedPersonalizationEventLogDelegate() {
  return (
    prisma as typeof prisma & {
      feedPersonalizationEventLog?: {
        create: (typeof prisma.feedPersonalizationEventLog)["create"];
      };
    }
  ).feedPersonalizationEventLog;
}

function isMissingFeedPersonalizationSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return (
      tableName.includes("FeedPersonalizationStat") ||
      columnName.includes("FeedPersonalizationStat")
    );
  }

  return (
    error instanceof Error &&
    error.message.includes("FeedPersonalizationStat") &&
    (error.message.includes("does not exist") ||
      error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
}

function isMissingFeedPersonalizationEventLogSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return (
      tableName.includes("FeedPersonalizationEventLog") ||
      columnName.includes("FeedPersonalizationEventLog")
    );
  }

  return (
    error instanceof Error &&
    error.message.includes("FeedPersonalizationEventLog") &&
    (error.message.includes("does not exist") ||
      error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
}

function getDayBucket(date = new Date()) {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

function shouldRecordUserLevelEvent(input: RecordFeedPersonalizationMetricInput) {
  return Boolean(
    input.userId &&
      (input.event === "POST_CLICK" || input.event === "AD_CLICK"),
  );
}

export async function recordFeedPersonalizationMetric(
  input: RecordFeedPersonalizationMetricInput,
): Promise<RecordFeedPersonalizationMetricResult> {
  const delegate = getFeedPersonalizationStatDelegate();
  if (!delegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" };
  }

  const day = getDayBucket();
  const audienceKey = normalizeFeedAudienceDimension(input.audienceKey);
  const breedCode = normalizeFeedAudienceDimension(input.breedCode);
  const postId = input.postId?.trim() || null;

  try {
    await delegate.upsert({
      where: {
        day_surface_event_audienceKey_breedCode_audienceSource: {
          day,
          surface: input.surface,
          event: input.event,
          audienceKey,
          breedCode,
          audienceSource: input.audienceSource,
        },
      },
      create: {
        day,
        surface: input.surface,
        event: input.event,
        audienceKey,
        breedCode,
        audienceSource: input.audienceSource,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });

    if (!shouldRecordUserLevelEvent(input)) {
      return { ok: true, recorded: true };
    }

    const eventLogDelegate = getFeedPersonalizationEventLogDelegate();
    if (!eventLogDelegate || !input.userId) {
      return { ok: true, recorded: true };
    }

    try {
      await eventLogDelegate.create({
        data: {
          userId: input.userId,
          postId: input.event === "POST_CLICK" ? postId : null,
          surface: input.surface,
          event: input.event,
          audienceKey,
          breedCode,
          audienceSource: input.audienceSource,
        },
      });
    } catch (eventLogError) {
      if (!isMissingFeedPersonalizationEventLogSchemaError(eventLogError)) {
        throw eventLogError;
      }
    }

    return { ok: true, recorded: true };
  } catch (error) {
    if (isMissingFeedPersonalizationSchemaError(error)) {
      return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" };
    }
    throw error;
  }
}
