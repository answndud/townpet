"use client";

import { AnimalBoardHoverMenu } from "@/components/navigation/animal-board-hover-menu";
import { CommonBoardHoverMenu } from "@/components/navigation/common-board-hover-menu";

export function LazyFeedHoverMenu({ boardActive = false }: { boardActive?: boolean }) {
  return (
    <div className="flex w-auto flex-wrap items-center gap-1.5">
      <CommonBoardHoverMenu boardActive={boardActive} />
      <AnimalBoardHoverMenu boardActive={boardActive} />
    </div>
  );
}
