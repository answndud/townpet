export type AnimalBoardCatalogItem = {
  code: string;
  communitySlug: string;
  label: string;
  group: string;
  sortOrder: number;
};

export const ANIMAL_BOARD_CATALOG = [
  { code: "dog", communitySlug: "dogs", label: "강아지", group: "강아지 & 고양이", sortOrder: 10 },
  { code: "cat", communitySlug: "cats", label: "고양이", group: "강아지 & 고양이", sortOrder: 20 },
  { code: "parrots", communitySlug: "parrots", label: "앵무새", group: "조류", sortOrder: 30 },
  { code: "birds", communitySlug: "birds", label: "조류", group: "조류", sortOrder: 40 },
  { code: "turtles", communitySlug: "turtles", label: "거북", group: "파충류 & 양서류", sortOrder: 50 },
  { code: "lizards", communitySlug: "lizards", label: "도마뱀", group: "파충류 & 양서류", sortOrder: 60 },
  { code: "snakes", communitySlug: "snakes", label: "뱀", group: "파충류 & 양서류", sortOrder: 70 },
  { code: "amphibians", communitySlug: "amphibians", label: "양서류", group: "파충류 & 양서류", sortOrder: 80 },
  { code: "reptiles", communitySlug: "reptiles", label: "파충류", group: "파충류 & 양서류", sortOrder: 90 },
  { code: "small-pets", communitySlug: "small-pets", label: "소동물", group: "소동물", sortOrder: 100 },
  { code: "aquatics", communitySlug: "aquatics", label: "어류·수조", group: "어류·수조", sortOrder: 110 },
  { code: "arthropods", communitySlug: "arthropods", label: "절지류·곤충", group: "기타", sortOrder: 120 },
] as const satisfies readonly AnimalBoardCatalogItem[];

export const ANIMAL_BOARD_CODES = ANIMAL_BOARD_CATALOG.map((item) => item.code);
export type AnimalBoardCode = (typeof ANIMAL_BOARD_CATALOG)[number]["code"];
export const ANIMAL_BOARD_POST_TYPES = [
  "FREE_BOARD",
  "QA_QUESTION",
  "PET_SHOWCASE",
  "PRODUCT_REVIEW",
] as const;
export type AnimalBoardType = (typeof ANIMAL_BOARD_POST_TYPES)[number];

export function getAnimalBoardByCode(code: string | null | undefined) {
  return ANIMAL_BOARD_CATALOG.find((item) => item.code === code) ?? null;
}

export function getAnimalBoardByCommunitySlug(slug: string | null | undefined) {
  return ANIMAL_BOARD_CATALOG.find((item) => item.communitySlug === slug) ?? null;
}

export function buildAnimalBoardHref(code?: string | null, board?: string | null) {
  if (!code || code === "all") {
    return board ? `/animals/all/${board}` : "/animals/all";
  }
  return board ? `/animals/${code}/${board}` : `/animals/${code}`;
}

export function isAnimalBoardType(value: string): value is AnimalBoardType {
  return (ANIMAL_BOARD_POST_TYPES as readonly string[]).includes(value);
}
