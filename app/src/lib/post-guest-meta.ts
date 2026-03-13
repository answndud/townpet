import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";

type GuestPostLike = {
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  guestAuthor?: {
    displayName?: string | null;
  } | null;
};

export function getGuestPostMeta(post: GuestPostLike) {
  const guestAuthorName =
    post.guestDisplayName?.trim() || post.guestAuthor?.displayName?.trim() || "";
  const isGuestPost = Boolean(guestAuthorName) || Boolean(post.guestAuthorId);

  return {
    isGuestPost,
    guestAuthorName,
    guestPublicName: isGuestPost ? resolvePublicGuestDisplayName(guestAuthorName) : null,
  };
}
