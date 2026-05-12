const postListBaseInclude = (includeGuestAuthor: boolean) =>
  ({
    author: { select: { id: true, nickname: true, image: true } },
    ...(includeGuestAuthor ? { guestAuthor: { select: { id: true, displayName: true } } } : {}),
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    petType: {
      select: {
        id: true,
        labelKo: true,
        tags: true,
        category: {
          select: {
            labelKo: true,
          },
        },
      },
    },
    images: {
      orderBy: { order: "asc" },
      take: 1,
      select: { id: true, url: true },
    },
    adoptionListing: {
      select: {
        shelterName: true,
        region: true,
        animalType: true,
        status: true,
      },
    },
    volunteerRecruitment: {
      select: {
        shelterName: true,
        region: true,
        volunteerDate: true,
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
  }) as const;

export const buildPostListInclude = (
  viewerId: string | undefined,
  includeGuestAuthor: boolean,
  noViewerId: string,
) =>
  ({
    ...postListBaseInclude(includeGuestAuthor),
    reactions: {
      where: {
        userId: viewerId ?? noViewerId,
      },
      select: { type: true },
    },
  }) as const;

export const buildPostListIncludeWithoutReactions = (includeGuestAuthor: boolean) =>
  postListBaseInclude(includeGuestAuthor);
