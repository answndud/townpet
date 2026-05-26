"use client";

import {
  canOpenUserActionMenu,
  canToggleMuteUser,
  UserActionMenu,
} from "@/components/user/user-action-menu";
import {
  COMMENT_REPLY_BADGE_CLASS_NAME,
  MUTED_COMMENT_AUTHOR_NAME,
  MUTED_COMMENT_PLACEHOLDER_TEXT,
  ReactionStatIcon,
  formatCommentDate,
} from "@/components/posts/post-comment-thread-presenter";
import type { CommentItem } from "@/components/posts/post-comment-thread-types";
import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";
import { resolveUserDisplayName } from "@/lib/user-display";

type PostCommentBestItemProps = {
  comment: CommentItem;
  currentUserId?: string;
  currentPage: number;
  canLoadPage: boolean;
  isPending: boolean;
  onBestCommentJump: (comment: CommentItem) => void;
  onUnmute: (commentId: string, userId: string) => void;
  onActionMessage: (message: string | null) => void;
  onAuthorMuteStateChange: (commentId: string) => Promise<void>;
};

export function PostCommentBestItem({
  comment,
  currentUserId,
  currentPage,
  canLoadPage,
  isPending,
  onBestCommentJump,
  onUnmute,
  onActionMessage,
  onAuthorMuteStateChange,
}: PostCommentBestItemProps) {
  const isMutedPlaceholder = Boolean(comment.isMutedByViewer);
  const isGuestComment = Boolean(
    comment.isGuestAuthor || comment.guestAuthorId || comment.guestDisplayName?.trim(),
  );
  const guestAuthorName = resolvePublicGuestDisplayName(comment.guestDisplayName);
  const displayName = isMutedPlaceholder
    ? MUTED_COMMENT_AUTHOR_NAME
    : isGuestComment
      ? guestAuthorName
      : resolveUserDisplayName(comment.author.nickname);
  const authorNode = isMutedPlaceholder || isGuestComment || !canOpenUserActionMenu(currentUserId) ? (
    <span className="tp-text-heading truncate text-[14px] font-semibold leading-5">{displayName}</span>
  ) : (
    <UserActionMenu
      userId={comment.author.id}
      displayName={displayName}
      currentUserId={currentUserId}
      onActionMessage={onActionMessage}
      onMuteStateChange={async () => {
        await onAuthorMuteStateChange(comment.id);
      }}
    />
  );

  return (
    <article
      id={`best-comment-${comment.id}`}
      className="flex flex-col gap-1.5 px-3 py-2.5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="inline-flex h-5 items-center rounded-md bg-[#2f6fda] px-1.5 text-[10px] font-semibold tracking-[0.03em] text-white">
              BEST
            </span>
            {comment.parentId ? (
              <span className={COMMENT_REPLY_BADGE_CLASS_NAME}>답글</span>
            ) : null}
            {authorNode}
            <span suppressHydrationWarning className="tp-text-subtle text-[11px]">
              {formatCommentDate(comment.createdAt)}
            </span>
          </div>
          <p className="tp-text-primary mt-1 overflow-hidden whitespace-pre-line text-[13px] leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {isMutedPlaceholder ? MUTED_COMMENT_PLACEHOLDER_TEXT : comment.content}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
          <div className="tp-text-muted flex items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1">
              <ReactionStatIcon type="LIKE" />
              <span>{comment.likeCount.toLocaleString()}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <ReactionStatIcon type="DISLIKE" />
              <span>{comment.dislikeCount.toLocaleString()}</span>
            </span>
          </div>
          {isMutedPlaceholder && canToggleMuteUser(currentUserId, comment.author.id) ? (
            <button
              type="button"
              className="tp-text-muted inline-flex min-h-10 items-center rounded-md px-2.5 text-[12px] font-medium transition hover:bg-white hover:text-[#2f5da4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
              onClick={() => onUnmute(comment.id, comment.author.id)}
              disabled={isPending}
            >
              뮤트 해제
            </button>
          ) : null}
          {comment.threadPage && (comment.threadPage === currentPage || canLoadPage) ? (
            <button
              type="button"
              className="tp-text-muted inline-flex min-h-10 items-center rounded-md px-2.5 text-[12px] font-medium transition hover:bg-white hover:text-[#2f5da4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
              onClick={() => onBestCommentJump(comment)}
            >
              원댓글로 가기
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
