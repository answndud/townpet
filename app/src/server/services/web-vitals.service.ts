import { Prisma, type WebVitalMetric, type WebVitalRating } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { WebVitalValidatedPayload } from "@/lib/validations/web-vitals";

type RecordWebVitalResult =
  | { ok: true; recorded: true }
  | { ok: false; reason: "SCHEMA_SYNC_REQUIRED" };

function getWebVitalSampleDelegate() {
  return (
    prisma as typeof prisma & {
      webVitalSample?: {
        create: (typeof prisma.webVitalSample)["create"];
      };
    }
  ).webVitalSample;
}

function isMissingWebVitalSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return tableName.includes("WebVitalSample") || columnName.includes("WebVitalSample");
  }

  return (
    error instanceof Error &&
    error.message.includes("WebVitalSample") &&
    (error.message.includes("does not exist") ||
      error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
}

function compactOptional(value: string | null | undefined, fallback = "unknown") {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized.slice(0, 128) : fallback;
}

export async function recordWebVitalSample(
  input: WebVitalValidatedPayload,
): Promise<RecordWebVitalResult> {
  const delegate = getWebVitalSampleDelegate();
  if (!delegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" };
  }

  try {
    await delegate.create({
      data: {
        metric: input.metric as WebVitalMetric,
        value: input.value,
        rating: input.rating as WebVitalRating,
        route: input.route,
        navigationType: compactOptional(input.navigationType),
        deviceType: compactOptional(input.deviceType),
        connectionType: compactOptional(input.connectionType),
      },
    });
  } catch (error) {
    if (isMissingWebVitalSchemaError(error)) {
      return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" };
    }
    throw error;
  }

  return { ok: true, recorded: true };
}
