import { CareApplicationStatus, CareRequestStatus } from "@prisma/client";

import { logger, serializeError } from "@/server/logger";
import {
  notifyCareApplicationCreated,
  notifyCareApplicationDecision,
  notifyCareRequestStatusChanged,
} from "@/server/services/notification.service";

import {
  notifyNotificationCacheChange,
  notifyPostCacheChange,
} from "./post-write-support";

export async function notifyCareRequestStatusChangedEffect(params: {
  recipientUserIds: string[];
  actorId: string;
  postId: string;
  postTitle: string;
  status: CareRequestStatus;
}) {
  const recipientUserIds = Array.from(new Set(params.recipientUserIds.filter(Boolean)));

  for (const recipientUserId of recipientUserIds) {
    try {
      await notifyCareRequestStatusChanged({
        recipientUserId,
        actorId: params.actorId,
        postId: params.postId,
        postTitle: params.postTitle,
        status: params.status,
      });
    } catch (error) {
      logger.warn("돌봄 요청 상태 변경 알림 생성에 실패했습니다.", {
        postId: params.postId,
        actorId: params.actorId,
        recipientUserId,
        error: serializeError(error),
      });
    }
  }

  notifyNotificationCacheChange(recipientUserIds);
  notifyPostCacheChange();
}

export async function notifyCareApplicationCreatedEffect(params: {
  recipientUserId: string;
  actorId: string;
  postId: string;
  applicationId: string;
  postTitle: string;
  message: string | null;
}) {
  try {
    await notifyCareApplicationCreated(params);
    notifyNotificationCacheChange([params.recipientUserId]);
  } catch (error) {
    logger.warn("돌봄 지원 생성 알림에 실패했습니다.", {
      postId: params.postId,
      applicantId: params.actorId,
      error: serializeError(error),
    });
  }

  notifyPostCacheChange();
}

export async function notifyCareApplicationDecisionEffect(params: {
  recipientUserId: string;
  actorId: string;
  postId: string;
  applicationId: string;
  postTitle: string;
  status: Extract<CareApplicationStatus, "ACCEPTED" | "DECLINED">;
}) {
  try {
    await notifyCareApplicationDecision(params);
    notifyNotificationCacheChange([params.recipientUserId]);
  } catch (error) {
    logger.warn("돌봄 지원 결정 알림에 실패했습니다.", {
      applicationId: params.applicationId,
      actorId: params.actorId,
      error: serializeError(error),
    });
  }

  notifyPostCacheChange();
}
