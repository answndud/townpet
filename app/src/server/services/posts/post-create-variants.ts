import { PostType, Prisma } from "@prisma/client";

import { buildPostStructuredSearchText } from "@/lib/post-structured-search";
import {
  type AdoptionListingInput,
  type CareRequestInput,
  type HospitalReviewInput,
  type LostFoundInput,
  type MarketListingInput,
  type VolunteerRecruitmentInput,
  placeReviewSchema,
  walkRouteSchema,
} from "@/lib/validations/post";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/server/services/service-error";

type CreatePostVariantParams = {
  postType: PostType;
  rawInput: Record<string, unknown>;
  commonCreateData: Prisma.PostCreateArgs["data"];
  commonBoardAnimalTags: string[];
  hospitalReviewInput: HospitalReviewInput | null;
  adoptionListingInput: AdoptionListingInput | null;
  volunteerRecruitmentInput: VolunteerRecruitmentInput | null;
  marketListingInput: MarketListingInput | null;
  careRequestInput: CareRequestInput | null;
  lostFoundInput: LostFoundInput | null;
};

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
};

const hasAnyValue = (data: Record<string, unknown>) =>
  Object.values(data).some((value) => hasValue(value));

const basePostInclude = {
  author: { select: { id: true, nickname: true } },
  neighborhood: {
    select: { id: true, name: true, city: true, district: true },
  },
  images: {
    select: { id: true, url: true, order: true },
    orderBy: { order: "asc" },
  },
} satisfies Prisma.PostInclude;

const hospitalReviewInclude = {
  hospitalReview: {
    select: {
      hospitalName: true,
      totalCost: true,
      waitTime: true,
      rating: true,
    },
  },
} satisfies Prisma.PostInclude;

const placeReviewInclude = {
  placeReview: {
    select: {
      placeName: true,
      placeType: true,
      address: true,
      isPetAllowed: true,
      rating: true,
    },
  },
} satisfies Prisma.PostInclude;

const walkRouteInclude = {
  walkRoute: {
    select: {
      routeName: true,
      distance: true,
      duration: true,
      difficulty: true,
      largeDogFriendly: true,
      crowdedTime: true,
      leashRequiredNote: true,
      hasStreetLights: true,
      hasRestroom: true,
      hasParkingLot: true,
      hasWasteBags: true,
      hasWaterStation: true,
      cautionNote: true,
      safetyTags: true,
    },
  },
} satisfies Prisma.PostInclude;

const marketListingInclude = {
  marketListing: {
    select: {
      listingType: true,
      price: true,
      condition: true,
      depositAmount: true,
      rentalPeriod: true,
      status: true,
    },
  },
} satisfies Prisma.PostInclude;

const careRequestInclude = {
  careRequest: {
    select: {
      careType: true,
      startsAt: true,
      endsAt: true,
      locationNote: true,
      petNote: true,
      requirements: true,
      rewardAmount: true,
      isUrgent: true,
      status: true,
    },
  },
} satisfies Prisma.PostInclude;

const lostFoundAlertInclude = {
  lostFoundAlert: {
    select: {
      alertType: true,
      petType: true,
      breed: true,
      lastSeenAt: true,
      lastSeenLocation: true,
      status: true,
    },
  },
} satisfies Prisma.PostInclude;

const adoptionListingInclude = {
  adoptionListing: {
    select: {
      shelterName: true,
      region: true,
      animalType: true,
      breed: true,
      ageLabel: true,
      sex: true,
      isNeutered: true,
      isVaccinated: true,
      sizeLabel: true,
      status: true,
    },
  },
} satisfies Prisma.PostInclude;

const volunteerRecruitmentInclude = {
  volunteerRecruitment: {
    select: {
      shelterName: true,
      region: true,
      volunteerDate: true,
      volunteerType: true,
      capacity: true,
      status: true,
    },
  },
} satisfies Prisma.PostInclude;

