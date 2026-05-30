import { PostScope, PostType } from "@prisma/client";

import type { PostCreateTemplate } from "@/lib/post-create-templates";
import { REVIEW_CATEGORY, type ReviewCategory } from "@/lib/review-category";

export type PostCreateFormState = {
  title: string;
  content: string;
  type: PostType;
  scope: PostScope;
  neighborhoodId: string;
  petTypeId: string;
  reviewCategory: ReviewCategory;
  animalTagsInput: string;
  isOperatorContent: string;
  operatorSourceName: string;
  operatorSourceUrl: string;
  operatorLastVerifiedAt: string;
  hospitalReview: {
    hospitalName: string;
    visitPurpose: string;
    animalType: string;
    treatmentType: string;
    totalCost: string;
    waitTime: string;
    explanationSatisfaction: string;
    priceLevel: string;
    hasParking: string;
    hasNightCare: string;
    wouldRevisit: string;
    rating: string;
  };
  placeReview: {
    placeName: string;
    placeType: string;
    address: string;
    isPetAllowed: string;
    rating: string;
  };
  walkRoute: {
    routeName: string;
    distance: string;
    duration: string;
    difficulty: string;
    largeDogFriendly: string;
    crowdedTime: string;
    leashRequiredNote: string;
    hasStreetLights: string;
    hasRestroom: string;
    hasParkingLot: string;
    hasWasteBags: string;
    hasWaterStation: string;
    cautionNote: string;
    safetyTags: string;
  };
  adoptionListing: {
    shelterName: string;
    region: string;
    animalType: string;
    breed: string;
    ageLabel: string;
    sex: string;
    isNeutered: string;
    isVaccinated: string;
    sizeLabel: string;
    status: string;
  };
  volunteerRecruitment: {
    shelterName: string;
    region: string;
    volunteerDate: string;
    volunteerType: string;
    capacity: string;
    status: string;
  };
  marketListing: {
    listingType: string;
    price: string;
    condition: string;
    depositAmount: string;
    rentalPeriod: string;
  };
  careRequest: {
    careType: string;
    startsAt: string;
    endsAt: string;
    locationNote: string;
    petNote: string;
    requirements: string;
    rewardAmount: string;
    isUrgent: string;
  };
  lostFound: {
    alertType: string;
    petType: string;
    breed: string;
    lastSeenAt: string;
    lastSeenLocation: string;
  };
  imageUrls: string[];
  guestDisplayName: string;
  guestPassword: string;
};

export const POST_CREATE_DRAFT_STORAGE_KEY = "townpet:post-create-draft:v1";

export function createInitialPostCreateFormState(
  defaultNeighborhoodId: string,
): PostCreateFormState {
  return {
    title: "",
    content: "",
    type: PostType.FREE_BOARD,
    scope: PostScope.GLOBAL,
    neighborhoodId: defaultNeighborhoodId,
    petTypeId: "",
    reviewCategory: REVIEW_CATEGORY.SUPPLIES,
    animalTagsInput: "",
    isOperatorContent: "false",
    operatorSourceName: "",
    operatorSourceUrl: "",
    operatorLastVerifiedAt: "",
    hospitalReview: {
      hospitalName: "",
      visitPurpose: "",
      animalType: "",
      treatmentType: "",
      totalCost: "",
      waitTime: "",
      explanationSatisfaction: "",
      priceLevel: "",
      hasParking: "",
      hasNightCare: "",
      wouldRevisit: "",
      rating: "",
    },
    placeReview: {
      placeName: "",
      placeType: "",
      address: "",
      isPetAllowed: "",
      rating: "",
    },
    walkRoute: {
      routeName: "",
      distance: "",
      duration: "",
      difficulty: "",
      largeDogFriendly: "",
      crowdedTime: "",
      leashRequiredNote: "",
      hasStreetLights: "false",
      hasRestroom: "false",
      hasParkingLot: "false",
      hasWasteBags: "false",
      hasWaterStation: "false",
      cautionNote: "",
      safetyTags: "",
    },
    adoptionListing: {
      shelterName: "",
      region: "",
      animalType: "",
      breed: "",
      ageLabel: "",
      sex: "",
      isNeutered: "",
      isVaccinated: "",
      sizeLabel: "",
      status: "OPEN",
    },
    volunteerRecruitment: {
      shelterName: "",
      region: "",
      volunteerDate: "",
      volunteerType: "",
      capacity: "",
      status: "OPEN",
    },
    marketListing: {
      listingType: "SELL",
      price: "",
      condition: "GOOD",
      depositAmount: "",
      rentalPeriod: "",
    },
    careRequest: {
      careType: "WALK",
      startsAt: "",
      endsAt: "",
      locationNote: "",
      petNote: "",
      requirements: "",
      rewardAmount: "",
      isUrgent: "false",
    },
    lostFound: {
      alertType: "LOST",
      petType: "",
      breed: "",
      lastSeenAt: "",
      lastSeenLocation: "",
    },
    imageUrls: [],
    guestDisplayName: "",
    guestPassword: "",
  };
}

export function applyPostCreateTemplateToFormState(
  state: PostCreateFormState,
  template: PostCreateTemplate,
): PostCreateFormState {
  const defaults = template.defaults ?? {};
  return {
    ...state,
    type: template.type,
    title: template.title,
    content: template.content,
    reviewCategory: defaults.reviewCategory ?? template.reviewCategory ?? state.reviewCategory,
    animalTagsInput: defaults.animalTagsInput ?? state.animalTagsInput,
    hospitalReview: {
      ...state.hospitalReview,
      ...defaults.hospitalReview,
    },
    walkRoute: {
      ...state.walkRoute,
      ...defaults.walkRoute,
    },
    marketListing: {
      ...state.marketListing,
      ...defaults.marketListing,
    },
    lostFound: {
      ...state.lostFound,
      ...defaults.lostFound,
    },
  };
}

export function isDraftFormState(value: unknown): value is PostCreateFormState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PostCreateFormState>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.scope === "string" &&
    typeof candidate.neighborhoodId === "string" &&
    (typeof candidate.petTypeId === "string" || candidate.petTypeId === undefined) &&
    (typeof candidate.reviewCategory === "string" || candidate.reviewCategory === undefined) &&
    (typeof candidate.animalTagsInput === "string" || candidate.animalTagsInput === undefined) &&
    Array.isArray(candidate.imageUrls) &&
    (typeof candidate.guestDisplayName === "string" || candidate.guestDisplayName === undefined) &&
    (typeof candidate.guestPassword === "string" || candidate.guestPassword === undefined) &&
    !!candidate.hospitalReview &&
    !!candidate.placeReview &&
    !!candidate.walkRoute &&
    !!candidate.adoptionListing &&
    !!candidate.volunteerRecruitment &&
    !!candidate.marketListing &&
    !!candidate.careRequest &&
    !!candidate.lostFound
  );
}
