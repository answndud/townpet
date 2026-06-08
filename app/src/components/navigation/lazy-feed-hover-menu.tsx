"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";

import {
  APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME,
  APP_SHELL_MOBILE_DISCLOSURE_ROW_CLASS_NAME,
  getAppShellMobileDisclosureTriggerClassName,
  getAppShellNavLinkClassName,
} from "@/components/navigation/app-shell-header-class";

type MenuKey = "board" | "pet";

type LazyFeedHoverMenuProps = {
  communities: Array<{
    id: string;
    slug: string;
    labelKo: string;
  }>;
  isAuthenticated: boolean;
  initialPreferredPetTypeIds: string[];
  boardActive?: boolean;
};

const FeedHoverMenu = dynamic(
  () => import("@/components/navigation/feed-hover-menu").then((module) => module.FeedHoverMenu),
  { ssr: false },
);

function FeedHoverMenuFallback({
  boardActive = false,
  onRequestMenu,
}: {
  boardActive?: boolean;
  onRequestMenu: (menu: MenuKey, surface: "desktop" | "mobile") => void;
}) {
  return (
    <>
      <div className="w-full space-y-1.5 md:hidden">
        <div className={APP_SHELL_MOBILE_DISCLOSURE_ROW_CLASS_NAME}>
          <button
            type="button"
            className={getAppShellMobileDisclosureTriggerClassName(boardActive)}
            onClick={() => onRequestMenu("board", "mobile")}
            aria-current={boardActive ? "page" : undefined}
          >
            게시판
          </button>
          <button
            type="button"
            className={getAppShellMobileDisclosureTriggerClassName(false)}
            onClick={() => onRequestMenu("pet", "mobile")}
          >
            관심 동물
          </button>
        </div>
      </div>
      <div className={`hidden md:flex ${APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME}`}>
        <div
          onMouseEnter={() => onRequestMenu("board", "desktop")}
          onFocus={() => onRequestMenu("board", "desktop")}
        >
          <button
            type="button"
            className={getAppShellNavLinkClassName(boardActive, "appearance-none")}
            onClick={() => onRequestMenu("board", "desktop")}
            aria-current={boardActive ? "page" : undefined}
          >
            게시판
          </button>
        </div>
        <div
          onMouseEnter={() => onRequestMenu("pet", "desktop")}
          onFocus={() => onRequestMenu("pet", "desktop")}
        >
          <button
            type="button"
            className={getAppShellNavLinkClassName(false, "appearance-none")}
            onClick={() => onRequestMenu("pet", "desktop")}
          >
            관심 동물
          </button>
        </div>
        <Link href="/feed/guest" prefetch={false} className="sr-only">
          전체 게시판
        </Link>
      </div>
    </>
  );
}

export function LazyFeedHoverMenu(props: LazyFeedHoverMenuProps) {
  const [requestedMenu, setRequestedMenu] = useState<{
    menu: MenuKey;
    surface: "desktop" | "mobile";
  } | null>(null);

  if (!requestedMenu) {
    return (
      <FeedHoverMenuFallback
        boardActive={props.boardActive}
        onRequestMenu={(menu, surface) => setRequestedMenu({ menu, surface })}
      />
    );
  }

  return (
    <FeedHoverMenu
      {...props}
      initialOpenMenu={requestedMenu.surface === "desktop" ? requestedMenu.menu : null}
      initialMobileOpenMenu={requestedMenu.surface === "mobile" ? requestedMenu.menu : null}
    />
  );
}
