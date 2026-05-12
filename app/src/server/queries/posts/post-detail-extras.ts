import { PostType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  ADOPTION_LISTING_SELECT,
  CARE_REQUEST_SELECT,
  HOSPITAL_REVIEW_SELECT,
  MARKET_LISTING_SELECT,
  PLACE_REVIEW_SELECT,
  VOLUNTEER_RECRUITMENT_SELECT,
  WALK_ROUTE_SELECT,
  type PostDetailExtras,
} from "./post-detail-read-model";

export const buildPostDetailBaseInclude = (includeGuestAuthor = true) =>
  ({
    author: { select: { id: true, nickname: true } },
    ...(includeGuestAuthor ? { guestAuthor: { select: { id: true, displayName: true } } } : {}),
    neighborhood: {
      select: { id: true, name: true, city: true },
    },
    images: {
      select: { url: true, order: true },
    },
  }) as const;

export const buildPostDetailBaseIncludeWithoutReactions = (includeGuestAuthor = true) =>
  ({
    author: { select: { id: true, nickname: true } },
    ...(includeGuestAuthor ? { guestAuthor: { select: { id: true, displayName: true } } } : {}),
    neighborhood: {
      select: { id: true, name: true, city: true },
    },
    images: {
      select: { url: true, order: true },
    },
  }) as const;

export async function attachPostDetailExtras<T extends { id: string; type: PostType }>(
  post: T | null,
): Promise<(T & PostDetailExtras) | null> {
  if (!post) {
    return null;
  }

  const needsHospital = post.type === PostType.HOSPITAL_REVIEW;
  const needsPlace = post.type === PostType.PLACE_REVIEW;
  const needsWalk = post.type === PostType.WALK_ROUTE;
  const needsAdoption = post.type === PostType.ADOPTION_LISTING;
  const needsVolunteer = post.type === PostType.SHELTER_VOLUNTEER;
  const needsMarket = post.type === PostType.MARKET_LISTING;
  const needsCare = post.type === PostType.CARE_REQUEST;
  const tasks: Array<Promise<void>> = [];
  const target = post as T & PostDetailExtras;

  if (needsHospital) {
    if (target.hospitalReview === undefined) {
      tasks.push(
        prisma.hospitalReview
          .findUnique({ where: { postId: post.id }, select: HOSPITAL_REVIEW_SELECT })
          .then((review) => {
            target.hospitalReview = review;
          }),
      );
    }
  } else if (target.hospitalReview === undefined) {
    target.hospitalReview = null;
  }

  if (needsPlace) {
    if (target.placeReview === undefined) {
      tasks.push(
        prisma.placeReview
          .findUnique({ where: { postId: post.id }, select: PLACE_REVIEW_SELECT })
          .then((review) => {
            target.placeReview = review;
          }),
      );
    }
  } else if (target.placeReview === undefined) {
    target.placeReview = null;
  }

  if (needsWalk) {
    if (target.walkRoute === undefined) {
      tasks.push(
        prisma.walkRoute
          .findUnique({ where: { postId: post.id }, select: WALK_ROUTE_SELECT })
          .then((route) => {
            target.walkRoute = route;
          }),
      );
    }
  } else if (target.walkRoute === undefined) {
    target.walkRoute = null;
  }

  if (needsAdoption) {
    if (target.adoptionListing === undefined) {
      tasks.push(
        prisma.adoptionListing
          .findUnique({ where: { postId: post.id }, select: ADOPTION_LISTING_SELECT })
          .then((listing) => {
            target.adoptionListing = listing;
          }),
      );
    }
  } else if (target.adoptionListing === undefined) {
    target.adoptionListing = null;
  }

  if (needsVolunteer) {
    if (target.volunteerRecruitment === undefined) {
      tasks.push(
        prisma.volunteerRecruitment
          .findUnique({ where: { postId: post.id }, select: VOLUNTEER_RECRUITMENT_SELECT })
          .then((recruitment) => {
            target.volunteerRecruitment = recruitment;
          }),
      );
    }
  } else if (target.volunteerRecruitment === undefined) {
    target.volunteerRecruitment = null;
  }

  if (needsMarket) {
    if (target.marketListing === undefined) {
      tasks.push(
        prisma.marketListing
          .findUnique({ where: { postId: post.id }, select: MARKET_LISTING_SELECT })
          .then((listing) => {
            target.marketListing = listing;
          }),
      );
    }
  } else if (target.marketListing === undefined) {
    target.marketListing = null;
  }

  if (needsCare) {
    if (target.careRequest === undefined) {
      tasks.push(
        prisma.careRequest
          .findUnique({ where: { postId: post.id }, select: CARE_REQUEST_SELECT })
          .then((request) => {
            target.careRequest = request;
          }),
      );
    }
  } else if (target.careRequest === undefined) {
    target.careRequest = null;
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  return target;
}