const defaultPostInclude = {
  ...basePostInclude,
  ...hospitalReviewInclude,
  ...placeReviewInclude,
  ...walkRouteInclude,
  ...adoptionListingInclude,
  ...volunteerRecruitmentInclude,
  ...marketListingInclude,
  ...careRequestInclude,
  ...lostFoundAlertInclude,
} satisfies Prisma.PostInclude;

export async function createPostVariant(params: CreatePostVariantParams) {
  const { commonCreateData, commonBoardAnimalTags, postType, rawInput } = params;

  if (postType === PostType.HOSPITAL_REVIEW) {
    const reviewInput: HospitalReviewInput =
      params.hospitalReviewInput ?? {
        hospitalName: undefined,
        visitPurpose: undefined,
        animalType: undefined,
        treatmentType: undefined,
      };
    const shouldCreateReview = hasAnyValue(reviewInput);

    const created = await prisma.post.create({
      data: {
        ...commonCreateData,
        structuredSearchText: buildPostStructuredSearchText({
          animalTags: commonBoardAnimalTags,
          hospitalReview: reviewInput,
        }),
        ...(shouldCreateReview
          ? {
              hospitalReview: {
                create: {
                  ...reviewInput,
                },
              },
            }
          : {}),
      },
      include: {
        ...basePostInclude,
        ...hospitalReviewInclude,
      },
    });

    return {
      created,
      hospitalReviewRisk: {
        shouldCreateReview,
        reviewInput,
      },
    };
  }

  if (postType === PostType.PLACE_REVIEW) {
    const reviewInput = placeReviewSchema.safeParse(rawInput.placeReview ?? {});
    if (!reviewInput.success) {
      throw new ServiceError("장소 리뷰 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    const shouldCreateReview = hasAnyValue(reviewInput.data);

    const created = await prisma.post.create({
      data: {
        ...commonCreateData,
        structuredSearchText: buildPostStructuredSearchText({
          animalTags: commonBoardAnimalTags,
          placeReview: reviewInput.data,
        }),
        ...(shouldCreateReview
          ? {
              placeReview: {
                create: {
                  ...reviewInput.data,
                },
              },
            }
          : {}),
      },
      include: {
        ...basePostInclude,
        ...hospitalReviewInclude,
        ...placeReviewInclude,
      },
    });

    return { created };
  }

  if (postType === PostType.WALK_ROUTE) {
    const routeInput = walkRouteSchema.safeParse(rawInput.walkRoute ?? {});
    if (!routeInput.success) {
      throw new ServiceError("산책로 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    const shouldCreateReview = hasAnyValue(routeInput.data);

    const created = await prisma.post.create({
      data: {
        ...commonCreateData,
        structuredSearchText: buildPostStructuredSearchText({
          animalTags: commonBoardAnimalTags,
          walkRoute: {
            routeName: routeInput.data.routeName,
            crowdedTime: routeInput.data.crowdedTime,
            leashRequiredNote: routeInput.data.leashRequiredNote,
            cautionNote: routeInput.data.cautionNote,
            safetyTags: routeInput.data.safetyTags ?? [],
          },
        }),
        ...(shouldCreateReview
          ? {
              walkRoute: {
                create: {
                  ...routeInput.data,
                  coordinates: [],
                  safetyTags: routeInput.data.safetyTags ?? [],
                },
              },
            }
          : {}),
      },
      include: {
        ...basePostInclude,
        ...hospitalReviewInclude,
        ...placeReviewInclude,
        ...walkRouteInclude,
      },
    });

    return { created };
  }

  if (postType === PostType.MARKET_LISTING) {
    if (!params.marketListingInput) {
      throw new ServiceError("거래 글 입력값이 올바르지 않습니다.", "INVALID_MARKET_LISTING", 400);
    }

    const { marketListingInput } = params;
    const created = await prisma.post.create({
      data: {
        ...commonCreateData,
        structuredSearchText: buildPostStructuredSearchText({
          animalTags: commonBoardAnimalTags,
          marketListing: marketListingInput,
        }),
        marketListing: {
          create: {
            listingType: marketListingInput.listingType,
            price: marketListingInput.price,
            condition: marketListingInput.condition,
            depositAmount: marketListingInput.depositAmount,
            rentalPeriod: marketListingInput.rentalPeriod,
          },
        },
      },
      include: {
        ...basePostInclude,
        ...marketListingInclude,
      },
    });

    return { created };
  }

  if (postType === PostType.CARE_REQUEST) {
    if (!params.careRequestInput) {
      throw new ServiceError("돌봄 요청 입력값이 올바르지 않습니다.", "INVALID_CARE_REQUEST", 400);
    }

    const { careRequestInput } = params;
    const created = await prisma.post.create({
      data: {
        ...commonCreateData,
        structuredSearchText: buildPostStructuredSearchText({
          animalTags: commonBoardAnimalTags,
          careRequest: careRequestInput,
        }),
        careRequest: {
          create: {
            careType: careRequestInput.careType,
            startsAt: careRequestInput.startsAt,
            endsAt: careRequestInput.endsAt,
            locationNote: careRequestInput.locationNote,
            petNote: careRequestInput.petNote,
            requirements: careRequestInput.requirements,
            rewardAmount: careRequestInput.rewardAmount,
            isUrgent: careRequestInput.isUrgent,
          },
        },
      },
      include: {
        ...basePostInclude,
        ...careRequestInclude,
      },
    });

    return { created };
  }

  if (postType === PostType.LOST_FOUND) {
    if (!params.lostFoundInput) {
      throw new ServiceError("분실/목격 입력값이 올바르지 않습니다.", "INVALID_LOST_FOUND", 400);
    }

    const { lostFoundInput } = params;
    const created = await prisma.post.create({
      data: {
        ...commonCreateData,
        structuredSearchText: buildPostStructuredSearchText({
          animalTags: commonBoardAnimalTags,
          lostFound: lostFoundInput,
        }),
        lostFoundAlert: {
          create: {
            alertType: lostFoundInput.alertType,
            petType: lostFoundInput.petType,
            breed: lostFoundInput.breed,
            lastSeenAt: lostFoundInput.lastSeenAt,
            lastSeenLocation: lostFoundInput.lastSeenLocation,
          },
        },
      },
      include: {
        ...basePostInclude,
        ...lostFoundAlertInclude,
      },
    });

    return { created };
  }

  if (postType === PostType.ADOPTION_LISTING) {
    const listingInput = params.adoptionListingInput ?? {};
    const shouldCreateListing = hasAnyValue(listingInput);

    const created = await prisma.post.create({
      data: {
        ...commonCreateData,
        structuredSearchText: buildPostStructuredSearchText({
          animalTags: commonBoardAnimalTags,
          adoptionListing: listingInput,
        }),
        ...(shouldCreateListing
          ? {
              adoptionListing: {
                create: {
                  ...listingInput,
                },
              },
            }
          : {}),
      },
      include: {
        ...basePostInclude,
        ...adoptionListingInclude,
      },
    });

    return { created };
  }

  if (postType === PostType.SHELTER_VOLUNTEER) {
    const recruitmentInput = params.volunteerRecruitmentInput ?? {};
    const shouldCreateRecruitment = hasAnyValue(recruitmentInput);

    const created = await prisma.post.create({
      data: {
        ...commonCreateData,
        structuredSearchText: buildPostStructuredSearchText({
          animalTags: commonBoardAnimalTags,
          volunteerRecruitment: recruitmentInput,
        }),
        ...(shouldCreateRecruitment
          ? {
              volunteerRecruitment: {
                create: {
                  ...recruitmentInput,
                },
              },
            }
          : {}),
      },
      include: {
        ...basePostInclude,
        ...volunteerRecruitmentInclude,
      },
    });

    return { created };
  }

  const created = await prisma.post.create({
    data: {
      ...commonCreateData,
    },
    include: defaultPostInclude,
  });

  return { created };
}
