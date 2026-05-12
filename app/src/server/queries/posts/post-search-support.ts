import { Prisma } from "@prisma/client";

import { buildStructuredSearchVariants } from "@/lib/structured-field-normalization";

export type PostSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
export const DEFAULT_POST_SEARCH_IN: PostSearchIn = "ALL";

export function buildPostSearchWhere(
  q?: string,
  searchIn: PostSearchIn = DEFAULT_POST_SEARCH_IN,
): Prisma.PostWhereInput {
  const trimmedQuery = q?.trim();
  if (!trimmedQuery) {
    return {};
  }

  const searchTerms = Array.from(
    new Set([trimmedQuery, ...buildStructuredSearchVariants(trimmedQuery)]),
  );
  const titleFilters = searchTerms.map((term) => ({
    title: { contains: term, mode: "insensitive" as const },
  }));
  const contentFilters = searchTerms.map((term) => ({
    content: { contains: term, mode: "insensitive" as const },
  }));
  const authorFilters = searchTerms.map((term) => ({
    author: {
      nickname: { contains: term, mode: "insensitive" as const },
    },
  }));
  const structuredFilters: Prisma.PostWhereInput[] = [
    ...searchTerms.map((term) => ({
      structuredSearchText: { contains: term, mode: "insensitive" as const },
    })),
  ];

  if (searchIn === "TITLE") {
    return titleFilters.length === 1 ? titleFilters[0]! : { OR: titleFilters };
  }
  if (searchIn === "CONTENT") {
    return contentFilters.length === 1 ? contentFilters[0]! : { OR: contentFilters };
  }
  if (searchIn === "AUTHOR") {
    return authorFilters.length === 1 ? authorFilters[0]! : { OR: authorFilters };
  }

  return {
    OR: [...titleFilters, ...contentFilters, ...authorFilters, ...structuredFilters],
  };
}

export type PostSearchSuggestionRow = {
  title: string;
  content?: string;
  animalTags?: string[];
  author: {
    nickname: string | null;
  };
  hospitalReview?: {
    hospitalName?: string | null;
    treatmentType?: string | null;
  } | null;
  placeReview?: {
    placeName?: string | null;
    placeType?: string | null;
    address?: string | null;
  } | null;
  walkRoute?: {
    routeName?: string | null;
    safetyTags?: string[] | null;
  } | null;
  adoptionListing?: {
    shelterName?: string | null;
    region?: string | null;
    animalType?: string | null;
    breed?: string | null;
    ageLabel?: string | null;
    sizeLabel?: string | null;
  } | null;
  volunteerRecruitment?: {
    shelterName?: string | null;
    region?: string | null;
    volunteerType?: string | null;
  } | null;
};

export function listStructuredSuggestionCandidates(row: PostSearchSuggestionRow) {
  return [
    ...(row.animalTags ?? []),
    row.hospitalReview?.hospitalName,
    row.hospitalReview?.treatmentType,
    row.placeReview?.placeName,
    row.placeReview?.placeType,
    row.placeReview?.address,
    row.walkRoute?.routeName,
    ...(row.walkRoute?.safetyTags ?? []),
    row.adoptionListing?.shelterName,
    row.adoptionListing?.region,
    row.adoptionListing?.animalType,
    row.adoptionListing?.breed,
    row.adoptionListing?.ageLabel,
    row.adoptionListing?.sizeLabel,
    row.volunteerRecruitment?.shelterName,
    row.volunteerRecruitment?.region,
    row.volunteerRecruitment?.volunteerType,
  ];
}
