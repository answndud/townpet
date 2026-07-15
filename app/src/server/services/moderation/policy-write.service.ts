import { PostType, Prisma } from "@prisma/client";

import {
  DEFAULT_CONTACT_BLOCK_WINDOW_HOURS,
  DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
  DEFAULT_NEW_USER_RESTRICTED_POST_TYPES,
  NEW_USER_SAFETY_POLICY_KEY,
  normalizeNewUserSafetyPolicy,
  type NewUserSafetyPolicy,
} from "@/lib/new-user-safety-policy";
import {
  DEFAULT_FORBIDDEN_KEYWORDS,
  FORBIDDEN_KEYWORDS_POLICY_KEY,
  normalizeForbiddenKeywords,
} from "@/lib/forbidden-keyword-policy";
import {
  DEFAULT_LOGIN_REQUIRED_POST_TYPES,
  GUEST_READ_POLICY_KEY,
  normalizeLoginRequiredPostTypes,
} from "@/lib/post-access";
import {
  DEFAULT_GUEST_POST_POLICY,
  GUEST_POST_POLICY_KEY,
  type GuestPostPolicy,
  normalizeGuestPostPolicy,
} from "@/lib/guest-post-policy";
import {
  DEFAULT_FEED_PERSONALIZATION_POLICY,
  FEED_PERSONALIZATION_POLICY_KEY,
  normalizeFeedPersonalizationPolicy,
  type FeedPersonalizationPolicy,
} from "@/lib/feed-personalization-policy";
import {
  DEFAULT_POPULAR_POST_MIN_LIKES,
  POPULAR_POST_POLICY_KEY,
  normalizePopularPostPolicy,
  type PopularPostPolicy,
} from "@/lib/popular-post-policy";
import { prisma } from "@/lib/prisma";
import { bumpCacheVersion } from "@/server/cache/query-cache";
import { logger, serializeError } from "@/server/logger";

type SiteSettingRecord = {
  key: string;
  value: Prisma.InputJsonValue;
};

type SiteSettingDelegate = {
  upsert(args: {
    where: { key: string };
    update: { value: Prisma.InputJsonValue };
    create: { key: string; value: Prisma.InputJsonValue };
  }): Promise<SiteSettingRecord>;
};

type SetPolicyResult =
  | { ok: true; setting: SiteSettingRecord }
  | { ok: false; reason: "SCHEMA_SYNC_REQUIRED" };

let missingTableWarned = false;

function isSiteSettingTableMissingError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

function getSiteSettingDelegate() {
  return (prisma as unknown as { siteSetting?: SiteSettingDelegate }).siteSetting ?? null;
}

function warnMissingSiteSettingTable(error: unknown) {
  if (missingTableWarned || process.env.NODE_ENV === "test") {
    return;
  }
  missingTableWarned = true;
  logger.warn("SiteSetting 테이블이 없어 정책 저장을 중단합니다.", {
    error: serializeError(error),
  });
}

async function upsertPolicySetting(
  key: string,
  value: Prisma.InputJsonValue,
): Promise<SetPolicyResult> {
  const delegate = getSiteSettingDelegate();
  if (!delegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" };
  }

  try {
    const setting = await delegate.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return { ok: true, setting };
  } catch (error) {
    if (!isSiteSettingTableMissingError(error)) {
      throw error;
    }
    warnMissingSiteSettingTable(error);
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" };
  }
}

function resultWithPolicyCache(result: SetPolicyResult) {
  if (result.ok) {
    void bumpCacheVersion("policy").catch(() => undefined);
  }
  return result;
}

export function setGuestReadLoginRequiredPostTypes(types: PostType[]) {
  const normalized = normalizeLoginRequiredPostTypes(
    types,
    DEFAULT_LOGIN_REQUIRED_POST_TYPES,
    { allowEmpty: true },
  );
  return upsertPolicySetting(GUEST_READ_POLICY_KEY, normalized).then(resultWithPolicyCache);
}

export function setForbiddenKeywords(keywords: string[]) {
  const normalized = normalizeForbiddenKeywords(keywords, DEFAULT_FORBIDDEN_KEYWORDS, {
    allowEmpty: true,
  });
  return upsertPolicySetting(FORBIDDEN_KEYWORDS_POLICY_KEY, normalized);
}

export function setNewUserSafetyPolicy(input: NewUserSafetyPolicy) {
  const normalized = normalizeNewUserSafetyPolicy(input, {
    minAccountAgeHours: DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
    restrictedPostTypes: [...DEFAULT_NEW_USER_RESTRICTED_POST_TYPES],
    contactBlockWindowHours: DEFAULT_CONTACT_BLOCK_WINDOW_HOURS,
  });
  return upsertPolicySetting(NEW_USER_SAFETY_POLICY_KEY, normalized);
}

export function setGuestPostPolicy(input: GuestPostPolicy) {
  const normalized = normalizeGuestPostPolicy(input, DEFAULT_GUEST_POST_POLICY);
  return upsertPolicySetting(GUEST_POST_POLICY_KEY, normalized);
}

export function setFeedPersonalizationPolicy(input: FeedPersonalizationPolicy) {
  const normalized = normalizeFeedPersonalizationPolicy(
    input,
    DEFAULT_FEED_PERSONALIZATION_POLICY,
  );
  return upsertPolicySetting(FEED_PERSONALIZATION_POLICY_KEY, normalized).then(
    resultWithPolicyCache,
  );
}

export async function setPopularPostPolicy(input: PopularPostPolicy) {
  const normalized = normalizePopularPostPolicy(input, {
    minLikes: DEFAULT_POPULAR_POST_MIN_LIKES,
  });
  const result = await upsertPolicySetting(POPULAR_POST_POLICY_KEY, normalized);
  if (result.ok) {
    await Promise.all([bumpCacheVersion("policy"), bumpCacheVersion("feed")]);
  }
  return result;
}
