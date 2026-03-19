import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/posts/suggestions/route";
import { isLoginRequiredPostType } from "@/lib/post-access";
import { getCurrentUserId, hasSessionCookieFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listPostSearchSuggestions } from "@/server/queries/post.queries";
import { listSearchTermSuggestions } from "@/server/queries/search.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/lib/post-access", () => ({ isLoginRequiredPostType: vi.fn() }));
vi.mock("@/server/auth", () => ({
  getCurrentUserId: vi.fn(),
  hasSessionCookieFromRequest: vi.fn(),
}));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
}));
vi.mock("@/server/queries/post.queries", () => ({ listPostSearchSuggestions: vi.fn() }));
vi.mock("@/server/queries/search.queries", () => ({ listSearchTermSuggestions: vi.fn() }));
vi.mock("@/server/queries/user.queries", () => ({ getUserWithNeighborhoods: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockIsLoginRequiredPostType = vi.mocked(isLoginRequiredPostType);
const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockHasSessionCookieFromRequest = vi.mocked(hasSessionCookieFromRequest);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(getGuestReadLoginRequiredPostTypes);
const mockListPostSearchSuggestions = vi.mocked(listPostSearchSuggestions);
const mockListSearchTermSuggestions = vi.mocked(listSearchTermSuggestions);
const mockGetUserWithNeighborhoods = vi.mocked(getUserWithNeighborhoods);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/posts/suggestions contract", () => {
  beforeEach(() => {
    mockIsLoginRequiredPostType.mockReset();
    mockGetCurrentUserId.mockReset();
    mockHasSessionCookieFromRequest.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockListPostSearchSuggestions.mockReset();
    mockListSearchTermSuggestions.mockReset();
    mockGetUserWithNeighborhoods.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockIsLoginRequiredPostType.mockReturnValue(false);
    mockGetCurrentUserId.mockResolvedValue(null);
    mockHasSessionCookieFromRequest.mockReturnValue(false);
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([]);
    mockListPostSearchSuggestions.mockResolvedValue(["강아지 산책"]);
    mockListSearchTermSuggestions.mockResolvedValue([]);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
  });

  it("returns INVALID_QUERY for malformed params", async () => {
    const request = new Request("http://localhost/api/posts/suggestions?limit=0") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_QUERY" },
    });
  });

  it("returns empty list for guest when type requires login", async () => {
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue(["MARKET_LISTING"]);
    mockIsLoginRequiredPostType.mockReturnValue(true);
    const request = new Request(
      "http://localhost/api/posts/suggestions?q=사료&type=MARKET_LISTING",
    ) as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: { items: [] },
    });
    expect(mockListPostSearchSuggestions).not.toHaveBeenCalled();
  });

  it("uses user rate key when authenticated", async () => {
    mockHasSessionCookieFromRequest.mockReturnValue(true);
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const request = new Request("http://localhost/api/posts/suggestions?q=사료") as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "feed-suggest:user:user-1",
      }),
    );
  });

  it("skips auth lookup when session cookie is absent", async () => {
    const request = new Request("http://localhost/api/posts/suggestions?q=사료") as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockGetCurrentUserId).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("rate fail"));
    const request = new Request("http://localhost/api/posts/suggestions?q=사료") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });

  it("merges search-term telemetry suggestions ahead of content suggestions", async () => {
    mockListSearchTermSuggestions.mockResolvedValue(["병원 후기", "병원비"]);
    mockListPostSearchSuggestions.mockResolvedValue(["병원비", "병원 추천"]);

    const request = new Request("http://localhost/api/posts/suggestions?q=%EB%B3%91%EC%9B%90") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: { items: ["병원 후기", "병원비", "병원 추천"] },
    });
    expect(mockListSearchTermSuggestions).toHaveBeenCalledWith("병원", 5, {
      scope: "GLOBAL",
      type: undefined,
      searchIn: undefined,
    });
  });
});
