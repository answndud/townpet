import {
  CareApplicationStatus,
  CareFeedbackAuthorRole,
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  PostType,
} from "@prisma/client";

export type RelationState = {
  isBlockedByMe: boolean;
  hasBlockedMe: boolean;
  isMutedByMe: boolean;
};

export type PostDetailResponse = {
  ok: boolean;
  data?: {
    post: PostDetailItem;
    viewerId: string | null;
    canModerate: boolean;
    relationState?: RelationState;
  };
  error?: {
    code: string;
    message: string;
  };
};

export type PostDetailItem = {
  id: string;
  authorId: string;
  type: PostType;
  scope: "LOCAL" | "GLOBAL";
  status: "ACTIVE" | "HIDDEN" | "DELETED";
  title: string;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  viewCount?: number | null;
  likeCount?: number | null;
  dislikeCount?: number | null;
  commentCount?: number | null;
  isBookmarked?: boolean | null;
  author: { id: string; nickname: string | null; image?: string | null };
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  neighborhood?: { id: string; name: string; city: string; district?: string } | null;
  images: Array<{ url: string; order: number }>;
  hospitalReview?: {
    hospitalName?: string | null;
    totalCost?: number | null;
    waitTime?: number | null;
    rating?: number | null;
    treatmentType?: string | null;
  } | null;
  placeReview?: {
    placeName?: string | null;
    placeType?: string | null;
    address?: string | null;
    isPetAllowed?: boolean | null;
    rating?: number | null;
  } | null;
  walkRoute?: {
    routeName?: string | null;
    distance?: number | null;
    duration?: number | null;
    difficulty?: string | null;
    hasStreetLights?: boolean | null;
    hasRestroom?: boolean | null;
    hasParkingLot?: boolean | null;
    safetyTags?: string[] | null;
  } | null;
  adoptionListing?: {
    shelterName?: string | null;
    region?: string | null;
    animalType?: string | null;
    breed?: string | null;
    ageLabel?: string | null;
    sex?: string | null;
    isNeutered?: boolean | null;
    isVaccinated?: boolean | null;
    sizeLabel?: string | null;
    status?: string | null;
  } | null;
  volunteerRecruitment?: {
    shelterName?: string | null;
    region?: string | null;
    volunteerDate?: string | Date | null;
    volunteerType?: string | null;
    capacity?: number | null;
    status?: string | null;
  } | null;
  marketListing?: {
    listingType?: string | null;
    price?: number | null;
    condition?: string | null;
    depositAmount?: number | null;
    rentalPeriod?: string | null;
    status?: string | null;
  } | null;
  careRequest?: {
    id?: string | null;
    careType?: string | null;
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
    locationNote?: string | null;
    petNote?: string | null;
    requirements?: string | null;
    rewardAmount?: number | null;
    isUrgent?: boolean | null;
    status?: string | null;
  } | null;
  careApplications?: Array<{
    id: string;
    applicantId: string;
    message: string | null;
    status: CareApplicationStatus;
    decidedAt?: string | Date | null;
    createdAt: string | Date;
    applicant: { id: string; nickname: string | null; image?: string | null };
  }>;
  careCompletionFeedbacks?: Array<{
    id: string;
    authorId: string;
    authorRole: CareFeedbackAuthorRole;
    outcome: CareFeedbackOutcome;
    issueType: CareFeedbackIssueType;
    wouldRepeat: boolean | null;
    comment: string | null;
    createdAt: string | Date;
    author: { id: string; nickname: string | null; image?: string | null };
  }>;
  renderedContentHtml?: string | null;
  renderedContentText?: string | null;
};
