"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME,
  APP_SHELL_HEADER_CLASS_NAME,
  getAppShellNavLinkClassName,
  getAppShellMobileQuickLinkClassName,
  isHeaderNavActive,
  isPublicAcquisitionHeaderPath,
  shouldRefreshViewerShellOnFocus,
} from "@/components/navigation/app-shell-header-class";
import { FeedHoverMenu } from "@/components/navigation/feed-hover-menu";
import { emitViewerShellSync, subscribeViewerShellSync } from "@/lib/viewer-shell-sync";

type AppShellHeaderProps = {
  communities: Array<{
    id: string;
    slug: string;
    labelKo: string;
  }>;
};

type CommunityNavItem = AppShellHeaderProps["communities"][number];

type CommunitiesResponse =
  | {
      ok: true;
      data: {
        items: Array<CommunityNavItem & Record<string, unknown>>;
      };
    }
  | { ok: false };

type ViewerShellData = {
  isAuthenticated: boolean;
  userId?: string | null;
  canModerate: boolean;
  unreadNotificationCount: number;
  preferredPetTypeIds: string[];
};

const DEFAULT_VIEWER_SHELL: ViewerShellData = {
  isAuthenticated: false,
  userId: null,
  canModerate: false,
  unreadNotificationCount: 0,
  preferredPetTypeIds: [],
};

const AuthControls = dynamic(
  () => import("@/components/auth/auth-controls").then((module) => module.AuthControls),
  { ssr: false },
);

const NotificationBell = dynamic(
  () => import("@/components/notifications/notification-bell").then((module) => module.NotificationBell),
  { ssr: false },
);

