import { UserRole } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

import { moderateContactContent } from "@/lib/contact-policy";
import type { HospitalReviewInput } from "@/lib/validations/post";
import { ServiceError } from "@/server/services/service-error";

export const GUEST_LINK_PATTERN = /https?:\/\/[^\s]+/i;
export const GUEST_IMAGE_MARKDOWN_PATTERN =
  /!\[[^\]]*\]\(([^)\s]+)\)(?:\{\s*width\s*=\s*\d{1,4}\s*\})?/gi;

export const HOSPITAL_REVIEW_TEXT_FIELDS = [
  "hospitalName",
  "visitPurpose",
  "animalType",
  "treatmentType",
] as const;
export const ADOPTION_LISTING_TEXT_FIELDS = [
  "shelterName",
  "region",
  "animalType",
  "breed",
  "ageLabel",
  "sizeLabel",
] as const;
export const VOLUNTEER_RECRUITMENT_TEXT_FIELDS = [
  "shelterName",
  "region",
  "volunteerType",
] as const;
export const MARKET_LISTING_TEXT_FIELDS = ["rentalPeriod"] as const;
export const CARE_REQUEST_TEXT_FIELDS = ["locationNote", "petNote", "requirements"] as const;
export const LOST_FOUND_TEXT_FIELDS = ["petType", "breed", "lastSeenLocation"] as const;

export function normalizeAnimalTags(animalTags: string[] | undefined) {
  return Array.from(
    new Set(
      (animalTags ?? [])
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  ).slice(0, 5);
}

export function buildModerationText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0)
    .join("\n");
}

export function moderateHospitalReviewStructuredFields(params: {
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

export function moderateStructuredTextFields<
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

export function stripImageTokensForGuestPolicy(value: string) {
  return value.replace(GUEST_IMAGE_MARKDOWN_PATTERN, " ").replace(/\s+/g, " ").trim();
}

export function hashGuestPassword(rawPassword: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(rawPassword, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}
