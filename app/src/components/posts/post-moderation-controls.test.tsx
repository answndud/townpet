import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("keeps moderator actions explicit without legacy soft button styling", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/posts/post-moderation-controls.tsx"),
      "utf8",
    );

    expect(source).toContain("POST_MODERATION_SUMMARY_CLASS_NAME");
    expect(source).toContain("POST_MODERATION_DANGER_ACTION_CLASS_NAME");
    expect(source).toContain("POST_MODERATION_PRIMARY_ACTION_CLASS_NAME");
    expect(source).toContain("inline-flex min-h-10 items-center justify-center");
    expect(source).toContain("hover:underline hover:underline-offset-4");
    expect(source).not.toContain("tp-btn-soft text-rose-700 hover:bg-rose-50");
    expect(source).not.toContain("tp-btn-primary");
    expect(source).not.toContain("rounded-xl border border-[#dbe6f5] bg-white px-3 py-2.5");
  });
});
