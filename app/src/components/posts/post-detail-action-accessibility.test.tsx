import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PostScope, PostStatus, PostType } from "@prisma/client";

import { GuestPostDetailActions } from "@/components/posts/guest-post-detail-actions";
import { LostFoundSharePanel } from "@/components/posts/lost-found-share-panel";
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

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: { src: string; alt: string } & ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
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

  it("keeps guest mobile management controls inline inside the detail card", () => {
    const source = readFileSync(join(process.cwd(), "src/components/posts/guest-post-detail-actions.tsx"), "utf8");

    expect(source).toContain("mt-2 grid gap-2 border-t border-[#dbe6f6] pt-2");
    expect(source).not.toContain("tp-btn-soft inline-flex min-h-10 items-center rounded-lg");
    expect(source).not.toContain("mt-2 space-y-2 rounded-lg border border-[#dbe6f6] bg-[#f8fbff] p-2");
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
    expect(html).toContain("min-h-8");
    expect(html).not.toContain("rounded-full");
    expect(html).not.toContain("border-[#dbe6f5]");
  });

  it("keeps share control status announcement visible to assistive tech", () => {
    const html = renderToStaticMarkup(<PostShareControls url="https://townpet.example/posts/post-1" />);

    expect(html).toContain("공유");
    expect(html).toContain("min-h-9");
    expect(html).not.toContain("tp-btn-soft");
    expect(html).not.toContain("rounded-lg");
  });

  it("renders lost-found share tools with mobile-safe actions", () => {
    const html = renderToStaticMarkup(
      <LostFoundSharePanel
        post={{
          id: "post-1",
          authorId: "author-1",
          type: PostType.LOST_FOUND,
          scope: PostScope.GLOBAL,
          status: PostStatus.ACTIVE,
          title: "반포동에서 고양이를 봤어요",
          content: "노란 목줄",
          createdAt: new Date("2026-05-21T09:30:00.000Z"),
          updatedAt: new Date("2026-05-21T09:30:00.000Z"),
          author: { id: "author-1", nickname: "작성자" },
          images: [],
          lostFoundAlert: {
            alertType: "FOUND",
            petType: "고양이",
            breed: "치즈태비",
            lastSeenAt: "2026-05-21T09:30:00.000Z",
            lastSeenLocation: "서초구 반포동",
            status: "ACTIVE",
          },
        }}
        postUrl="https://townpet.example/posts/post-1"
      />,
    );

    expect(html).toContain("카카오톡 문구 복사");
    expect(html).toContain("공유 이미지 열기");
    expect(html).toContain("목격 제보");
    expect(html).toContain("목격했어요");
    expect(html).toContain("확인된 시간·위치·특징만 전달합니다.");
    expect(html).toContain("min-h-10");
    expect(html).toContain("rounded-md bg-[#3567b5]");
    expect(html).toContain("hover:underline-offset-4");
    expect(html).toContain('role="status"');
    expect(html).toContain("min-h-28 overflow-auto whitespace-pre-wrap border-t border-[#dbe6f5] pt-2");
    expect(html).not.toContain("tp-btn-soft");
    expect(html).not.toContain("tp-btn-primary");
    expect(html).not.toContain("min-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-[#dbe6f5] bg-[#f8fbff] p-3");
  });

  it("announces action failures and share status", () => {
    const files = [
      "src/components/posts/post-detail-actions.tsx",
      "src/components/posts/guest-post-detail-actions.tsx",
      "src/components/posts/post-detail-action-button-class.ts",
      "src/components/posts/post-bookmark-button.tsx",
      "src/components/posts/post-reaction-controls.tsx",
      "src/components/posts/post-share-controls.tsx",
    ]
      .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
      .join("\n");

    expect(files).toContain('role="alert"');
    expect(files).toContain('aria-live="polite"');
    expect(files).toContain('role="status"');
    expect(files).not.toContain("tp-btn-soft inline-flex min-h-10 items-center rounded-lg");
    expect(files).not.toContain("border-rose-300");
  });
});
