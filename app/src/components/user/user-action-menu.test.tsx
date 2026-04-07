import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  canOpenUserActionMenu,
  canToggleMuteUser,
  shouldCloseUserActionMenu,
  UserActionMenu,
} from "@/components/user/user-action-menu";

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

vi.mock("@/server/actions/user-relation", () => ({
  muteUserAction: vi.fn(),
  unmuteUserAction: vi.fn(),
}));

describe("UserActionMenu", () => {
  it("renders profile and mute actions for other signed-in viewers", () => {
    const html = renderToStaticMarkup(
      <UserActionMenu
        userId="author-1"
        displayName="작성자"
        currentUserId="viewer-1"
        defaultOpen
      />,
    );

    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("작성자");
    expect(html).toContain('href="/users/author-1"');
    expect(html).toContain("프로필 보기");
    expect(html).toContain(">뮤트<");
    expect(html).toContain("focus-visible:ring-2");
  });

  it("renders unmute when the author is already muted", () => {
    const html = renderToStaticMarkup(
      <UserActionMenu
        userId="author-1"
        displayName="작성자"
        currentUserId="viewer-1"
        isMutedByViewer
        defaultOpen
      />,
    );

    expect(html).toContain("뮤트 해제");
    expect(html).not.toContain(">뮤트<");
  });

  it("falls back to plain text for signed-out viewers", () => {
    const html = renderToStaticMarkup(
      <UserActionMenu
        userId="author-1"
        displayName="작성자"
        plainTextClassName="tp-text-heading"
      />,
    );

    expect(html).toContain("작성자");
    expect(html).not.toContain('aria-haspopup="menu"');
    expect(html).not.toContain("프로필 보기");
  });

  it("keeps helper guards aligned with the menu behavior", () => {
    const insideTarget = { id: "inside-node" };
    const menuRoot = {
      contains: vi.fn((target: unknown) => target === insideTarget),
    };

    expect(canOpenUserActionMenu("viewer-1")).toBe(true);
    expect(canOpenUserActionMenu(undefined)).toBe(false);
    expect(canToggleMuteUser("viewer-1", "author-1")).toBe(true);
    expect(canToggleMuteUser("viewer-1", "viewer-1")).toBe(false);
    expect(shouldCloseUserActionMenu(menuRoot, insideTarget as unknown as EventTarget)).toBe(false);
    expect(
      shouldCloseUserActionMenu(menuRoot, { id: "outside-node" } as unknown as EventTarget),
    ).toBe(true);
  });
});
