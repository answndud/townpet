import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostStatus } from "@prisma/client";

import {
  parsePostModerationResponsePayload,
  PostModerationControls,
} from "@/components/posts/post-moderation-controls";

describe("PostModerationControls", () => {
  it("renders a collapsed moderator tool entry by default", () => {
    const html = renderToStaticMarkup(
      <PostModerationControls
        postId="post-1"
        postTitle="테스트 글"
        currentStatus={PostStatus.ACTIVE}
        onStatusChange={() => undefined}
      />,
    );

    expect(html).toContain("운영자 도구 보기");
    expect(html).toContain("공개");
    expect(html).not.toContain("사유");
    expect(html).not.toContain("게시글 숨김");
  });

  it("returns an error payload message when the moderation API fails", async () => {
    const response = new Response(
      JSON.stringify({
        ok: false,
        error: { message: "숨김 처리에 실패했습니다." },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );

    const payload = await parsePostModerationResponsePayload<{ ok: true }>(response);
    expect(payload).toEqual({
      ok: false,
      message: "숨김 처리에 실패했습니다.",
    });
  });
});
