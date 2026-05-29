import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PostType } from "@prisma/client";

import { PostBoardLinkChip } from "@/components/posts/post-board-link-chip";

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

describe("PostBoardLinkChip", () => {
  it("uses a restrained rectangular board link instead of a pill", () => {
    const html = renderToStaticMarkup(
      <PostBoardLinkChip
        type={PostType.FREE_POST}
        label="자유게시판"
        chipClass="border-slate-200 bg-slate-50 text-slate-600"
      />,
    );

    expect(html).toContain("자유게시판");
    expect(html).toContain("rounded-md");
    expect(html).toContain("min-h-7");
    expect(html).toContain("hover:underline-offset-4");
    expect(html).not.toContain("rounded-full");
    expect(html).not.toContain("이동");
  });
});
