import { notFound } from "next/navigation";

import { AnimalBoardPage } from "@/components/animals/animal-board-page";
import { getAnimalBoardByCode } from "@/lib/animal-board-catalog";

export const metadata = { title: "동물 게시판", description: "동물별 게시판을 탐색합니다." };

export default async function AnimalCodePage({ params, searchParams }: { params: Promise<{ animalCode: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { animalCode } = await params;
  if (animalCode === "all") return <AnimalBoardPage code="all" searchParams={searchParams} />;
  if (!getAnimalBoardByCode(animalCode)) notFound();
  return <AnimalBoardPage code={animalCode} searchParams={searchParams} />;
}
