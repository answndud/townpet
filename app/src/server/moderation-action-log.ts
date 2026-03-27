import {
  ModerationActionType,
  ModerationTargetType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/server/logger";

const MODERATION_ACTION_POLICY_UPDATED = "POLICY_UPDATED" as ModerationActionType;
const MODERATION_ACTION_AUTH_AUDIT_VIEWED = "AUTH_AUDIT_VIEWED" as ModerationActionType;
const MODERATION_ACTION_AUTH_AUDIT_EXPORTED = "AUTH_AUDIT_EXPORTED" as ModerationActionType;
const MODERATION_TARGET_SYSTEM = "SYSTEM" as ModerationTargetType;

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

export async function recordAdminPolicyUpdated(params: {
  actorId: string;
  policyKey: string;
  metadata?: Prisma.InputJsonValue | null;
}) {
  await recordModerationAction({
    actorId: params.actorId,
    action: MODERATION_ACTION_POLICY_UPDATED,
    targetType: MODERATION_TARGET_SYSTEM,
    targetId: params.policyKey,
    metadata: params.metadata ?? undefined,
  });
}

export async function recordAuthAuditViewed(params: {
  actorId: string;
  source: "page" | "api";
  actionFilter?: string | null;
  query?: string | null;
  limit?: number | null;
}) {
  await recordModerationAction({
    actorId: params.actorId,
    action: MODERATION_ACTION_AUTH_AUDIT_VIEWED,
    targetType: MODERATION_TARGET_SYSTEM,
    targetId: "auth-audits",
    metadata: {
      source: params.source,
      actionFilter: params.actionFilter ?? null,
      queryPresent: Boolean(params.query?.trim()),
      limit: params.limit ?? null,
    },
  });
}

export async function recordAuthAuditExported(params: {
  actorId: string;
  actionFilter?: string | null;
  query?: string | null;
  limit?: number | null;
  rowCount: number;
}) {
  await recordModerationAction({
    actorId: params.actorId,
    action: MODERATION_ACTION_AUTH_AUDIT_EXPORTED,
    targetType: MODERATION_TARGET_SYSTEM,
    targetId: "auth-audits",
    metadata: {
      actionFilter: params.actionFilter ?? null,
      queryPresent: Boolean(params.query?.trim()),
      limit: params.limit ?? null,
      rowCount: params.rowCount,
    },
  });
}
