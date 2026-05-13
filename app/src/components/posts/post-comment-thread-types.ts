import { PostStatus } from "@prisma/client";

export type CommentItem = {
  id: string;
  content: string;
  createdAt: Date | string;
  parentId: string | null;
  threadRootId?: string | null;
  threadPage?: number | null;
  status: PostStatus;
  likeCount: number;
  dislikeCount: number;
  reactions?: Array<{
    type: "LIKE" | "DISLIKE";
  }>;
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  isGuestAuthor?: boolean;
  isMutedByViewer?: boolean;
  author: { id: string; nickname: string | null };
};

export type CommentFormState = {
  [key: string]: string;
};
