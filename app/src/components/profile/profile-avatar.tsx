"use client";

import Image from "next/image";
import { useState } from "react";

type ProfileAvatarProps = {
  src?: string | null;
};

function ProfileAvatarFallback() {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#cbdcf5] bg-[radial-gradient(circle_at_top,#ffffff,transparent_60%),linear-gradient(180deg,#f8fbff_0%,#edf4ff_100%)] text-[#5b78a1] shadow-[0_8px_18px_rgba(53,103,181,0.10)]">
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="24" cy="19" r="7" />
        <path d="M12 38c2.8-6.1 8-9.2 12-9.2s9.2 3.1 12 9.2" />
      </svg>
      <span className="sr-only">프로필 이미지 없음</span>
    </div>
  );
}

export function ProfileAvatar({ src }: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <ProfileAvatarFallback />;
  }

  return (
    <Image
      src={src}
      alt="프로필 이미지"
      width={56}
      height={56}
      className="tp-border-soft h-14 w-14 shrink-0 rounded-full border object-cover"
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
