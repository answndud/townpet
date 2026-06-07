import { describe, expect, it, vi } from "vitest";
import { PostScope, PostType } from "@prisma/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/server/actions/post", () => ({
  createPostAction: vi.fn(),
}));

vi.mock("@/lib/guest-client", () => ({
  getClientFingerprint: vi.fn(() => "fingerprint"),
}));

vi.mock("@/lib/guest-step-up.client", () => ({
  getGuestWriteHeaders: vi.fn(async () => ({ "x-guest-token": "token" })),
}));

import {
  buildPostCreateSuccessHref,
  toGuestPostCreateActionResult,
  toPostCreateNetworkErrorResult,
} from "@/components/posts/use-post-create-submit";
import type { PostCreateSubmitPayload } from "@/components/posts/post-create-submit";

describe("post create submit transport helpers", () => {
  it("maps a successful guest post response to success", () => {
    expect(toGuestPostCreateActionResult(true, { ok: true, data: { id: "post-1" } })).toEqual({
      ok: true,
      postId: "post-1",
    });
  });

  it("uses the guest API error message when present", () => {
    expect(
      toGuestPostCreateActionResult(false, {
        ok: false,
        error: { message: "비회원 제한" },
      }),
    ).toEqual({
      ok: false,
      message: "비회원 제한",
    });
  });

  it("falls back to a stable guest submit failure message", () => {
    expect(toGuestPostCreateActionResult(false, { ok: false })).toEqual({
      ok: false,
      message: "비회원 글 등록에 실패했습니다.",
    });
  });

  it("maps network failures to user-facing messages", () => {
    expect(toPostCreateNetworkErrorResult(new Error("network down"))).toEqual({
      ok: false,
      message: "network down",
    });
    expect(toPostCreateNetworkErrorResult(null)).toEqual({
      ok: false,
      message: "네트워크 오류가 발생했습니다.",
    });
  });

  it("keeps ordinary post success on the feed", () => {
    const payload = {
      title: "일반 글",
      content: "내용",
      type: PostType.FREE_BOARD,
      scope: PostScope.GLOBAL,
      imageUrls: [],
    } satisfies PostCreateSubmitPayload;

    expect(
      buildPostCreateSuccessHref({
        isAuthenticated: true,
        payload,
        result: { ok: true, postId: "post-1" },
      }),
    ).toBe("/feed");
  });

  it("sends lost-found authors to detail so sharing is the next visible action", () => {
    const payload = {
      title: "분실 글",
      content: "내용",
      type: PostType.LOST_FOUND,
      scope: PostScope.GLOBAL,
      imageUrls: [],
      lostFound: {
        alertType: "LOST",
        petType: "강아지",
        lastSeenAt: "2026-06-07T10:00",
        lastSeenLocation: "공원 입구",
      },
    } satisfies PostCreateSubmitPayload;

    expect(
      buildPostCreateSuccessHref({
        isAuthenticated: true,
        payload,
        result: { ok: true, postId: "post-1" },
      }),
    ).toBe("/posts/post-1");
    expect(
      buildPostCreateSuccessHref({
        isAuthenticated: false,
        payload,
        result: { ok: true, postId: "post-1" },
      }),
    ).toBe("/posts/post-1/guest");
  });
});
