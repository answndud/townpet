"use client";

import Link from "next/link";
import { PostStatus } from "@prisma/client";

import { GuestPostDetailActions } from "@/components/posts/guest-post-detail-actions";
import { OperatorContentSourcePanel } from "@/components/posts/operator-content-source-panel";
import { PostBoardLinkChip } from "@/components/posts/post-board-link-chip";
import { PostBookmarkButton } from "@/components/posts/post-bookmark-button";
import { POST_DETAIL_ACTION_BUTTON_CLASS_NAME } from "@/components/posts/post-detail-action-button-class";
import { PostDetailActions } from "@/components/posts/post-detail-actions";
import { PostDetailMediaGallery } from "@/components/posts/post-detail-media-gallery";
import { PostModerationControls } from "@/components/posts/post-moderation-controls";
import { PostReactionControls } from "@/components/posts/post-reaction-controls";
import { PostReportForm } from "@/components/posts/post-report-form";
import { PostShareControls } from "@/components/posts/post-share-controls";
import { DismissibleDetails } from "@/components/ui/dismissible-details";
import { UserActionMenu } from "@/components/user/user-action-menu";
import { renderLiteMarkdown } from "@/lib/markdown-lite";
import { formatKoreanDate } from "@/lib/date-format";
import { typeMeta } from "@/components/posts/post-detail-presenter";
import type { PostDetailItem, RelationState } from "@/components/posts/post-detail-types";

type PostDetailPrimaryCardProps = {
  post: PostDetailItem;
  viewerId: string | null;
  createdAt: Date;
  relationState: RelationState;
  relationMessage: string | null;
  displayAuthorName: string | null;
  isGuestPost: boolean;
  isAuthor: boolean;
  isPostActive: boolean;
  canInteract: boolean;
  canInteractWithPostOwner: boolean;
  canModeratePost: boolean;
  canReportPost: boolean;
  showPostReportControls: boolean;
  isPostReportOpen: boolean;
  loginHref: string;
  postUrl: string;
  resolvedViewCount: number;
  resolvedLikeCount: number;
  resolvedDislikeCount: number;
  resolvedCommentCount: number;
  onTogglePostReportOpen: () => void;
  onReactionStateChange: (state: { likeCount: number; dislikeCount: number }) => void;
  onAuthorActionMessage: (message: string | null) => void;
  onAuthorMuteStateChange: (nextMuted: boolean) => void;
  onPostStatusChange: (nextStatus: PostStatus) => void;
};

