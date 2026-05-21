import { Prisma } from "@prisma/client";

import { normalizeAcquisitionDimension } from "@/lib/acquisition-events";
import { prisma } from "@/lib/prisma";
import type { AcquisitionEventPayload } from "@/lib/validations/acquisition-events";

type RecordAcquisitionEventResult =
  | { ok: true; recorded: true }
  | { ok: false; reason: "SCHEMA_SYNC_REQUIRED" };

function getAcquisitionEventStatDelegate() {
  return (
    prisma as typeof prisma & {
      acquisitionEventStat?: {
        upsert: (typeof prisma.acquisitionEventStat)["upsert"];
      };
    }
  ).acquisitionEventStat;
}

function isMissingAcquisitionEventSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return (
      tableName.includes("AcquisitionEventStat") ||
      columnName.includes("AcquisitionEventStat")
    );
  }

  return (
    error instanceof Error &&
    error.message.includes("AcquisitionEventStat") &&
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

export async function recordAcquisitionEvent(
  input: AcquisitionEventPayload,
): Promise<RecordAcquisitionEventResult> {
  const delegate = getAcquisitionEventStatDelegate();
  if (!delegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" };
  }

  const day = getDayBucket();
  const targetType = input.targetType ?? "NONE";
  const targetId = normalizeAcquisitionDimension(input.targetId);
  const source = normalizeAcquisitionDimension(input.source);

  try {
    await delegate.upsert({
      where: {
        day_surface_event_targetType_targetId_source: {
          day,
          surface: input.surface,
          event: input.event,
          targetType,
          targetId,
          source,
        },
      },
      create: {
        day,
        surface: input.surface,
        event: input.event,
        targetType,
        targetId,
        source,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  } catch (error) {
    if (isMissingAcquisitionEventSchemaError(error)) {
      return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" };
    }
    throw error;
  }

  return { ok: true, recorded: true };
}
