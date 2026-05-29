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
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 transition hover:bg-white/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/30 ${chipClass}`}
    >
      {label}
    </Link>
  );
}
