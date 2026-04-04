import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "@/app/api/comments/[id]/route";
import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";
import {
  deleteComment,
  deleteGuestComment,
  updateComment,
  updateGuestComment,
} from "@/server/services/comment.service";

vi.mock("@/server/auth", () => ({ getCurrentUserIdFromRequest: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({ getGuestPostPolicy: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/comment.service", () => ({
  deleteComment: vi.fn(),
  deleteGuestComment: vi.fn(),
  updateComment: vi.fn(),
  updateGuestComment: vi.fn(),
}));

const mockGetCurrentUserIdFromRequest = vi.mocked(getCurrentUserIdFromRequest);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestPostPolicy = vi.mocked(getGuestPostPolicy);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockDeleteComment = vi.mocked(deleteComment);
const mockDeleteGuestComment = vi.mocked(deleteGuestComment);
const mockUpdateComment = vi.mocked(updateComment);
const mockUpdateGuestComment = vi.mocked(updateGuestComment);

describe("/api/comments/[id] contract", () => {
  beforeEach(() => {
    mockGetCurrentUserIdFromRequest.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetGuestPostPolicy.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockDeleteComment.mockReset();
    mockDeleteGuestComment.mockReset();
    mockUpdateComment.mockReset();
    mockUpdateGuestComment.mockReset();

    mockGetCurrentUserIdFromRequest.mockResolvedValue(null);
    mockGetGuestPostPolicy.mockResolvedValue({
      postRateLimit10m: 5,
      postRateLimit1h: 10,
    } as never);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
  });

  it("returns GUEST_PASSWORD_REQUIRED for unauthenticated patch without guest password", async () => {
    const request = new Request("http://localhost/api/comments/comment-1", {
      method: "PATCH",
      body: JSON.stringify({ content: "edited" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "comment-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "GUEST_PASSWORD_REQUIRED" },
    });
  });

  it("uses updateGuestComment when guest password is provided even if auth cookie exists", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockUpdateGuestComment.mockResolvedValue({ id: "comment-1" } as never);
    const request = new Request("http://localhost/api/comments/comment-1", {
      method: "PATCH",
      body: JSON.stringify({ content: "edited", guestPassword: "1234" }),
      headers: {
        "content-type": "application/json",
        "x-guest-fingerprint": "guest-fp-1",
        "x-guest-mode": "1",
      },
    }) as NextRequest;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "comment-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockGetCurrentUserIdFromRequest).not.toHaveBeenCalled();
    expect(mockUpdateComment).not.toHaveBeenCalled();
    expect(mockUpdateGuestComment).toHaveBeenCalledWith({
      commentId: "comment-1",
      input: { content: "edited" },
      guestPassword: "1234",
      guestIdentity: {
        ip: "127.0.0.1",
        fingerprint: "guest-fp-1",
      },
    });
  });

  it("uses deleteGuestComment when guest password is provided even if auth cookie exists", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockDeleteGuestComment.mockResolvedValue({ ok: true } as never);
    const request = new Request("http://localhost/api/comments/comment-1", {
      method: "DELETE",
      headers: {
        "x-guest-password": "1234",
        "x-guest-fingerprint": "guest-fp-1",
        "x-guest-mode": "1",
      },
    }) as NextRequest;

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "comment-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockGetCurrentUserIdFromRequest).not.toHaveBeenCalled();
    expect(mockDeleteComment).not.toHaveBeenCalled();
    expect(mockDeleteGuestComment).toHaveBeenCalledWith({
      commentId: "comment-1",
      guestPassword: "1234",
      guestIdentity: {
        ip: "127.0.0.1",
        fingerprint: "guest-fp-1",
      },
    });
  });

  it("uses authenticated patch path when guest password is absent", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockUpdateComment.mockResolvedValue({ id: "comment-1" } as never);
    const request = new Request("http://localhost/api/comments/comment-1", {
      method: "PATCH",
      body: JSON.stringify({ content: "edited" }),
      headers: {
        "content-type": "application/json",
        "x-guest-mode": "1",
      },
    }) as NextRequest;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "comment-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockGetCurrentUserIdFromRequest).toHaveBeenCalledWith(request);
    expect(mockUpdateComment).toHaveBeenCalledWith({
      commentId: "comment-1",
      authorId: "user-1",
      input: { content: "edited" },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockUpdateComment.mockRejectedValue(new Error("boom"));
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    const request = new Request("http://localhost/api/comments/comment-1", {
      method: "PATCH",
      body: JSON.stringify({ content: "edited" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "comment-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });

  it("maps service errors from authenticated delete path", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockDeleteComment.mockRejectedValue(
      new ServiceError("forbidden", "FORBIDDEN", 403),
    );
    const request = new Request("http://localhost/api/comments/comment-1", {
      method: "DELETE",
    }) as NextRequest;

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "comment-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});
