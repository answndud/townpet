import { PostScope, PostStatus } from "@prisma/client";

import { findMatchedForbiddenKeywords } from "@/lib/forbidden-keyword-policy";
import { moderateContactContent } from "@/lib/contact-policy";
import { prisma } from "@/lib/prisma";
import { evaluateAdminOnlyPostWritePolicy } from "@/lib/post-write-policy";
import { postUpdateSchema } from "@/lib/validations/post";
import {
  getForbiddenKeywords,
  getNewUserSafetyPolicy,
} from "@/server/queries/policy.queries";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";
import {
  buildImageCreateInput,
  finalizeUploadUrlChanges,
  normalizeImageUrls,
  notifyPostCacheChange,
} from "./post-write-support";

type UpdatePostParams = {
  postId: string;
  authorId: string;
  input: unknown;
};

export async function updatePost({ postId, authorId, input }: UpdatePostParams) {
  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  if (parsed.data.scope === PostScope.LOCAL && !parsed.data.neighborhoodId) {
    throw new ServiceError("동네 정보가 필요합니다.", "NEIGHBORHOOD_REQUIRED", 400);
  }

  const normalizedImageUrls = normalizeImageUrls(parsed.data.imageUrls);
  const { imageUrls, ...postData } = parsed.data;

  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { id: true, role: true, createdAt: true },
  });
  if (!author) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  await assertUserInteractionAllowed(author.id);

  if (postData.content !== undefined) {
    const newUserSafetyPolicy = await getNewUserSafetyPolicy();

    const contactPolicy = moderateContactContent({
      text: postData.content,
      role: author.role,
      accountCreatedAt: author.createdAt,
      blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
    });
    if (contactPolicy.blocked) {
      throw new ServiceError(
        contactPolicy.message ?? "연락처가 포함된 내용은 현재 계정으로 수정할 수 없습니다.",
        "CONTACT_RESTRICTED_FOR_NEW_USER",
        403,
      );
    }
    postData.content = contactPolicy.sanitizedText;
  }

  if (postData.title !== undefined || postData.content !== undefined) {
    const forbiddenKeywords = await getForbiddenKeywords();
    const matchedForbiddenKeywords = findMatchedForbiddenKeywords(
      `${postData.title ?? ""}\n${postData.content ?? ""}`,
      forbiddenKeywords,
    );
    if (matchedForbiddenKeywords.length > 0) {
      throw new ServiceError(
        `금칙어가 포함되어 게시글을 수정할 수 없습니다. (${matchedForbiddenKeywords
          .slice(0, 3)
          .join(", ")})`,
        "FORBIDDEN_KEYWORD_DETECTED",
        400,
      );
    }
  }

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      authorId: true,
      type: true,
      images: {
        select: { url: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (existing.authorId !== authorId) {
    throw new ServiceError("수정 권한이 없습니다.", "FORBIDDEN", 403);
  }

  const adminOnlyWritePolicy = evaluateAdminOnlyPostWritePolicy({
    role: author.role,
    postType: existing.type,
  });
  if (!adminOnlyWritePolicy.allowed) {
    throw new ServiceError(
      adminOnlyWritePolicy.message ?? "현재 계정으로는 이 카테고리 글을 수정할 수 없습니다.",
      "ADMIN_ONLY_POST_TYPE",
      403,
    );
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      ...postData,
      neighborhoodId:
        postData.scope === PostScope.GLOBAL ? null : postData.neighborhoodId,
      ...(imageUrls
        ? {
            images: {
              deleteMany: {},
              create: buildImageCreateInput(normalizedImageUrls),
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
      images: {
        select: { id: true, url: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });
  if (imageUrls) {
    const previousImageUrls = (existing.images ?? []).map((image) => image.url);
    await finalizeUploadUrlChanges({
      attachedUrls: normalizedImageUrls,
      releasedUrls: previousImageUrls.filter((url) => !normalizedImageUrls.includes(url)),
    });
  }
  notifyPostCacheChange();
  return updated;
}
