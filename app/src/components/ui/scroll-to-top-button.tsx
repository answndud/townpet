"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type ScrollToTopButtonProps = {
  className?: string;
  label?: string;
  threshold?: number;
};

export const DEFAULT_SCROLL_TO_TOP_THRESHOLD = 280;

export function shouldShowScrollToTopButton(
  scrollY: number,
  threshold = DEFAULT_SCROLL_TO_TOP_THRESHOLD,
) {
  return scrollY >= threshold;
}

export function scrollWindowToTop(target: Pick<Window, "scrollTo">) {
  target.scrollTo({ top: 0, behavior: "smooth" });
}

export function ScrollToTopButton({
  className,
  label = "맨 위로",
  threshold = DEFAULT_SCROLL_TO_TOP_THRESHOLD,
}: ScrollToTopButtonProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const syncVisibility = () => {
      setIsVisible(shouldShowScrollToTopButton(window.scrollY, threshold));
    };

    syncVisibility();
    window.addEventListener("scroll", syncVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", syncVisibility);
    };
  }, [pathname, threshold]);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        scrollWindowToTop(window);
      }}
      className={
        className ??
        "fixed right-3 bottom-5 z-30 inline-flex min-h-10 items-center justify-center rounded-md border border-[#d6e4f6] bg-[#fbfdff]/95 px-3 text-[11px] font-semibold text-[#315b9a] shadow-[0_10px_24px_rgba(16,40,74,0.12)] backdrop-blur-sm transition hover:border-[#b9cdeb] hover:text-[#244b86] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] sm:right-6 sm:bottom-6"
      }
    >
      {label}
    </button>
  );
}
