import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PostScope, PostStatus, PostType } from "@prisma/client";

import { DeferredLostFoundSharePanel } from "@/components/posts/deferred-lost-found-share-panel";
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

    expect(html).toContain("글 비밀번호를 입력하면");
    expect(html).toContain("글 비밀번호");
    expect(html).toContain("비회원 글 수정");
    expect(html).toContain("비회원 글 삭제");
    expect(html).toContain('for="guest-post-password-post-1"');
    expect((html.match(/min-h-10/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("keeps guest management controls inside the overflow menu instead of the action bar", () => {
    const source = readFileSync(join(process.cwd(), "src/components/posts/guest-post-detail-actions.tsx"), "utf8");
    const primaryCardSource = readFileSync(
      join(process.cwd(), "src/components/posts/post-detail-primary-card.tsx"),
      "utf8",
    );

    expect(source).toContain("mt-1 grid w-full gap-2 border-t border-[#e8eff9] pt-2");
    expect(primaryCardSource).toContain("showOverflowMenu");
    expect(primaryCardSource).toContain("<GuestPostDetailActions postId={post.id} />");
    expect(primaryCardSource.split("<GuestPostDetailActions postId={post.id} />").length - 1).toBe(1);
    expect(source).not.toContain("sm:hidden");
    expect(source).not.toContain("hidden flex-wrap");
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
    const source = readFileSync(
      join(process.cwd(), "src/components/posts/post-bookmark-button.tsx"),
      "utf8",
    );
    expect(source).toContain("flex w-[min(86vw,300px)]");
    expect(source).toContain("min-w-[260px]");
    expect(source).toContain("items-center gap-1.5 whitespace-nowrap");
    expect(source).toContain("inline-flex shrink-0 items-center");
    expect(source).not.toContain("min-h-10 whitespace-nowrap align-middle");
    expect(source).not.toContain("break-keep");
    expect(source).toContain('compact ? "right-0" : "left-0"');
    expect(source).not.toContain("absolute left-0 top-[calc(100%+8px)] z-10 max-w-[min(86vw,260px)]");
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

    expect(html).toContain("공유 준비");
    expect(html).toContain("주변 공유 도구");
    expect(html).toContain('id="lost-found-share-tools"');
    expect(html).toContain("복사 문구와 전단 이미지에 같은 핵심 정보를 넣습니다.");
    expect(html).toContain('aria-label="공유 문구에 포함되는 정보"');
    expect(html).toContain("제보 접수 중");
    expect(html).toContain("서초구 반포동");
    expect(html).toContain("공개 연락처, 오픈채팅, 집 주소 전체 제외");
    expect(html).toContain("카카오톡 문구 복사");
    expect(html).toContain("전단 저장");
    expect(html).toContain("인스타/전단 이미지");
    expect(html).toContain('aria-label="분실/목격 카카오톡 공유 문구 복사"');
    expect(html).toContain('aria-label="분실/목격 게시글 링크 복사"');
    expect(html).toContain('aria-label="분실/목격 전단 PNG 저장"');
    expect(html).toContain('aria-label="분실/목격 인스타 또는 전단 이미지 새 창에서 열기"');
    expect(html).toContain('download="townpet-found-pet-post-1.png"');
    expect(html).toContain("lost-found-share.svg?format=png");
    expect(html).toContain("download=1");
    expect(html).toContain("저장 파일: townpet-found-pet-post-1.png");
    expect(html).toContain("목격자는 게시글 댓글로 위치와 시간을 제보");
    expect(html).toContain("개인 연락처와 집 주소 전체는 공개하지 않기");
    expect(html).toContain("공유 문구");
    expect(html).toContain("min-h-9");
    expect(html).toContain("rounded-md bg-[#3567b5]");
    expect(html).toContain("hover:underline-offset-4");
    expect(html).not.toContain("rounded-lg border border-[#dbe6f5] bg-white");
    expect(html).toContain('role="status"');
    expect(html).toContain("min-h-28 max-w-full overflow-auto whitespace-pre-wrap break-words border-t border-[#dbe6f5] pt-2");
    expect(html).not.toContain("tp-btn-soft");
    expect(html).not.toContain("tp-btn-primary");
    expect(html).not.toContain("min-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-[#dbe6f5] bg-[#f8fbff] p-3");
  });

  it("renders deferred lost-found share CTA with a clear discovery path", () => {
    const html = renderToStaticMarkup(
      <DeferredLostFoundSharePanel
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

    expect(html).toContain("공유 준비");
    expect(html).toContain("주변에 바로 공유하세요");
    expect(html).toContain('id="lost-found-share-tools"');
    expect(html).toContain("링크, 카카오톡 문구, 전단 이미지를 한 번에 준비합니다.");
    expect(html).toContain("제공: 링크 복사 · 카카오톡 문구 · 인스타/전단 이미지");
    expect(html).toContain("공유 문구 열기");
    expect(html).toContain('aria-label="분실/목격 공유 도구 열기"');
    expect(html).toContain("w-full");
    expect(html).toContain("sm:w-auto");
    expect(html).not.toContain(">공유 도구 열기<");
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
