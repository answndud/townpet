import {
  GuestViolationCategory,
  ModerationActionType,
  ModerationTargetType,
  PostScope,
  PostStatus,
  PostType,
  UserRole,
} from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

import {
  isAnimalTagsRequiredCommonBoardPostType,
  resolveBoardByPostType,
} from "@/lib/community-board";
import { moderateContactContent, detectContactSignals } from "@/lib/contact-policy";
import { findMatchedForbiddenKeywords } from "@/lib/forbidden-keyword-policy";
import { buildGuestIpMeta } from "@/lib/guest-ip-display";
import { isGuestPostTypeBlocked, isGuestScopeAllowed } from "@/lib/guest-post-policy";
import { buildPostStructuredSearchText } from "@/lib/post-structured-search";
import { isAdminOnlyPostType, isFreeBoardPostType } from "@/lib/post-type-groups";
import {
  evaluateAdminOnlyPostWritePolicy,
  evaluateNewUserPostWritePolicy,
} from "@/lib/post-write-policy";
import { prisma } from "@/lib/prisma";
import {
  normalizeAdoptionListingFields,
  normalizeHospitalReviewFields,
  normalizeVolunteerRecruitmentFields,
} from "@/lib/structured-field-normalization";
import {
  type AdoptionListingInput,
  type CareRequestInput,
  type HospitalReviewInput,
  type MarketListingInput,
  type VolunteerRecruitmentInput,
  adoptionListingSchema,
  careRequestSchema,
  hospitalReviewSchema,
  marketListingSchema,
  placeReviewSchema,
  postCreateSchema,
  volunteerRecruitmentSchema,
  walkRouteSchema,
} from "@/lib/validations/post";
import { buildHospitalReviewRiskSignals } from "@/server/hospital-review-risk";
import { recordModerationAction } from "@/server/moderation-action-log";
import {
  getForbiddenKeywords,
  getGuestPostPolicy,
  getNewUserSafetyPolicy,
} from "@/server/queries/policy.queries";
import { getOrCreateGuestSystemUserId } from "@/server/services/guest-author.service";
import {
  assertGuestNotBanned,
  hashGuestIdentity,
  registerGuestViolation,
} from "@/server/services/guest-safety.service";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";
import {
  buildImageCreateInput,
  finalizeUploadUrlChanges,
  normalizeImageUrls,
  notifyPostCacheChange,
} from "./post-write-support";

type CreatePostParams = {
  authorId?: string;
  input: unknown;
  guestIdentity?: {
    ip: string;
    fingerprint?: string;
    userAgent?: string;
  };
};

const GUEST_LINK_PATTERN = /https?:\/\/[\S]+/i;
const GUEST_IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*\]\(([^)\s]+)\)(?:\{\s*width\s*=\s*\d{1,4}\s*\})?/gi;

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

const HOSPITAL_REVIEW_TEXT_FIELDS = ["hospitalName", "treatmentType"] as const;
const ADOPTION_LISTING_TEXT_FIELDS = [
  "shelterName",
  "region",
  "animalType",
  "breed",
  "ageLabel",
  "sizeLabel",
] as const;
const VOLUNTEER_RECRUITMENT_TEXT_FIELDS = [
  "shelterName",
  "region",
  "volunteerType",
] as const;
const MARKET_LISTING_TEXT_FIELDS = ["rentalPeriod"] as const;
const CARE_REQUEST_TEXT_FIELDS = ["locationNote", "petNote", "requirements"] as const;

const normalizeAnimalTags = (animalTags: string[] | undefined) =>
  Array.from(
    new Set(
      (animalTags ?? [])
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  ).slice(0, 5);

function buildModerationText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0)
    .join("\n");
}

function moderateHospitalReviewStructuredFields(params: {
  review: HospitalReviewInput;
  role: UserRole;
  accountCreatedAt: Date;
  blockWindowHours: number;
}) {
  const moderatedReview = { ...params.review };

  for (const field of HOSPITAL_REVIEW_TEXT_FIELDS) {
    const rawValue = moderatedReview[field];
    if (!rawValue) {
      continue;
    }

    const contactPolicy = moderateContactContent({
      text: rawValue,
      role: params.role,
      accountCreatedAt: params.accountCreatedAt,
      blockWindowHours: params.blockWindowHours,
    });
    if (contactPolicy.blocked) {
      throw new ServiceError(
        contactPolicy.message ?? "연락처가 포함된 내용은 현재 계정으로 작성할 수 없습니다.",
        "CONTACT_RESTRICTED_FOR_NEW_USER",
        403,
      );
    }

    moderatedReview[field] = contactPolicy.sanitizedText;
  }

  return moderatedReview;
}

