import {
  FeedPersonalizationEvent,
  PostScope,
  PostType,
  Prisma,
} from "@prisma/client";

import {
  DEFAULT_BREED_CATALOG,
} from "@/lib/breed-catalog";
import type { FeedPersonalizationPolicy } from "@/lib/feed-personalization-policy";
import {
  extractAudienceSegmentBreedLabel,
  getPetBreedDisplayLabel,
  hasBreedLoungeRoute,
} from "@/lib/pet-profile";
import { prisma } from "@/lib/prisma";
import { buildVisibleAuthorFilter } from "@/lib/sanction-visibility";
import {
  expandExcludedPostTypes,
} from "@/lib/post-type-groups";
import type { ReviewCategory } from "@/lib/review-category";
import { logger, serializeError } from "@/server/logger";
import { getFeedPersonalizationPolicy } from "@/server/queries/policy.queries";
import { listPreferredPetTypeIdsByUserId } from "@/server/queries/user.queries";
import { listHiddenAuthorIdsForViewer } from "@/server/queries/user-relation.queries";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { fetchPostDetailWithFallback } from "./post-detail-fetch-fallback";
import {
  buildRankedSearchCandidateSql,
  buildRankedSearchMatchSql,
  buildRankedSearchWhereSql,
  buildStructuredSearchSqlVariants,
  resolveRankedSearchCandidateLimit,
  shouldTryPostSearchDocumentFallback,
  type RankedSearchRow,
} from "./post-ranked-search-support";
import { runRankedSearchWithCache } from "./post-ranked-search-cache";
import { listRankedSearchDocumentFallbackCandidateIds } from "./post-ranked-search-document-fallback";
import { hydrateRankedSearchPostsByIds } from "./post-ranked-search-hydration";
import {
  isPostTypeFullyExcluded,
} from "./post-list-where-support";
import {
  countBestPostsWithDependencies,
  countPostsWithDependencies,
  listBestPostsWithDependencies,
  listPostsWithDependencies,
  type BestPostCountOptions,
  type BestPostListOptions,
  type FeedLikePost,
  type PostCountOptions,
  type PostListOptions,
} from "./post-list.queries";
import { getPostDetailWidgetById } from "./post-detail-widget.queries";
import {
  DEFAULT_POST_SEARCH_IN,
  type PostSearchIn,
} from "./post-search-support";
import {
  isMissingPostBookmarkTableError,
  isMissingPostReactionTableError,
  isUnavailableReactionsIncludeError,
  markPostReactionsUnsupported,
  supportsPostBookmarksField,
  supportsPostReactionsField,
} from "./post-engagement-support";
export {
  listCareApplicationsForPostDetail,
  listCareCompletionFeedbacksForPostDetail,
} from "./post-detail-care.queries";
export type {
  CareApplicationDetailItem,
  CareCompletionFeedbackDetailItem,
} from "./post-detail-read-model";
export type { PostSearchIn } from "./post-search-support";
export type { PostListSort } from "./post-list-args";
export {
  listPostSearchSuggestions,
} from "./post-search-suggestions.queries";
export {
  countUserBookmarkedPosts,
  countUserPosts,
  listUserBookmarkedPostsPage,
  listUserPosts,
  listUserPostsPage,
} from "./post-user-posts.queries";

const NO_VIEWER_ID = "__NO_VIEWER__";
let postGuestAuthorFieldSupport: boolean | null = null;
let postReviewCategoryFieldSupport: boolean | null = null;
let pgTrgmSupport: boolean | null = null;
let pgTrgmSupportWarned = false;

async function supportsPgTrgm() {
  if (pgTrgmSupport !== null) {
    return pgTrgmSupport;
  }

  try {
    const result = await prisma.$queryRaw<Array<{ enabled: boolean }>>(Prisma.sql`
      SELECT EXISTS(
        SELECT 1
        FROM pg_extension
        WHERE extname = 'pg_trgm'
      ) AS enabled
    `);
    pgTrgmSupport = Boolean(result[0]?.enabled);
  } catch (error) {
    pgTrgmSupport = false;
    if (!pgTrgmSupportWarned) {
      pgTrgmSupportWarned = true;
      logger.warn("pg_trgm 확장 지원 여부 확인에 실패해 trigram 검색을 비활성화합니다.", {
        error: serializeError(error),
      });
    }
  }

  if (!pgTrgmSupport && !pgTrgmSupportWarned) {
    pgTrgmSupportWarned = true;
    logger.warn(
      "pg_trgm 확장이 설치되지 않아 trigram 유사도 검색을 비활성화합니다. 마이그레이션으로 확장을 적용해 주세요.",
    );
  }

  return pgTrgmSupport;
}

function isMissingFeedPersonalizationEventLogSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return (
      tableName.includes("FeedPersonalizationEventLog") ||
      columnName.includes("FeedPersonalizationEventLog")
    );
  }

  return (
    error instanceof Error &&
    error.message.includes("FeedPersonalizationEventLog") &&
    (error.message.includes("does not exist") ||
      error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
}

function isUnknownGuestAuthorIncludeError(error: unknown) {
  return error instanceof Error && error.message.includes("Unknown field `guestAuthor`");
}

function isUnknownGuestPostColumnError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("guestDisplayName") ||
    message.includes("guestIpDisplay") ||
    message.includes("guestIpLabel") ||
    message.includes("guestPasswordHash") ||
    message.includes("guestIpHash") ||
    message.includes("guestFingerprintHash")
  );
}

function isUnknownReviewCategoryFieldError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("Unknown argument `reviewCategory`");
}

function isMissingReviewCategoryColumnError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
    const meta = error.meta as { column?: unknown } | undefined;
    const columnName = typeof meta?.column === "string" ? meta.column : "";
    if (columnName.includes("Post.reviewCategory")) {
      return true;
    }
  }

  return (
    error instanceof Error &&
    error.message.includes("Post.reviewCategory") &&
    error.message.includes("does not exist")
  );
}

function isUnsupportedReviewCategoryFilterError(error: unknown) {
  return isUnknownReviewCategoryFieldError(error) || isMissingReviewCategoryColumnError(error);
}

