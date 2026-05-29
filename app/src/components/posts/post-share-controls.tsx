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
        aria-label="게시글 공유 링크 복사"
        className={
          compact
            ? "inline-flex min-h-10 items-center justify-center rounded-full border border-[#dbe6f5] bg-white px-2.5 text-xs font-semibold text-[#54739e] transition hover:bg-[#f5f9ff] hover:text-[#315b9a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
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
