const NO_VIEWER_ID = "__NO_VIEWER__";

const LEGACY_POST_BASE_SELECT = {
  id: true,
  authorId: true,
  neighborhoodId: true,
  type: true,
  scope: true,
  status: true,
  title: true,
  content: true,
  viewCount: true,
  likeCount: true,
  dislikeCount: true,
  commentCount: true,
  isOperatorContent: true,
  operatorSourceName: true,
  operatorSourceUrl: true,
  operatorLastVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const LEGACY_POST_RELATION_SELECT = {
  author: { select: { id: true, nickname: true, isFoundingMember: true } },
  neighborhood: {
    select: { id: true, name: true, city: true },
  },
  hospitalReview: {
    select: {
      hospitalName: true,
      visitPurpose: true,
      animalType: true,
      totalCost: true,
      waitTime: true,
      explanationSatisfaction: true,
      priceLevel: true,
      hasParking: true,
      hasNightCare: true,
      wouldRevisit: true,
      rating: true,
    },
  },
  placeReview: {
    select: {
      placeName: true,
      placeType: true,
      address: true,
      isPetAllowed: true,
      rating: true,
    },
  },
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
  images: {
    select: { url: true, order: true },
  },
} as const;

export const buildLegacyPostListSelect = (viewerId?: string) =>
  ({
    ...LEGACY_POST_BASE_SELECT,
    author: { select: { id: true, nickname: true, image: true, isFoundingMember: true } },
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    images: {
      orderBy: { order: "asc" },
      take: 1,
      select: { id: true, url: true },
    },
    reactions: {
      where: {
        userId: viewerId ?? NO_VIEWER_ID,
      },
      select: { type: true },
    },
  }) as const;

export const buildLegacyPostListSelectWithoutReactions = () =>
  ({
    ...LEGACY_POST_BASE_SELECT,
    author: { select: { id: true, nickname: true, image: true, isFoundingMember: true } },
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    images: {
      orderBy: { order: "asc" },
      take: 1,
      select: { id: true, url: true },
    },
  }) as const;

export const buildLegacyPostDetailSelect = () =>
  ({
    ...LEGACY_POST_BASE_SELECT,
    ...LEGACY_POST_RELATION_SELECT,
    hospitalReview: {
      select: {
        hospitalName: true,
        visitPurpose: true,
        animalType: true,
        totalCost: true,
        waitTime: true,
        explanationSatisfaction: true,
        priceLevel: true,
        hasParking: true,
        hasNightCare: true,
        wouldRevisit: true,
        rating: true,
        treatmentType: true,
      },
    },
  }) as const;

export const buildLegacyPostDetailSelectWithoutReactions = () =>
  ({
    ...LEGACY_POST_BASE_SELECT,
    ...LEGACY_POST_RELATION_SELECT,
    hospitalReview: {
      select: {
        hospitalName: true,
        visitPurpose: true,
        animalType: true,
        totalCost: true,
        waitTime: true,
        explanationSatisfaction: true,
        priceLevel: true,
        hasParking: true,
        hasNightCare: true,
        wouldRevisit: true,
        rating: true,
        treatmentType: true,
      },
    },
  }) as const;
