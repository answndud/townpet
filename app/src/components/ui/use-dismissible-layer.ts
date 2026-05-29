"use client";

import type { RefObject } from "react";
import { useEffect } from "react";

export function useDismissibleLayer({
  enabled,
  refs,
  onDismiss,
}: {
  enabled: boolean;
  refs: Array<RefObject<HTMLElement | null>>;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const isInsideLayer = (target: EventTarget | null) =>
      Boolean(
        target &&
          refs.some((ref) => ref.current?.contains(target as Node)),
      );

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!isInsideLayer(event.target)) {
        onDismiss();
      }
    };

    const handleFocusIn = (event: globalThis.FocusEvent) => {
      if (!isInsideLayer(event.target)) {
        onDismiss();
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
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
  }, [enabled, onDismiss, refs]);
}
