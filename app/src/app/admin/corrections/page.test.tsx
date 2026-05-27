import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CorrectionRequesterRole,
  CorrectionRequestStatus,
  CorrectionRequestTargetType,
  PostStatus,
  PostType,
  ReportReason,
  ReportStatus,
  ReportTarget,
} from "@prisma/client";

import AdminCorrectionRequestsPage from "@/app/admin/corrections/page";
import { requireModeratorPageUser } from "@/server/admin-page-access";
import {
  getCorrectionRequestQueueSummary,
  listInformationCorrectionRequests,
} from "@/server/queries/correction-request.queries";
import { getReportStats } from "@/server/queries/report.queries";

vi.mock("@/server/admin-page-access", () => ({
  requireModeratorPageUser: vi.fn(),
}));
vi.mock("@/server/queries/correction-request.queries", () => ({
  getCorrectionRequestQueueSummary: vi.fn(),
  listInformationCorrectionRequests: vi.fn(),
}));
vi.mock("@/server/queries/report.queries", () => ({
  getReportStats: vi.fn(),
}));
vi.mock("@/app/admin/corrections/actions", () => ({
  updateCorrectionRequestAction: vi.fn(),
}));

const mockRequireModeratorPageUser = vi.mocked(requireModeratorPageUser);
const mockGetCorrectionRequestQueueSummary = vi.mocked(getCorrectionRequestQueueSummary);
const mockListInformationCorrectionRequests = vi.mocked(listInformationCorrectionRequests);
const mockGetReportStats = vi.mocked(getReportStats);

describe("AdminCorrectionRequestsPage", () => {
  beforeEach(() => {
    mockRequireModeratorPageUser.mockReset();
    mockGetCorrectionRequestQueueSummary.mockReset();
    mockListInformationCorrectionRequests.mockReset();
    mockGetReportStats.mockReset();
    mockRequireModeratorPageUser.mockResolvedValue({ id: "mod-1" } as never);
    mockGetCorrectionRequestQueueSummary.mockResolvedValue({
      pendingCount: 2,
      reviewingCount: 1,
      activeCount: 3,
      operatorPendingCount: 2,
    });
    mockGetReportStats.mockResolvedValue({
      totalCount: 4,
      statusCounts: {
        [ReportStatus.PENDING]: 2,
        [ReportStatus.RESOLVED]: 1,
        [ReportStatus.DISMISSED]: 1,
      },
      reasonCounts: {
        [ReportReason.EMERGENCY]: 0,
        [ReportReason.PRIVACY]: 0,
        [ReportReason.FRAUD]: 0,
        [ReportReason.HARASSMENT]: 0,
        [ReportReason.FAKE]: 0,
        [ReportReason.SPAM]: 0,
        [ReportReason.INAPPROPRIATE]: 0,
        [ReportReason.OTHER]: 0,
      },
      targetCounts: {
        [ReportTarget.POST]: 2,
        [ReportTarget.COMMENT]: 2,
      },
      dailyCounts: [],
      averageResolutionHours: null,
    } as never);
  });

  it("marks correction requests linked from operator content", async () => {
    mockListInformationCorrectionRequests.mockResolvedValue([
      {
        id: "correction-1",
        targetType: CorrectionRequestTargetType.POST,
        targetName: "동네 병원 운영자 정리",
        status: CorrectionRequestStatus.PENDING,
        requesterRole: CorrectionRequesterRole.CUSTOMER,
        requesterName: "홍길동",
        requesterEmail: "user@example.com",
        requesterPhone: null,
        organizationName: null,
        requestedChange: "운영자 정리 글의 영업시간이 실제와 달라 정정해 주세요.",
        evidenceUrl: null,
        resolution: null,
        createdAt: new Date("2026-05-27T01:00:00.000Z"),
        resolvedAt: null,
        post: {
          id: "ckc7k5qsj0000u0t8qv6d1d7k",
          title: "동네 병원 운영자 정리",
          type: PostType.HOSPITAL_REVIEW,
          status: PostStatus.ACTIVE,
          isOperatorContent: true,
          operatorSourceName: "TownPet 운영자 정리",
          operatorLastVerifiedAt: new Date("2026-05-26T12:00:00.000Z"),
        },
        requester: null,
        resolver: null,
      },
    ] as never);

    const html = renderToStaticMarkup(
      await AdminCorrectionRequestsPage({
        searchParams: Promise.resolve({ status: "PENDING" }),
      }),
    );

    expect(html).toContain("운영자 정리 글 제보");
    expect(html).toContain("신고 큐");
    expect(html).toContain("2건 대기");
    expect(html).toContain("정정 큐");
    expect(html).toContain("3건 진행");
    expect(html).toContain("운영자 콘텐츠 제보 2건");
    expect(html).toContain("TownPet 운영자 정리");
    expect(html).toContain('href="/posts/ckc7k5qsj0000u0t8qv6d1d7k"');
  });
});
