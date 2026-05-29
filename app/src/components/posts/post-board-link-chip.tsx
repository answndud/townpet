import Link from "next/link";
import { PostType } from "@prisma/client";

import { buildBoardListingHref } from "@/lib/community-board";

type PostBoardLinkChipProps = {
  type: PostType;
  label: string;
  chipClass: string;
};

export function PostBoardLinkChip({
  type,
  label,
  chipClass,
}: PostBoardLinkChipProps) {
  return (
    <Link
      href={buildBoardListingHref(type)}
      aria-label={`${label} 게시판으로 이동`}
      className={`inline-flex min-h-7 items-center gap-1 rounded-md border px-2.5 text-[11px] font-semibold leading-none transition hover:bg-white/80 hover:text-[#1f4f8f] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/30 ${chipClass}`}
    >
      <span>{label}</span>
      <span className="text-[10px] font-semibold text-current opacity-60" aria-hidden="true">
        이동
      </span>
    </Link>
  );
}
