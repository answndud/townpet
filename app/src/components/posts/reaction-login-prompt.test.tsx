import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ReactionLoginPrompt } from "@/components/posts/reaction-login-prompt";

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

describe("ReactionLoginPrompt", () => {
  it("renders shared desktop and mobile login CTA surfaces when open", () => {
    const html = renderToStaticMarkup(
      <ReactionLoginPrompt
        isOpen
        message="게시글 좋아요/싫어요는 로그인 후 이용할 수 있습니다."
        loginHref="/login?next=%2Fposts%2Fpost-1"
        align="end"
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("게시글 좋아요/싫어요는 로그인 후 이용할 수 있습니다.");
    expect(html).toContain('/login?next=%2Fposts%2Fpost-1');
    expect(html).toContain("닫기");
    expect(html).toContain("로그인하기");
    expect(html).toContain("sm:hidden");
    expect(html).toContain("hidden min-w-[220px] sm:block");
    expect((html.match(/min-h-10/g) ?? []).length).toBe(4);
    expect(html).toContain("hover:underline-offset-4");
    expect(html).toContain("rounded-md bg-[#3567b5]");
    expect(html).not.toContain("tp-btn-soft");
    expect(html).not.toContain("tp-btn-primary");
    expect(html).not.toContain("rounded-lg px-4 text-sm");
    expect(html).not.toContain("rounded-2xl");
  });
});
