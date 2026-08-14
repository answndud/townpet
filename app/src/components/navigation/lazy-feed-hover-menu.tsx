"use client";

import { AnimalBoardHoverMenu } from "@/components/navigation/animal-board-hover-menu";

export function LazyFeedHoverMenu({ boardActive = false }: { boardActive?: boolean }) {
  return <AnimalBoardHoverMenu boardActive={boardActive} />;
}
