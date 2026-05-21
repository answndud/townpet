import {
  GuestViolationCategory,
  PostScope,
  PostStatus,
} from "@prisma/client";
import { scryptSync, timingSafeEqual } from "crypto";

import { detectContactSignals } from "@/lib/contact-policy";
import { findMatchedForbiddenKeywords } from "@/lib/forbidden-keyword-policy";
import { prisma } from "@/lib/prisma";
import { getUploadProxyPath } from "@/lib/upload-url";
import { postUpdateSchema } from "@/lib/validations/post";
import {
  getForbiddenKeywords,
  getGuestPostPolicy,
} from "@/server/queries/policy.queries";
import {
  hashGuestIdentityCandidates,
  registerGuestViolation,
} from "@/server/services/guest-safety.service";
import { ServiceError } from "@/server/services/service-error";
import {
  finalizeUploadUrlChanges,
  notifyNotificationCacheChange,
  notifyPostCacheChange,
  softDeletePostDependents,
} from "./post-write-support";

type UpdateGuestPostParams = {
  postId: string;
  input: unknown;
  guestPassword: string;
  guestIdentity: {
    ip: string;
    fingerprint?: string;
  };
};

type DeleteGuestPostParams = {
  postId: string;
  guestPassword: string;
  guestIdentity: {
    ip: string;
    fingerprint?: string;
  };
};

const MAX_POST_IMAGES = 10;
const GUEST_LINK_PATTERN = /https?:\/\/[\S]+/i;
const GUEST_IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*\]\(([^)\s]+)\)(?:\{\s*width\s*=\s*\d{1,4}\s*\})?/gi;

const normalizeImageUrls = (imageUrls: string[] | undefined) =>
  Array.from(
    new Set(
      (imageUrls ?? [])
        .map((url) => {
          const trimmed = url.trim();
          return trimmed ? getUploadProxyPath(trimmed) ?? trimmed : "";
        })
        .filter((url) => url.length > 0),
    ),
  ).slice(0, MAX_POST_IMAGES);

const buildImageCreateInput = (imageUrls: string[]) =>
  imageUrls.map((url, index) => ({
    url,
    order: index,
  }));

function stripImageTokensForGuestPolicy(value: string) {
  return value.replace(GUEST_IMAGE_MARKDOWN_PATTERN, " ").replace(/\s+/g, " ").trim();
}

