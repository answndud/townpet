"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PostType } from "@prisma/client";

import {
  APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME,
  APP_SHELL_MOBILE_DISCLOSURE_ROW_CLASS_NAME,
  APP_SHELL_MOBILE_PANEL_CLASS_NAME,
  APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME,
  getAppShellMobileDisclosureTriggerClassName,
  getAppShellNavLinkClassName,
} from "@/components/navigation/app-shell-header-class";
import {
  PET_TYPE_PREFERENCE_COOKIE,
  parsePetTypePreferenceCookie,
  serializePetTypePreferenceCookie,
} from "@/lib/pet-type-preference-cookie";
import { normalizeFeedPetTypeIds } from "@/lib/feed-pet-type-filter";
import { buildBoardListingHref, buildFeedHref } from "@/lib/community-board";
import { getPostTypeMeta } from "@/lib/post-presenter";
import { groupPetTypeCommunities } from "@/lib/pet-type-taxonomy";
import { PRIMARY_POST_TYPES } from "@/lib/post-type-groups";
import { emitViewerShellSync } from "@/lib/viewer-shell-sync";
import { updatePreferredPetTypesAction } from "@/server/actions/user";

type FeedHoverMenuProps = {
  communities: Array<{
    id: string;
    slug: string;
    labelKo: string;
  }>;
  isAuthenticated: boolean;
  initialPreferredPetTypeIds: string[];
  boardActive?: boolean;
};

function writePetTypePreferenceCookie(petTypeIds: string[]) {
  document.cookie = `${PET_TYPE_PREFERENCE_COOKIE}=${encodeURIComponent(serializePetTypePreferenceCookie(petTypeIds))}; path=/; max-age=31536000; samesite=lax`;
}

