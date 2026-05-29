import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PostStatus } from "@prisma/client";

import {
  canOpenCommentAuthorMenu,
  canMuteCommentAuthor,
  PostCommentThread,
  shouldIgnoreCommentPanelReplyClick,
  shouldRefreshCommentRoute,
  shouldCloseCommentAuthorMenu,
} from "@/components/posts/post-comment-thread";
import {
  POST_COMMENT_BEST_SECTION_CLASS_NAME,
  POST_COMMENT_LATEST_HEADER_CLASS_NAME,
  POST_COMMENT_ROOT_COMPOSER_WRAPPER_CLASS_NAME,
  POST_COMMENT_ROOT_LIST_CLASS_NAME,
  POST_COMMENT_THREAD_FOOTER_CLASS_NAME,
  POST_COMMENT_THREAD_MENU_PANEL_CLASS_NAME,
  POST_COMMENT_THREAD_REPLY_CARD_CLASS_NAME,
  POST_COMMENT_THREAD_ROOT_CARD_CLASS_NAME,
  POST_COMMENT_THREAD_SIGHTING_META_CLASS_NAME,
} from "@/components/posts/post-comment-layout-class";

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
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/posts/comment-reaction-controls", () => ({
  CommentReactionControls: ({
    commentId,
    likeCount,
    dislikeCount,
  }: {
    commentId: string;
    likeCount: number;
    dislikeCount: number;
  }) => <div data-comment-reaction={commentId}>{likeCount}:{dislikeCount}</div>,
  canUseCommentReaction: vi.fn(() => true),
}));

