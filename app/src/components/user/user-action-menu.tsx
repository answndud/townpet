"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { muteUserAction, unmuteUserAction } from "@/server/actions/user-relation";

const USER_ACTION_MENU_BUTTON_CLASS_NAME =
  "tp-text-heading inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md bg-transparent px-1 py-0.5 text-[13px] font-semibold transition hover:bg-[#f4f8ff] hover:text-[#2f5da4]";
const USER_ACTION_MENU_PANEL_BASE_CLASS_NAME =
  "tp-border-muted absolute z-20 mt-1.5 min-w-[108px] rounded-md border bg-white p-1 shadow-[0_10px_24px_rgba(16,40,74,0.1)]";
const USER_ACTION_MENU_PANEL_POSITION_CLASS_NAME = {
  start: "left-0",
  end: "right-0",
} as const;

export function shouldCloseUserActionMenu(
  menuRoot: Pick<Node, "contains"> | null,
  target: EventTarget | null,
) {
  if (!menuRoot || !target) {
    return false;
  }

  return !menuRoot.contains(target as Node);
}

export function canOpenUserActionMenu(viewerId?: string) {
  return Boolean(viewerId);
}

export function canToggleMuteUser(viewerId?: string, targetUserId?: string) {
  return Boolean(viewerId && targetUserId && viewerId !== targetUserId);
}

type UserActionMenuProps = {
  userId: string;
  displayName: string;
  currentUserId?: string;
  isMutedByViewer?: boolean;
  align?: keyof typeof USER_ACTION_MENU_PANEL_POSITION_CLASS_NAME;
  defaultOpen?: boolean;
  onActionMessage?: (message: string) => void;
  onMuteStateChange?: (nextMuted: boolean) => Promise<void> | void;
  plainTextClassName?: string;
};

export function UserActionMenu({
  userId,
  displayName,
  currentUserId,
  isMutedByViewer = false,
  align = "start",
  defaultOpen = false,
  onActionMessage,
  onMuteStateChange,
  plainTextClassName,
}: UserActionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isActionPending, startActionTransition] = useTransition();
  const canToggleMute = canToggleMuteUser(currentUserId, userId);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeMenuIfOutside = (target: EventTarget | null) => {
      if (shouldCloseUserActionMenu(menuRef.current, target)) {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      closeMenuIfOutside(event.target);
    };

    const handleFocusIn = (event: globalThis.FocusEvent) => {
      closeMenuIfOutside(event.target);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
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
  }, [isOpen]);

  const handleMuteToggle = () => {
    if (!canToggleMute || isActionPending) {
      return;
    }

    startActionTransition(async () => {
      const result = isMutedByViewer
        ? await unmuteUserAction(
            { targetUserId: userId },
            { revalidate: false },
          )
        : await muteUserAction(
            { targetUserId: userId },
            { revalidate: false },
          );

      if (!result.ok) {
        onActionMessage?.(result.message);
        return;
      }

      setIsOpen(false);
      const nextMuted = !isMutedByViewer;
      onActionMessage?.(nextMuted ? "사용자를 뮤트했습니다." : "사용자 뮤트를 해제했습니다.");
      await onMuteStateChange?.(nextMuted);
    });
  };

  if (!canOpenUserActionMenu(currentUserId)) {
    return <span className={plainTextClassName}>{displayName}</span>;
  }

  return (
    <div ref={menuRef} className="relative inline-flex max-w-full shrink-0">
      <button
        type="button"
        className={USER_ACTION_MENU_BUTTON_CLASS_NAME}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="truncate">{displayName}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="mt-px h-3 w-3 shrink-0 text-[#6a84ac]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M2.25 4.5 6 8.25 9.75 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen ? (
        <div
          className={`${USER_ACTION_MENU_PANEL_BASE_CLASS_NAME} ${USER_ACTION_MENU_PANEL_POSITION_CLASS_NAME[align]}`}
          role="menu"
        >
          <Link
            href={`/users/${userId}`}
            role="menuitem"
            className="tp-text-heading block rounded px-2 py-1.5 text-[11px] hover:bg-[#f5f9ff]"
            onClick={() => setIsOpen(false)}
          >
            프로필 보기
          </Link>
          {canToggleMute ? (
            <button
              type="button"
              role="menuitem"
              className="tp-text-heading block w-full rounded px-2 py-1.5 text-left text-[11px] hover:bg-[#f5f9ff]"
              onClick={handleMuteToggle}
              disabled={isActionPending}
            >
              {isMutedByViewer ? "뮤트 해제" : "뮤트"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
