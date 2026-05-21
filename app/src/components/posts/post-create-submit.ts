import { PostScope, PostType } from "@prisma/client";

import type { PostCreateFormState } from "@/components/posts/post-create-form-state";
import { POST_CONTENT_MAX_LENGTH } from "@/lib/input-limits";
import { REVIEW_CATEGORY } from "@/lib/review-category";

export type PostCreateSubmitPayload = {
  title: string;
  content: string;
  type: PostType;
  reviewCategory?: string;
  scope: PostScope;
  imageUrls: string[];
  neighborhoodId?: string;
  petTypeId?: string;
  animalTags?: string[];
  guestDisplayName?: string;
  guestPassword?: string;
  hospitalReview?: Record<string, unknown>;
  placeReview?: Record<string, unknown>;
  walkRoute?: Record<string, unknown>;
  adoptionListing?: Record<string, unknown>;
  volunteerRecruitment?: Record<string, unknown>;
  marketListing?: Record<string, unknown>;
  careRequest?: Record<string, unknown>;
  lostFound?: Record<string, unknown>;
};

type BuildPostCreatePayloadParams = {
  formState: PostCreateFormState;
  normalizedTitle: string;
  serializedContent: string;
  serializedImageUrls: string[];
  resolvedScope: PostScope;
  isAuthenticated: boolean;
  canUseLocalScope: boolean;
  showNeighborhood: boolean;
  showCommunitySelector: boolean;
  showAnimalTagsInput: boolean;
  showMarketListing: boolean;
  showCareRequest: boolean;
  showLostFound: boolean;
  isFreeBoardType: boolean;
};

type BuildPostCreatePayloadResult =
  | { ok: true; payload: PostCreateSubmitPayload }
  | { ok: false; message: string };

function normalizeAnimalTags(input: string) {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 5);
}

function hasHospitalReview(formState: PostCreateFormState) {
  return (
    formState.hospitalReview.hospitalName.trim().length > 0 ||
    formState.hospitalReview.visitPurpose.trim().length > 0 ||
    formState.hospitalReview.animalType.trim().length > 0 ||
    formState.hospitalReview.treatmentType.trim().length > 0 ||
    formState.hospitalReview.totalCost.trim().length > 0 ||
    formState.hospitalReview.waitTime.trim().length > 0 ||
    formState.hospitalReview.explanationSatisfaction.trim().length > 0 ||
    formState.hospitalReview.priceLevel.trim().length > 0 ||
    formState.hospitalReview.hasParking.trim().length > 0 ||
    formState.hospitalReview.hasNightCare.trim().length > 0 ||
    formState.hospitalReview.wouldRevisit.trim().length > 0 ||
    formState.hospitalReview.rating.trim().length > 0
  );
}

function hasPlaceReview(formState: PostCreateFormState, resolvedType: PostType) {
  return (
    resolvedType === PostType.PLACE_REVIEW &&
    (formState.placeReview.placeName.trim().length > 0 ||
      formState.placeReview.placeType.trim().length > 0 ||
      formState.placeReview.address.trim().length > 0 ||
      formState.placeReview.isPetAllowed.trim().length > 0 ||
      formState.placeReview.rating.trim().length > 0)
  );
}

function hasWalkRoute(formState: PostCreateFormState) {
  return (
    formState.type === PostType.WALK_ROUTE &&
    (formState.walkRoute.routeName.trim().length > 0 ||
      formState.walkRoute.distance.trim().length > 0 ||
      formState.walkRoute.duration.trim().length > 0 ||
      formState.walkRoute.difficulty.trim().length > 0 ||
      formState.walkRoute.largeDogFriendly.trim().length > 0 ||
      formState.walkRoute.crowdedTime.trim().length > 0 ||
      formState.walkRoute.leashRequiredNote.trim().length > 0 ||
      formState.walkRoute.safetyTags.trim().length > 0 ||
      formState.walkRoute.hasStreetLights === "true" ||
      formState.walkRoute.hasRestroom === "true" ||
      formState.walkRoute.hasParkingLot === "true" ||
      formState.walkRoute.hasWasteBags === "true" ||
      formState.walkRoute.hasWaterStation === "true" ||
      formState.walkRoute.cautionNote.trim().length > 0)
  );
}

function hasAdoptionListing(formState: PostCreateFormState) {
  return (
    formState.type === PostType.ADOPTION_LISTING &&
    (formState.adoptionListing.shelterName.trim().length > 0 ||
      formState.adoptionListing.region.trim().length > 0 ||
      formState.adoptionListing.animalType.trim().length > 0 ||
      formState.adoptionListing.breed.trim().length > 0 ||
      formState.adoptionListing.ageLabel.trim().length > 0 ||
      formState.adoptionListing.sex.trim().length > 0 ||
      formState.adoptionListing.isNeutered.trim().length > 0 ||
      formState.adoptionListing.isVaccinated.trim().length > 0 ||
      formState.adoptionListing.sizeLabel.trim().length > 0 ||
      formState.adoptionListing.status.trim().length > 0)
  );
}

