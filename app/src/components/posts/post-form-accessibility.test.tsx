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
    expect(html).toContain('for="post-comment-guest-name"');
    expect(html).toContain('for="post-comment-guest-password"');
    expect(html).toContain('aria-label="댓글 내용"');
    expect(html).toContain("비회원 댓글 작성");
    expect((html.match(/min-h-10/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(html).toContain("post-comment-root-submit");
    expect(html).toContain("min-h-10");
    expect(html).toContain('class="bg-[#fbfdff] px-2 py-2 sm:px-2.5"');
    expect(html).toContain("rounded-md bg-[#f8fbff] px-2.5 py-2");
    expect(html).toContain("min-h-[88px] w-full");
    expect(html).not.toContain("sm:min-h-[56px]");
    expect(html).not.toContain("tp-form-panel tp-form-panel-page-soft p-2.5");
    expect(html).not.toContain("min-h-11");
    expect(html).not.toContain("min-h-24 w-full");
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

    expect(html).toContain("댓글 작성, 답글, 신고는 로그인 후 이용할 수 있습니다.");
    expect(html).toContain("로그인하기");
    expect(html).toContain("min-h-10");
  });

  it("explains signed-in comment ownership without guest password fields", () => {
    const html = renderToStaticMarkup(
      <PostCommentRootForm
        canComment
        currentUserId="viewer-1"
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

    expect(html).toContain("회원 댓글 작성");
    expect(html).toContain("로그인한 계정으로 댓글이 등록");
    expect(html).toContain('aria-label="댓글 내용"');
    expect(html).not.toContain("post-comment-guest-name");
    expect(html).not.toContain("post-comment-guest-password");
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
    expect(html).toContain("rounded-md bg-[#3567b5]");
    expect(html).not.toContain("tp-btn-primary inline-flex min-h-10 items-center justify-center rounded-lg");
  });

  it("keeps post edit layout compact without shrinking touch targets", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/posts/post-detail-edit-form.tsx"),
      "utf8",
    );

    expect(source).toContain("tp-card w-full p-4 sm:p-5");
    expect(source).toContain("mt-4 grid gap-3 md:grid-cols-3");
    expect(source).toContain('<div className="mt-4">');
    expect(source).not.toContain("tp-card w-full p-5 sm:p-6");
    expect(source).not.toContain("mt-6 grid gap-4 md:grid-cols-3");
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
