import type { NextRequest } from "next/server";
import { PostScope, PostType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/lounges/breeds/[breedCode]/groupbuys/route";
import { getCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { createPost } from "@/server/services/post.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/post.service", () => ({ createPost: vi.fn() }));

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockCreatePost = vi.mocked(createPost);

const validPayload = {
  title: "공구 모집",
  content: "함께 구매해요",
  productName: "사료",
  targetPrice: 12000,
  minParticipants: 5,
  purchaseDeadline: "2026-05-01",
  deliveryMethod: "택배",
  imageUrls: [],
};

function buildRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/lounges/breeds/golden/groupbuys", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  }) as NextRequest;
}

describe("POST /api/lounges/breeds/[breedCode]/groupbuys contract", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockCreatePost.mockReset();

    mockGetCurrentUserId.mockResolvedValue(null);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockCreatePost.mockResolvedValue({ id: "post-1" } as never);
  });

  it("returns INVALID_BREED_CODE for malformed breedCode", async () => {
    const request = new Request("http://localhost/api/lounges/breeds/*/groupbuys", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ breedCode: "*" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_BREED_CODE" },
    });
  });

  it("creates post with authorId for authenticated user", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const request = buildRequest(validPayload);

    const response = await POST(request, { params: Promise.resolve({ breedCode: "golden" }) });

    expect(response.status).toBe(201);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "lounge-groupbuy:user-1",
      limit: 5,
      windowMs: 60_000,
    });
    expect(mockCreatePost).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-1",
        input: expect.objectContaining({
          title: "공구 모집",
          type: PostType.MARKET_LISTING,
          scope: PostScope.GLOBAL,
          animalTags: ["GOLDEN"],
          imageUrls: [],
          marketListing: {
            listingType: "SELL",
            price: 12000,
            condition: "NEW",
            rentalPeriod: "2026-05-01",
          },
          content: expect.stringContaining("[공동구매 템플릿]"),
        }),
      }),
    );
    expect(mockCreatePost).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          content: expect.stringContaining("품종코드: GOLDEN"),
        }),
      }),
    );
  });

  it("propagates authenticated high-risk write gate errors from createPost", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockCreatePost.mockRejectedValueOnce(
      new ServiceError(
        "가입 초기에는 중고/공동구매 게시글을 작성할 수 없습니다.",
        "NEW_USER_RESTRICTED_TYPE",
        403,
      ),
    );
    const request = buildRequest(validPayload);

    const response = await POST(request, { params: Promise.resolve({ breedCode: "golden" }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "NEW_USER_RESTRICTED_TYPE" },
    });
    expect(mockCreatePost).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-1",
        input: expect.objectContaining({ type: PostType.MARKET_LISTING }),
      }),
    );
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("propagates contact restriction errors instead of masking them as server errors", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockCreatePost.mockRejectedValueOnce(
      new ServiceError(
        "가입 초기에는 연락처가 포함된 글을 작성할 수 없습니다.",
        "CONTACT_RESTRICTED_FOR_NEW_USER",
        403,
      ),
    );
    const request = buildRequest({ ...validPayload, content: "010-1234-5678 연락 주세요" });

    const response = await POST(request, { params: Promise.resolve({ breedCode: "golden" }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "CONTACT_RESTRICTED_FOR_NEW_USER" },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("creates guest groupbuy posts through the shared high-risk post policy path", async () => {
    const request = buildRequest(
      { ...validPayload, guestDisplayName: "비회원", guestPassword: "guest-pass-1234" },
      { "x-guest-fingerprint": "fp-1", "user-agent": "vitest-agent" },
    );

    const response = await POST(request, { params: Promise.resolve({ breedCode: "golden" }) });

    expect(response.status).toBe(201);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "lounge-groupbuy:guest:ip:127.0.0.1:fp:fp-1:10m",
      limit: 3,
      windowMs: 10 * 60_000,
    });
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "lounge-groupbuy:guest:ip:127.0.0.1:fp:fp-1:1h",
      limit: 8,
      windowMs: 60 * 60_000,
    });
    expect(mockCreatePost).toHaveBeenCalledWith({
      input: expect.objectContaining({
        title: "공구 모집",
        type: PostType.MARKET_LISTING,
        scope: PostScope.GLOBAL,
        animalTags: ["GOLDEN"],
        marketListing: {
          listingType: "SELL",
          price: 12000,
          condition: "NEW",
          rentalPeriod: "2026-05-01",
        },
        guestDisplayName: "비회원",
        guestPassword: "guest-pass-1234",
      }),
      guestIdentity: {
        ip: "127.0.0.1",
        fingerprint: "fp-1",
        userAgent: "vitest-agent",
      },
    });
  });

  it("propagates guest restricted type errors from createPost", async () => {
    mockCreatePost.mockRejectedValueOnce(
      new ServiceError("비회원은 중고/공동구매 게시글을 작성할 수 없습니다.", "GUEST_RESTRICTED_TYPE", 403),
    );
    const request = buildRequest(
      { ...validPayload, guestDisplayName: "비회원", guestPassword: "guest-pass-1234" },
      { "x-guest-fingerprint": "fp-1" },
    );

    const response = await POST(request, { params: Promise.resolve({ breedCode: "golden" }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "GUEST_RESTRICTED_TYPE" },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("rate fail"));
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const request = buildRequest(validPayload);

    const response = await POST(request, { params: Promise.resolve({ breedCode: "golden" }) });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
