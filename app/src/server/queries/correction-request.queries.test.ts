import { beforeEach, describe, expect, it, vi } from "vitest";
import { CorrectionRequestStatus, PostScope, PostStatus, PostType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import {
  getCorrectionRequestPostContext,
  getCorrectionRequestQueueSummary,
  listInformationCorrectionRequests,
} from "@/server/queries/correction-request.queries";

vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    informationCorrectionRequest: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    post: {
      findFirst: vi.fn(),
    },
  },
}));

const mockFindMany = vi.mocked(prisma.informationCorrectionRequest.findMany);
const mockCount = vi.mocked(prisma.informationCorrectionRequest.count);
const mockPostFindFirst = vi.mocked(prisma.post.findFirst);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(getGuestReadLoginRequiredPostTypes);

describe("correction request queries", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockCount.mockReset();
    mockPostFindFirst.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([PostType.HOSPITAL_REVIEW]);
  });

  it("includes operator content post markers for the admin queue", async () => {
    mockFindMany.mockResolvedValue([] as never);

    await listInformationCorrectionRequests({
      status: CorrectionRequestStatus.PENDING,
      query: "운영자",
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          post: {
            select: expect.objectContaining({
              isOperatorContent: true,
              operatorSourceName: true,
              operatorLastVerifiedAt: true,
            }),
          },
        }),
      }),
    );
  });

  it("loads active post context for public correction prefill", async () => {
    mockPostFindFirst.mockResolvedValue({
      id: "ckc7k5qsj0000u0t8qv6d1d7k",
      title: "동네 병원 운영자 정리",
      type: PostType.HOSPITAL_REVIEW,
      scope: PostScope.LOCAL,
      isOperatorContent: true,
      operatorSourceName: "TownPet 운영자 정리",
      operatorLastVerifiedAt: new Date("2026-05-26T12:00:00.000Z"),
    } as never);

    await getCorrectionRequestPostContext(" ckc7k5qsj0000u0t8qv6d1d7k ");

    expect(mockPostFindFirst).toHaveBeenCalledWith({
      where: {
        id: "ckc7k5qsj0000u0t8qv6d1d7k",
        status: PostStatus.ACTIVE,
      },
      select: expect.objectContaining({
        isOperatorContent: true,
        operatorSourceName: true,
        operatorLastVerifiedAt: true,
        scope: true,
      }),
    });
  });

  it("does not expose non-operator post context when guests cannot read the post", async () => {
    mockPostFindFirst.mockResolvedValue({
      id: "local-post-1",
      title: "우리 동네 돌봄 요청",
      type: PostType.CARE_REQUEST,
      scope: PostScope.LOCAL,
      isOperatorContent: false,
      operatorSourceName: null,
      operatorLastVerifiedAt: null,
    } as never);

    await expect(getCorrectionRequestPostContext("local-post-1")).resolves.toBeNull();
  });

  it("allows non-operator post context only when guests can read the post", async () => {
    mockPostFindFirst.mockResolvedValue({
      id: "global-post-1",
      title: "전국 분실 제보",
      type: PostType.LOST_FOUND,
      scope: PostScope.GLOBAL,
      isOperatorContent: false,
      operatorSourceName: null,
      operatorLastVerifiedAt: null,
    } as never);

    await expect(getCorrectionRequestPostContext("global-post-1")).resolves.toMatchObject({
      id: "global-post-1",
      title: "전국 분실 제보",
    });
  });

  it("does not query when post id is empty", async () => {
    await expect(getCorrectionRequestPostContext(" ")).resolves.toBeNull();

    expect(mockPostFindFirst).not.toHaveBeenCalled();
  });

  it("summarizes active and operator-linked correction queue counts", async () => {
    mockCount
      .mockResolvedValueOnce(3 as never)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce(1 as never);

    await expect(getCorrectionRequestQueueSummary()).resolves.toEqual({
      pendingCount: 3,
      reviewingCount: 2,
      activeCount: 5,
      operatorPendingCount: 1,
    });

    expect(mockCount).toHaveBeenNthCalledWith(3, {
      where: {
        status: { in: [CorrectionRequestStatus.PENDING, CorrectionRequestStatus.REVIEWING] },
        post: { isOperatorContent: true },
      },
    });
  });
});
