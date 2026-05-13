import type { AnchorHTMLAttributes, ReactNode } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GuestPostDetailActions } from "@/components/posts/guest-post-detail-actions";
import { PostBookmarkButton } from "@/components/posts/post-bookmark-button";
import { PostDetailActions } from "@/components/posts/post-detail-actions";
import { PostShareControls } from "@/components/posts/post-share-controls";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/server/actions/post", () => ({
  deletePostAction: vi.fn(),
  togglePostBookmarkAction: vi.fn(),
}));

describe("post detail action accessibility", () => {
  it("keeps owner delete action mobile-safe", () => {
    const html = renderToStaticMarkup(<PostDetailActions postId="post-1" />);

    expect(html).toContain("삭제");
    expect(html).toContain("min-h-10");
  });

  it("keeps guest management controls mobile-safe", () => {
    const html = renderToStaticMarkup(<GuestPostDetailActions postId="post-1" />);

    expect(html).toContain("비회원 관리");
    expect(html).toContain("글 비밀번호");
    expect(html).toContain("비회원 수정");
    expect(html).toContain("비회원 삭제");
    expect((html.match(/min-h-10/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it("keeps bookmark controls and recovery prompt mobile-safe", () => {
    const html = renderToStaticMarkup(
      <PostBookmarkButton
        postId="post-1"
        currentBookmarked={false}
        compact
        canBookmark={false}
        loginHref="/login?next=%2Fposts%2Fpost-1"
      />,
    );

    expect(html).toContain("북마크");
    expect(html).toContain("min-h-10");
  });

  it("keeps share control status announcement visible to assistive tech", () => {
    const html = renderToStaticMarkup(<PostShareControls url="https://townpet.example/posts/post-1" />);

    expect(html).toContain("공유");
    expect(html).toContain("min-h-10");
  });

  it("announces action failures and share status", () => {
    const files = [
      "src/components/posts/post-detail-actions.tsx",
      "src/components/posts/guest-post-detail-actions.tsx",
      "src/components/posts/post-bookmark-button.tsx",
      "src/components/posts/post-reaction-controls.tsx",
      "src/components/posts/post-share-controls.tsx",
    ]
      .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
      .join("\n");

    expect(files).toContain('role="alert"');
    expect(files).toContain('aria-live="polite"');
    expect(files).toContain('role="status"');
  });
});