function isMissingCommunityBoardSchemaError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === "P2021") {
    const meta = error.meta as { table?: unknown } | undefined;
    const tableName = typeof meta?.table === "string" ? meta.table : "";
    return tableName.includes("Community") || tableName.includes("CommunityCategory");
  }

  if (error.code === "P2022") {
    const meta = error.meta as { column?: unknown } | undefined;
    const columnName = typeof meta?.column === "string" ? meta.column : "";
    return (
      columnName.includes("Post.boardScope") ||
      // Legacy column name for petTypeId is kept in DB via @map("communityId").
      columnName.includes("Post.communityId") ||
      columnName.includes("Post.commonBoardType") ||
      columnName.includes("Post.animalTags")
    );
  }

  return false;
}

const postListFetchFallbackHandlers = {
  isUnknownGuestPostColumnError,
  isUnknownGuestAuthorIncludeError,
  isMissingCommunityBoardSchemaError,
  isUnsupportedReviewCategoryFilterError,
  onUnsupportedReviewCategoryFilter: () => {
    postReviewCategoryFieldSupport = false;
  },
};

const postDetailFetchFallbackHandlers = {
  isUnknownGuestPostColumnError,
  isUnknownGuestAuthorIncludeError,
  onUnavailableReactions: markPostReactionsUnsupported,
};

function countPostRowsWithSchemaFallback({
  where,
  legacyWhere,
}: {
  where: Prisma.PostWhereInput;
  legacyWhere: Prisma.PostWhereInput;
}) {
  return prisma.post.count({ where }).catch((error) => {
    if (!isMissingCommunityBoardSchemaError(error) && !isUnsupportedReviewCategoryFilterError(error)) {
      throw error;
    }

    if (isUnsupportedReviewCategoryFilterError(error)) {
      postReviewCategoryFieldSupport = false;
    }

    return prisma.post.count({ where: legacyWhere });
  });
}

function supportsFeedPersonalizationEventLogField() {
  return Boolean(
    (
      prisma as typeof prisma & {
        feedPersonalizationEventLog?: {
          findMany: (typeof prisma.feedPersonalizationEventLog)["findMany"];
        };
      }
    ).feedPersonalizationEventLog,
  );
}

function supportsPostGuestAuthorField() {
  if (postGuestAuthorFieldSupport !== null) {
    return postGuestAuthorFieldSupport;
  }

  postGuestAuthorFieldSupport = true;
  return true;
}

function supportsPostReviewCategoryField() {
  if (postReviewCategoryFieldSupport !== null) {
    return postReviewCategoryFieldSupport;
  }

  postReviewCategoryFieldSupport = true;
  return true;
}

type PetSignal = {
  userId: string;
  species: string;
  breedCode: string | null;
  breedLabel: string | null;
  sizeClass: string;
  lifeStage: string;
};

type PostInterestLike = Pick<
  FeedLikePost,
  "petTypeId" | "type" | "reviewCategory" | "animalTags" | "petType"
>;

type FeedPersonalizationEventLogLike = {
  event: FeedPersonalizationEvent;
  audienceKey: string;
  breedCode: string;
  post: PostInterestLike | null;
};

type ViewerPersonalizationContext = {
  policy: FeedPersonalizationPolicy;
  petSignals: PetSignal[];
  preferredPetTypeIds: string[];
  preferredInterestLabels: string[];
  recentEngagementPetTypeIds: string[];
  recentNegativePetTypeIds: string[];
  recentEngagementInterestLabels: string[];
  recentNegativeInterestLabels: string[];
  recentClickPetTypeWeights: Record<string, number>;
  recentClickInterestWeights: Record<string, number>;
  recentAdBreedWeights: Record<string, number>;
  recentAdAudienceKeyWeights: Record<string, number>;
  recentDwellPetTypeWeights: Record<string, number>;
  recentDwellInterestWeights: Record<string, number>;
  recentBookmarkPetTypeWeights: Record<string, number>;
  recentBookmarkInterestWeights: Record<string, number>;
};

const REVIEW_CATEGORY_INTEREST_LABELS: Partial<Record<ReviewCategory, string[]>> = {
  FEED: ["사료"],
  SNACK: ["간식"],
  TOY: ["장난감"],
  PLACE: ["장소", "산책"],
  SUPPLIES: ["용품"],
  ETC: ["후기"],
};

const POST_TYPE_INTEREST_LABELS: Partial<Record<PostType, string[]>> = {
  WALK_ROUTE: ["산책"],
  HOSPITAL_REVIEW: ["건강", "병원"],
  PLACE_REVIEW: ["장소"],
  PRODUCT_REVIEW: ["용품", "후기"],
  ADOPTION_LISTING: ["입양", "보호소"],
  SHELTER_VOLUNTEER: ["봉사", "보호소"],
  PET_SHOWCASE: ["행동", "일상"],
  QA_QUESTION: ["질문"],
  QA_ANSWER: ["질문"],
};

function normalizeBreedCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeBreedLabel(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeAudienceKey(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeInterestLabel(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function dedupeInterestLabels(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );
}

function buildFallbackAudienceKey(input: {
  species: string | null | undefined;
  sizeClass?: string | null;
  lifeStage?: string | null;
}) {
  if (!input.species) {
    return null;
  }

  const parts = [String(input.species)];
  if (input.sizeClass && input.sizeClass !== "UNKNOWN") {
    parts.push(String(input.sizeClass));
  }
  if (input.lifeStage && input.lifeStage !== "UNKNOWN") {
    parts.push(String(input.lifeStage));
  }
  return parts.join(":");
}

function getRecencyWeight(index: number, policy: FeedPersonalizationPolicy) {
  return Math.max(policy.recencyDecayFloor, 1 - index * policy.recencyDecayStep);
}

function addWeightedDimension(
  target: Record<string, number>,
  key: string | null | undefined,
  weight: number,
) {
  if (!key || weight <= 0) {
    return;
  }

  target[key] = (target[key] ?? 0) + weight;
}

function listTopWeightedDimensions(
  values: Record<string, number>,
  limit = 3,
) {
  return Object.entries(values)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0], "ko");
    })
    .slice(0, limit)
    .map(([key]) => key);
}

function applySignalCap(baseBoost: number, multiplier: number, cap: number) {
  if (baseBoost <= 0 || multiplier <= 0 || cap <= 0) {
    return 0;
  }

  return Math.min(cap, baseBoost * multiplier);
}

function getBreedSummaryLabel(breedCode: string) {
  const catalogEntry = DEFAULT_BREED_CATALOG.find((entry) => entry.code === breedCode);
  return catalogEntry?.labelKo ?? getPetBreedDisplayLabel({ breedCode, breedLabel: null });
}

