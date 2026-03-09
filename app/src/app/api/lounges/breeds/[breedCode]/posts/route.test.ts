import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/lounges/breeds/[breedCode]/posts/route";
import { getCurrentUserId, hasSessionCookieFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { countPosts, listPosts } from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/server/auth", () => ({
  getCurrentUserId: vi.fn(),
  hasSessionCookieFromRequest: vi.fn(),
}));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
}));
vi.mock("@/server/queries/post.queries", () => ({ countPosts: vi.fn(), listPosts: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockHasSessionCookieFromRequest = vi.mocked(hasSessionCookieFromRequest);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(getGuestReadLoginRequiredPostTypes);
const mockCountPosts = vi.mocked(countPosts);
const mockListPosts = vi.mocked(listPosts);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/lounges/breeds/[breedCode]/posts contract", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockReset();
    mockHasSessionCookieFromRequest.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockCountPosts.mockReset();
    mockListPosts.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockGetCurrentUserId.mockResolvedValue(null);
    mockHasSessionCookieFromRequest.mockReturnValue(false);
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([]);
    mockCountPosts.mockResolvedValue(0);
    mockListPosts.mockResolvedValue({ items: [], nextCursor: null });
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
  });

  it("returns INVALID_BREED_CODE for malformed breedCode", async () => {
    const request = new Request("http://localhost/api/lounges/breeds/*/posts") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ breedCode: "*" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_BREED_CODE" },
    });
  });

  it("uses user rate key and skips guest policy query when authenticated", async () => {
    mockHasSessionCookieFromRequest.mockReturnValue(true);
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const request = new Request("http://localhost/api/lounges/breeds/golden/posts?q=산책") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ breedCode: "golden" }) });

    expect(response.status).toBe(200);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "breed-lounge:user:user-1",
      limit: 30,
      windowMs: 60_000,
      cacheMs: 1_000,
    });
    expect(mockGetGuestReadLoginRequiredPostTypes).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("skips auth lookup when session cookie is absent", async () => {
    const request = new Request("http://localhost/api/lounges/breeds/golden/posts?q=산책") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ breedCode: "golden" }) });

    expect(response.status).toBe(200);
    expect(mockGetCurrentUserId).not.toHaveBeenCalled();
  });

  it("applies cache-control for guest first page requests", async () => {
    const request = new Request("http://localhost/api/lounges/breeds/golden/posts?q=산책") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ breedCode: "golden" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=30");
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("rate fail"));
    const request = new Request("http://localhost/api/lounges/breeds/golden/posts?q=산책") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ breedCode: "golden" }) });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