function hasVolunteerRecruitment(formState: PostCreateFormState) {
  return (
    formState.type === PostType.SHELTER_VOLUNTEER &&
    (formState.volunteerRecruitment.shelterName.trim().length > 0 ||
      formState.volunteerRecruitment.region.trim().length > 0 ||
      formState.volunteerRecruitment.volunteerDate.trim().length > 0 ||
      formState.volunteerRecruitment.volunteerType.trim().length > 0 ||
      formState.volunteerRecruitment.capacity.trim().length > 0 ||
      formState.volunteerRecruitment.status.trim().length > 0)
  );
}

function hasLostFound(formState: PostCreateFormState) {
  return (
    formState.type === PostType.LOST_FOUND &&
    (formState.lostFound.alertType.trim().length > 0 ||
      formState.lostFound.petType.trim().length > 0 ||
      formState.lostFound.breed.trim().length > 0 ||
      formState.lostFound.lastSeenAt.trim().length > 0 ||
      formState.lostFound.lastSeenLocation.trim().length > 0)
  );
}

export function resolvePostCreateSubmitType(formState: PostCreateFormState) {
  return formState.type === PostType.PRODUCT_REVIEW &&
    formState.reviewCategory === REVIEW_CATEGORY.PLACE
    ? PostType.PLACE_REVIEW
    : formState.type;
}

