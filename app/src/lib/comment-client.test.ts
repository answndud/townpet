import { describe, expect, it } from "vitest";

import { unwrapCommentListResponse } from "@/lib/comment-client";

describe("comment-client", () => {
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
});
