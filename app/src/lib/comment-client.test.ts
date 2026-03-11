import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPostComments, unwrapCommentListResponse } from "@/lib/comment-client";

describe("comment-client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("정상 응답이면 댓글 배열을 반환한다", () => {
    expect(
      unwrapCommentListResponse(true, {
        ok: true,
        data: [{ id: "comment-1" }],
      }),
    ).toEqual([{ id: "comment-1" }]);
  });

  it("응답이 실패면 에러 메시지와 함께 예외를 던진다", () => {
    expect(() =>
      unwrapCommentListResponse(false, {
        ok: false,
        error: { message: "댓글 로딩 실패" },
      }),
    ).toThrow("댓글 로딩 실패");
  });

  it("post 댓글 fetch helper는 no-store GET 요청으로 댓글 배열을 가져온다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: [{ id: "comment-1" }],
      }),
    } as Response);

    await expect(fetchPostComments<{ id: string }>("post-1")).resolves.toEqual([
      { id: "comment-1" },
    ]);

    expect(fetchSpy).toHaveBeenCalledWith("/api/posts/post-1/comments", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
  });
});