export function buildPostCreateSubmitPayload({
  formState,
  normalizedTitle,
  serializedContent,
  serializedImageUrls,
  resolvedScope,
  isAuthenticated,
  canUseLocalScope,
  showNeighborhood,
  showCommunitySelector,
  showAnimalTagsInput,
  showMarketListing,
  showCareRequest,
  showLostFound,
  isFreeBoardType,
}: BuildPostCreatePayloadParams): BuildPostCreatePayloadResult {
  if (!normalizedTitle) {
    return { ok: false, message: "제목을 입력해 주세요." };
  }
  if (!serializedContent.trim()) {
    return { ok: false, message: "내용을 입력해 주세요." };
  }
  if (serializedContent.length > POST_CONTENT_MAX_LENGTH) {
    return {
      ok: false,
      message: `내용은 ${POST_CONTENT_MAX_LENGTH.toLocaleString("ko-KR")}자까지 입력할 수 있습니다.`,
    };
  }

  const normalizedAnimalTags = normalizeAnimalTags(formState.animalTagsInput);
  const resolvedType = resolvePostCreateSubmitType(formState);
  const shouldAttachReviewCategory =
    resolvedType === PostType.PLACE_REVIEW || resolvedType === PostType.PRODUCT_REVIEW;

  if (showCommunitySelector && !isFreeBoardType && !formState.petTypeId) {
    return { ok: false, message: "커뮤니티를 선택해 주세요." };
  }

  if (resolvedScope === PostScope.LOCAL && !formState.neighborhoodId) {
    return {
      ok: false,
      message: canUseLocalScope
        ? "동네를 먼저 선택해 주세요."
        : "동네 기반 글을 작성하려면 먼저 대표 동네를 설정해 주세요.",
    };
  }

  if (showAnimalTagsInput && normalizedAnimalTags.length === 0) {
    return { ok: false, message: "공용 보드 글은 동물 태그를 1개 이상 입력해 주세요." };
  }

  if (showMarketListing && formState.marketListing.price.trim().length === 0) {
    return { ok: false, message: "거래 글은 가격을 입력해 주세요. 나눔은 0원을 입력합니다." };
  }

  if (showCareRequest && !formState.careRequest.startsAt) {
    return { ok: false, message: "돌봄 요청은 시작 시간을 입력해 주세요." };
  }

  if (showLostFound) {
    if (!formState.lostFound.petType.trim()) {
      return { ok: false, message: "분실/목격 글은 동물 종류를 입력해 주세요." };
    }
    if (!formState.lostFound.lastSeenAt) {
      return { ok: false, message: "분실/목격 글은 마지막 확인 시간을 입력해 주세요." };
    }
    if (!formState.lostFound.lastSeenLocation.trim()) {
      return { ok: false, message: "분실/목격 글은 마지막 확인 위치를 입력해 주세요." };
    }
  }

  return {
    ok: true,
    payload: {
      title: normalizedTitle,
      content: serializedContent,
      type: resolvedType,
      reviewCategory: shouldAttachReviewCategory ? formState.reviewCategory : undefined,
      scope: isAuthenticated ? resolvedScope : PostScope.GLOBAL,
      imageUrls: serializedImageUrls,
      neighborhoodId: showNeighborhood ? formState.neighborhoodId : undefined,
      petTypeId: showCommunitySelector ? formState.petTypeId || undefined : undefined,
      animalTags: showAnimalTagsInput ? normalizedAnimalTags : undefined,
      guestDisplayName: isAuthenticated ? undefined : formState.guestDisplayName,
      guestPassword: isAuthenticated ? undefined : formState.guestPassword,
      hospitalReview: hasHospitalReview(formState)
        ? {
            ...formState.hospitalReview,
            totalCost: formState.hospitalReview.totalCost || undefined,
            waitTime: formState.hospitalReview.waitTime || undefined,
            explanationSatisfaction:
              formState.hospitalReview.explanationSatisfaction || undefined,
            priceLevel: formState.hospitalReview.priceLevel || undefined,
            hasParking: formState.hospitalReview.hasParking || undefined,
            hasNightCare: formState.hospitalReview.hasNightCare || undefined,
            wouldRevisit: formState.hospitalReview.wouldRevisit || undefined,
          }
        : undefined,
      placeReview: hasPlaceReview(formState, resolvedType)
        ? {
            ...formState.placeReview,
            isPetAllowed: formState.placeReview.isPetAllowed || undefined,
          }
        : undefined,
      walkRoute: hasWalkRoute(formState)
        ? {
            ...formState.walkRoute,
            distance: formState.walkRoute.distance || undefined,
            duration: formState.walkRoute.duration || undefined,
            largeDogFriendly: formState.walkRoute.largeDogFriendly || undefined,
            hasWasteBags: formState.walkRoute.hasWasteBags || undefined,
            hasWaterStation: formState.walkRoute.hasWaterStation || undefined,
            safetyTags: formState.walkRoute.safetyTags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          }
        : undefined,
      adoptionListing: hasAdoptionListing(formState)
        ? {
            ...formState.adoptionListing,
            sex: formState.adoptionListing.sex || undefined,
            isNeutered: formState.adoptionListing.isNeutered || undefined,
            isVaccinated: formState.adoptionListing.isVaccinated || undefined,
            status: formState.adoptionListing.status || undefined,
          }
        : undefined,
      volunteerRecruitment: hasVolunteerRecruitment(formState)
        ? {
            ...formState.volunteerRecruitment,
            volunteerDate: formState.volunteerRecruitment.volunteerDate || undefined,
            capacity: formState.volunteerRecruitment.capacity || undefined,
            status: formState.volunteerRecruitment.status || undefined,
          }
        : undefined,
      marketListing: showMarketListing
        ? {
            ...formState.marketListing,
            depositAmount: formState.marketListing.depositAmount || undefined,
            rentalPeriod: formState.marketListing.rentalPeriod || undefined,
          }
        : undefined,
      careRequest: showCareRequest
        ? {
            ...formState.careRequest,
            startsAt: formState.careRequest.startsAt || undefined,
            endsAt: formState.careRequest.endsAt || undefined,
            locationNote: formState.careRequest.locationNote || undefined,
            petNote: formState.careRequest.petNote || undefined,
            requirements: formState.careRequest.requirements || undefined,
            rewardAmount: formState.careRequest.rewardAmount || undefined,
            isUrgent: formState.careRequest.isUrgent === "true",
          }
        : undefined,
      lostFound: hasLostFound(formState)
        ? {
            ...formState.lostFound,
            breed: formState.lostFound.breed || undefined,
            lastSeenAt: formState.lostFound.lastSeenAt || undefined,
          }
        : undefined,
    },
  };
}

export function createPostCreateSuccessState(prev: PostCreateFormState): PostCreateFormState {
  return {
    ...prev,
    title: "",
    content: "",
    type: PostType.FREE_BOARD,
    petTypeId: "",
    reviewCategory: REVIEW_CATEGORY.SUPPLIES,
    animalTagsInput: "",
    hospitalReview: {
      ...prev.hospitalReview,
      hospitalName: "",
      treatmentType: "",
      totalCost: "",
      waitTime: "",
      rating: "",
    },
    placeReview: {
      ...prev.placeReview,
      placeName: "",
      placeType: "",
      address: "",
      isPetAllowed: "",
      rating: "",
    },
    walkRoute: {
      ...prev.walkRoute,
      routeName: "",
      distance: "",
      duration: "",
      difficulty: "",
      largeDogFriendly: "",
      crowdedTime: "",
      leashRequiredNote: "",
      hasWasteBags: "false",
      hasWaterStation: "false",
      cautionNote: "",
      safetyTags: "",
    },
    adoptionListing: {
      ...prev.adoptionListing,
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
      ...prev.volunteerRecruitment,
      shelterName: "",
      region: "",
      volunteerDate: "",
      volunteerType: "",
      capacity: "",
      status: "OPEN",
    },
    marketListing: {
      ...prev.marketListing,
      listingType: "SELL",
      price: "",
      condition: "GOOD",
      depositAmount: "",
      rentalPeriod: "",
    },
    lostFound: {
      ...prev.lostFound,
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
