import {
  ModerationActionType,
  ModerationTargetType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/server/logger";

type ModerationActionLogDelegate = {
  create(args: Prisma.ModerationActionLogCreateArgs): Promise<unknown>;
};

export type ModerationActionLogInput = {
  actorId: string;
  action: ModerationActionType;
  targetType: ModerationTargetType;
  targetId: string;
  targetUserId?: string | null;
  reportId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export async function createModerationActionLog(params: {
  delegate?: ModerationActionLogDelegate;
  input: ModerationActionLogInput;
}) {
  const delegate = params.delegate ?? prisma.moderationActionLog;
  return delegate.create({
    data: {
      actorId: params.input.actorId,
      action: params.input.action,
      targetType: params.input.targetType,
      targetId: params.input.targetId,
      targetUserId: params.input.targetUserId ?? null,
      reportId: params.input.reportId ?? null,
      metadata: params.input.metadata ?? undefined,
    },
  });
}

export async function createModerationActionLogs(params: {
  delegate?: ModerationActionLogDelegate;
  inputs: ModerationActionLogInput[];
}) {
  for (const input of params.inputs) {
    await createModerationActionLog({
      delegate: params.delegate,
      input,
    });
  }
}

export async function recordModerationAction(input: ModerationActionLogInput) {
  try {
    await createModerationActionLog({ input });
  } catch (error) {
    logger.warn("Moderation action log write failed.", {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reportId: input.reportId ?? null,
      error: serializeError(error),
    });
  }
}
