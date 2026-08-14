import { notFound, redirect } from "next/navigation";

import { AnimalBoardPage } from "@/components/animals/animal-board-page";
import { getAnimalBoardByCode, isAnimalBoardType } from "@/lib/animal-board-catalog";

export const metadata = { title: "동물 게시판", description: "동물별 내부 게시판을 탐색합니다." };

const boardBySlug = { free: "FREE_BOARD", questions: "QA_QUESTION", showcase: "PET_SHOWCASE", "product-reviews": "PRODUCT_REVIEW" } as const;

export default async function AnimalBoardTypePage({ params, searchParams }: { params: Promise<{ animalCode: string; board: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { animalCode, board } = await params;
  const commonTypeBySlug: Record<string, string> = {
    adoption: "ADOPTION_LISTING",
    "lost-found": "LOST_FOUND",
    "hospital-reviews": "HOSPITAL_REVIEW",
    gatherings: "MEETUP",
    marketplace: "MARKET_LISTING",
    care: "CARE_REQUEST",
    volunteer: "SHELTER_VOLUNTEER",
  };
  if (commonTypeBySlug[board]) redirect(`/feed?type=${commonTypeBySlug[board]}`);
  if (animalCode !== "all" && !getAnimalBoardByCode(animalCode)) notFound();
  const type = boardBySlug[board as keyof typeof boardBySlug];
  if (!type || !isAnimalBoardType(type)) notFound();
  return <AnimalBoardPage code={animalCode} boardType={type} searchParams={searchParams} />;
}