function calculatePersonalizationBoost(
  authorPets: PetSignal[],
  viewerPets: PetSignal[],
) {
  if (authorPets.length === 0 || viewerPets.length === 0) {
    return 0;
  }

  let best = 0;
  for (const authorPet of authorPets) {
    const authorBreedCode = normalizeBreedCode(authorPet.breedCode);
    const authorBreedLabel = normalizeBreedLabel(authorPet.breedLabel);
    const authorHasSpecificBreed = hasBreedLoungeRoute(authorBreedCode);

    for (const viewerPet of viewerPets) {
      let score = 0;
      const viewerBreedCode = normalizeBreedCode(viewerPet.breedCode);
      const viewerBreedLabel = normalizeBreedLabel(viewerPet.breedLabel);
      const viewerHasSpecificBreed = hasBreedLoungeRoute(viewerBreedCode);

      if (
        viewerHasSpecificBreed &&
        authorHasSpecificBreed &&
        viewerBreedCode &&
        authorBreedCode &&
        viewerBreedCode === authorBreedCode
      ) {
        score += 0.45;
      } else if (
        viewerBreedLabel &&
        authorBreedLabel &&
        viewerBreedLabel === authorBreedLabel
      ) {
        score += 0.22;
      }
      if (viewerPet.sizeClass !== "UNKNOWN" && authorPet.sizeClass === viewerPet.sizeClass) {
        score += 0.16;
      }
      if (viewerPet.lifeStage !== "UNKNOWN" && authorPet.lifeStage === viewerPet.lifeStage) {
        score += 0.12;
      }
      if (authorPet.species === viewerPet.species) {
        score += 0.08;
      }

      if (score > best) {
        best = score;
      }
    }
  }

  return best;
}

function calculatePreferredPetTypeBoost(
  postPetTypeId: string | null | undefined,
  preferredPetTypeIds: string[],
) {
  if (!postPetTypeId || preferredPetTypeIds.length === 0) {
    return 0;
  }

  return preferredPetTypeIds.includes(postPetTypeId) ? 0.12 : 0;
}

function collectPostInterestLabels(post: PostInterestLike) {
  return dedupeInterestLabels([
    ...(post.animalTags ?? []).map((tag) => normalizeInterestLabel(tag)),
    ...((post.petType?.tags ?? []) as string[]).map((tag) => normalizeInterestLabel(tag)),
    ...((post.type ? POST_TYPE_INTEREST_LABELS[post.type] : []) ?? []).map((tag) =>
      normalizeInterestLabel(tag),
    ),
    ...((post.reviewCategory ? REVIEW_CATEGORY_INTEREST_LABELS[post.reviewCategory] : []) ?? []).map(
      (tag) => normalizeInterestLabel(tag),
    ),
  ]);
}

function buildRecentBehaviorSignal(
  logs: FeedPersonalizationEventLogLike[],
  policy: FeedPersonalizationPolicy,
) {
  const recentClickPetTypeWeights: Record<string, number> = {};
  const recentClickInterestWeights: Record<string, number> = {};
  const recentAdBreedWeights: Record<string, number> = {};
  const recentAdAudienceKeyWeights: Record<string, number> = {};
  const recentBehaviorSummaryWeights: Record<string, number> = {};

  logs.forEach((log, index) => {
    const weight = getRecencyWeight(index, policy);

    if (log.event === "POST_CLICK" && log.post) {
      addWeightedDimension(
        recentClickPetTypeWeights,
        log.post.petTypeId,
        weight,
      );
      const interestLabels = collectPostInterestLabels(log.post);
      for (const label of interestLabels) {
        addWeightedDimension(recentClickInterestWeights, label, weight);
        addWeightedDimension(recentBehaviorSummaryWeights, label, weight);
      }
      return;
    }

    if (log.event !== "AD_CLICK") {
      return;
    }

    const breedCode = normalizeBreedCode(log.breedCode);
    if (breedCode && hasBreedLoungeRoute(breedCode)) {
      addWeightedDimension(recentAdBreedWeights, breedCode, weight);
      addWeightedDimension(
        recentBehaviorSummaryWeights,
        getBreedSummaryLabel(breedCode),
        weight,
      );
    }

    const audienceKey = normalizeAudienceKey(log.audienceKey);
    if (audienceKey && audienceKey !== "NONE") {
      addWeightedDimension(recentAdAudienceKeyWeights, audienceKey, weight);
    }
  });

  return {
    recentClickPetTypeWeights,
    recentClickInterestWeights,
    recentAdBreedWeights,
    recentAdAudienceKeyWeights,
    summaryLabels: listTopWeightedDimensions(recentBehaviorSummaryWeights, 3),
  };
}

function buildRecentDwellSignal(
  logs: FeedPersonalizationEventLogLike[],
  policy: FeedPersonalizationPolicy,
) {
  const recentDwellPetTypeWeights: Record<string, number> = {};
  const recentDwellInterestWeights: Record<string, number> = {};
  const recentDwellSummaryWeights: Record<string, number> = {};

  logs.forEach((log, index) => {
    if (log.event !== FeedPersonalizationEvent.POST_DWELL || !log.post) {
      return;
    }

    const weight = getRecencyWeight(index, policy);
    addWeightedDimension(recentDwellPetTypeWeights, log.post.petTypeId, weight);

    const interestLabels = collectPostInterestLabels(log.post);
    for (const label of interestLabels) {
      addWeightedDimension(recentDwellInterestWeights, label, weight);
      addWeightedDimension(recentDwellSummaryWeights, label, weight);
    }
  });

  return {
    recentDwellPetTypeWeights,
    recentDwellInterestWeights,
    summaryLabels: listTopWeightedDimensions(recentDwellSummaryWeights, 3),
  };
}

function buildRecentBookmarkSignal(
  posts: PostInterestLike[],
  policy: FeedPersonalizationPolicy,
) {
  const recentBookmarkPetTypeWeights: Record<string, number> = {};
  const recentBookmarkInterestWeights: Record<string, number> = {};
  const recentBookmarkSummaryWeights: Record<string, number> = {};

  posts.forEach((post, index) => {
    const weight = getRecencyWeight(index, policy);
    addWeightedDimension(recentBookmarkPetTypeWeights, post.petTypeId, weight);

    const interestLabels = collectPostInterestLabels(post);
    for (const label of interestLabels) {
      addWeightedDimension(recentBookmarkInterestWeights, label, weight);
      addWeightedDimension(recentBookmarkSummaryWeights, label, weight);
    }
  });

  return {
    recentBookmarkPetTypeWeights,
    recentBookmarkInterestWeights,
    summaryLabels: listTopWeightedDimensions(recentBookmarkSummaryWeights, 3),
  };
}

