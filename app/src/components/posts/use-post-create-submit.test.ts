import { describe, expect, it, vi } from "vitest";

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
  toGuestPostCreateActionResult,
  toPostCreateNetworkErrorResult,
} from "@/components/posts/use-post-create-submit";

describe("post create submit transport helpers", () => {
  it("maps a successful guest post response to success", () => {
    expect(toGuestPostCreateActionResult(true, { ok: true })).toEqual({ ok: true });
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
});
