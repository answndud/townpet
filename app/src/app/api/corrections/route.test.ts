import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/corrections/route";
import { getCurrentUserIdFromRequest } from "@/server/auth";
import { getClientIp } from "@/server/request-context";
import { createInformationCorrectionRequest } from "@/server/services/correction-request.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({
  getCurrentUserIdFromRequest: vi.fn(),
}));
vi.mock("@/server/request-context", () => ({
  getClientIp: vi.fn(),
}));
vi.mock("@/server/error-monitor", () => ({
  monitorUnhandledError: vi.fn(),
}));
vi.mock("@/server/services/correction-request.service", () => ({
  createInformationCorrectionRequest: vi.fn(),
}));

const mockGetCurrentUserIdFromRequest = vi.mocked(getCurrentUserIdFromRequest);
const mockGetClientIp = vi.mocked(getClientIp);
const mockCreateCorrectionRequest = vi.mocked(createInformationCorrectionRequest);

describe("POST /api/corrections", () => {
  beforeEach(() => {
    mockGetCurrentUserIdFromRequest.mockReset();
    mockGetClientIp.mockReset();
    mockCreateCorrectionRequest.mockReset();
    mockGetCurrentUserIdFromRequest.mockResolvedValue(null);
    mockGetClientIp.mockReturnValue("203.0.113.10");
  });

  it("creates JSON correction requests for anonymous business owners", async () => {
    mockCreateCorrectionRequest.mockResolvedValue({
      id: "correction-1",
      status: "PENDING",
    } as never);
    const request = new Request("http://localhost/api/corrections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetType: "HOSPITAL",
        targetName: "타운동물병원",
        requesterRole: "BUSINESS_OWNER",
        requesterName: "홍길동",
        requesterEmail: "owner@example.com",
        requestedChange: "영업시간 정보가 실제와 달라 정정해 주세요.",
      }),
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toMatchObject({
      ok: true,
      data: { id: "correction-1" },
    });
    expect(mockCreateCorrectionRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterUserId: null,
        clientIp: "203.0.113.10",
      }),
    );
  });

  it("maps service errors for JSON requests", async () => {
    mockCreateCorrectionRequest.mockRejectedValue(
      new ServiceError("bad", "INVALID_INPUT", 400),
    );
    const request = new Request("http://localhost/api/corrections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
  });

  it("redirects browser form submissions to receipt page", async () => {
    mockCreateCorrectionRequest.mockResolvedValue({ id: "correction-1" } as never);
    const formData = new FormData();
    formData.set("targetType", "HOSPITAL");
    formData.set("targetName", "타운동물병원");
    formData.set("requesterRole", "BUSINESS_OWNER");
    formData.set("requesterName", "홍길동");
    formData.set("requesterEmail", "owner@example.com");
    formData.set("requestedChange", "영업시간 정보가 실제와 달라 정정해 주세요.");
    const request = new Request("http://localhost/api/corrections", {
      method: "POST",
      body: formData,
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost/corrections/new?submitted=correction-1",
    );
  });
});