function calculatePreferredInterestBoost(
  post: FeedLikePost,
  preferredInterestLabels: string[],
) {
  if (preferredInterestLabels.length === 0) {
    return 0;
  }

  const postInterestLabels = collectPostInterestLabels(post);
  if (postInterestLabels.length === 0) {
    return 0;
  }

  const preferredInterestSet = new Set(preferredInterestLabels);
  let sharedCount = 0;
  for (const label of postInterestLabels) {
    if (preferredInterestSet.has(label)) {
      sharedCount += 1;
    }
  }

  return Math.min(0.09, sharedCount * 0.03);
}

function calculateRecentEngagementBoost(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
) {
  let boost = 0;

  if (post.petTypeId && viewerContext.recentEngagementPetTypeIds.includes(post.petTypeId)) {
    boost += 0.05;
  }
  if (post.petTypeId && viewerContext.recentNegativePetTypeIds.includes(post.petTypeId)) {
    boost -= 0.04;
  }

  const postInterestLabels = collectPostInterestLabels(post);
  if (postInterestLabels.length === 0) {
    return boost;
  }

  const positiveInterests = new Set(viewerContext.recentEngagementInterestLabels);
  const negativeInterests = new Set(viewerContext.recentNegativeInterestLabels);
  let likedCount = 0;
  let dislikedCount = 0;
  for (const label of postInterestLabels) {
    if (positiveInterests.has(label)) {
      likedCount += 1;
    }
    if (negativeInterests.has(label)) {
      dislikedCount += 1;
    }
  }

  boost += Math.min(0.06, likedCount * 0.02);
  boost -= Math.min(0.04, dislikedCount * 0.02);
  return boost;
}

function calculateRecentBehaviorBoost(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
  authorPetByUserId: Map<string, PetSignal[]>,
) {
  let clickBoost = 0;

  if (post.petTypeId) {
    clickBoost += Math.min(
      0.045,
      (viewerContext.recentClickPetTypeWeights[post.petTypeId] ?? 0) * 0.03,
    );
  }

  const postInterestLabels = collectPostInterestLabels(post);
  if (postInterestLabels.length > 0) {
    const clickInterestWeight = postInterestLabels.reduce(
      (total, label) => total + (viewerContext.recentClickInterestWeights[label] ?? 0),
      0,
    );
    clickBoost += Math.min(0.05, clickInterestWeight * 0.015);
  }

  let boost = applySignalCap(
    clickBoost,
    viewerContext.policy.clickSignalMultiplier,
    viewerContext.policy.clickSignalCap,
  );

  const authorPets = authorPetByUserId.get(post.author.id) ?? [];
  if (authorPets.length === 0) {
    return boost;
  }

  let bestBreedWeight = 0;
  let bestAudienceKeyWeight = 0;

  for (const authorPet of authorPets) {
    const authorBreedCode = normalizeBreedCode(authorPet.breedCode);
    if (authorBreedCode && hasBreedLoungeRoute(authorBreedCode)) {
      bestBreedWeight = Math.max(
        bestBreedWeight,
        viewerContext.recentAdBreedWeights[authorBreedCode] ?? 0,
      );
    }

    const fallbackAudienceKey = buildFallbackAudienceKey({
      species: authorPet.species,
      sizeClass: authorPet.sizeClass,
      lifeStage: authorPet.lifeStage,
    });
    if (fallbackAudienceKey) {
      bestAudienceKeyWeight = Math.max(
        bestAudienceKeyWeight,
        viewerContext.recentAdAudienceKeyWeights[fallbackAudienceKey] ?? 0,
      );
    }
  }

  const adBoost =
    Math.min(0.04, bestBreedWeight * 0.028) +
    Math.min(0.025, bestAudienceKeyWeight * 0.02);
  boost += applySignalCap(
    adBoost,
    viewerContext.policy.adSignalMultiplier,
    viewerContext.policy.adSignalCap,
  );
  return boost;
}

function calculateRecentDwellBoost(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
) {
  let baseBoost = 0;

  if (post.petTypeId) {
    baseBoost += Math.min(
      0.06,
      (viewerContext.recentDwellPetTypeWeights[post.petTypeId] ?? 0) * 0.038,
    );
  }

  const postInterestLabels = collectPostInterestLabels(post);
  if (postInterestLabels.length === 0) {
    return applySignalCap(
      baseBoost,
      viewerContext.policy.dwellSignalMultiplier,
      viewerContext.policy.dwellSignalCap,
    );
  }

  const dwellInterestWeight = postInterestLabels.reduce(
    (total, label) => total + (viewerContext.recentDwellInterestWeights[label] ?? 0),
    0,
  );
  baseBoost += Math.min(0.07, dwellInterestWeight * 0.022);
  return applySignalCap(
    baseBoost,
    viewerContext.policy.dwellSignalMultiplier,
    viewerContext.policy.dwellSignalCap,
  );
}

function calculateRecentBookmarkBoost(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
) {
  let baseBoost = 0;

  if (post.petTypeId) {
    baseBoost += Math.min(
      0.07,
      (viewerContext.recentBookmarkPetTypeWeights[post.petTypeId] ?? 0) * 0.042,
    );
  }

  const postInterestLabels = collectPostInterestLabels(post);
  if (postInterestLabels.length === 0) {
    return applySignalCap(
      baseBoost,
      viewerContext.policy.bookmarkSignalMultiplier,
      viewerContext.policy.bookmarkSignalCap,
    );
  }

  const bookmarkInterestWeight = postInterestLabels.reduce(
    (total, label) => total + (viewerContext.recentBookmarkInterestWeights[label] ?? 0),
    0,
  );
  baseBoost += Math.min(0.08, bookmarkInterestWeight * 0.024);
  return applySignalCap(
    baseBoost,
    viewerContext.policy.bookmarkSignalMultiplier,
    viewerContext.policy.bookmarkSignalCap,
  );
}

