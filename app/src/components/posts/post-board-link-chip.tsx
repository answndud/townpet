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
      className={`inline-flex items-center rounded-lg border px-3 py-1 font-semibold transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/30 ${chipClass}`}
    >
      {label}
    </Link>
  );
}
