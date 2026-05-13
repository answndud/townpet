"use client";

import { useState } from "react";

import { copyPostShareUrl } from "@/lib/post-share";

type PostShareControlsProps = {
  url: string;
  compact?: boolean;
};

export function PostShareControls({ url, compact = false }: PostShareControlsProps) {
  const [message, setMessage] = useState<string | null>(null);

  const handleCopy = async () => {
    const result = await copyPostShareUrl(
      typeof navigator === "undefined" ? undefined : navigator.clipboard,
      url,
    );
    setMessage(result.message);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={handleCopy}
        className={
          compact
            ? "tp-btn-soft inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold"
            : "tp-btn-soft inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold"
        }
      >
        공유
      </button>

      {message ? (
        <span role="status" aria-live="polite" className="text-[11px] font-medium text-[#5a7398]">
          {message}
        </span>
      ) : null}
    </div>
  );
}
