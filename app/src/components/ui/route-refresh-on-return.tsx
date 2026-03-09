"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type RouteRefreshOnReturnProps = {
  cooldownMs?: number;
  refreshOnFocus?: boolean;
  refreshOnPageShow?: boolean;
};

export function RouteRefreshOnReturn({
  cooldownMs = 750,
  refreshOnFocus = true,
  refreshOnPageShow = true,
}: RouteRefreshOnReturnProps) {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < cooldownMs) {
        return;
      }
      lastRefreshAtRef.current = now;
      router.refresh();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        refresh();
      }
    };

    if (refreshOnFocus) {
      window.addEventListener("focus", refresh);
    }
    if (refreshOnPageShow) {
      window.addEventListener("pageshow", handlePageShow);
    }

    return () => {
      if (refreshOnFocus) {
        window.removeEventListener("focus", refresh);
      }
      if (refreshOnPageShow) {
        window.removeEventListener("pageshow", handlePageShow);
      }
    };
  }, [cooldownMs, refreshOnFocus, refreshOnPageShow, router]);

  return null;
}
