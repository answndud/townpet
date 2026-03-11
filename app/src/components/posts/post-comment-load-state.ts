export type PostCommentItem = {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  status: string;
  likeCount: number;
  dislikeCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  authorId: string;
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  isGuestAuthor?: boolean;
  reactions?: Array<{ type: "LIKE" | "DISLIKE" }>;
  author: { id: string; nickname: string | null; email?: string | null };
};

export type PostCommentPrefetchState = {
  status: "idle" | "loading" | "ready" | "error";
  comments: PostCommentItem[] | null;
  error: string | null;
};

export function shouldAutoLoadPostComments({
  comments,
  error,
  isLoading,
  prefetchStatus,
}: {
  comments: PostCommentItem[] | null;
  error: string | null;
  isLoading: boolean;
  prefetchStatus?: PostCommentPrefetchState["status"];
}) {
  if (comments !== null || error || isLoading) {
    return false;
  }

  return prefetchStatus !== "loading" && prefetchStatus !== "ready" && prefetchStatus !== "error";
}
