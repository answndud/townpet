"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type DismissibleDetailsProps = {
  children: ReactNode;
  className?: string;
};

export function DismissibleDetails({ children, className }: DismissibleDetailsProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const closeDetails = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeIfOutside = (target: EventTarget | null) => {
      if (!target || !detailsRef.current || detailsRef.current.contains(target as Node)) {
        return;
      }
      closeDetails();
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      closeIfOutside(event.target);
    };

    const handleFocusIn = (event: globalThis.FocusEvent) => {
      closeIfOutside(event.target);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDetails();
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

  const handleClick = (event: MouseEvent<HTMLDetailsElement>) => {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("[data-dismissible-details-close]")
    ) {
      window.requestAnimationFrame(closeDetails);
    }
  };

  return (
    <details
      ref={detailsRef}
      className={className}
      onClick={handleClick}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      {children}
    </details>
  );
}
