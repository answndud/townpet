import type { FeedPostItem } from "@/components/posts/feed-infinite-list";
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
      scope: post.scope,
      status: post.status,
      title: post.title,
      content: post.content,
      commentCount: post.commentCount,
      likeCount: post.likeCount,
      dislikeCount: post.dislikeCount,
      viewCount: post.viewCount,
      createdAt: post.createdAt.toISOString(),
      isOperatorContent: post.isOperatorContent ?? false,
      operatorSourceName: post.operatorSourceName ?? null,
      operatorSourceUrl: post.operatorSourceUrl ?? null,
      operatorLastVerifiedAt:
        post.operatorLastVerifiedAt instanceof Date
          ? post.operatorLastVerifiedAt.toISOString()
          : post.operatorLastVerifiedAt ?? null,
      author: {
        id: post.author.id,
        nickname: post.author.nickname,
        image: post.author.image,
        isFoundingMember: post.author.isFoundingMember ?? false,
      },
      guestAuthorId: post.guestAuthorId ?? null,
      guestDisplayName: post.guestDisplayName ?? null,
      neighborhood: post.neighborhood
        ? {
            id: post.neighborhood.id,
            name: post.neighborhood.name,
            city: post.neighborhood.city,
            district: post.neighborhood.district ?? "",
          }
        : null,
      petType: petType
        ? {
            id: petType.id,
            labelKo: petType.labelKo,
            categoryLabelKo: petType.category.labelKo,
          }
        : null,
      images: post.images.map((image) => ({
        id: image.id,
        url: image.url ?? null,
      })),
      marketListing: post.marketListing ?? null,
      isBookmarked: Boolean(post.isBookmarked),
      reactions: post.reactions?.map((reaction) => ({ type: reaction.type })) ?? [],
    };
  });
}
