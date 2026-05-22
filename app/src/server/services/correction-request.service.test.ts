import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CorrectionRequesterRole,
  CorrectionRequestStatus,
  CorrectionRequestTargetType,
  PostStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  createInformationCorrectionRequest,
  updateInformationCorrectionRequest,
} from "@/server/services/correction-request.service";
import { enforceRateLimit } from "@/server/rate-limit";
import { recordModerationAction } from "@/server/moderation-action-log";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: vi.fn(),
    },
    informationCorrectionRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/server/moderation-action-log", () => ({
  recordModerationAction: vi.fn(),
}));

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockRecordModerationAction = vi.mocked(recordModerationAction);
const mockPostFindUnique = prisma.post.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockCorrectionCreate = prisma.informationCorrectionRequest.create as unknown as ReturnType<typeof vi.fn>;
const mockCorrectionFindUnique = prisma.informationCorrectionRequest.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockCorrectionUpdate = prisma.informationCorrectionRequest.update as unknown as ReturnType<typeof vi.fn>;

describe("correction request service", () => {
  beforeEach(() => {
    mockEnforceRateLimit.mockReset();
    mockRecordModerationAction.mockReset();
    mockPostFindUnique.mockReset();
    mockCorrectionCreate.mockReset();
    mockCorrectionFindUnique.mockReset();
    mockCorrectionUpdate.mockReset();
    mockEnforceRateLimit.mockResolvedValue(undefined);
  });

  it("creates public correction requests with hashed IP and optional post link", async () => {
    mockPostFindUnique.mockResolvedValue({ id: "ckc7k5qsj0000u0t8qv6d1d7k", status: PostStatus.ACTIVE });
    mockCorrectionCreate.mockResolvedValue({
      id: "correction-1",
      status: CorrectionRequestStatus.PENDING,
    });

    const result = await createInformationCorrectionRequest({
      requesterUserId: null,
      clientIp: "203.0.113.10",
      input: {
        postId: "ckc7k5qsj0000u0t8qv6d1d7k",
        targetType: CorrectionRequestTargetType.HOSPITAL,
        targetName: "타운동물병원",
        requesterRole: CorrectionRequesterRole.BUSINESS_OWNER,
        requesterName: "홍길동",
        requesterEmail: "owner@example.com",
        requestedChange: "영업시간이 실제와 달라 최신 정보로 정정해 주세요.",
      },
    });

    expect(result).toEqual({
      id: "correction-1",
      status: CorrectionRequestStatus.PENDING,
    });
    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/^correction-request:create:/),
        limit: 5,
      }),
    );
    expect(mockCorrectionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetName: "타운동물병원",
        requesterEmail: "owner@example.com",
        requesterUserId: null,
        clientIpHash: expect.any(String),
      }),
      select: expect.any(Object),
    });
  });

  it("rejects correction requests for inactive or missing posts", async () => {
    mockPostFindUnique.mockResolvedValue(null);

    await expect(
      createInformationCorrectionRequest({
        requesterUserId: null,
        clientIp: "203.0.113.10",
        input: {
          postId: "ckc7k5qsj0000u0t8qv6d1d7k",
          targetType: CorrectionRequestTargetType.HOSPITAL,
          targetName: "타운동물병원",
          requesterRole: CorrectionRequesterRole.BUSINESS_OWNER,
          requesterName: "홍길동",
          requesterEmail: "owner@example.com",
          requestedChange: "영업시간이 실제와 달라 최신 정보로 정정해 주세요.",
        },
      }),
    ).rejects.toMatchObject({ code: "POST_NOT_FOUND", status: 404 });
  });

  it("updates status and records moderation action log", async () => {
    mockCorrectionFindUnique.mockResolvedValue({
      id: "correction-1",
      status: CorrectionRequestStatus.PENDING,
    });
    mockCorrectionUpdate.mockResolvedValue({
      id: "correction-1",
      status: CorrectionRequestStatus.RESOLVED,
      targetType: CorrectionRequestTargetType.HOSPITAL,
      targetName: "타운동물병원",
      resolution: "공식 홈페이지 기준으로 수정",
    });

    await updateInformationCorrectionRequest({
      requestId: "correction-1",
      moderatorId: "moderator-1",
      input: {
        status: CorrectionRequestStatus.RESOLVED,
        resolution: "공식 홈페이지 기준으로 수정",
      },
    });

    expect(mockCorrectionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "correction-1" },
        data: expect.objectContaining({
          status: CorrectionRequestStatus.RESOLVED,
          resolvedBy: "moderator-1",
          resolvedAt: expect.any(Date),
        }),
      }),
    );
    expect(mockRecordModerationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "moderator-1",
        targetType: "CORRECTION_REQUEST",
        targetId: "correction-1",
      }),
    );
  });
});
