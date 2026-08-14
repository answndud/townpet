"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME,
  APP_SHELL_MOBILE_DISCLOSURE_ROW_CLASS_NAME,
  APP_SHELL_MOBILE_PANEL_CLASS_NAME,
  APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME,
  getAppShellMobileDisclosureTriggerClassName,
  getAppShellNavLinkClassName,
} from "@/components/navigation/app-shell-header-class";
import {
  ANIMAL_BOARD_CATALOG,
  buildAnimalBoardHref,
} from "@/lib/animal-board-catalog";

type Props = { boardActive?: boolean };

export function AnimalBoardHoverMenu({ boardActive = false }: Props) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    clearClose();
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
        return;
      }
      if (!open || !rootRef.current?.contains(document.activeElement)) return;
      const links = Array.from(rootRef.current.querySelectorAll<HTMLAnchorElement>("[role=menuitem]"));
      const current = links.indexOf(document.activeElement as HTMLAnchorElement);
      if (links.length === 0) return;
      const next = event.key === "ArrowDown" ? current + 1 : event.key === "ArrowUp" ? current - 1 : event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : -1;
      if (next >= 0) {
        event.preventDefault();
        links[(next + links.length) % links.length]?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      clearClose();
    };
  }, [open]);

  return (
    <div ref={rootRef} className="w-full md:w-auto" onMouseEnter={() => { clearClose(); setOpen(true); }} onMouseLeave={scheduleClose}>
      <div className="md:hidden">
        <div className={APP_SHELL_MOBILE_DISCLOSURE_ROW_CLASS_NAME}>
          <button type="button" className={getAppShellMobileDisclosureTriggerClassName(boardActive)} aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>
            동물 게시판
          </button>
        </div>
        {mobileOpen ? (
          <div className={APP_SHELL_MOBILE_PANEL_CLASS_NAME}>
            <div className="flex flex-wrap gap-1.5 bg-white p-2.5">
              <Link href={buildAnimalBoardHref("all")} role="menuitem" className={APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME} onClick={() => setMobileOpen(false)}>전체 동물 게시판</Link>
              {ANIMAL_BOARD_CATALOG.map((item) => <Link key={item.code} href={buildAnimalBoardHref(item.code)} role="menuitem" className={APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}
            </div>
          </div>
        ) : null}
      </div>
      <div className={`hidden md:flex ${APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME}`}>
        <button type="button" className={getAppShellNavLinkClassName(boardActive, "appearance-none")} aria-expanded={open} onClick={() => setOpen((value) => !value)} onFocus={() => setOpen(true)}>
          동물 게시판
        </button>
        {open ? (
          <div className="absolute z-50 pt-2" onMouseEnter={clearClose}>
            <div className="min-w-64 rounded-lg border border-[#d8e4f6] bg-white p-2 shadow-[0_14px_36px_rgba(31,63,113,0.16)]" role="menu" aria-label="동물 게시판">
              <Link href={buildAnimalBoardHref("all")} role="menuitem" className="block rounded-md px-3 py-2 text-xs font-semibold text-[#173963] hover:bg-[#f3f8ff]">전체 동물 게시판</Link>
              <div className="my-1 border-t border-[#edf2f9]" />
              {ANIMAL_BOARD_CATALOG.map((item) => <Link key={item.code} href={buildAnimalBoardHref(item.code)} role="menuitem" className="block rounded-md px-3 py-2 text-xs text-[#315b9a] hover:bg-[#f3f8ff]">{item.label} 게시판</Link>)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