function calculateViewerPersonalizationBoost(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
  authorPetByUserId: Map<string, PetSignal[]>,
) {
  const petBoost = calculatePersonalizationBoost(
    authorPetByUserId.get(post.author.id) ?? [],
    viewerContext.petSignals,
  );
  const preferredPetTypeBoost = calculatePreferredPetTypeBoost(
    post.petTypeId,
    viewerContext.preferredPetTypeIds,
  );
  const preferredInterestBoost = calculatePreferredInterestBoost(
    post,
    viewerContext.preferredInterestLabels,
  );
  const recentEngagementBoost = calculateRecentEngagementBoost(post, viewerContext);
  const recentBehaviorBoost = calculateRecentBehaviorBoost(
    post,
    viewerContext,
    authorPetByUserId,
  );
  const recentDwellBoost = calculateRecentDwellBoost(post, viewerContext);
  const recentBookmarkBoost = calculateRecentBookmarkBoost(post, viewerContext);

  return (
    petBoost +
    preferredPetTypeBoost +
    preferredInterestBoost +
    recentEngagementBoost +
    recentBehaviorBoost +
    recentDwellBoost +
    recentBookmarkBoost
  );
}

function calculateFeedScore(
  post: FeedLikePost,
  viewerContext: ViewerPersonalizationContext,
  authorPetByUserId: Map<string, PetSignal[]>,
) {
  const ageHours = Math.max(1, (Date.now() - post.createdAt.getTime()) / 3_600_000);
  const recency = 1 / Math.sqrt(ageHours);
  const engagement =
    Math.log1p(post.likeCount * 2 + post.commentCount * 1.6 + post.viewCount * 0.15) / 6;
  const personalization = calculateViewerPersonalizationBoost(
    post,
    viewerContext,
    authorPetByUserId,
  );

  return recency * 0.5 + engagement * 0.35 + personalization;
}

function interleaveForDiversity<T>(personalized: T[], explore: T[], personalizedRatio: number) {
  const total = personalized.length + explore.length;
  if (total === 0) {
    return [] as T[];
  }

  const targetPersonalized = Math.max(
    0,
    Math.min(personalized.length, Math.ceil(total * personalizedRatio)),
  );
  const targetExplore = Math.max(0, total - targetPersonalized);

  const selectedPersonalized = personalized.slice(0, targetPersonalized);
  const selectedExplore = explore.slice(0, targetExplore);
  const result: T[] = [];

  let pIndex = 0;
  let eIndex = 0;
  while (result.length < total && (pIndex < selectedPersonalized.length || eIndex < selectedExplore.length)) {
    const personalizedShare = result.length === 0 ? 0 : pIndex / result.length;
    const shouldPickPersonalized =
      pIndex < selectedPersonalized.length &&
      (eIndex >= selectedExplore.length || personalizedShare < personalizedRatio);

    if (shouldPickPersonalized) {
      result.push(selectedPersonalized[pIndex]);
      pIndex += 1;
      continue;
    }

    if (eIndex < selectedExplore.length) {
      result.push(selectedExplore[eIndex]);
      eIndex += 1;
      continue;
    }

    if (pIndex < selectedPersonalized.length) {
      result.push(selectedPersonalized[pIndex]);
      pIndex += 1;
    }
  }

  if (result.length < total) {
    result.push(...personalized.slice(pIndex), ...explore.slice(eIndex));
  }

  return result.slice(0, total);
}

function mapToPetSignal(signal: {
  userId: string;
  species: string;
  breedCode: string | null;
  breedLabel?: string | null;
  sizeClass: string | null;
  lifeStage?: string | null;
}) {
  return {
    userId: signal.userId,
    species: String(signal.species),
    breedCode: normalizeBreedCode(signal.breedCode),
    breedLabel: normalizeBreedLabel(signal.breedLabel),
    sizeClass: signal.sizeClass ? String(signal.sizeClass) : "UNKNOWN",
    lifeStage: signal.lifeStage ? String(signal.lifeStage) : "UNKNOWN",
  } satisfies PetSignal;
}

function isMissingAudienceSegmentSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return (
      tableName.includes("UserAudienceSegment") ||
      columnName.includes("UserAudienceSegment")
    );
  }

  return (
    error instanceof Error &&
    error.message.includes("UserAudienceSegment") &&
    (error.message.includes("does not exist") ||
      error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
}

async function listViewerPetSignals(viewerId: string) {
  const viewerAudienceSignalsRaw = await prisma.userAudienceSegment
    .findMany({
      where: { userId: viewerId },
      select: {
        userId: true,
        species: true,
        breedCode: true,
        interestTags: true,
        sizeClass: true,
        lifeStage: true,
      },
      orderBy: [{ confidenceScore: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
    })
    .catch((error) => {
      if (!isMissingAudienceSegmentSchemaError(error)) {
        throw error;
      }
      return [];
    });

  if (viewerAudienceSignalsRaw.length > 0) {
    return viewerAudienceSignalsRaw.map((signal) =>
      mapToPetSignal({
        userId: signal.userId,
        species: String(signal.species),
        breedCode: signal.breedCode,
        breedLabel: extractAudienceSegmentBreedLabel(
          Array.isArray(signal.interestTags) ? signal.interestTags : [],
        ),
        sizeClass: signal.sizeClass ? String(signal.sizeClass) : null,
        lifeStage: signal.lifeStage ? String(signal.lifeStage) : null,
      }),
    );
  }

  const viewerPetsRaw = await prisma.pet.findMany({
    where: { userId: viewerId },
    select: {
      userId: true,
      species: true,
      breedCode: true,
      breedLabel: true,
      sizeClass: true,
      lifeStage: true,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return viewerPetsRaw.map((pet) =>
    mapToPetSignal({
      userId: pet.userId,
      species: String(pet.species),
      breedCode: pet.breedCode,
      breedLabel: pet.breedLabel,
      sizeClass: String(pet.sizeClass),
      lifeStage: String(pet.lifeStage),
    }),
  );
}

export async function listViewerRecentEngagementSummaryLabels(viewerId: string) {
  if (!supportsPostReactionsField()) {
    return [];
  }

  const recentReactions = await prisma.postReaction
    .findMany({
      where: {
        userId: viewerId,
        type: "LIKE",
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        post: {
          select: {
            petTypeId: true,
            type: true,
            reviewCategory: true,
            animalTags: true,
            petType: {
              select: {
                tags: true,
              },
            },
          },
        },
      },
    })
    .catch((error) => {
      if (
        isMissingPostReactionTableError(error) ||
        isUnavailableReactionsIncludeError(error) ||
        isMissingCommunityBoardSchemaError(error) ||
        isMissingReviewCategoryColumnError(error)
      ) {
        return [];
      }
      throw error;
    });

  return dedupeInterestLabels(
    recentReactions.flatMap((reaction) => collectPostInterestLabels(reaction.post)),
  ).slice(0, 3);
}

async function listViewerRecentBehaviorEvents(
  viewerId: string,
  take = 16,
): Promise<FeedPersonalizationEventLogLike[]> {
  if (!supportsFeedPersonalizationEventLogField()) {
    return [];
  }

  const delegate = (
    prisma as typeof prisma & {
      feedPersonalizationEventLog?: {
        findMany: (typeof prisma.feedPersonalizationEventLog)["findMany"];
      };
    }
  ).feedPersonalizationEventLog;

  if (!delegate) {
    return [];
  }

  return delegate
    .findMany({
      where: {
        userId: viewerId,
        event: { in: ["POST_CLICK", "AD_CLICK"] },
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        event: true,
        audienceKey: true,
        breedCode: true,
        post: {
          select: {
            petTypeId: true,
            type: true,
            reviewCategory: true,
            animalTags: true,
            petType: {
              select: {
                tags: true,
              },
            },
          },
        },
      },
    })
    .catch((error) => {
      if (
        isMissingFeedPersonalizationEventLogSchemaError(error) ||
        isMissingCommunityBoardSchemaError(error) ||
        isMissingReviewCategoryColumnError(error)
      ) {
        return [];
      }
      throw error;
    });
}

export async function listViewerRecentBehaviorSummaryLabels(viewerId: string) {
  const recentBehaviorEvents = await listViewerRecentBehaviorEvents(viewerId, 12);
  const policy = await getFeedPersonalizationPolicy();
  return buildRecentBehaviorSignal(recentBehaviorEvents, policy).summaryLabels;
}

async function listViewerRecentDwellEvents(
  viewerId: string,
  take = 12,
): Promise<FeedPersonalizationEventLogLike[]> {
  if (!supportsFeedPersonalizationEventLogField()) {
    return [];
  }

  const delegate = (
    prisma as typeof prisma & {
      feedPersonalizationEventLog?: {
        findMany: (typeof prisma.feedPersonalizationEventLog)["findMany"];
      };
    }
  ).feedPersonalizationEventLog;

  if (!delegate) {
    return [];
  }

  return delegate
    .findMany({
      where: {
        userId: viewerId,
        event: FeedPersonalizationEvent.POST_DWELL,
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        event: true,
        audienceKey: true,
        breedCode: true,
        post: {
          select: {
            petTypeId: true,
            type: true,
            reviewCategory: true,
            animalTags: true,
            petType: {
              select: {
                tags: true,
              },
            },
          },
        },
      },
    })
    .catch((error) => {
      if (
        isMissingFeedPersonalizationEventLogSchemaError(error) ||
        isMissingCommunityBoardSchemaError(error) ||
        isMissingReviewCategoryColumnError(error)
      ) {
        return [];
      }
      throw error;
    });
}

export async function listViewerRecentDwellSummaryLabels(viewerId: string) {
  const recentDwellEvents = await listViewerRecentDwellEvents(viewerId, 12);
  const policy = await getFeedPersonalizationPolicy();
  return buildRecentDwellSignal(recentDwellEvents, policy).summaryLabels;
}

async function listViewerRecentBookmarkedPosts(
  viewerId: string,
  take = 12,
): Promise<PostInterestLike[]> {
  if (!supportsPostBookmarksField()) {
    return [];
  }

  const delegate = (
    prisma as typeof prisma & {
      postBookmark?: {
        findMany: (typeof prisma.postBookmark)["findMany"];
      };
    }
  ).postBookmark;

  if (!delegate) {
    return [];
  }

  return delegate
    .findMany({
      where: {
        userId: viewerId,
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        post: {
          select: {
            petTypeId: true,
            type: true,
            reviewCategory: true,
            animalTags: true,
            petType: {
              select: {
                tags: true,
              },
            },
          },
        },
      },
    })
    .then((bookmarks) =>
      bookmarks.flatMap((bookmark) =>
        bookmark.post ? [bookmark.post as PostInterestLike] : [],
      ),
    )
    .catch((error) => {
      if (
        isMissingPostBookmarkTableError(error) ||
        isMissingCommunityBoardSchemaError(error) ||
        isMissingReviewCategoryColumnError(error)
      ) {
        return [];
      }
      throw error;
    });
}

export async function listViewerRecentBookmarkSummaryLabels(viewerId: string) {
  const recentBookmarks = await listViewerRecentBookmarkedPosts(viewerId, 12);
  const policy = await getFeedPersonalizationPolicy();
  return buildRecentBookmarkSignal(recentBookmarks, policy).summaryLabels;
}

async function listViewerPersonalizationContext(
  viewerId: string,
): Promise<ViewerPersonalizationContext> {
  const [policy, petSignals, preferredPetTypeIds, recentBehaviorEvents, recentDwellEvents, recentBookmarks] =
    await Promise.all([
      getFeedPersonalizationPolicy(),
      listViewerPetSignals(viewerId),
      listPreferredPetTypeIdsByUserId(viewerId),
      listViewerRecentBehaviorEvents(viewerId, 20),
      listViewerRecentDwellEvents(viewerId, 20),
      listViewerRecentBookmarkedPosts(viewerId, 20),
    ]);
  const normalizedPreferredPetTypeIds = Array.from(
    new Set(
      preferredPetTypeIds.filter(
        (petTypeId): petTypeId is string =>
          typeof petTypeId === "string" && petTypeId.length > 0,
      ),
    ),
  );
  const preferredCommunities =
    normalizedPreferredPetTypeIds.length > 0
      ? await prisma.community
          .findMany({
            where: {
              id: { in: normalizedPreferredPetTypeIds },
              isActive: true,
            },
            select: {
              tags: true,
            },
          })
          .catch((error) => {
            if (isMissingCommunityBoardSchemaError(error)) {
              return [];
            }
            throw error;
          })
      : [];
  const recentReactions = supportsPostReactionsField()
    ? await prisma.postReaction
        .findMany({
          where: { userId: viewerId },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            type: true,
            post: {
              select: {
                petTypeId: true,
                type: true,
                reviewCategory: true,
                animalTags: true,
                petType: {
                  select: {
                    tags: true,
                  },
                },
              },
            },
          },
        })
        .catch((error) => {
          if (
            isMissingPostReactionTableError(error) ||
            isUnavailableReactionsIncludeError(error) ||
            isMissingCommunityBoardSchemaError(error) ||
            isMissingReviewCategoryColumnError(error)
          ) {
            return [];
          }
          throw error;
        })
    : [];
  const positiveReactions = recentReactions.filter((reaction) => reaction.type === "LIKE");
  const negativeReactions = recentReactions.filter((reaction) => reaction.type === "DISLIKE");
  const recentBehaviorSignal = buildRecentBehaviorSignal(recentBehaviorEvents, policy);
  const recentDwellSignal = buildRecentDwellSignal(recentDwellEvents, policy);
  const recentBookmarkSignal = buildRecentBookmarkSignal(recentBookmarks, policy);

  return {
    policy,
    petSignals,
    preferredPetTypeIds: normalizedPreferredPetTypeIds,
    preferredInterestLabels: dedupeInterestLabels(
      preferredCommunities.flatMap((community) =>
        community.tags.map((tag) => normalizeInterestLabel(tag)),
      ),
    ),
    recentEngagementPetTypeIds: dedupeInterestLabels(
      positiveReactions.map((reaction) => reaction.post.petTypeId),
    ),
    recentNegativePetTypeIds: dedupeInterestLabels(
      negativeReactions.map((reaction) => reaction.post.petTypeId),
    ),
    recentEngagementInterestLabels: dedupeInterestLabels(
      positiveReactions.flatMap((reaction) => collectPostInterestLabels(reaction.post)),
    ),
    recentNegativeInterestLabels: dedupeInterestLabels(
      negativeReactions.flatMap((reaction) => collectPostInterestLabels(reaction.post)),
    ),
    recentClickPetTypeWeights: recentBehaviorSignal.recentClickPetTypeWeights,
    recentClickInterestWeights: recentBehaviorSignal.recentClickInterestWeights,
    recentAdBreedWeights: recentBehaviorSignal.recentAdBreedWeights,
    recentAdAudienceKeyWeights: recentBehaviorSignal.recentAdAudienceKeyWeights,
    recentDwellPetTypeWeights: recentDwellSignal.recentDwellPetTypeWeights,
    recentDwellInterestWeights: recentDwellSignal.recentDwellInterestWeights,
    recentBookmarkPetTypeWeights: recentBookmarkSignal.recentBookmarkPetTypeWeights,
    recentBookmarkInterestWeights: recentBookmarkSignal.recentBookmarkInterestWeights,
  };
}

async function applyPetPersonalization<T extends FeedLikePost>(
  items: T[],
  viewerId: string,
) {
  if (items.length < 2) {
    return items;
  }

  const viewerContext = await listViewerPersonalizationContext(viewerId);
  if (
    viewerContext.petSignals.length === 0 &&
    viewerContext.preferredPetTypeIds.length === 0 &&
    viewerContext.preferredInterestLabels.length === 0 &&
    viewerContext.recentEngagementPetTypeIds.length === 0 &&
    viewerContext.recentNegativePetTypeIds.length === 0 &&
    viewerContext.recentEngagementInterestLabels.length === 0 &&
    viewerContext.recentNegativeInterestLabels.length === 0 &&
    Object.keys(viewerContext.recentClickPetTypeWeights).length === 0 &&
    Object.keys(viewerContext.recentClickInterestWeights).length === 0 &&
    Object.keys(viewerContext.recentAdBreedWeights).length === 0 &&
    Object.keys(viewerContext.recentAdAudienceKeyWeights).length === 0 &&
    Object.keys(viewerContext.recentDwellPetTypeWeights).length === 0 &&
    Object.keys(viewerContext.recentDwellInterestWeights).length === 0 &&
    Object.keys(viewerContext.recentBookmarkPetTypeWeights).length === 0 &&
    Object.keys(viewerContext.recentBookmarkInterestWeights).length === 0
  ) {
    return items;
  }

  const authorPetByUserId = new Map<string, PetSignal[]>();
  if (
    viewerContext.petSignals.length > 0 ||
    Object.keys(viewerContext.recentAdBreedWeights).length > 0 ||
    Object.keys(viewerContext.recentAdAudienceKeyWeights).length > 0
  ) {
    const authorIds = Array.from(new Set(items.map((item) => item.author.id)));
    if (authorIds.length > 0) {
      const authorPetSignalsRaw = await prisma.pet.findMany({
        where: {
          userId: { in: authorIds },
        },
        select: {
          userId: true,
          species: true,
          breedCode: true,
          breedLabel: true,
          sizeClass: true,
          lifeStage: true,
        },
      });
      const authorPetSignals: PetSignal[] = authorPetSignalsRaw.map((pet) =>
        mapToPetSignal({
          userId: pet.userId,
          species: String(pet.species),
          breedCode: pet.breedCode,
          breedLabel: pet.breedLabel,
          sizeClass: String(pet.sizeClass),
          lifeStage: String(pet.lifeStage),
        }),
      );

      for (const pet of authorPetSignals) {
        const list = authorPetByUserId.get(pet.userId);
        if (list) {
          list.push(pet);
          continue;
        }
        authorPetByUserId.set(pet.userId, [pet]);
      }
    }
  }

  const scored = items
    .map((item) => {
      const boost = calculateViewerPersonalizationBoost(
        item,
        viewerContext,
        authorPetByUserId,
      );

      return {
        item,
        boost,
        score: calculateFeedScore(item, viewerContext, authorPetByUserId),
      };
    })
    .sort((a, b) => b.score - a.score);

  const personalized = scored
    .filter((entry) => entry.boost > viewerContext.policy.personalizedThreshold)
    .map((entry) => entry.item);
  const personalizedSet = new Set(personalized.map((item) => item.id));
  const explore = scored
    .filter((entry) => !personalizedSet.has(entry.item.id))
    .map((entry) => entry.item);

  return interleaveForDiversity(personalized, explore, viewerContext.policy.personalizedRatio);
}

export async function getPostById(id?: string, viewerId?: string) {
  if (!id) {
    return null;
  }
  const shouldCache = !viewerId;
  const runGetPost = async () => {
    const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
    const visibilityFilter: Prisma.PostWhereInput = {
      ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
      author: buildVisibleAuthorFilter(),
    };

    return fetchPostDetailWithFallback({
      id,
      visibilityFilter,
      viewerId,
      includeReactions: supportsPostReactionsField(),
      includeGuestAuthor: supportsPostGuestAuthorField(),
      handlers: postDetailFetchFallbackHandlers,
    });
  };

  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("post-detail", { id });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 30,
      fetcher: runGetPost,
      cacheNull: false,
    });
  }

  return runGetPost();
}

export async function getPostMetadataById(id?: string, viewerId?: string) {
  return getPostDetailWidgetById({
    id,
    viewerId,
    mode: "meta",
    ttlSeconds: 30,
    select: {
      id: true,
      type: true,
      scope: true,
      status: true,
      title: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      images: {
        select: { url: true },
        orderBy: { order: "asc" },
        take: 1,
      },
    },
  });
}

export async function getPostStatsById(id?: string, viewerId?: string) {
  return getPostDetailWidgetById({
    id,
    viewerId,
    mode: "stats",
    ttlSeconds: 60,
    select: {
      id: true,
      authorId: true,
      type: true,
      scope: true,
      status: true,
      neighborhoodId: true,
      likeCount: true,
      dislikeCount: true,
      commentCount: true,
      viewCount: true,
    },
  });
}

export async function getPostReadAccessById(id?: string, viewerId?: string) {
  return getPostDetailWidgetById({
    id,
    viewerId,
    mode: "read-access",
    ttlSeconds: 60,
    select: {
      id: true,
      type: true,
      scope: true,
      status: true,
      neighborhoodId: true,
    },
  });
}

export async function getPostContentById(id?: string, viewerId?: string) {
  return getPostDetailWidgetById({
    id,
    viewerId,
    mode: "content",
    ttlSeconds: 60,
    select: {
      id: true,
      type: true,
      scope: true,
      status: true,
      content: true,
    },
  });
}

function getPostListQueryDependencies() {
  return {
    noViewerId: NO_VIEWER_ID,
    postListFetchFallbackHandlers,
    supportsPostGuestAuthorField,
    supportsPostReviewCategoryField,
    countPostRowsWithSchemaFallback,
    applyPetPersonalization,
  };
}

export async function listPosts(options: PostListOptions) {
  return listPostsWithDependencies(options, getPostListQueryDependencies());
}

export async function listBestPosts(options: BestPostListOptions) {
  return listBestPostsWithDependencies(options, getPostListQueryDependencies());
}

export async function countPosts(options: PostCountOptions) {
  return countPostsWithDependencies(options, getPostListQueryDependencies());
}

export async function countBestPosts(options: BestPostCountOptions) {
  return countBestPostsWithDependencies(options, getPostListQueryDependencies());
}

type RankedPostSearchOptions = {
  limit: number;
  type?: PostType;
  scope: PostScope;
  q?: string;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
};

export async function listRankedSearchPosts({
  limit,
  type,
  scope,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  viewerId,
}: RankedPostSearchOptions) {
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const trimmedQuery = q?.trim();
  if (!trimmedQuery) {
    return [];
  }

  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return [];
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const includeStructuredSearch = resolvedSearchIn === "ALL";
  const shouldTryDocumentFallback = shouldTryPostSearchDocumentFallback(trimmedQuery);
  const likePattern = `%${trimmedQuery}%`;
  const compactQuery = trimmedQuery.replace(/\s+/g, "");
  const compactPattern = `%${compactQuery}%`;
  const useTrigram = await supportsPgTrgm();
  const structuredSearchVariants = includeStructuredSearch
    ? buildStructuredSearchSqlVariants(trimmedQuery)
    : [];
  const searchMatchSql = buildRankedSearchMatchSql(
    resolvedSearchIn,
    trimmedQuery,
    likePattern,
    compactPattern,
    useTrigram,
    structuredSearchVariants,
  );
  const whereSql = buildRankedSearchWhereSql({
    scope,
    type,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
    searchSql: searchMatchSql,
  });
  const candidateLimit = resolveRankedSearchCandidateLimit({
    query: trimmedQuery,
    safeLimit,
  });
  const includeViewerReactions = Boolean(viewerId);
  const hydratePostsByIds = (candidateIds: string[]) =>
    hydrateRankedSearchPostsByIds({
      candidateIds,
      hiddenAuthorIds,
      safeLimit,
      includeViewerReactions,
      viewerId,
      includeGuestAuthor: supportsPostGuestAuthorField(),
      noViewerId: NO_VIEWER_ID,
      isUnknownGuestAuthorIncludeError,
    });
  const runRankedSearch = async () => {
    const candidates = await prisma.$queryRaw<RankedSearchRow[]>(
      buildRankedSearchCandidateSql({
        whereSql,
        query: trimmedQuery,
        likePattern,
        compactPattern,
        useTrigram,
        includeStructuredSearch,
        structuredSearchVariants,
        candidateLimit,
      }),
    );

    const candidateIds = Array.from(
      new Set(
        candidates
          .map((item) => item.id)
          .filter((value): value is string => typeof value === "string"),
      ),
    );
    return hydratePostsByIds(candidateIds);
  };

  const runSearchDocumentFallback = async () => {
    const candidateIds = await listRankedSearchDocumentFallbackCandidateIds({
      type,
      excludeTypes: normalizedExcludeTypes,
      scope,
      neighborhoodId,
      hiddenAuthorIds,
      query: trimmedQuery,
      searchIn: resolvedSearchIn,
      safeLimit,
    });

    return hydratePostsByIds(candidateIds);
  };

  const runSearch = async () => {
    const rankedItems = await runRankedSearch();
    if (rankedItems.length > 0 || !shouldTryDocumentFallback) {
      return rankedItems;
    }

    return runSearchDocumentFallback();
  };

  return runRankedSearchWithCache({
    scope,
    type,
    query: trimmedQuery,
    searchIn: resolvedSearchIn,
    excludeTypes: normalizedExcludeTypes,
    limit: safeLimit,
    neighborhoodId,
    viewerId,
    hiddenAuthorIds,
    hasDocumentFallback: shouldTryDocumentFallback,
    runSearch,
    runFallbackSearch: async () => {
      const fallback = await listPosts({
        limit: Math.min(Math.max(safeLimit * 3, safeLimit), 80),
        type,
        scope,
        q: trimmedQuery,
        searchIn: resolvedSearchIn,
        excludeTypes: normalizedExcludeTypes,
        neighborhoodId,
        viewerId,
      });
      return fallback.items.slice(0, safeLimit);
    },
  });
}
