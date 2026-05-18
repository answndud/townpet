import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "@/app/api/reports/bulk/route";
import { requireModerator } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { bulkUpdateReports } from "@/server/services/report.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireModerator: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/services/report.service", () => ({ bulkUpdateReports: vi.fn() }));

const mockRequireModerator = vi.mocked(requireModerator);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockBulkUpdateReports = vi.mocked(bulkUpdateReports);

describe("PATCH /api/reports/bulk contract", () => {
  beforeEach(() => {
    mockRequireModerator.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockBulkUpdateReports.mockReset();

    mockRequireModerator.mockResolvedValue({ id: "moderator-1" } as never);
    mockBulkUpdateReports.mockResolvedValue({
      updatedCount: 2,
      skippedCount: 0,
    } as never);
  });

  it("passes parsed body and moderator id to bulk update service", async () => {
    const body = {
      reportIds: ["report-1", "report-2"],
      status: "RESOLVED",
      memo: "일괄 처리",
    };
    const request = new Request("http://localhost/api/reports/bulk", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: { updatedCount: 2, skippedCount: 0 },
    });
    expect(mockBulkUpdateReports).toHaveBeenCalledWith({
      input: body,
      moderatorId: "moderator-1",
    });
  });

  it("maps moderator auth errors to the service error status", async () => {
    mockRequireModerator.mockRejectedValue(
      new ServiceError("moderator only", "FORBIDDEN", 403),
    );
    const request = new Request("http://localhost/api/reports/bulk", {
      method: "PATCH",
      body: JSON.stringify({ reportIds: ["report-1"], status: "RESOLVED" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(mockBulkUpdateReports).not.toHaveBeenCalled();
  });

  it("maps bulk service errors without monitoring them as internal errors", async () => {
    mockBulkUpdateReports.mockRejectedValue(
      new ServiceError("invalid", "INVALID_REPORT_BULK_ACTION", 400),
    );
    const request = new Request("http://localhost/api/reports/bulk", {
      method: "PATCH",
      body: JSON.stringify({ reportIds: [], status: "RESOLVED" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_REPORT_BULK_ACTION" },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockBulkUpdateReports.mockRejectedValue(new Error("db down"));
    const request = new Request("http://localhost/api/reports/bulk", {
      method: "PATCH",
      body: JSON.stringify({ reportIds: ["report-1"], status: "RESOLVED" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
