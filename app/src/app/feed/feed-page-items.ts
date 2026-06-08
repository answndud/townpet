import type { FeedPostItem } from "@/components/posts/feed-infinite-list";
import { buildFeedSignalContent } from "@/lib/feed-list-presenter";
import { sanitizePublicGuestIdentity } from "@/lib/public-guest-identity";

type RawFeedPost = {
  id: string;
  type: FeedPostItem["type"];
  scope: FeedPostItem["scope"];
  status: FeedPostItem["status"];
  title: string;
  content: string;
  commentCount: number;
  likeCount: number;
  dislikeCount: number;
  viewCount: number;
  createdAt: Date;
  isOperatorContent?: boolean | null;
  operatorSourceName?: string | null;
  operatorSourceUrl?: string | null;
  operatorLastVerifiedAt?: Date | string | null;
  author: {
    id: string;
    nickname: string | null;
    image?: string | null;
    isFoundingMember?: boolean | null;
  };
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  guestAuthor?: {
    displayName?: string | null;
    ipDisplay?: string | null;
    ipLabel?: string | null;
  } | null;
  neighborhood?: {
    id: string;
    name: string;
    city: string;
    district?: string | null;
  } | null;
  petType?: {
    id: string;
    labelKo: string;
    category: { labelKo: string };
  } | null;
  images: Array<{
    id: string;
    url?: string | null;
  }>;
  marketListing?: {
    listingType?: string | null;
    price?: number | null;
    condition?: string | null;
    depositAmount?: number | null;
    rentalPeriod?: string | null;
    status?: string | null;
  } | null;
  lostFoundAlert?: {
    alertType?: string | null;
    petType?: string | null;
    breed?: string | null;
    lastSeenAt?: Date | string | null;
    lastSeenLocation?: string | null;
    status?: string | null;
  } | null;
  isBookmarked?: boolean | null;
  reactions?: Array<{ type: "LIKE" | "DISLIKE" }>;
};

export function buildInitialFeedItems(items: RawFeedPost[]): FeedPostItem[] {
  return items.map((rawPost) => {
    const post = sanitizePublicGuestIdentity(rawPost);
    const petType = post.petType;

    return {
      id: post.id,
      type: post.type,
      status: post.status,
      title: post.title,
      content: buildFeedSignalContent(post.content),
      commentCount: post.commentCount,
      likeCount: post.likeCount,
      viewCount: post.viewCount,
      createdAt: post.createdAt.toISOString(),
      author: {
        id: post.author.id,
        nickname: post.author.nickname,
        ...(post.author.isFoundingMember ? { isFoundingMember: true } : {}),
      },
      images: post.images.map((image) => ({
        id: image.id,
        url: image.url ?? null,
      })),
      ...(post.isOperatorContent
        ? {
            isOperatorContent: true,
            operatorSourceName: post.operatorSourceName ?? null,
            operatorLastVerifiedAt:
              post.operatorLastVerifiedAt instanceof Date
                ? post.operatorLastVerifiedAt.toISOString()
                : post.operatorLastVerifiedAt ?? null,
          }
        : {}),
      ...(post.guestAuthorId ? { guestAuthorId: post.guestAuthorId } : {}),
      ...(post.guestDisplayName ? { guestDisplayName: post.guestDisplayName } : {}),
      ...(post.neighborhood
        ? {
            neighborhood: {
              name: post.neighborhood.name,
              city: post.neighborhood.city,
            },
          }
        : {}),
      ...(petType
        ? {
            petType: {
              labelKo: petType.labelKo,
              categoryLabelKo: petType.category.labelKo,
            },
          }
        : {}),
      ...(post.marketListing ? { marketListing: post.marketListing } : {}),
      ...(post.lostFoundAlert
        ? {
            lostFoundAlert: {
              alertType: post.lostFoundAlert.alertType ?? null,
              petType: post.lostFoundAlert.petType ?? null,
              breed: post.lostFoundAlert.breed ?? null,
              lastSeenAt:
                post.lostFoundAlert.lastSeenAt instanceof Date
                  ? post.lostFoundAlert.lastSeenAt.toISOString()
                  : post.lostFoundAlert.lastSeenAt ?? null,
              lastSeenLocation: post.lostFoundAlert.lastSeenLocation ?? null,
              status: post.lostFoundAlert.status ?? null,
            },
          }
        : {}),
    };
  });
}
