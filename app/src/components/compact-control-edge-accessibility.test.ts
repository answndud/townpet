import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("remaining compact user control accessibility", () => {
  it("keeps notification center item actions mobile-safe", () => {
    const code = readSource("src/components/notifications/notification-center.tsx");

    expect(code).toContain("notification-move");
    expect(code).toContain("inline-flex min-h-10");
    expect(code).not.toContain("min-h-9 px-3 py-1.5");
  });

  it("keeps notification bell popover actions mobile-safe and announced", () => {
    const code = readSource("src/components/notifications/notification-bell.tsx");

    expect(code).toContain("min-h-10");
    expect(code).toContain("min-w-10");
    expect(code).toContain('role="alert"');
    expect(code).toContain('aria-live="polite"');
    expect(code).not.toContain("h-7 items-center");
    expect(code).not.toContain("h-6 w-6");
    expect(code).not.toContain("h-9 w-full");
  });

  it("keeps saved-post search inputs mobile-safe", () => {
    const sources = [
      "src/app/bookmarks/page.tsx",
      "src/app/my-posts/page.tsx",
    ].map(readSource).join("\n");

    expect(sources).toContain("min-h-10 w-full");
    expect(sources).toContain("rounded-md bg-[#3567b5]");
    expect(sources).toContain("hover:underline hover:underline-offset-4");
    expect(sources).not.toContain("tp-input-soft h-9");
    expect(sources).not.toContain("tp-btn-primary");
    expect(sources).not.toContain("tp-btn-soft");
    expect(sources).not.toContain("tp-btn-md");
  });

  it("keeps profile and relation controls mobile-safe with status announcements", () => {
    const sources = [
      "src/components/profile/profile-social-account-connections.tsx",
      "src/components/user/user-relation-controls.tsx",
    ].map(readSource).join("\n");

    expect(sources).toContain("min-h-10");
    expect(sources).toContain('role="status"');
    expect(sources).toContain('aria-live="polite"');
    expect(sources).not.toContain("min-h-9 items-center");
  });

  it("keeps menu popovers dismissible outside their trigger area", () => {
    const dismissibleDetailsCode = readSource("src/components/ui/dismissible-details.tsx");
    const dismissibleLayerCode = readSource("src/components/ui/use-dismissible-layer.ts");
    const menuSources = [
      "src/components/posts/post-detail-primary-card.tsx",
      "src/app/posts/[id]/guest/page.tsx",
      "src/components/posts/post-comment-thread.tsx",
      "src/components/posts/guest-post-detail-actions.tsx",
      "src/components/posts/post-bookmark-button.tsx",
      "src/components/posts/reaction-login-prompt.tsx",
      "src/components/posts/feed-search-form.tsx",
      "src/components/notifications/notification-bell.tsx",
    ].map(readSource).join("\n");
    const feedHoverMenuCode = readSource("src/components/navigation/feed-hover-menu.tsx");

    expect(dismissibleDetailsCode).toContain('document.addEventListener("pointerdown"');
    expect(dismissibleDetailsCode).toContain('document.addEventListener("focusin"');
    expect(dismissibleDetailsCode).toContain('event.key === "Escape"');
    expect(dismissibleDetailsCode).toContain("[data-dismissible-details-close]");
    expect(dismissibleLayerCode).toContain('document.addEventListener("pointerdown"');
    expect(dismissibleLayerCode).toContain('document.addEventListener("focusin"');
    expect(dismissibleLayerCode).toContain('event.key === "Escape"');
    expect(menuSources).toContain("DismissibleDetails");
    expect(menuSources).toContain("useDismissibleLayer");
    expect(menuSources).toContain("data-dismissible-details-close");
    expect(feedHoverMenuCode).toContain('document.addEventListener("pointerdown"');
    expect(feedHoverMenuCode).toContain('document.addEventListener("focusin"');
    expect(feedHoverMenuCode).toContain('event.key === "Escape"');
  });

  it("keeps feed hover pet menu actions compact but hierarchy-safe", () => {
    const code = readSource("src/components/navigation/feed-hover-menu.tsx");

    expect(code).toContain("FEED_HOVER_MENU_TEXT_ACTION_CLASS_NAME");
    expect(code).toContain("FEED_HOVER_MENU_SAVE_ACTION_CLASS_NAME");
    expect(code).toContain("inline-flex min-h-10 items-center justify-center rounded-md bg-[#3567b5]");
    expect(code).toContain("hover:underline hover:underline-offset-4");
    expect(code).not.toContain("tp-btn-soft px-2.5 py-1 text-[11px] font-semibold text-[#204f8a]");
    expect(code).not.toContain("tp-btn-soft px-2 py-1 text-[11px] font-semibold text-[#204f8a]");
  });

  it("keeps feed error recovery actions mobile-safe without legacy 30px buttons", () => {
    const code = readSource("src/app/feed/error.tsx");

    expect(code).toContain("FEED_ERROR_PRIMARY_ACTION_CLASS_NAME");
    expect(code).toContain("FEED_ERROR_TEXT_ACTION_CLASS_NAME");
    expect(code).toContain("inline-flex min-h-10 items-center justify-center rounded-md bg-[#3567b5]");
    expect(code).toContain("hover:underline hover:underline-offset-4");
    expect(code).not.toContain("tp-btn-primary inline-flex h-[30px]");
    expect(code).not.toContain("tp-btn-soft inline-flex h-[30px]");
  });

  it("keeps auxiliary navigation and error recovery links out of legacy button styling", () => {
    const sources = [
      "src/app/error.tsx",
      "src/app/not-found.tsx",
      "src/app/posts/[id]/error.tsx",
      "src/app/admin/error.tsx",
      "src/components/ui/error-state-back-button.tsx",
      "src/components/neighborhood/neighborhood-gate-notice.tsx",
      "src/components/navigation/app-shell-footer.tsx",
      "src/app/posts/new/page.tsx",
      "src/components/posts/post-detail-client.tsx",
    ].map(readSource).join("\n");

    expect(sources).toContain("ERROR_STATE_PRIMARY_ACTION_CLASS_NAME");
    expect(sources).toContain("ERROR_STATE_TEXT_ACTION_CLASS_NAME");
    expect(sources).toContain("hover:underline hover:underline-offset-4");
    expect(sources).not.toContain("tp-btn-soft inline-flex h-[28px]");
    expect(sources).not.toContain("tp-btn-soft inline-flex min-h-10 items-center px-3 text-xs");
    expect(sources).not.toContain("tp-btn-soft px-4 py-2 text-[#315484]");
    expect(sources).not.toContain("tp-btn-primary inline-flex min-h-11");
    expect(sources).not.toContain("tp-btn-soft inline-flex min-h-11");
    expect(sources).not.toContain("tp-btn-primary inline-flex min-h-10 items-center px-3 text-xs");
    expect(sources).not.toContain("tp-btn-soft px-4 py-2");
  });
});