vi.mock("@/components/content/linkified-content", () => ({
  LinkifiedContent: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("@/components/posts/post-report-form", () => ({
  PostReportForm: () => <div>신고 폼</div>,
}));

vi.mock("@/lib/guest-client", () => ({
  getClientFingerprint: vi.fn(() => "fp"),
  getGuestFingerprint: vi.fn(() => "guest-fp"),
}));

vi.mock("@/lib/guest-step-up.client", () => ({
  getGuestWriteHeaders: vi.fn(async () => ({})),
}));

vi.mock("@/server/actions/comment", () => ({
  createCommentAction: vi.fn(),
  deleteCommentAction: vi.fn(),
  updateCommentAction: vi.fn(),
}));

vi.mock("@/server/actions/user-relation", () => ({
  muteUserAction: vi.fn(),
  unmuteUserAction: vi.fn(),
}));

function buildComment(
  id: string,
  overrides?: Partial<{
    content: string;
    parentId: string | null;
    threadRootId: string | null;
    threadPage: number | null;
    likeCount: number;
    dislikeCount: number;
    authorId: string;
    isMutedByViewer: boolean;
    kind: "GENERAL" | "LOST_FOUND_SIGHTING";
    sightingLocation: string;
    sightingSeenAt: string;
    sightingImageUrl: string;
    isPrivateSighting: boolean;
  }>,
) {
  return {
    id,
    kind: overrides?.kind ?? "GENERAL",
    content: overrides?.content ?? `${id} 내용`,
    sightingLocation: overrides?.sightingLocation,
    sightingSeenAt: overrides?.sightingSeenAt,
    sightingImageUrl: overrides?.sightingImageUrl,
    isPrivateSighting: overrides?.isPrivateSighting,
    createdAt: "2026-03-11T10:00:00.000Z",
    parentId: overrides?.parentId ?? null,
    threadRootId: overrides?.threadRootId,
    threadPage: overrides?.threadPage,
    status: PostStatus.ACTIVE,
    likeCount: overrides?.likeCount ?? 0,
    dislikeCount: overrides?.dislikeCount ?? 0,
    isMutedByViewer: overrides?.isMutedByViewer,
    author: {
      id: overrides?.authorId ?? `user-${id}`,
      nickname: `${id}닉네임`,
    },
  };
}

describe("PostCommentThread", () => {
  it("renders a best comment section above the latest comment list", () => {
    const html = renderToStaticMarkup(
      <PostCommentThread
        postId="post-1"
        comments={[
          buildComment("latest-root", { content: "최신 댓글 본문" }),
          buildComment("latest-reply", {
            content: "최신 댓글의 답글",
            parentId: "latest-root",
          }),
        ]}
        bestComments={[
          buildComment("best-1", {
            content: "베스트 댓글 본문",
            threadRootId: "best-1",
            threadPage: 1,
            likeCount: 28,
            dislikeCount: 1,
          }),
        ]}
        totalCommentCount={3}
        currentPage={1}
        totalPages={1}
        currentUserId="user-1"
        canInteract
      />,
    );

    expect(html).toContain("베스트 댓글");
    expect(html).toContain("최신 댓글");
    expect(html).toContain("베스트 댓글 본문");
    expect(html).toContain("최신 댓글 본문");
    expect(html).toContain("최신 댓글의 답글");
    expect(html).toContain("원댓글로 가기");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("best-1닉네임");
    expect(html).toContain(POST_COMMENT_BEST_SECTION_CLASS_NAME);
    expect(html).toContain(POST_COMMENT_LATEST_HEADER_CLASS_NAME);
    expect(html).toContain(POST_COMMENT_ROOT_LIST_CLASS_NAME);
    expect(html).toContain(POST_COMMENT_THREAD_FOOTER_CLASS_NAME);
    expect(html).toContain("tp-text-muted inline-flex min-h-8 min-w-8 cursor-pointer list-none");
    expect(html).toContain(POST_COMMENT_THREAD_MENU_PANEL_CLASS_NAME);
    expect(html).toContain("댓글 작업 메뉴");
    expect(html).toContain("신고");
    expect(html).toContain('role="button"');
    expect(html).toContain("댓글에 답글 작성");
    expect(html).toContain("aria-expanded");
    expect(html).not.toContain(">답글</button>");
    expect(html).not.toContain("답글 취소");
    expect(html).toContain(POST_COMMENT_ROOT_COMPOSER_WRAPPER_CLASS_NAME);
    expect(html).toContain(POST_COMMENT_THREAD_ROOT_CARD_CLASS_NAME);
    expect(html).toContain(POST_COMMENT_THREAD_REPLY_CARD_CLASS_NAME);
    expect(html).toContain("before:bg-[#dfe9f8]");
    expect(html).toContain("relative mt-1.5 ml-3");
    expect(html).toContain("sm:ml-5");
    expect(html).toContain("before:absolute");
    expect(html).toContain("space-y-1.5 pl-2.5");
    expect(html).toContain("sm:pl-3");
    expect(html).not.toContain('href="/users/user-best-1"');
    expect(html).not.toContain("프로필 보기");
    expect(html).not.toContain("뮤트");
    expect(html).not.toContain("작성 글 보기");
    expect(html).toContain("divide-[#edf3fb]");
    expect(html).not.toContain("TOP 4");
    expect(html.indexOf("베스트 댓글")).toBeLessThan(html.indexOf("최신 댓글"));
  });

  it("closes the author menu only for outside targets", () => {
    const insideTarget = { id: "inside-node" };
    const menuRoot = {
      contains: vi.fn((target: unknown) => target === insideTarget),
    };

    expect(shouldCloseCommentAuthorMenu(menuRoot, insideTarget as unknown as EventTarget)).toBe(false);
    expect(
      shouldCloseCommentAuthorMenu(menuRoot, { id: "outside-node" } as unknown as EventTarget),
    ).toBe(true);
    expect(shouldCloseCommentAuthorMenu(menuRoot, null)).toBe(false);
  });

  it("ignores nested controls when opening reply from the comment panel", () => {
    const article = {
      name: "article",
      closest: vi.fn((): unknown => article),
    };
    const body = {
      closest: vi.fn(() => article),
    };
    const button = {
      closest: vi.fn(() => ({ name: "nested-button" })),
    };
    const ignoredText = {
      closest: vi.fn(() => ({ name: "ignored-region" })),
    };

    expect(
      shouldIgnoreCommentPanelReplyClick(body as unknown as EventTarget, article as unknown as EventTarget),
    ).toBe(false);
    expect(
      shouldIgnoreCommentPanelReplyClick(article as unknown as EventTarget, article as unknown as EventTarget),
    ).toBe(false);
    expect(
      shouldIgnoreCommentPanelReplyClick(button as unknown as EventTarget, article as unknown as EventTarget),
    ).toBe(true);
    expect(
      shouldIgnoreCommentPanelReplyClick(ignoredText as unknown as EventTarget, article as unknown as EventTarget),
    ).toBe(true);
  });

  it("allows mute only for other signed-in users", () => {
    expect(canMuteCommentAuthor("viewer-1", "author-1")).toBe(true);
    expect(canMuteCommentAuthor("viewer-1", "viewer-1")).toBe(false);
    expect(canMuteCommentAuthor(undefined, "author-1")).toBe(false);
  });

  it("does not render the author menu for signed-out viewers", () => {
    const html = renderToStaticMarkup(
      <PostCommentThread
        postId="post-1"
        comments={[buildComment("latest-root", { content: "최신 댓글 본문" })]}
        bestComments={[
          buildComment("best-1", {
            content: "베스트 댓글 본문",
            threadRootId: "best-1",
            threadPage: 1,
            likeCount: 28,
            dislikeCount: 1,
          }),
        ]}
        totalCommentCount={3}
        currentPage={1}
        totalPages={1}
        canInteract={false}
      />,
    );

    expect(html).toContain("best-1닉네임");
    expect(html).toContain("latest-root닉네임");
    expect(html).not.toContain('aria-haspopup="menu"');
    expect(html).not.toContain("프로필 보기");
    expect(html).not.toContain("뮤트");
  });

  it("renders lost-found sighting comments with structured metadata", () => {
    const html = renderToStaticMarkup(
      <PostCommentThread
        postId="post-1"
        comments={[
          buildComment("sighting-1", {
            kind: "LOST_FOUND_SIGHTING",
            content: "북문 쪽으로 이동했습니다.",
            sightingLocation: "중앙공원 북문",
            sightingSeenAt: "2026-05-21T10:30:00.000Z",
            sightingImageUrl: "https://example.com/sighting.jpg",
            isPrivateSighting: true,
          }),
        ]}
        bestComments={[]}
        totalCommentCount={1}
        currentPage={1}
        totalPages={1}
        currentUserId="viewer-1"
        canInteract
        lostFoundSightingEnabled
      />,
    );

    expect(html).toContain("목격 제보");
    expect(html).toContain("보호자 공개");
    expect(html).toContain("목격 위치");
    expect(html).toContain("중앙공원 북문");
    expect(html).toContain("사진 열기");
    expect(html).toContain("목격했어요");
    expect(html).toContain(POST_COMMENT_THREAD_SIGHTING_META_CLASS_NAME);
    expect(html).not.toContain("rounded-lg border border-[#dbe6f5] bg-[#f8fbff] px-3 py-2");
  });

  it("opens the author menu only for signed-in viewers", () => {
    expect(canOpenCommentAuthorMenu("viewer-1")).toBe(true);
    expect(canOpenCommentAuthorMenu(undefined)).toBe(false);
  });

  it("keeps report in the comment overflow menu instead of the footer actions", () => {
    const html = renderToStaticMarkup(
      <PostCommentThread
        postId="post-1"
        comments={[buildComment("reportable-root", { content: "신고 가능한 댓글" })]}
        bestComments={[]}
        totalCommentCount={1}
        currentPage={1}
        totalPages={1}
        currentUserId="viewer-1"
        canInteract
      />,
    );

    const footerIndex = html.indexOf(POST_COMMENT_THREAD_FOOTER_CLASS_NAME);
    const menuIndex = html.indexOf(POST_COMMENT_THREAD_MENU_PANEL_CLASS_NAME);
    const reportIndex = html.indexOf(">신고</button>");

    expect(html).toContain("reportable-root닉네임 댓글 작업 메뉴");
    expect(menuIndex).toBeGreaterThan(-1);
    expect(reportIndex).toBeGreaterThan(menuIndex);
    expect(reportIndex).toBeLessThan(footerIndex);
    expect(html).toContain('data-comment-reaction="reportable-root"');
  });

  it("uses the lighter client comment reload path when available", () => {
    expect(shouldRefreshCommentRoute()).toBe(true);
    expect(shouldRefreshCommentRoute(async () => undefined)).toBe(false);
  });

  it("renders muted comments as placeholders while preserving visible replies", () => {
    const html = renderToStaticMarkup(
      <PostCommentThread
        postId="post-1"
        comments={[
          buildComment("muted-root", {
            content: "숨겨져야 하는 원문",
            authorId: "muted-user",
            isMutedByViewer: true,
          }),
          buildComment("visible-reply", {
            content: "보이는 답글",
            parentId: "muted-root",
            authorId: "visible-user",
          }),
        ]}
        bestComments={[]}
        totalCommentCount={2}
        currentPage={1}
        totalPages={1}
        currentUserId="viewer-1"
        canInteract
      />,
    );

    expect(html).toContain("뮤트한 사용자");
    expect(html).toContain("뮤트한 사용자 댓글입니다.");
    expect(html).toContain("뮤트 해제");
    expect(html).not.toContain("숨겨져야 하는 원문");
    expect(html).toContain(POST_COMMENT_THREAD_FOOTER_CLASS_NAME);
    expect(html).toContain(POST_COMMENT_THREAD_REPLY_CARD_CLASS_NAME);
    expect(html).toContain("보이는 답글");
    expect(html).not.toContain('data-comment-reaction="muted-root"');
    expect(html).toContain('data-comment-reaction="visible-reply"');
  });

  it("renders muted best comments as placeholders instead of removing them", () => {
    const html = renderToStaticMarkup(
      <PostCommentThread
        postId="post-1"
        comments={[buildComment("latest-root", { content: "최신 댓글 본문" })]}
        bestComments={[
          buildComment("best-muted", {
            content: "숨겨져야 하는 베스트 원문",
            threadRootId: "best-muted",
            threadPage: 1,
            likeCount: 28,
            dislikeCount: 1,
            isMutedByViewer: true,
          }),
        ]}
        totalCommentCount={2}
        currentPage={1}
        totalPages={1}
        currentUserId="viewer-1"
        canInteract
      />,
    );

    expect(html).toContain("베스트 댓글");
    expect(html).toContain("뮤트한 사용자");
    expect(html).toContain("뮤트한 사용자 댓글입니다.");
    expect(html).toContain("뮤트 해제");
    expect(html).not.toContain("숨겨져야 하는 베스트 원문");
  });
});
