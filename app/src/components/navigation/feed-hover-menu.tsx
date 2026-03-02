"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { postTypeMeta } from "@/lib/post-presenter";
import { PRIMARY_POST_TYPES } from "@/lib/post-type-groups";

type FeedHoverMenuProps = {
  communities: Array<{
    id: string;
    labelKo: string;
  }>;
};

function buildFeedHref(params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value) {
      continue;
    }
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `/feed?${query}` : "/feed";
}

function buildPetTypeHref(petType?: string | null) {
  return buildFeedHref({ petType: petType ?? null, scope: null, page: "1" });
}

export function FeedHoverMenu({ communities }: FeedHoverMenuProps) {
  const limitedCommunities = communities.slice(0, 10);
  const triggerClass =
    "inline-flex h-8 items-center appearance-none rounded-sm bg-transparent px-1 text-[14px] leading-none text-[#315484] transition hover:bg-[#dcecff] hover:text-[#1f4f8f]";
  const [openMenu, setOpenMenu] = useState<"board" | "pet" | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <div className="hidden items-center gap-2.5 md:flex" onMouseLeave={scheduleClose}>
      <Link href="/feed" className={triggerClass}>
        피드
      </Link>

      <span className="px-0.5 text-[#9ab0cf]">|</span>
      <div className="relative" onMouseEnter={() => openMenuNow("board")} onMouseLeave={scheduleClose}>
        <button
          type="button"
          className={triggerClass}
          onFocus={() => openMenuNow("board")}
          onBlur={scheduleClose}
          onClick={() => setOpenMenu((prev) => (prev === "board" ? null : "board"))}
          aria-expanded={openMenu === "board"}
        >
          게시판
        </button>
        <div
          className={`absolute left-0 top-full z-50 min-w-[220px] transition duration-150 ${
            openMenu === "board" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="rounded-md border border-[#dbe6f6] bg-white py-1.5 shadow-[0_8px_18px_rgba(16,40,74,0.08)]">
            <Link
              href={buildFeedHref({ page: "1" })}
              className="block px-3 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
              onClick={() => setOpenMenu(null)}
            >
              전체
            </Link>
            {PRIMARY_POST_TYPES.map((value) => (
              <Link
                key={`nav-type-${value}`}
                href={buildFeedHref({ type: value, page: "1" })}
                className="block px-3 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
                onClick={() => setOpenMenu(null)}
              >
                {postTypeMeta[value].label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <span className="px-0.5 text-[#9ab0cf]">|</span>
      <div className="relative" onMouseEnter={() => openMenuNow("pet")} onMouseLeave={scheduleClose}>
        <button
          type="button"
          className={triggerClass}
          onFocus={() => openMenuNow("pet")}
          onBlur={scheduleClose}
          onClick={() => setOpenMenu((prev) => (prev === "pet" ? null : "pet"))}
          aria-expanded={openMenu === "pet"}
        >
          관심 동물
        </button>
        <div
          className={`absolute left-0 top-full z-50 min-w-[240px] transition duration-150 ${
            openMenu === "pet" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="rounded-md border border-[#dbe6f6] bg-white py-1.5 shadow-[0_8px_18px_rgba(16,40,74,0.08)]">
            <Link
              href={buildPetTypeHref(null)}
              className="block px-3 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
              onClick={() => setOpenMenu(null)}
            >
              전체 동물
            </Link>
            {limitedCommunities.map((community) => (
              <Link
                key={`nav-community-${community.id}`}
                href={buildPetTypeHref(community.id)}
                className="block px-3 py-1.5 text-xs text-[#315b9a] transition hover:bg-[#f5f9ff]"
                onClick={() => setOpenMenu(null)}
              >
                {community.labelKo}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
