import { PostType, UserRole } from "@prisma/client";

import {
  DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
  DEFAULT_NEW_USER_RESTRICTED_POST_TYPES,
} from "@/lib/new-user-safety-policy";
import { getPostTypeMeta } from "@/lib/post-presenter";
import { isAdminOnlyPostType } from "@/lib/post-type-groups";

export const NEW_USER_RESTRICTION_HOURS = DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS;

export const NEW_USER_RESTRICTED_POST_TYPES: ReadonlyArray<PostType> =
  DEFAULT_NEW_USER_RESTRICTED_POST_TYPES;

type EvaluateNewUserPostWritePolicyParams = {
  role: UserRole;
  accountCreatedAt: Date;
  postType: PostType;
  now?: Date;
  minAccountAgeHours?: number;
  restrictedTypes?: ReadonlyArray<PostType>;
};

type EvaluateNewUserPostWritePolicyResult = {
  allowed: boolean;
  remainingHours: number;
  message: string | null;
};

type EvaluateAdminOnlyPostWritePolicyParams = {
  role: UserRole;
  postType: PostType;
};

type EvaluateAdminOnlyPostWritePolicyResult = {
  allowed: boolean;
  message: string | null;
};

export function evaluateNewUserPostWritePolicy({
  role,
  accountCreatedAt,
  postType,
  now = new Date(),
  minAccountAgeHours = NEW_USER_RESTRICTION_HOURS,
  restrictedTypes = NEW_USER_RESTRICTED_POST_TYPES,
}: EvaluateNewUserPostWritePolicyParams): EvaluateNewUserPostWritePolicyResult {
  if (role !== UserRole.USER) {
    return { allowed: true, remainingHours: 0, message: null };
  }

  if (!new Set(restrictedTypes).has(postType)) {
    return { allowed: true, remainingHours: 0, message: null };
  }

  const ageMs = now.getTime() - accountCreatedAt.getTime();
  const minAgeMs = minAccountAgeHours * 60 * 60 * 1000;
  if (ageMs >= minAgeMs) {
    return { allowed: true, remainingHours: 0, message: null };
  }

  const remainingMs = Math.max(0, minAgeMs - ageMs);
  const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
  const postTypeLabel = getPostTypeMeta(postType).label;
  const message = `가입 후 ${minAccountAgeHours}시간 이내에는 ${postTypeLabel} 글을 작성할 수 없습니다. 약 ${remainingHours}시간 후 다시 시도해 주세요.`;

  return { allowed: false, remainingHours, message };
}

export function evaluateAdminOnlyPostWritePolicy({
  role,
  postType,
}: EvaluateAdminOnlyPostWritePolicyParams): EvaluateAdminOnlyPostWritePolicyResult {
  if (!isAdminOnlyPostType(postType)) {
    return { allowed: true, message: null };
  }

  if (role === UserRole.ADMIN || role === UserRole.MODERATOR) {
    return { allowed: true, message: null };
  }

  return {
    allowed: false,
    message: `${getPostTypeMeta(postType).label} 글은 관리자만 등록하거나 수정할 수 있습니다.`,
  };
}
