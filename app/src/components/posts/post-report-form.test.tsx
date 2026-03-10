import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PostReportForm } from "@/components/posts/post-report-form";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("PostReportForm", () => {
  it("shows a login prompt instead of the report form for guests", () => {
    const html = renderToStaticMarkup(
      <PostReportForm
        postId="post-1"
        canReport={false}
        loginHref="/login?next=%2Fposts%2Fpost-1"
      />,
    );

    expect(html).toContain("로그인 후 게시글 신고 가능.");
    expect(html).toContain('/login?next=%2Fposts%2Fpost-1');
    expect(html).not.toContain("textarea");
  });

  it("renders the report inputs for signed-in users", () => {
    const html = renderToStaticMarkup(<PostReportForm postId="post-1" />);

    expect(html).toContain("추가 설명");
    expect(html).toContain("신고");
    expect(html).not.toContain("로그인 후 게시글 신고 가능.");
  });
});