function verifyGuestPassword(rawPassword: string, stored: string) {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const actual = scryptSync(rawPassword, salt, 32);
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

function matchesGuestIdentity(
  params: {
    guestIpHash: string | null;
    guestFingerprintHash: string | null;
  },
  identity: {
    ip: string;
    fingerprint?: string;
  },
) {
  const { ipHashes, fingerprintHashes } = hashGuestIdentityCandidates(identity);
  if (params.guestIpHash && ipHashes.includes(params.guestIpHash)) {
    return true;
  }
  if (
    params.guestFingerprintHash &&
    fingerprintHashes.includes(params.guestFingerprintHash)
  ) {
    return true;
  }
  return false;
}

function resolveGuestPostCredential(params: {
  guestAuthorId?: string | null;
  guestAuthor?: {
    passwordHash: string;
    ipHash: string;
    fingerprintHash: string | null;
  } | null;
}) {
  return {
    hasGuestMarker: Boolean(params.guestAuthorId || params.guestAuthor),
    passwordHash: params.guestAuthor?.passwordHash ?? null,
    ipHash: params.guestAuthor?.ipHash ?? null,
    fingerprintHash: params.guestAuthor?.fingerprintHash ?? null,
  };
}

export async function updateGuestPost({
  postId,
  input,
  guestPassword,
  guestIdentity,
}: UpdateGuestPostParams) {
  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      guestAuthorId: true,
      images: {
        select: { url: true },
        orderBy: { order: "asc" },
      },
      guestAuthor: {
        select: {
          passwordHash: true,
          ipHash: true,
          fingerprintHash: true,
        },
      },
    },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  const guestCredential = resolveGuestPostCredential(existing);

  if (!guestCredential.hasGuestMarker || !guestCredential.passwordHash) {
    throw new ServiceError("비회원 게시글이 아닙니다.", "GUEST_POST_ONLY", 403);
  }

  if (
    !matchesGuestIdentity(
      {
        guestIpHash: guestCredential.ipHash,
        guestFingerprintHash: guestCredential.fingerprintHash,
      },
      guestIdentity,
    )
  ) {
    const guestPostPolicy = await getGuestPostPolicy();
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 글 수정 시도 식별 불일치",
      source: "guest-update-identity-mismatch",
      policy: guestPostPolicy,
    });
    throw new ServiceError("수정 권한이 없습니다.", "FORBIDDEN", 403);
  }

  if (!verifyGuestPassword(guestPassword, guestCredential.passwordHash)) {
    const guestPostPolicy = await getGuestPostPolicy();
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 글 수정 비밀번호 실패",
      source: "guest-update-password-failed",
      policy: guestPostPolicy,
    });
    throw new ServiceError("비밀번호가 일치하지 않습니다.", "INVALID_GUEST_PASSWORD", 403);
  }

  const guestPostPolicy = await getGuestPostPolicy();
  if (parsed.data.scope && parsed.data.scope !== PostScope.GLOBAL) {
    throw new ServiceError("비회원 게시글은 전체 범위만 허용됩니다.", "GUEST_SCOPE_RESTRICTED", 403);
  }

  const normalizedImageUrls = normalizeImageUrls(parsed.data.imageUrls);
  if (parsed.data.imageUrls && normalizedImageUrls.length > guestPostPolicy.maxImageCount) {
    throw new ServiceError(
      `비회원은 이미지를 최대 ${guestPostPolicy.maxImageCount}장까지 첨부할 수 있습니다.`,
      "GUEST_IMAGE_LIMIT_EXCEEDED",
      400,
    );
  }

  const postData = { ...parsed.data };
  if (postData.content !== undefined) {
    const guestPolicyText = stripImageTokensForGuestPolicy(postData.content);

    if (!guestPostPolicy.allowLinks && GUEST_LINK_PATTERN.test(guestPolicyText)) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.SPAM,
        reason: "비회원 글 수정 링크 위반",
        source: "guest-update-link",
        policy: guestPostPolicy,
      });
      throw new ServiceError("비회원 글에서는 외부 링크를 포함할 수 없습니다.", "GUEST_LINK_BLOCKED", 403);
    }

    if (!guestPostPolicy.allowContact && detectContactSignals(guestPolicyText).length > 0) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.SPAM,
        reason: "비회원 글 수정 연락처 위반",
        source: "guest-update-contact",
        policy: guestPostPolicy,
      });
      throw new ServiceError(
        "비회원 글에서는 연락처/외부 연락 수단을 포함할 수 없습니다.",
        "GUEST_CONTACT_BLOCKED",
        403,
      );
    }
  }

  if (postData.title !== undefined || postData.content !== undefined) {
    const forbiddenKeywords = await getForbiddenKeywords();
    const matchedForbiddenKeywords = findMatchedForbiddenKeywords(
      `${postData.title ?? ""}\n${postData.content ?? ""}`,
      forbiddenKeywords,
    );
    if (matchedForbiddenKeywords.length > 0) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.POLICY,
        reason: "비회원 글 수정 금칙어 위반",
        source: "guest-update-forbidden-keyword",
        policy: guestPostPolicy,
      });
      throw new ServiceError(
        `금칙어가 포함되어 게시글을 수정할 수 없습니다. (${matchedForbiddenKeywords
          .slice(0, 3)
          .join(", ")})`,
        "FORBIDDEN_KEYWORD_DETECTED",
        400,
      );
    }
  }

  const { imageUrls, ...restData } = postData;

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      ...restData,
      scope: PostScope.GLOBAL,
      neighborhoodId: null,
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

export async function deleteGuestPost({
  postId,
  guestPassword,
  guestIdentity,
}: DeleteGuestPostParams) {
  const guestPostPolicy = await getGuestPostPolicy();
  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      guestAuthorId: true,
      images: {
        select: { url: true },
      },
      guestAuthor: {
        select: {
          passwordHash: true,
          ipHash: true,
          fingerprintHash: true,
        },
      },
    },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  const guestCredential = resolveGuestPostCredential(existing);

  if (!guestCredential.hasGuestMarker || !guestCredential.passwordHash) {
    throw new ServiceError("비회원 게시글이 아닙니다.", "GUEST_POST_ONLY", 403);
  }

  if (
    !matchesGuestIdentity(
      {
        guestIpHash: guestCredential.ipHash,
        guestFingerprintHash: guestCredential.fingerprintHash,
      },
      guestIdentity,
    )
  ) {
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 글 삭제 시도 식별 불일치",
      source: "guest-delete-identity-mismatch",
      policy: guestPostPolicy,
    });
    throw new ServiceError("삭제 권한이 없습니다.", "FORBIDDEN", 403);
  }

  if (!verifyGuestPassword(guestPassword, guestCredential.passwordHash)) {
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 글 삭제 비밀번호 실패",
      source: "guest-delete-password-failed",
      policy: guestPostPolicy,
    });
    throw new ServiceError("비밀번호가 일치하지 않습니다.", "INVALID_GUEST_PASSWORD", 403);
  }

  const { deleted, notificationUserIds } = await softDeletePostDependents(postId);
  await finalizeUploadUrlChanges({
    releasedUrls: (existing.images ?? []).map((image) => image.url),
  });
  notifyPostCacheChange();
  notifyNotificationCacheChange(notificationUserIds);
  return deleted;
}
