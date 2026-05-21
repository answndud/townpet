import type { AnchorHTMLAttributes, ReactNode } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { forwardRef, useImperativeHandle } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PostScope } from "@prisma/client";

import { PostCommentRootForm } from "@/components/posts/post-comment-root-form";
import { PostDetailEditForm } from "@/components/posts/post-detail-edit-form";

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

vi.mock("@/components/posts/post-body-rich-editor", () => ({
  PostBodyRichEditor: forwardRef(function MockPostBodyRichEditor(
    _props: Record<string, unknown>,
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      getSerializedState: () => ({ content: "본문", imageUrls: [] }),
    }));
    return <div data-testid="mock-rich-editor">본문 편집기</div>;
  }),
}));

vi.mock("@/server/actions/post", () => ({
  updatePostAction: vi.fn(),
}));

describe("post form accessibility", () => {
  it("keeps root comment guest fields and submit action mobile-safe", () => {
    const html = renderToStaticMarkup(
      <PostCommentRootForm
        canComment
        guestDisplayName=""
        guestPassword=""
        rootContent=""
        isPending={false}
        loginHref="/login"
        onGuestDisplayNameChange={vi.fn()}
        onGuestPasswordChange={vi.fn()}
        onRootContentChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(html).toContain("post-comment-guest-name");
    expect(html).toContain("post-comment-guest-password");
    expect((html.match(/sm:min-h-10/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("post-comment-root-submit");
    expect(html).toContain("min-h-10");
  });

  it("keeps disabled comment recovery action mobile-safe", () => {
    const html = renderToStaticMarkup(
      <PostCommentRootForm
        canComment={false}
        guestDisplayName=""
        guestPassword=""
        rootContent=""
        isPending={false}
        loginHref="/login?next=%2Fposts%2Fpost-1"
        onGuestDisplayNameChange={vi.fn()}
        onGuestPasswordChange={vi.fn()}
        onRootContentChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(html).toContain("댓글 작성/답글/신고는 로그인 후 이용할 수 있습니다.");
    expect(html).toContain("로그인하기");
    expect(html).toContain("min-h-10");
  });

  it("shows immediate pending feedback while a root comment is submitting", () => {
    const html = renderToStaticMarkup(
      <PostCommentRootForm
        canComment
        currentUserId="viewer-1"
        guestDisplayName=""
        guestPassword=""
        rootContent="등록 중인 댓글"
        isPending
        loginHref="/login"
        onGuestDisplayNameChange={vi.fn()}
        onGuestPasswordChange={vi.fn()}
        onRootContentChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(html).toContain("등록 중...");
    expect(html).toContain("disabled");
  });

  it("keeps post edit controls mobile-safe", () => {
    const html = renderToStaticMarkup(
      <PostDetailEditForm
        postId="post-1"
        title="제목"
        content="본문"
        scope={PostScope.GLOBAL}
        neighborhoodId={null}
        imageUrls={[]}
        neighborhoods={[{
          id: "neighborhood-1",
          name: "상암동",
          city: "서울",
          district: "서초구",
        }]}
        isAuthenticated={false}
        guestPassword=""
      />,
    );

    expect(html).toContain("게시물 수정");
    expect(html).toContain("수정 저장");
    expect((html.match(/min-h-10/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("announces post edit validation errors", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/posts/post-detail-edit-form.tsx"),
      "utf8",
    );

    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-live="polite"');
  });
});