export function PostDetailPrimaryCard({
  post,
  viewerId,
  createdAt,
  relationState,
  relationMessage,
  displayAuthorName,
  isGuestPost,
  isAuthor,
  isPostActive,
  canInteract,
  canInteractWithPostOwner,
  canModeratePost,
  canReportPost,
  showPostReportControls,
  isPostReportOpen,
  loginHref,
  postUrl,
  resolvedViewCount,
  resolvedLikeCount,
  resolvedDislikeCount,
  resolvedCommentCount,
  onTogglePostReportOpen,
  onReactionStateChange,
  onAuthorActionMessage,
  onAuthorMuteStateChange,
  onPostStatusChange,
}: PostDetailPrimaryCardProps) {
  const meta = typeMeta[post.type];
  const renderedContentHtml = post.renderedContentHtml?.trim()
    ? post.renderedContentHtml
    : renderLiteMarkdown(post.content);
  const renderedContentText = post.renderedContentText?.trim()
    ? post.renderedContentText
    : renderedContentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const shouldUsePlainFallback =
    renderedContentText.length === 0 || renderedContentText.includes("미리보기 내용이 없습니다");
  const orderedImages = [...post.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hasInlineImages = /<img[\s>]/i.test(renderedContentHtml);
  const trimmedAuthorName = displayAuthorName?.trim() ?? "";
  const authorDisplayLabel = isGuestPost
    ? trimmedAuthorName
      ? `비회원 ${trimmedAuthorName}`
      : "비회원 사용자"
    : trimmedAuthorName || "익명";
  const avatarLabel = isGuestPost ? "비" : authorDisplayLabel.slice(0, 1).toUpperCase();
  const showOverflowMenu = showPostReportControls || (!canInteract && isGuestPost);

  return (
    <section className="tp-card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <PostBoardLinkChip type={post.type} label={meta.label} chipClass={meta.chipClass} />
          {post.neighborhood ? (
            <span className="tp-chip-base tp-chip-muted">
              {post.neighborhood.city} {post.neighborhood.name}
            </span>
          ) : null}
          {post.status === PostStatus.HIDDEN ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
              운영 숨김 상태
            </span>
          ) : null}
        </div>
        {showOverflowMenu ? (
          <DismissibleDetails className="relative shrink-0">
            <summary
              aria-label="게시글 더보기"
              className="tp-text-muted inline-flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center text-[16px] leading-none transition hover:text-[#1f4f8f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
            >
              ···
            </summary>
            <div className="tp-border-muted absolute right-0 z-20 mt-1.5 min-w-[260px] rounded-md border bg-white p-1.5 shadow-[0_8px_18px_rgba(16,40,74,0.08)]">
              {showPostReportControls ? (
                <button
                  type="button"
                  className="flex min-h-10 w-full items-center rounded px-3 text-left text-[12px] font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-1"
                  onClick={onTogglePostReportOpen}
                  data-dismissible-details-close
                >
                  {isPostReportOpen ? "신고 닫기" : "게시글 신고"}
                </button>
              ) : null}
              {!canInteract && isGuestPost ? <GuestPostDetailActions postId={post.id} /> : null}
            </div>
          </DismissibleDetails>
        ) : null}
      </div>

      <div className="tp-border-soft mt-4 border-b pb-3 sm:pb-4">
        <h1 className="tp-text-post-title tp-text-primary">{post.title}</h1>
        <div className="mt-3 flex items-start gap-2.5">
          <div className="tp-surface-alt tp-text-accent flex size-[34px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
            {avatarLabel}
          </div>
          <div className="min-w-0">
            <div className="tp-text-heading min-w-0 break-all text-[14px] font-semibold leading-5">
              {isGuestPost ? (
                <span>{authorDisplayLabel}</span>
              ) : (
                <UserActionMenu
                  userId={post.author.id}
                  displayName={authorDisplayLabel}
                  currentUserId={viewerId ?? undefined}
                  isMutedByViewer={relationState.isMutedByMe}
                  align="start"
                  plainTextClassName="tp-text-heading"
                  onActionMessage={onAuthorActionMessage}
                  onMuteStateChange={onAuthorMuteStateChange}
                />
              )}
            </div>
            <p className="tp-text-subtle mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
              <span suppressHydrationWarning>{formatKoreanDate(createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span>조회 {resolvedViewCount.toLocaleString()}</span>
              <span aria-hidden="true">·</span>
              <span>댓글 {resolvedCommentCount.toLocaleString()}</span>
            </p>
          </div>
        </div>
        {relationMessage ? (
          <p className="tp-text-subtle mt-2 text-[11px]">{relationMessage}</p>
        ) : null}
      </div>

      {post.isOperatorContent ? (
        <OperatorContentSourcePanel
          postId={post.id}
          sourceName={post.operatorSourceName}
          sourceUrl={post.operatorSourceUrl}
          lastVerifiedAt={post.operatorLastVerifiedAt}
        />
      ) : null}

      <div className="mt-4 sm:mt-5">
        <article className="tp-text-body tp-text-primary max-w-[760px]">
          {shouldUsePlainFallback ? (
            <div className="whitespace-pre-wrap">{post.content}</div>
          ) : (
            <div
              className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_img]:!ml-0 [&_img]:!mr-auto [&_img]:my-3 [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:max-w-full sm:[&_img]:max-w-[640px] [&_img]:rounded-lg [&_img]:border-0 [&_img]:bg-transparent [&_img]:object-contain"
              dangerouslySetInnerHTML={{ __html: renderedContentHtml }}
            />
          )}
        </article>
        {!hasInlineImages ? <PostDetailMediaGallery images={orderedImages} /> : null}
      </div>

      <div className="tp-border-soft mt-4 space-y-2.5 border-t pt-3 sm:mt-5 sm:pt-4">
        {isPostActive ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PostReactionControls
                key={`${post.id}:${canInteract ? "viewer" : "guest"}:${canInteractWithPostOwner ? "interactive" : "blocked"}`}
                postId={post.id}
                likeCount={resolvedLikeCount}
                dislikeCount={resolvedDislikeCount}
                currentReaction={canInteract ? undefined : null}
                canReact={canInteract && canInteractWithPostOwner}
                loginHref={loginHref}
                align="start"
                compact
                onStateChange={onReactionStateChange}
              />
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <PostBookmarkButton
                  key={`${post.id}:${canInteract ? "viewer" : "guest"}`}
                  postId={post.id}
                  currentBookmarked={Boolean(post.isBookmarked)}
                  canBookmark={canInteract && canInteractWithPostOwner}
                  loginHref={loginHref}
                  compact
                />
                <PostShareControls url={postUrl} compact />
              </div>
            </div>
            {showPostReportControls && isPostReportOpen ? (
              <div className="tp-border-soft border-t pt-3">
                <PostReportForm targetId={post.id} />
              </div>
            ) : null}
            {isAuthor ? (
              <>
                <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
                  <Link
                    href={`/posts/${post.id}/edit`}
                    className={POST_DETAIL_ACTION_BUTTON_CLASS_NAME}
                  >
                    수정
                  </Link>
                  <PostDetailActions postId={post.id} />
                </div>
                <DismissibleDetails className="sm:hidden">
                  <summary className={POST_DETAIL_ACTION_BUTTON_CLASS_NAME}>글 관리</summary>
                  <div className="tp-border-soft mt-2 flex flex-wrap items-center gap-2 border-t pt-2">
                    <Link
                      href={`/posts/${post.id}/edit`}
                      className={POST_DETAIL_ACTION_BUTTON_CLASS_NAME}
                      data-dismissible-details-close
                    >
                      수정
                    </Link>
                    <PostDetailActions postId={post.id} />
                  </div>
                </DismissibleDetails>
              </>
            ) : null}
          </>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
            이 게시글은 현재 숨김 상태입니다. 관리자 검토용으로만 열람되며, 반응/북마크/신고/댓글
            작성은 비활성화됩니다.
          </div>
        )}
        {canModeratePost ? (
          <PostModerationControls
            postId={post.id}
            postTitle={post.title}
            currentStatus={post.status}
            onStatusChange={onPostStatusChange}
          />
        ) : null}
      </div>

      {isPostActive && canInteract && !isAuthor && !canInteractWithPostOwner ? (
        <div className="mt-4 border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          차단 관계에서는 {canReportPost ? "댓글/반응/신고" : "댓글/반응"} 기능을 사용할 수 없습니다.
        </div>
      ) : null}
    </section>
  );
}
