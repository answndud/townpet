import { createHash } from "crypto";
import {
  CorrectionRequestStatus,
  ModerationActionType,
  ModerationTargetType,
  PostStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  correctionRequestCreateSchema,
  correctionRequestUpdateSchema,
} from "@/lib/validations/moderation/correction-request";
import { enforceRateLimit } from "@/server/rate-limit";
import { recordModerationAction } from "@/server/moderation-action-log";
import { ServiceError } from "@/server/services/service-error";

type CreateCorrectionRequestParams = {
  input: unknown;
  requesterUserId?: string | null;
  clientIp: string;
};

type UpdateCorrectionRequestParams = {
  requestId: string;
  input: unknown;
  moderatorId: string;
};

function hashClientIp(value: string) {
  return createHash("sha256").update(value.trim() || "anonymous").digest("hex").slice(0, 32);
}

export async function createInformationCorrectionRequest({
  input,
  requesterUserId,
  clientIp,
}: CreateCorrectionRequestParams) {
  const parsed = correctionRequestCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("정정 요청 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const ipHash = hashClientIp(clientIp);
  await enforceRateLimit({
    key: `correction-request:create:${ipHash}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
    failureMode: "memory",
  });

  if (parsed.data.postId) {
    const post = await prisma.post.findUnique({
      where: { id: parsed.data.postId },
      select: { id: true, status: true },
    });
    if (!post || post.status !== PostStatus.ACTIVE) {
      throw new ServiceError("정정 요청 대상 글을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
    }
  }

  return prisma.informationCorrectionRequest.create({
    data: {
      requesterUserId: requesterUserId ?? null,
      postId: parsed.data.postId ?? null,
      targetType: parsed.data.targetType,
      targetName: parsed.data.targetName,
      requesterRole: parsed.data.requesterRole,
      organizationName: parsed.data.organizationName ?? null,
      requesterName: parsed.data.requesterName,
      requesterEmail: parsed.data.requesterEmail,
      requesterPhone: parsed.data.requesterPhone ?? null,
      requestedChange: parsed.data.requestedChange,
      evidenceUrl: parsed.data.evidenceUrl ?? null,
      clientIpHash: ipHash,
    },
    select: {
      id: true,
      status: true,
      targetType: true,
      targetName: true,
      createdAt: true,
    },
  });
}

export async function updateInformationCorrectionRequest({
  requestId,
  input,
  moderatorId,
}: UpdateCorrectionRequestParams) {
  const parsed = correctionRequestUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("정정 요청 처리 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existing = await prisma.informationCorrectionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new ServiceError("정정 요청을 찾을 수 없습니다.", "CORRECTION_REQUEST_NOT_FOUND", 404);
  }

  const shouldResolve =
    parsed.data.status === CorrectionRequestStatus.RESOLVED ||
    parsed.data.status === CorrectionRequestStatus.DISMISSED;

  const updated = await prisma.informationCorrectionRequest.update({
    where: { id: requestId },
    data: {
      status: parsed.data.status,
      resolution: parsed.data.resolution ?? null,
      resolvedBy: shouldResolve ? moderatorId : null,
      resolvedAt: shouldResolve ? new Date() : null,
    },
    include: {
      post: { select: { id: true, title: true } },
      resolver: { select: { id: true, email: true, nickname: true } },
    },
  });

  await recordModerationAction({
    actorId: moderatorId,
    action: ModerationActionType.CORRECTION_REQUEST_REVIEWED,
    targetType: ModerationTargetType.CORRECTION_REQUEST,
    targetId: updated.id,
    metadata: {
      previousStatus: existing.status,
      nextStatus: updated.status,
      targetType: updated.targetType,
      targetName: updated.targetName,
      hasResolution: Boolean(updated.resolution?.trim()),
    } satisfies Prisma.InputJsonObject,
  });

  return updated;
}
