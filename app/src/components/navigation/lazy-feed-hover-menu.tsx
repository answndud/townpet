"use client";

import { AnimalBoardHoverMenu } from "@/components/navigation/animal-board-hover-menu";
import { CommonBoardHoverMenu } from "@/components/navigation/common-board-hover-menu";

export function LazyFeedHoverMenu({ boardActive = false }: { boardActive?: boolean }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 md:w-auto">
      <CommonBoardHoverMenu boardActive={boardActive} />
      <AnimalBoardHoverMenu boardActive={boardActive} />
    </div>
  );
}
