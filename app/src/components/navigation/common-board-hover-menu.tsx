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
import { COMMON_BOARD_NAV_ITEMS } from "@/lib/community-board";

type Props = { boardActive?: boolean };

export function CommonBoardHoverMenu({ boardActive = false }: Props) {
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
      const next = event.key === "ArrowDown" ? current + 1 : event.key === "ArrowUp" ? current - 1 : event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : -1;
      if (next >= 0 && links.length > 0) {
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
    <div ref={rootRef} className="relative w-auto" onMouseEnter={() => { clearClose(); setOpen(true); }} onMouseLeave={scheduleClose}>
      <div className="md:hidden">
        <div className={APP_SHELL_MOBILE_DISCLOSURE_ROW_CLASS_NAME}>
          <button type="button" className={getAppShellMobileDisclosureTriggerClassName(boardActive)} aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>공통 게시판</button>
        </div>
        {mobileOpen ? <div className={APP_SHELL_MOBILE_PANEL_CLASS_NAME}><div className="flex flex-wrap gap-1.5 bg-white p-2.5">{COMMON_BOARD_NAV_ITEMS.map((item) => <Link key={item.key} href={item.href} role="menuitem" className={APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}</div></div> : null}
      </div>
      <div className={`hidden md:flex ${APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME}`}>
        <button type="button" className={getAppShellNavLinkClassName(boardActive, "appearance-none")} aria-expanded={open} onClick={() => setOpen((value) => !value)} onFocus={() => setOpen(true)}>공통 게시판</button>
        {open ? <div className="absolute left-0 top-full z-50 pt-2" onMouseEnter={clearClose}><div className="min-w-64 rounded-lg border border-[#d8e4f6] bg-white p-2 shadow-[0_14px_36px_rgba(31,63,113,0.16)]" role="menu" aria-label="공통 게시판">{COMMON_BOARD_NAV_ITEMS.map((item) => <Link key={item.key} href={item.href} role="menuitem" className="block rounded-md px-3 py-2 text-xs text-[#315b9a] hover:bg-[#f3f8ff]">{item.label}</Link>)}</div></div> : null}
      </div>
    </div>
  );
}
