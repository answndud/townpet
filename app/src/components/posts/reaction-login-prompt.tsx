"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef } from "react";

import { useDismissibleLayer } from "@/components/ui/use-dismissible-layer";

type ReactionLoginPromptProps = {
  isOpen: boolean;
  message: string;
  loginHref: string;
  align?: "start" | "center" | "end";
  onClose: () => void;
};

export function ReactionLoginPrompt({
  isOpen,
  message,
  loginHref,
  align = "center",
  onClose,
}: ReactionLoginPromptProps) {
  const desktopLayerRef = useRef<HTMLDivElement | null>(null);
  const mobileLayerRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useMemo(() => [desktopLayerRef, mobileLayerRef], []);
  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  useDismissibleLayer({
    enabled: isOpen,
    refs: layerRefs,
    onDismiss: handleDismiss,
  });

  if (!isOpen) {
    return null;
  }

  const desktopAlignClass =
    align === "start"
      ? "left-0"
      : align === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";
  const closeButtonClassName =
    "tp-text-muted inline-flex min-h-10 items-center justify-center px-1.5 text-xs font-semibold transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2";
  const loginLinkClassName =
    "inline-flex min-h-10 items-center justify-center rounded-md bg-[#3567b5] px-3 text-xs font-semibold text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2";

  return (
    <>
      <div
        ref={desktopLayerRef}
        className={`absolute top-[calc(100%+8px)] z-10 hidden min-w-[220px] sm:block ${desktopAlignClass}`}
      >
        <div className="rounded-lg border border-[#dbe6f6] bg-white px-3 py-2.5 shadow-[0_10px_24px_rgba(16,40,74,0.12)]">
          <p className="text-[12px] leading-5 text-[#355988]">{message}</p>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className={closeButtonClassName}
              onClick={onClose}
            >
              닫기
            </button>
            <Link href={loginHref} className={loginLinkClassName}>
              로그인하기
            </Link>
          </div>
        </div>
      </div>

      <div ref={mobileLayerRef} className="fixed inset-x-4 bottom-4 z-30 sm:hidden">
        <div className="rounded-lg border border-[#dbe6f6] bg-white px-4 py-3 shadow-[0_14px_28px_rgba(16,40,74,0.14)]">
          <p className="text-[13px] leading-5 text-[#355988]">{message}</p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              className={closeButtonClassName}
              onClick={onClose}
            >
              닫기
            </button>
            <Link href={loginHref} className={loginLinkClassName}>
              로그인하기
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