export function FeedHoverMenu({
  communities,
  isAuthenticated,
  initialPreferredPetTypeIds,
  boardActive = false,
}: FeedHoverMenuProps) {
  const groupedCommunities = groupPetTypeCommunities(communities);
  const selectableCommunities = groupedCommunities.flatMap((group) => group.items);
  const allPetTypeIds = selectableCommunities.map((item) => item.id);
  const boardPostTypes = [
    ...PRIMARY_POST_TYPES.filter(
      (value) => value !== PostType.PLACE_REVIEW && value !== PostType.WALK_ROUTE,
    ),
    PostType.PRODUCT_REVIEW,
    PostType.PET_SHOWCASE,
  ];
  const [openMenu, setOpenMenu] = useState<"board" | "pet" | null>(null);
  const [mobileOpenMenu, setMobileOpenMenu] = useState<"board" | "pet" | null>(null);
  const [selectedPetTypeIds, setSelectedPetTypeIds] = useState<string[]>(() => {
    if (typeof document === "undefined" || isAuthenticated) {
      return initialPreferredPetTypeIds;
    }

    const cookieValue = document.cookie
      .split("; ")
      .find((value) => value.startsWith(`${PET_TYPE_PREFERENCE_COOKIE}=`))
      ?.split("=")[1];
    const parsedCookieIds = parsePetTypePreferenceCookie(
      cookieValue ? decodeURIComponent(cookieValue) : undefined,
    );
    return parsedCookieIds.length > 0 ? parsedCookieIds : initialPreferredPetTypeIds;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);

  const clearCloseTimer = () => {
    if (!closeTimerRef.current) {
      return;
    }
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const openMenuNow = (menu: "board" | "pet") => {
    clearCloseTimer();
    setOpenMenu(menu);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenMenu(null);
      closeTimerRef.current = null;
    }, 140);
  };

  useEffect(() => {
    if (!openMenu && !mobileOpenMenu) {
      return;
    }

    const closeIfOutside = (target: EventTarget | null) => {
      if (!target) {
        return;
      }
      const targetNode = target as Node;
      if (mobileMenuRef.current?.contains(targetNode) || desktopMenuRef.current?.contains(targetNode)) {
        return;
      }
      clearCloseTimer();
      setOpenMenu(null);
      setMobileOpenMenu(null);
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      closeIfOutside(event.target);
    };

    const handleFocusIn = (event: globalThis.FocusEvent) => {
      closeIfOutside(event.target);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        clearCloseTimer();
        setOpenMenu(null);
        setMobileOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpenMenu, openMenu]);

  const togglePetType = (petTypeId: string) => {
    setSelectedPetTypeIds((prev) =>
      prev.includes(petTypeId)
        ? prev.filter((id) => id !== petTypeId)
        : [...prev, petTypeId].slice(0, 50),
    );
  };

  const savePetTypes = () => {
    if (selectedPetTypeIds.length === 0) {
      setMessage("최소 1개 이상 선택해 주세요.");
      return;
    }

    const normalizedSelectedPetTypeIds = normalizeFeedPetTypeIds(
      selectedPetTypeIds,
      allPetTypeIds,
    );

    if (!isAuthenticated) {
      writePetTypePreferenceCookie(normalizedSelectedPetTypeIds);
      setMessage("관심 동물 설정을 저장했습니다.");
      if (pathname?.startsWith("/feed")) {
        const params = new URLSearchParams(
          typeof window === "undefined" ? "" : window.location.search,
        );
        params.delete("petType");
        params.delete("page");
        for (const petTypeId of normalizedSelectedPetTypeIds) {
          params.append("petType", petTypeId);
        }
        const nextPath = params.toString() ? `/feed?${params.toString()}` : "/feed";
        router.push(nextPath);
      }
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await updatePreferredPetTypesAction({
        petTypeIds: normalizedSelectedPetTypeIds,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("관심 동물 설정을 저장했습니다.");
      emitViewerShellSync({ reason: "preferred-pet-types-updated" });
      if (pathname?.startsWith("/feed")) {
        router.refresh();
      }
    });
  };

  return (
    <>
      <div ref={mobileMenuRef} className="w-full space-y-1.5 md:hidden">
        <div className={APP_SHELL_MOBILE_DISCLOSURE_ROW_CLASS_NAME}>
          <button
            type="button"
            className={getAppShellMobileDisclosureTriggerClassName(boardActive)}
            onClick={() =>
              setMobileOpenMenu((prev) => (prev === "board" ? null : "board"))
            }
            aria-expanded={mobileOpenMenu === "board"}
            aria-current={boardActive ? "page" : undefined}
          >
            게시판
          </button>
          <button
            type="button"
            className={getAppShellMobileDisclosureTriggerClassName(false)}
            onClick={() =>
              setMobileOpenMenu((prev) => (prev === "pet" ? null : "pet"))
            }
            aria-expanded={mobileOpenMenu === "pet"}
          >
            관심 동물
            {isAuthenticated ? (
              <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[#dcecff] px-1 text-[10px] font-semibold text-[#1f4f8f]">
                {selectedPetTypeIds.length}
              </span>
            ) : null}
          </button>
        </div>

        {mobileOpenMenu === "board" ? (
          <div className={APP_SHELL_MOBILE_PANEL_CLASS_NAME}>
          <div className="flex flex-wrap gap-1.5 bg-white p-2.5">
            <Link
              href={buildFeedHref({ page: "1" })}
              className={APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME}
              onClick={() => setMobileOpenMenu(null)}
            >
              전체
            </Link>
            {boardPostTypes.map((value) => (
              <Link
                key={`mobile-nav-type-${value}`}
                href={buildBoardListingHref(value)}
                className={APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME}
                onClick={() => setMobileOpenMenu(null)}
              >
                {getPostTypeMeta(value).label}
              </Link>
            ))}
          </div>
          </div>
        ) : null}

        {mobileOpenMenu === "pet" ? (
          <div className={APP_SHELL_MOBILE_PANEL_CLASS_NAME}>
          <div className="bg-white p-2.5">
            <p className="px-1 pb-1 text-[11px] text-[#5a7398]">보고 싶은 동물을 체크하고 저장하세요.</p>
            <div className="max-h-[44vh] space-y-0.5 overflow-y-auto pr-1">
              {groupedCommunities.map((group) => (
                <div key={`mobile-pet-group-${group.key}`} className="py-0.5">
                  <p className="px-2 pb-0.5 text-[10px] font-semibold text-[#6a86ad]">{group.label}</p>
                  {group.items.map((community) => {
                    const checked = selectedPetTypeIds.includes(community.id);
                    return (
                      <label
                        key={`mobile-nav-community-${community.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePetType(community.id)}
                          className="h-3.5 w-3.5 border-[#bcd0ed]"
                        />
                        <span>{community.labelKo}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#e3ebf8] pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[#5173a3] hover:text-[#204f8a]"
                  onClick={() => setSelectedPetTypeIds(selectableCommunities.map((item) => item.id))}
                  disabled={isPending}
                >
                  전체 선택
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[#5173a3] hover:text-[#204f8a]"
                  onClick={() => setSelectedPetTypeIds([])}
                  disabled={isPending}
                >
                  전체 해제
                </button>
              </div>
              <button
                type="button"
                className="tp-btn-soft px-2.5 py-1 text-[11px] font-semibold text-[#204f8a] disabled:opacity-60"
                onClick={savePetTypes}
                disabled={isPending}
              >
                {isPending ? "저장 중..." : "저장"}
              </button>
            </div>
            {message ? <p className="mt-1 text-[11px] text-[#4f678d]">{message}</p> : null}
          </div>
          </div>
        ) : null}
      </div>

      <div
        ref={desktopMenuRef}
        className={`hidden md:flex ${APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME}`}
        onMouseLeave={scheduleClose}
      >
        <div className="relative" onMouseEnter={() => openMenuNow("board")} onMouseLeave={scheduleClose}>
          <button
            type="button"
            className={getAppShellNavLinkClassName(boardActive, "appearance-none")}
            onFocus={() => openMenuNow("board")}
            onBlur={scheduleClose}
            onClick={() => setOpenMenu((prev) => (prev === "board" ? null : "board"))}
            aria-expanded={openMenu === "board"}
            aria-current={boardActive ? "page" : undefined}
          >
            게시판
          </button>
          <div
            className={`absolute left-0 top-full z-50 min-w-[220px] transition duration-150 ${
              openMenu === "board" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="rounded-xl border border-[#dbe6f6] bg-white py-1.5 shadow-[0_12px_24px_rgba(16,40,74,0.10)]">
              <Link
                href={buildFeedHref({ page: "1" })}
                className="block px-3 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
                onClick={() => setOpenMenu(null)}
              >
                전체
              </Link>
              {boardPostTypes.map((value) => (
                <Link
                  key={`nav-type-${value}`}
                  href={buildBoardListingHref(value)}
                  className="block px-3 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
                  onClick={() => setOpenMenu(null)}
                >
                  {getPostTypeMeta(value).label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="relative" onMouseEnter={() => openMenuNow("pet")} onMouseLeave={scheduleClose}>
          <button
            type="button"
            className={getAppShellNavLinkClassName(false, "appearance-none")}
            onFocus={() => openMenuNow("pet")}
            onBlur={scheduleClose}
            onClick={() => setOpenMenu((prev) => (prev === "pet" ? null : "pet"))}
            aria-expanded={openMenu === "pet"}
          >
            관심 동물
            {isAuthenticated ? (
              <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[#dcecff] px-1.5 text-[10px] font-semibold text-[#1f4f8f]">
                {selectedPetTypeIds.length}
              </span>
            ) : null}
          </button>
          <div
            className={`absolute right-0 top-full z-50 min-w-[240px] transition duration-150 ${
              openMenu === "pet" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="rounded-xl border border-[#dbe6f6] bg-white p-2 shadow-[0_12px_24px_rgba(16,40,74,0.10)]">
              <p className="px-1 pb-1 text-[11px] text-[#5a7398]">보고 싶은 동물을 체크하고 저장하세요.</p>
              <div className="space-y-0.5">
                {groupedCommunities.map((group) => (
                  <div key={`pet-group-${group.key}`} className="py-0.5">
                    <p className="px-2 pb-0.5 text-[10px] font-semibold text-[#6a86ad]">{group.label}</p>
                    {group.items.map((community) => {
                      const checked = selectedPetTypeIds.includes(community.id);
                      return (
                        <label
                          key={`nav-community-${community.id}`}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePetType(community.id)}
                            className="h-3.5 w-3.5 border-[#bcd0ed]"
                          />
                          <span>{community.labelKo}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#e3ebf8] pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-[#5173a3] hover:text-[#204f8a]"
                    onClick={() => setSelectedPetTypeIds(selectableCommunities.map((item) => item.id))}
                    disabled={isPending}
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-[#5173a3] hover:text-[#204f8a]"
                    onClick={() => setSelectedPetTypeIds([])}
                    disabled={isPending}
                  >
                    전체 해제
                  </button>
                </div>
                <button
                  type="button"
                  className="tp-btn-soft px-2 py-1 text-[11px] font-semibold text-[#204f8a] disabled:opacity-60"
                  onClick={savePetTypes}
                  disabled={isPending}
                >
                  {isPending ? "저장 중..." : "저장"}
                </button>
              </div>
              {message ? <p className="mt-1 text-[11px] text-[#4f678d]">{message}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
