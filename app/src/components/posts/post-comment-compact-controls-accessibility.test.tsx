import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostCommentPagination } from "@/components/posts/post-comment-pagination";

describe("post comment compact controls accessibility", () => {
  it("keeps comment pagination controls at the 40px touch target baseline", () => {
    const html = renderToStaticMarkup(
      <PostCommentPagination currentPage={2} totalPages={4} />,
    );

    expect(html).toContain("이전");
    expect(html).toContain("다음");
    expect((html.match(/min-h-10/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(html).not.toContain("tp-btn-xs");
    expect(html).not.toContain("min-h-9");
  });

  it("keeps comment thread menu and inline form controls mobile-safe", () => {
    const code = readFileSync(
      join(process.cwd(), "src/components/posts/post-comment-thread.tsx"),
      "utf8",
    );

    expect(code).toContain("min-h-10 min-w-10");
    expect(code).toContain("flex min-h-10 w-full items-center");
    expect(code).toContain("sm:min-h-10");
    expect(code).toContain('COMMENT_INLINE_FORM_SECTION_CLASS_NAME = "mt-2 border-t border-[#e7eef9] pt-2"');
    expect(code).toContain('role="status"');
    expect(code).toContain('aria-live="polite"');
    expect(code).not.toContain("POST_COMMENT_FORM_PANEL_CLASS_NAME} mt-2 p-2");
    expect(code).not.toContain("POST_COMMENT_FORM_PANEL_CLASS_NAME} mt-2 p-2.5");
    expect(code).not.toContain("sm:min-h-6");
    expect(code).not.toContain("sm:min-h-8");
    expect(code).not.toContain("tp-btn-xs");
  });

  it("keeps best-comment action controls mobile-safe", () => {
    const code = readFileSync(
      join(process.cwd(), "src/components/posts/post-comment-best-item.tsx"),
      "utf8",
    );

    expect(code).toContain("inline-flex min-h-10");
    expect(code).not.toContain("sm:min-h-6");
  });

  it("keeps comment load failure recovery mobile-safe and announced", () => {
    const code = readFileSync(
      join(process.cwd(), "src/components/posts/post-comment-section-client.tsx"),
      "utf8",
    );

    expect(code).toContain("다시 시도");
    expect(code).toContain("min-h-10");
    expect(code).toContain('role="alert"');
    expect(code).toContain('aria-live="polite"');
  });
});
