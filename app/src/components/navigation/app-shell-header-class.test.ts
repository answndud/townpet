import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME,
  APP_SHELL_DESKTOP_SEARCH_INPUT_CLASS_NAME,
  APP_SHELL_HEADER_CLASS_NAME,
  APP_SHELL_MOBILE_DISCLOSURE_ROW_CLASS_NAME,
  APP_SHELL_MOBILE_DISCLOSURE_TRIGGER_CLASS_NAME,
  APP_SHELL_MOBILE_PANEL_CLASS_NAME,
  APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME,
  APP_SHELL_NAV_LINK_CLASS_NAME,
  getAppShellMobileDisclosureTriggerClassName,
  getAppShellMobileQuickLinkClassName,
  getAppShellNavLinkClassName,
  hasMobileStickyHeader,
  isHeaderNavActive,
  isPublicAcquisitionHeaderPath,
  shouldRefreshViewerShellOnFocus,
} from "@/components/navigation/app-shell-header-class";

describe("app shell header classes", () => {
  it("keeps sticky positioning scoped to tablet and larger breakpoints", () => {
    expect(APP_SHELL_HEADER_CLASS_NAME).toContain("sm:sticky");
    expect(APP_SHELL_HEADER_CLASS_NAME).toContain("sm:top-0");
    expect(hasMobileStickyHeader(APP_SHELL_HEADER_CLASS_NAME)).toBe(false);
  });

  it("skips focus-based viewer shell refresh on feed routes", () => {
    expect(shouldRefreshViewerShellOnFocus("/feed")).toBe(false);
    expect(shouldRefreshViewerShellOnFocus("/feed/guest")).toBe(false);
    expect(shouldRefreshViewerShellOnFocus("/posts/abc")).toBe(true);
  });

  it("keeps mobile quick links compact while preserving touch targets", () => {
    expect(APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME).toContain("text-[11px]");
    expect(APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME).toContain("min-h-9");
    expect(APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME).not.toContain("rounded-md");
    expect(APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME).not.toContain("border");
    expect(APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME).toContain("focus-visible:ring-2");
  });

  it("uses shared desktop link sizing and softer mobile panels for header navigation", () => {
    expect(APP_SHELL_NAV_LINK_CLASS_NAME).not.toContain("rounded-md");
    expect(APP_SHELL_NAV_LINK_CLASS_NAME).not.toContain("hover:bg");
    expect(getAppShellNavLinkClassName(true)).toContain("text-[#2563eb]");
    expect(getAppShellNavLinkClassName(true)).toContain("underline");
    expect(getAppShellNavLinkClassName(true)).toContain("decoration-2");
    expect(getAppShellNavLinkClassName(true)).not.toContain("shadow-[inset_0_-2px_0_#3567b5]");
    expect(getAppShellNavLinkClassName(true)).not.toContain("border-[#b8d1f2]");
    expect(APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME).toContain("gap-1.5");
    expect(APP_SHELL_DESKTOP_SEARCH_INPUT_CLASS_NAME).toContain("rounded-md");
    expect(APP_SHELL_DESKTOP_SEARCH_INPUT_CLASS_NAME).toContain("h-9");
    expect(APP_SHELL_MOBILE_PANEL_CLASS_NAME).toContain("rounded-xl");
  });

  it("uses compact mobile disclosure controls instead of tall card summaries", () => {
    expect(APP_SHELL_MOBILE_DISCLOSURE_ROW_CLASS_NAME).toContain("flex-wrap");
    expect(APP_SHELL_MOBILE_DISCLOSURE_TRIGGER_CLASS_NAME).not.toContain("rounded-md");
    expect(APP_SHELL_MOBILE_DISCLOSURE_TRIGGER_CLASS_NAME).not.toContain("border");
    expect(APP_SHELL_MOBILE_DISCLOSURE_TRIGGER_CLASS_NAME).toContain("min-h-9");
    expect(APP_SHELL_MOBILE_DISCLOSURE_TRIGGER_CLASS_NAME).toContain("focus-visible:ring-2");
    expect(getAppShellMobileDisclosureTriggerClassName(true)).toContain("text-[#2563eb]");
    expect(getAppShellMobileQuickLinkClassName(true)).toContain("underline");
    expect(getAppShellMobileDisclosureTriggerClassName(true)).not.toContain("shadow-[inset_0_-2px_0_#3567b5]");
    expect(getAppShellMobileQuickLinkClassName(true)).not.toContain("border-[#b8d1f2]");
  });

  it("maps app routes to header navigation sections", () => {
    expect(isHeaderNavActive("/feed/guest", "board")).toBe(true);
    expect(isHeaderNavActive("/posts/post-1/guest", "board")).toBe(true);
    expect(isHeaderNavActive("/search/guest", "board")).toBe(true);
    expect(isHeaderNavActive("/profile", "profile")).toBe(true);
    expect(isHeaderNavActive("/bookmarks", "profile")).toBe(true);
    expect(isHeaderNavActive("/notifications", "notifications")).toBe(true);
    expect(isHeaderNavActive("/admin/ops", "admin")).toBe(true);
    expect(isHeaderNavActive("/login", "login")).toBe(true);
    expect(isHeaderNavActive("/", "board")).toBe(false);
  });

  it("keeps authenticated-only header widgets out of the guest initial chunk", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/navigation/app-shell-header.tsx"),
      "utf8",
    );
    const interactiveHeaderSource = readFileSync(
      join(process.cwd(), "src/components/navigation/app-shell-interactive-header.tsx"),
      "utf8",
    );
    const lazyMenuSource = readFileSync(
      join(process.cwd(), "src/components/navigation/lazy-feed-hover-menu.tsx"),
      "utf8",
    );

    expect(source).toContain("next/dynamic");
    expect(source).not.toContain('import { AuthControls } from "@/components/auth/auth-controls"');
    expect(source).not.toContain('import { NotificationBell } from "@/components/notifications/notification-bell"');
    expect(source).not.toContain('import { FeedHoverMenu } from "@/components/navigation/feed-hover-menu"');
    expect(source).not.toContain('import { LazyFeedHoverMenu } from "@/components/navigation/lazy-feed-hover-menu"');
    expect(source).toContain('import("@/components/navigation/app-shell-interactive-header")');
    expect(interactiveHeaderSource).toContain('import { LazyFeedHoverMenu } from "@/components/navigation/lazy-feed-hover-menu"');
    expect(interactiveHeaderSource).toContain('import("@/components/auth/auth-controls")');
    expect(interactiveHeaderSource).toContain('import("@/components/notifications/notification-bell")');
    expect(lazyMenuSource).toContain('import("@/components/navigation/feed-hover-menu")');
  });

  it("keeps hidden pet menu inside the viewport on desktop", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/navigation/feed-hover-menu.tsx"),
      "utf8",
    );

    expect(source).toContain("absolute right-0 top-full z-50 min-w-[240px]");
    expect(source).not.toContain("absolute left-0 top-full z-50 min-w-[240px]");
  });

  it("uses a simplified public landing header on the home route", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/navigation/app-shell-header.tsx"),
      "utf8",
    );

    expect(isPublicAcquisitionHeaderPath("/")).toBe(true);
    expect(isPublicAcquisitionHeaderPath("/guides/pet-used-trade-safety")).toBe(true);
    expect(isPublicAcquisitionHeaderPath("/campaigns/neighborhood-map")).toBe(true);
    expect(isPublicAcquisitionHeaderPath("/towns/%EC%84%9C%EC%9A%B8--%EA%B0%95%EB%82%A8")).toBe(true);
    expect(isPublicAcquisitionHeaderPath("/feed/guest")).toBe(false);
    expect(isPublicAcquisitionHeaderPath("/posts/new")).toBe(false);
    expect(isPublicAcquisitionHeaderPath("/admin/ops")).toBe(false);
    expect(source).toContain("isPublicAcquisitionHeaderPath(pathname)");
    expect(source).toContain("PublicAcquisitionHeader");
    expect(source).toContain('data-testid="header-login-link-home"');
    expect(source).toContain('aria-label="공개 안내 페이지 주요 이동"');
  });
});