function moderateStructuredTextFields<
  T extends Record<string, unknown>,
  K extends keyof T & string,
>(params: {
  data: T;
  fields: readonly K[];
  role: UserRole;
  accountCreatedAt: Date;
  blockWindowHours: number;
}) {
  const moderatedData = { ...params.data };

  for (const field of params.fields) {
    const rawValue = moderatedData[field];
    if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
      continue;
    }

    const contactPolicy = moderateContactContent({
      text: rawValue,
      role: params.role,
      accountCreatedAt: params.accountCreatedAt,
      blockWindowHours: params.blockWindowHours,
    });
    if (contactPolicy.blocked) {
      throw new ServiceError(
        contactPolicy.message ?? "연락처가 포함된 내용은 현재 계정으로 작성할 수 없습니다.",
        "CONTACT_RESTRICTED_FOR_NEW_USER",
        403,
      );
    }

    moderatedData[field] = contactPolicy.sanitizedText as T[K];
  }

  return moderatedData;
}

function stripImageTokensForGuestPolicy(value: string) {
  return value.replace(GUEST_IMAGE_MARKDOWN_PATTERN, " ").replace(/\s+/g, " ").trim();
}

function hashGuestPassword(rawPassword: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(rawPassword, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

export async function createPost({ authorId, input, guestIdentity }: CreatePostParams) {
  const parsed = postCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const {
    imageUrls,
    petTypeId,
    animalTags,
    guestDisplayName,
    guestPassword,
    marketListing,
    careRequest,
    ...postData
  } = parsed.data;
  const normalizedImageUrls = normalizeImageUrls(imageUrls);
  const normalizedAnimalTags = normalizeAnimalTags(animalTags);
  const mappedBoard = resolveBoardByPostType(postData.type);
  const effectiveScope =
    postData.type === PostType.HOSPITAL_REVIEW ||
    postData.type === PostType.ADOPTION_LISTING ||
    postData.type === PostType.SHELTER_VOLUNTEER
      ? PostScope.GLOBAL
      : postData.type === PostType.MEETUP || postData.type === PostType.CARE_REQUEST
      ? PostScope.LOCAL
      : postData.scope;
  const rawInput = input as Record<string, unknown>;
  let hospitalReviewInput: HospitalReviewInput | null = null;
  let adoptionListingInput: AdoptionListingInput | null = null;
  let volunteerRecruitmentInput: VolunteerRecruitmentInput | null = null;
  let marketListingInput: MarketListingInput | null = null;
  let careRequestInput: CareRequestInput | null = null;
  if (postData.type === PostType.HOSPITAL_REVIEW) {
    const reviewInput = hospitalReviewSchema.safeParse(rawInput.hospitalReview ?? {});
    if (!reviewInput.success) {
      throw new ServiceError("병원 리뷰 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    hospitalReviewInput = reviewInput.data;
  }
  if (postData.type === PostType.ADOPTION_LISTING) {
    const listingInput = adoptionListingSchema.safeParse(rawInput.adoptionListing ?? {});
    if (!listingInput.success) {
      throw new ServiceError("입양 게시글 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    adoptionListingInput = listingInput.data;
  }
  if (postData.type === PostType.SHELTER_VOLUNTEER) {
    const recruitmentInput = volunteerRecruitmentSchema.safeParse(
      rawInput.volunteerRecruitment ?? {},
    );
    if (!recruitmentInput.success) {
      throw new ServiceError("봉사 모집 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    volunteerRecruitmentInput = recruitmentInput.data;
  }
  if (postData.type === PostType.MARKET_LISTING) {
    const listingInput = marketListingSchema.safeParse(rawInput.marketListing ?? marketListing);
    if (!listingInput.success) {
      throw new ServiceError("거래 글 입력값이 올바르지 않습니다.", "INVALID_MARKET_LISTING", 400);
    }

    marketListingInput = listingInput.data;
  }
  if (postData.type === PostType.CARE_REQUEST) {
    const requestInput = careRequestSchema.safeParse(rawInput.careRequest ?? careRequest);
    if (!requestInput.success) {
      throw new ServiceError("돌봄 요청 입력값이 올바르지 않습니다.", "INVALID_CARE_REQUEST", 400);
    }

    careRequestInput = requestInput.data;
  }
  if (hospitalReviewInput) {
    hospitalReviewInput = normalizeHospitalReviewFields(hospitalReviewInput);
  }
  if (adoptionListingInput) {
    adoptionListingInput = normalizeAdoptionListingFields(adoptionListingInput);
  }
  if (volunteerRecruitmentInput) {
    volunteerRecruitmentInput = normalizeVolunteerRecruitmentFields(volunteerRecruitmentInput);
  }
  const [forbiddenKeywords, newUserSafetyPolicy, guestPostPolicy] = await Promise.all([
    getForbiddenKeywords(),
    getNewUserSafetyPolicy(),
    getGuestPostPolicy(),
  ]);
  const matchedForbiddenKeywords = findMatchedForbiddenKeywords(
    buildModerationText([
      postData.title,
      postData.content,
      hospitalReviewInput?.hospitalName,
      hospitalReviewInput?.treatmentType,
      adoptionListingInput?.shelterName,
      adoptionListingInput?.region,
      adoptionListingInput?.animalType,
      adoptionListingInput?.breed,
      adoptionListingInput?.ageLabel,
      adoptionListingInput?.sizeLabel,
      volunteerRecruitmentInput?.shelterName,
      volunteerRecruitmentInput?.region,
      volunteerRecruitmentInput?.volunteerType,
      marketListingInput?.rentalPeriod,
      careRequestInput?.locationNote,
      careRequestInput?.petNote,
      careRequestInput?.requirements,
    ]),
    forbiddenKeywords,
  );
  if (matchedForbiddenKeywords.length > 0) {
    if (guestIdentity) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.POLICY,
        reason: "금칙어 반복 위반",
        source: "post-forbidden-keyword",
        policy: guestPostPolicy,
      });
    }
    throw new ServiceError(
      `금칙어가 포함되어 게시글을 저장할 수 없습니다. (${matchedForbiddenKeywords
        .slice(0, 3)
        .join(", ")})`,
      "FORBIDDEN_KEYWORD_DETECTED",
      400,
    );
  }

  let resolvedAuthorId: string;
  let resolvedAuthorAccountCreatedAt: Date | null = null;
  let guestCreateMeta:
    | {
        guestAuthorId: string;
      }
    | undefined;

  if (authorId) {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, role: true, createdAt: true },
    });
    if (!author) {
      throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
    }

    await assertUserInteractionAllowed(author.id);

    const writePolicy = evaluateNewUserPostWritePolicy({
      role: author.role,
      accountCreatedAt: author.createdAt,
      postType: postData.type,
      minAccountAgeHours: newUserSafetyPolicy.minAccountAgeHours,
      restrictedTypes: newUserSafetyPolicy.restrictedPostTypes,
    });
    if (!writePolicy.allowed) {
      throw new ServiceError(
        writePolicy.message ?? "현재 계정으로는 이 카테고리 글을 작성할 수 없습니다.",
        "NEW_USER_RESTRICTED_TYPE",
        403,
      );
    }

    const adminOnlyWritePolicy = evaluateAdminOnlyPostWritePolicy({
      role: author.role,
      postType: postData.type,
    });
    if (!adminOnlyWritePolicy.allowed) {
      throw new ServiceError(
        adminOnlyWritePolicy.message ?? "현재 계정으로는 이 카테고리 글을 작성할 수 없습니다.",
        "ADMIN_ONLY_POST_TYPE",
        403,
      );
    }

    const contactPolicy = moderateContactContent({
      text: postData.content,
      role: author.role,
      accountCreatedAt: author.createdAt,
      blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
    });
    if (contactPolicy.blocked) {
      throw new ServiceError(
        contactPolicy.message ?? "연락처가 포함된 내용은 현재 계정으로 작성할 수 없습니다.",
        "CONTACT_RESTRICTED_FOR_NEW_USER",
        403,
      );
    }
    postData.content = contactPolicy.sanitizedText;
    if (hospitalReviewInput) {
      hospitalReviewInput = moderateHospitalReviewStructuredFields({
        review: hospitalReviewInput,
        role: author.role,
        accountCreatedAt: author.createdAt,
        blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
      });
    }
    if (adoptionListingInput) {
      adoptionListingInput = moderateStructuredTextFields({
        data: adoptionListingInput,
        fields: ADOPTION_LISTING_TEXT_FIELDS,
        role: author.role,
        accountCreatedAt: author.createdAt,
        blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
      });
    }
    if (volunteerRecruitmentInput) {
      volunteerRecruitmentInput = moderateStructuredTextFields({
        data: volunteerRecruitmentInput,
        fields: VOLUNTEER_RECRUITMENT_TEXT_FIELDS,
        role: author.role,
        accountCreatedAt: author.createdAt,
        blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
      });
    }
    if (marketListingInput) {
      marketListingInput = moderateStructuredTextFields({
        data: marketListingInput,
        fields: MARKET_LISTING_TEXT_FIELDS,
        role: author.role,
        accountCreatedAt: author.createdAt,
        blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
      });
    }
    if (careRequestInput) {
      careRequestInput = moderateStructuredTextFields({
        data: careRequestInput,
        fields: CARE_REQUEST_TEXT_FIELDS,
        role: author.role,
        accountCreatedAt: author.createdAt,
        blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
      });
    }
    resolvedAuthorId = author.id;
    resolvedAuthorAccountCreatedAt = author.createdAt;
  } else {
    if (!guestIdentity) {
      throw new ServiceError("비회원 식별 정보가 필요합니다.", "INVALID_GUEST_CONTEXT", 400);
    }

    if (isAdminOnlyPostType(postData.type)) {
      throw new ServiceError(
        "해당 게시판 글은 관리자만 등록할 수 있습니다.",
        "ADMIN_ONLY_POST_TYPE",
        403,
      );
    }

    await assertGuestNotBanned(guestIdentity);

    const normalizedGuestName = guestDisplayName?.trim();
    const normalizedGuestPassword = guestPassword?.trim();
    if (!normalizedGuestName || !normalizedGuestPassword) {
      throw new ServiceError("비회원 닉네임과 비밀번호를 입력해 주세요.", "GUEST_AUTH_REQUIRED", 400);
    }

    if (isGuestPostTypeBlocked(postData.type, guestPostPolicy.blockedPostTypes)) {
      throw new ServiceError(
        "비회원은 해당 게시판 글을 작성할 수 없습니다.",
        "GUEST_RESTRICTED_TYPE",
        403,
      );
    }

    if (!isGuestScopeAllowed(postData.scope, guestPostPolicy.enforceGlobalScope)) {
      throw new ServiceError(
        "비회원은 전체(글로벌) 글만 작성할 수 있습니다.",
        "GUEST_SCOPE_RESTRICTED",
        403,
      );
    }

    if (normalizedImageUrls.length > guestPostPolicy.maxImageCount) {
      throw new ServiceError(
        `비회원은 이미지를 최대 ${guestPostPolicy.maxImageCount}장까지 첨부할 수 있습니다.`,
        "GUEST_IMAGE_LIMIT_EXCEEDED",
        400,
      );
    }

    const guestPolicyText = buildModerationText([
      stripImageTokensForGuestPolicy(postData.content),
      hospitalReviewInput?.hospitalName,
      hospitalReviewInput?.treatmentType,
      adoptionListingInput?.shelterName,
      adoptionListingInput?.region,
      adoptionListingInput?.animalType,
      adoptionListingInput?.breed,
      adoptionListingInput?.ageLabel,
      adoptionListingInput?.sizeLabel,
      volunteerRecruitmentInput?.shelterName,
      volunteerRecruitmentInput?.region,
      volunteerRecruitmentInput?.volunteerType,
      marketListingInput?.rentalPeriod,
      careRequestInput?.locationNote,
      careRequestInput?.petNote,
      careRequestInput?.requirements,
    ]);

    if (!guestPostPolicy.allowLinks && GUEST_LINK_PATTERN.test(guestPolicyText)) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.SPAM,
        reason: "외부 링크 반복 게시",
        source: "post-link",
        policy: guestPostPolicy,
      });
      throw new ServiceError("비회원 글에서는 외부 링크를 포함할 수 없습니다.", "GUEST_LINK_BLOCKED", 403);
    }

    if (!guestPostPolicy.allowContact && detectContactSignals(guestPolicyText).length > 0) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.SPAM,
        reason: "연락처/외부 연락 유도 반복",
        source: "post-contact",
        policy: guestPostPolicy,
      });
      throw new ServiceError(
        "비회원 글에서는 연락처/외부 연락 수단을 포함할 수 없습니다.",
        "GUEST_CONTACT_BLOCKED",
        403,
      );
    }

    const { ipHash, fingerprintHash } = hashGuestIdentity(guestIdentity);
    const guestIpMeta = buildGuestIpMeta({
      ip: guestIdentity.ip,
      fingerprint: guestIdentity.fingerprint,
      userAgent: guestIdentity.userAgent,
    });
    const guestSystemUserId = await getOrCreateGuestSystemUserId();
    const guestAuthor = await prisma.guestAuthor.create({
      data: {
        displayName: normalizedGuestName,
        passwordHash: hashGuestPassword(normalizedGuestPassword),
        ipHash,
        fingerprintHash,
        ipDisplay: guestIpMeta.guestIpDisplay,
        ipLabel: guestIpMeta.guestIpLabel,
      },
      select: { id: true },
    });
    resolvedAuthorId = guestSystemUserId;
    guestCreateMeta = {
      guestAuthorId: guestAuthor.id,
    };
  }

  if (effectiveScope === PostScope.LOCAL && !postData.neighborhoodId) {
    throw new ServiceError("동네 정보가 필요합니다.", "NEIGHBORHOOD_REQUIRED", 400);
  }

  if (mappedBoard.boardScope === "COMMUNITY") {
    if (!petTypeId && !isFreeBoardPostType(postData.type)) {
      throw new ServiceError("반려동물 타입을 선택해 주세요.", "POST_COMMUNITY_REQUIRED", 400);
    }

    if (petTypeId) {
      const petType = await prisma.community.findUnique({
        where: { id: petTypeId },
        select: { id: true, isActive: true },
      });

      if (!petType || !petType.isActive) {
        throw new ServiceError("유효한 반려동물 타입을 찾을 수 없습니다.", "POST_COMMUNITY_INVALID", 400);
      }
    }
  } else {
    if (petTypeId) {
      throw new ServiceError("공용 보드 글은 반려동물 타입을 지정할 수 없습니다.", "POST_COMMUNITY_FORBIDDEN", 400);
    }

    if (
      isAnimalTagsRequiredCommonBoardPostType(postData.type) &&
      normalizedAnimalTags.length === 0
    ) {
      throw new ServiceError("공용 보드 글은 동물 태그를 1개 이상 입력해 주세요.", "POST_COMMON_BOARD_TAGS_REQUIRED", 400);
    }
  }

  const commonBoardAnimalTags =
    mappedBoard.boardScope === "COMMON" ? normalizedAnimalTags : [];

  const commonCreateData = {
    ...postData,
    structuredSearchText: buildPostStructuredSearchText({
      animalTags: commonBoardAnimalTags,
    }),
    scope: effectiveScope,
    boardScope: mappedBoard.boardScope,
    petTypeId: mappedBoard.boardScope === "COMMUNITY" ? (petTypeId ?? null) : null,
    commonBoardType: mappedBoard.commonBoardType,
    animalTags: commonBoardAnimalTags,
    authorId: resolvedAuthorId,
    ...(guestCreateMeta ?? {}),
    ...(normalizedImageUrls.length > 0
      ? {
          images: {
            create: buildImageCreateInput(normalizedImageUrls),
          },
        }
      : {}),
  };

  if (postData.type === "HOSPITAL_REVIEW") {
    const reviewInput: HospitalReviewInput =
      hospitalReviewInput ?? {
        hospitalName: undefined,
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
        author: { select: { id: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
        hospitalReview: {
          select: {
            hospitalName: true,
            totalCost: true,
            waitTime: true,
            rating: true,
          },
        },
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
    await finalizeUploadUrlChanges({ attachedUrls: normalizedImageUrls });
    if (
      shouldCreateReview &&
      resolvedAuthorAccountCreatedAt &&
      reviewInput.hospitalName?.trim().length
    ) {
      const normalizedHospitalName = reviewInput.hospitalName.trim();
      const [sameHospitalReviewCount30d, recentHospitalReviewCount7d] = await Promise.all([
        prisma.hospitalReview.count({
          where: {
            hospitalName: {
              equals: normalizedHospitalName,
              mode: "insensitive",
            },
            post: {
              authorId: resolvedAuthorId,
              status: PostStatus.ACTIVE,
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
              id: {
                not: created.id,
              },
            },
          },
        }),
        prisma.hospitalReview.count({
          where: {
            post: {
              authorId: resolvedAuthorId,
              status: PostStatus.ACTIVE,
              type: PostType.HOSPITAL_REVIEW,
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
        }),
      ]);
      const hospitalReviewRisk = buildHospitalReviewRiskSignals({
        accountCreatedAt: resolvedAuthorAccountCreatedAt,
        sameHospitalReviewCount30d,
        recentHospitalReviewCount7d,
      });

      if (hospitalReviewRisk.flagged) {
        await recordModerationAction({
          actorId: resolvedAuthorId,
          action: ModerationActionType.HOSPITAL_REVIEW_FLAGGED,
          targetType: ModerationTargetType.POST,
          targetId: created.id,
          targetUserId: resolvedAuthorId,
          metadata: {
            hospitalName: normalizedHospitalName,
            signals: hospitalReviewRisk.signals,
            sameHospitalReviewCount30d,
            recentHospitalReviewCount7d,
          },
        });
      }
    }
    notifyPostCacheChange();
    return created;
  }

  if (postData.type === "PLACE_REVIEW") {
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
        author: { select: { id: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
        hospitalReview: {
          select: {
            hospitalName: true,
            totalCost: true,
            waitTime: true,
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
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
    await finalizeUploadUrlChanges({ attachedUrls: normalizedImageUrls });
    notifyPostCacheChange();
    return created;
  }

  if (postData.type === "WALK_ROUTE") {
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
        author: { select: { id: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
        hospitalReview: {
          select: {
            hospitalName: true,
            totalCost: true,
            waitTime: true,
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
            hasStreetLights: true,
            hasRestroom: true,
            hasParkingLot: true,
            safetyTags: true,
          },
        },
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
    await finalizeUploadUrlChanges({ attachedUrls: normalizedImageUrls });
    notifyPostCacheChange();
    return created;
  }

  if (postData.type === "MARKET_LISTING") {
    if (!marketListingInput) {
      throw new ServiceError("거래 글 입력값이 올바르지 않습니다.", "INVALID_MARKET_LISTING", 400);
    }

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
        author: { select: { id: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
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
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
    await finalizeUploadUrlChanges({ attachedUrls: normalizedImageUrls });
    notifyPostCacheChange();
    return created;
  }

  if (postData.type === "CARE_REQUEST") {
    if (!careRequestInput) {
      throw new ServiceError("돌봄 요청 입력값이 올바르지 않습니다.", "INVALID_CARE_REQUEST", 400);
    }

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
        author: { select: { id: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
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
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
    await finalizeUploadUrlChanges({ attachedUrls: normalizedImageUrls });
    notifyPostCacheChange();
    return created;
  }

  if (postData.type === "ADOPTION_LISTING") {
    const listingInput = adoptionListingInput ?? {};
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
        author: { select: { id: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
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
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
    await finalizeUploadUrlChanges({ attachedUrls: normalizedImageUrls });
    notifyPostCacheChange();
    return created;
  }

  if (postData.type === "SHELTER_VOLUNTEER") {
    const recruitmentInput = volunteerRecruitmentInput ?? {};
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
        author: { select: { id: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
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
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
    await finalizeUploadUrlChanges({ attachedUrls: normalizedImageUrls });
    notifyPostCacheChange();
    return created;
  }

  const created = await prisma.post.create({
    data: {
      ...commonCreateData,
    },
    include: {
      author: { select: { id: true, nickname: true } },
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      hospitalReview: {
        select: {
          hospitalName: true,
          totalCost: true,
          waitTime: true,
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
          hasStreetLights: true,
          hasRestroom: true,
          hasParkingLot: true,
          safetyTags: true,
        },
      },
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
      images: {
        select: { id: true, url: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });
  await finalizeUploadUrlChanges({ attachedUrls: normalizedImageUrls });
  notifyPostCacheChange();
  return created;
}
