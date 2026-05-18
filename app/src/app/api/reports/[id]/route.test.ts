import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "@/app/api/reports/[id]/route";
import { requireModerator } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { updateReport } from "@/server/services/report.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireModerator: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/services/report.service", () => ({ updateReport: vi.fn() }));

const mockRequireModerator = vi.mocked(requireModerator);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockUpdateReport = vi.mocked(updateReport);

describe("PATCH /api/reports/[id] contract", () => {
  beforeEach(() => {
    mockRequireModerator.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockUpdateReport.mockReset();

    mockRequireModerator.mockResolvedValue({ id: "moderator-1" } as never);
    mockUpdateReport.mockResolvedValue({
      id: "report-1",
      status: "RESOLVED",
    } as never);
  });

  it("passes route id, body, and moderator id to update service", async () => {
    const request = new Request("http://localhost/api/reports/report-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED", memo: "처리 완료" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "report-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: { id: "report-1", status: "RESOLVED" },
    });
    expect(mockUpdateReport).toHaveBeenCalledWith({
      reportId: "report-1",
      input: { status: "RESOLVED", memo: "처리 완료" },
      moderatorId: "moderator-1",
    });
  });

  it("maps moderator auth errors to the service error status", async () => {
    mockRequireModerator.mockRejectedValue(
      new ServiceError("moderator only", "FORBIDDEN", 403),
    );
    const request = new Request("http://localhost/api/reports/report-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "report-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(mockUpdateReport).not.toHaveBeenCalled();
  });

  it("maps report service errors without monitoring them as internal errors", async () => {
    mockUpdateReport.mockRejectedValue(
      new ServiceError("missing", "REPORT_NOT_FOUND", 404),
    );
    const request = new Request("http://localhost/api/reports/report-missing", {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "report-missing" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "REPORT_NOT_FOUND" },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockUpdateReport.mockRejectedValue(new Error("db down"));
    const request = new Request("http://localhost/api/reports/report-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "report-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