export function AppShellHeader({ communities: initialCommunities = [] }: Partial<AppShellHeaderProps>) {
  const [communities, setCommunities] = useState<CommunityNavItem[]>(initialCommunities);
  const [viewerShell, setViewerShell] = useState<ViewerShellData>(DEFAULT_VIEWER_SHELL);
  const authSnapshotRef = useRef(
    `${DEFAULT_VIEWER_SHELL.isAuthenticated}:${DEFAULT_VIEWER_SHELL.canModerate}`,
  );
  const pathname = usePathname();
  const isAcquisitionHeaderPath = isPublicAcquisitionHeaderPath(pathname);
  const refreshOnFocus = shouldRefreshViewerShellOnFocus(pathname);
  const boardNavActive = isHeaderNavActive(pathname, "board");
  const profileNavActive = isHeaderNavActive(pathname, "profile");
  const notificationNavActive = isHeaderNavActive(pathname, "notifications");
  const adminNavActive = isHeaderNavActive(pathname, "admin");
  const loginNavActive = isHeaderNavActive(pathname, "login");
  const allPetTypeIds = communities.map((item) => item.id);
  const preferredPetTypeIds =
    viewerShell.preferredPetTypeIds.length > 0 ? viewerShell.preferredPetTypeIds : allPetTypeIds;

  useEffect(() => {
    if (isAcquisitionHeaderPath) {
      return;
    }

    if (initialCommunities.length > 0) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadCommunities = async () => {
      try {
        const response = await fetch("/api/communities?limit=50", {
          method: "GET",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const payload = (await response.json()) as CommunitiesResponse;
        if (!response.ok || !payload.ok) {
          return;
        }

        if (!cancelled) {
          setCommunities(
            payload.data.items.map((item) => ({
              id: item.id,
              slug: item.slug,
              labelKo: item.labelKo,
            })),
          );
        }
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
      }
    };

    void loadCommunities();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initialCommunities.length, isAcquisitionHeaderPath]);

  useEffect(() => {
    if (isAcquisitionHeaderPath) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadViewerShell = async () => {
      try {
        const response = await fetch("/api/viewer-shell", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as
          | { ok: true; data: ViewerShellData }
          | { ok: false };
        if (!response.ok || !payload.ok) {
          return;
        }

        if (!cancelled) {
          const nextAuthSnapshot = `${payload.data.isAuthenticated}:${payload.data.canModerate}`;
          if (authSnapshotRef.current !== nextAuthSnapshot) {
            authSnapshotRef.current = nextAuthSnapshot;
            emitViewerShellSync({
              reason: payload.data.isAuthenticated ? "auth-login" : "auth-logout",
            });
          }
          setViewerShell(payload.data);
        }
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
        // Keep the default guest shell when viewer data cannot be loaded.
      }
    };

    void loadViewerShell();

    const unsubscribe = subscribeViewerShellSync(() => {
      void loadViewerShell();
    });
    const handleFocus = () => {
      void loadViewerShell();
    };
    if (refreshOnFocus) {
      window.addEventListener("focus", handleFocus);
    }

    return () => {
      cancelled = true;
      controller.abort();
      if (refreshOnFocus) {
        window.removeEventListener("focus", handleFocus);
      }
      unsubscribe();
    };
  }, [isAcquisitionHeaderPath, pathname, refreshOnFocus]);

  if (isAcquisitionHeaderPath) {
    return (
      <header className="border-b border-[#d8e4f6] bg-[#f4f8ffeb]">
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-2.5 lg:px-10">
          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center"
            aria-label="TownPet 홈으로 이동"
          >
            <Image
              src="/townpet-logo.svg"
              alt="TownPet"
              width={274}
              height={72}
              priority
              className="h-[34px] w-auto sm:h-[38px]"
            />
          </Link>
          <nav className="flex items-center gap-1.5" aria-label="공개 안내 페이지 주요 이동">
            <Link
              href="/feed/guest"
              prefetch={false}
              className="inline-flex min-h-9 items-center px-2 text-xs font-semibold text-[#315484] transition hover:text-[#1f4f8f] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25"
            >
              게시판
            </Link>
            {viewerShell.isAuthenticated ? (
              <Link
                href="/profile"
                prefetch={false}
                className="inline-flex min-h-9 items-center px-2 text-xs font-semibold text-[#315484] transition hover:text-[#1f4f8f] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25"
              >
                내 프로필
              </Link>
            ) : (
              <Link
                href="/login"
                prefetch={false}
                data-testid="header-login-link-home"
                className="inline-flex min-h-9 items-center px-2 text-xs font-semibold text-[#315484] transition hover:text-[#1f4f8f] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25"
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className={APP_SHELL_HEADER_CLASS_NAME}>
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-1.5 px-4 py-2 sm:gap-2 sm:px-6 sm:py-2.5 lg:px-10 lg:py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center"
            aria-label="TownPet 홈으로 이동"
          >
            <Image
              src="/townpet-logo.svg"
              alt="TownPet"
              width={274}
              height={72}
              priority
              className="h-[34px] w-auto sm:h-[40px]"
            />
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-1.5 md:hidden">
            {viewerShell.canModerate ? (
              <Link
                href="/admin"
                prefetch={false}
                className={getAppShellMobileQuickLinkClassName(adminNavActive)}
                aria-current={adminNavActive ? "page" : undefined}
              >
                관리자
              </Link>
            ) : null}
            <Link
              href="/profile"
              prefetch={false}
              className={getAppShellMobileQuickLinkClassName(profileNavActive)}
              aria-current={profileNavActive ? "page" : undefined}
            >
              내 프로필
            </Link>
            {viewerShell.isAuthenticated ? (
              <Link
                href="/notifications"
                prefetch={false}
                className={getAppShellMobileQuickLinkClassName(notificationNavActive)}
                aria-current={notificationNavActive ? "page" : undefined}
              >
                알림
                {viewerShell.unreadNotificationCount > 0 ? (
                  <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[#dcecff] px-1 text-[10px] font-semibold text-[#1f4f8f]">
                    {viewerShell.unreadNotificationCount > 99
                      ? "99+"
                      : viewerShell.unreadNotificationCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {viewerShell.isAuthenticated ? (
              <AuthControls
                label="로그아웃"
                className={getAppShellMobileQuickLinkClassName(false, "text-[#173963] hover:text-[#0f2f56] disabled:opacity-60")}
              />
            ) : (
              <Link
                href="/login"
                prefetch={false}
                data-testid="header-login-link-mobile"
                className={getAppShellMobileQuickLinkClassName(loginNavActive, "text-[#173963] hover:text-[#0f2f56]")}
                aria-current={loginNavActive ? "page" : undefined}
              >
                로그인
              </Link>
            )}
          </div>
        </div>
        <nav className="flex flex-col gap-1.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <FeedHoverMenu
              key={`${viewerShell.isAuthenticated ? "auth" : "guest"}:${preferredPetTypeIds.join(",")}`}
              communities={communities}
              isAuthenticated={viewerShell.isAuthenticated}
              initialPreferredPetTypeIds={preferredPetTypeIds}
              boardActive={boardNavActive}
            />

            <div className={`hidden md:flex ${APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME}`}>
              <Link
                href="/profile"
                prefetch={false}
                className={getAppShellNavLinkClassName(profileNavActive)}
                aria-current={profileNavActive ? "page" : undefined}
              >
                내 프로필
              </Link>
              {viewerShell.isAuthenticated ? (
                <NotificationBell
                  unreadCount={viewerShell.unreadNotificationCount}
                  active={notificationNavActive}
                />
              ) : null}
            </div>

            {viewerShell.canModerate ? (
              <div className={`hidden md:flex ${APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME}`}>
                <Link
                  href="/admin"
                  prefetch={false}
                  className={getAppShellNavLinkClassName(adminNavActive)}
                  aria-current={adminNavActive ? "page" : undefined}
                >
                  관리자
                </Link>
              </div>
            ) : null}
          </div>

          <div className={`hidden md:flex ${APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME}`}>
            {viewerShell.isAuthenticated ? (
              <AuthControls
                className={getAppShellNavLinkClassName(false, "text-[#173963] hover:text-[#0f2f56] disabled:opacity-60")}
                label="로그아웃"
              />
            ) : (
              <Link
                href="/login"
                prefetch={false}
                data-testid="header-login-link"
                className={getAppShellNavLinkClassName(loginNavActive, "text-[#173963] hover:text-[#0f2f56]")}
                aria-current={loginNavActive ? "page" : undefined}
              >
                로그인
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
