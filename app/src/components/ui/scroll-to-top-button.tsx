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
        "tp-btn-soft fixed right-4 bottom-20 z-30 inline-flex h-11 items-center justify-center px-4 text-xs font-semibold shadow-[0_12px_28px_rgba(16,40,74,0.16)] backdrop-blur-sm sm:right-6 sm:bottom-6"
      }
    >
      {label}
    </button>
  );
}
