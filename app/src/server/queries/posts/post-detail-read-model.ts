import type {
  CareApplicationStatus,
  CareFeedbackAuthorRole,
  CareFeedbackIssueType,
  CareFeedbackOutcome,
} from "@prisma/client";

export const HOSPITAL_REVIEW_SELECT = {
  hospitalName: true,
  totalCost: true,
  waitTime: true,
  rating: true,
  treatmentType: true,
} as const;

export const PLACE_REVIEW_SELECT = {
  placeName: true,
  placeType: true,
  address: true,
  isPetAllowed: true,
  rating: true,
} as const;

export const WALK_ROUTE_SELECT = {
  routeName: true,
  distance: true,
  duration: true,
  difficulty: true,
  hasStreetLights: true,
  hasRestroom: true,
  hasParkingLot: true,
  safetyTags: true,
} as const;

export const ADOPTION_LISTING_SELECT = {
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
} as const;

export const VOLUNTEER_RECRUITMENT_SELECT = {
  shelterName: true,
  region: true,
  volunteerDate: true,
  volunteerType: true,
  capacity: true,
  status: true,
} as const;

export const MARKET_LISTING_SELECT = {
  listingType: true,
  price: true,
  condition: true,
  depositAmount: true,
  rentalPeriod: true,
  status: true,
} as const;

export const CARE_REQUEST_SELECT = {
  id: true,
  careType: true,
  startsAt: true,
  endsAt: true,
  locationNote: true,
  petNote: true,
  requirements: true,
  rewardAmount: true,
  isUrgent: true,
  status: true,
} as const;

export type PostDetailExtras = {
  hospitalReview: {
    hospitalName: string | null;
    totalCost: number | null;
    waitTime: number | null;
    rating: number | null;
    treatmentType: string | null;
  } | null;
  placeReview: {
    placeName: string | null;
    placeType: string | null;
    address: string | null;
    isPetAllowed: boolean | null;
    rating: number | null;
  } | null;
  walkRoute: {
    routeName: string | null;
    distance: number | null;
    duration: number | null;
    difficulty: string | null;
    hasStreetLights: boolean | null;
    hasRestroom: boolean | null;
    hasParkingLot: boolean | null;
    safetyTags: string[] | null;
  } | null;
  adoptionListing: {
    shelterName: string | null;
    region: string | null;
    animalType: string | null;
    breed: string | null;
    ageLabel: string | null;
    sex: string | null;
    isNeutered: boolean | null;
    isVaccinated: boolean | null;
    sizeLabel: string | null;
    status: string | null;
  } | null;
  volunteerRecruitment: {
    shelterName: string | null;
    region: string | null;
    volunteerDate: Date | null;
    volunteerType: string | null;
    capacity: number | null;
    status: string | null;
  } | null;
  marketListing: {
    listingType: string | null;
    price: number | null;
    condition: string | null;
    depositAmount: number | null;
    rentalPeriod: string | null;
    status: string | null;
  } | null;
  careRequest: {
    id: string;
    careType: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    locationNote: string | null;
    petNote: string | null;
    requirements: string | null;
    rewardAmount: number | null;
    isUrgent: boolean | null;
    status: string | null;
  } | null;
};

export type CareApplicationDetailItem = {
  id: string;
  applicantId: string;
  message: string | null;
  status: CareApplicationStatus;
  decidedAt: Date | null;
  createdAt: Date;
  applicant: {
    id: string;
    nickname: string | null;
    image: string | null;
  };
};

export type CareCompletionFeedbackDetailItem = {
  id: string;
  authorId: string;
  authorRole: CareFeedbackAuthorRole;
  outcome: CareFeedbackOutcome;
  issueType: CareFeedbackIssueType;
  wouldRepeat: boolean | null;
  comment: string | null;
  createdAt: Date;
  author: {
    id: string;
    nickname: string | null;
    image: string | null;
  };
};
