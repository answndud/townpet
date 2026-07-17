import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  notifyCareApplicationCreated,
  notifyCareApplicationDecision,
  notifyCareRequestStatusChanged,
} from "@/server/services/notification.service";
import { logger } from "@/server/logger";

import {
  notifyCareApplicationCreatedEffect,
  notifyCareApplicationDecisionEffect,
  notifyCareRequestStatusChangedEffect,
} from "./post-care-side-effects";
import {
  notifyNotificationCacheChange,
  notifyPostCacheChange,
} from "./post-write-support";

vi.mock("@/server/logger", () => ({
  logger: { warn: vi.fn() },
  serializeError: (error: unknown) => error,
}));

vi.mock("@/server/services/notification.service", () => ({
  notifyCareApplicationCreated: vi.fn(),
  notifyCareApplicationDecision: vi.fn(),
  notifyCareRequestStatusChanged: vi.fn(),
}));

vi.mock("./post-write-support", () => ({
  notifyNotificationCacheChange: vi.fn(),
  notifyPostCacheChange: vi.fn(),
}));

describe("post care side-effect coordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notifyCareApplicationCreated).mockResolvedValue(null);
    vi.mocked(notifyCareApplicationDecision).mockResolvedValue(null);
    vi.mocked(notifyCareRequestStatusChanged).mockResolvedValue(null);
  });

  it("deduplicates status recipients and keeps cache refresh outside notification failure", async () => {
    vi.mocked(notifyCareRequestStatusChanged)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("notification unavailable"));

    await notifyCareRequestStatusChangedEffect({
      recipientUserIds: ["user-1", "user-1", "user-2"],
      actorId: "actor-1",
      postId: "post-1",
      postTitle: "돌봄 요청",
      status: "MATCHED",
    });

    expect(notifyCareRequestStatusChanged).toHaveBeenCalledTimes(2);
    expect(notifyNotificationCacheChange).toHaveBeenCalledWith(["user-1", "user-2"]);
    expect(notifyPostCacheChange).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("refreshes post and notification caches after application creation", async () => {
    await notifyCareApplicationCreatedEffect({
      recipientUserId: "author-1",
      actorId: "applicant-1",
      postId: "post-1",
      applicationId: "application-1",
      postTitle: "돌봄 요청",
      message: "지원합니다.",
    });

    expect(notifyCareApplicationCreated).toHaveBeenCalledOnce();
    expect(notifyNotificationCacheChange).toHaveBeenCalledWith(["author-1"]);
    expect(notifyPostCacheChange).toHaveBeenCalledOnce();
  });

  it("swallows decision notification failure while preserving the mutation response path", async () => {
    vi.mocked(notifyCareApplicationDecision).mockRejectedValueOnce(new Error("outbox unavailable"));

    await notifyCareApplicationDecisionEffect({
      recipientUserId: "applicant-1",
      actorId: "author-1",
      postId: "post-1",
      applicationId: "application-1",
      postTitle: "돌봄 요청",
      status: "ACCEPTED",
    });

    expect(notifyNotificationCacheChange).not.toHaveBeenCalled();
    expect(notifyPostCacheChange).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledOnce();
  });
});

