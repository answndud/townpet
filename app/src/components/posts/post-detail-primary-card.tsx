"use client";

import Link from "next/link";
import { PostStatus } from "@prisma/client";

import { GuestPostDetailActions } from "@/components/posts/guest-post-detail-actions";
import { PostBoardLinkChip } from "@/components/posts/post-board-link-chip";
import { PostBookmarkButton } from "@/components/posts/post-bookmark-button";
import { POST_DETAIL_ACTION_BUTTON_CLASS_NAME } from "@/components/posts/post-detail-action-button-class";
import { PostDetailActions } from "@/components/posts/post-detail-actions";
import { PostDetailMediaGallery } from "@/components/posts/post-detail-media-gallery";
import { PostModerationControls } from "@/components/posts/post-moderation-controls";
import { PostReactionControls } from "@/components/posts/post-reaction-controls";
import { PostReportForm } from "@/components/posts/post-report-form";
import { PostShareControls } from "@/components/posts/post-share-controls";
import { UserActionMenu } from "@/components/user/user-action-menu";
import { extractImageUrlsFromMarkup } from "@/lib/editor-image-markup";
import { renderLiteMarkdown } from "@/lib/markdown-lite";
import { formatRelativeDate } from "@/lib/post-presenter";
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
  const hasInlineImages = extractImageUrlsFromMarkup(post.content).length > 0;

  return (
    <section className="tp-card p-4 sm:p-7">
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

      <div className="tp-border-soft mt-4 border-b pb-4 sm:pb-5">
        <h1 className="tp-text-post-title tp-text-primary">{post.title}</h1>
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="tp-text-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <div className="tp-text-heading min-w-0 break-all font-semibold">
              {isGuestPost ? (
                <span>{displayAuthorName}</span>
              ) : (
                <UserActionMenu
                  userId={post.author.id}
                  displayName={displayAuthorName ?? ""}
                  currentUserId={viewerId ?? undefined}
                  isMutedByViewer={relationState.isMutedByMe}
                  align="start"
                  plainTextClassName="tp-text-heading"
                  onActionMessage={onAuthorActionMessage}
                  onMuteStateChange={onAuthorMuteStateChange}
                />
              )}
            </div>
            <span className="tp-text-subtle">·</span>
            <p className="tp-text-subtle text-[12px]">{formatRelativeDate(createdAt)}</p>
          </div>
          <p className="tp-text-meta tp-text-subtle flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>조회 {resolvedViewCount.toLocaleString()}</span>
            <span>좋아요 {resolvedLikeCount.toLocaleString()}</span>
            <span>댓글 {resolvedCommentCount.toLocaleString()}</span>
          </p>
          {relationMessage ? (
            <p className="tp-text-subtle text-[11px]">{relationMessage}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 sm:mt-6">
        <article className="tp-text-body tp-text-primary">
          {shouldUsePlainFallback ? (
            <div className="whitespace-pre-wrap">{post.content}</div>
          ) : (
            <div
              className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_img]:!ml-0 [&_img]:!mr-auto [&_img]:block [&_img]:border-0 [&_img]:bg-transparent [&_img]:rounded-none"
              dangerouslySetInnerHTML={{ __html: renderedContentHtml }}
            />
          )}
        </article>
        {!hasInlineImages ? <PostDetailMediaGallery images={orderedImages} /> : null}
      </div>

      <div className="tp-border-soft mt-6 space-y-3 border-t pt-4 sm:mt-7 sm:pt-5">
        {isPostActive ? (
          <>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <PostReactionControls
                key={`${post.id}:${canInteract ? "viewer" : "guest"}:${canInteractWithPostOwner ? "interactive" : "blocked"}`}
                postId={post.id}
                likeCount={resolvedLikeCount}
                dislikeCount={resolvedDislikeCount}
                currentReaction={canInteract ? undefined : null}
                canReact={canInteract && canInteractWithPostOwner}
                loginHref={loginHref}
                align="start"
                onStateChange={onReactionStateChange}
              />
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <PostBookmarkButton
                  key={`${post.id}:${canInteract ? "viewer" : "guest"}`}
                  postId={post.id}
                  currentBookmarked={Boolean(post.isBookmarked)}
                  canBookmark={canInteract && canInteractWithPostOwner}
                  loginHref={loginHref}
                  compact
                />
                <PostShareControls url={postUrl} compact />
                {showPostReportControls ? (
                  <button
                    type="button"
                    className="tp-btn-soft tp-btn-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={onTogglePostReportOpen}
                  >
                    {isPostReportOpen ? "신고 닫기" : "신고"}
                  </button>
                ) : null}
              </div>
            </div>
            {showPostReportControls && isPostReportOpen ? (
              <div className="tp-border-soft rounded-lg border bg-white p-3">
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
                <details className="sm:hidden">
                  <summary className={POST_DETAIL_ACTION_BUTTON_CLASS_NAME}>글 관리</summary>
                  <div className="tp-border-soft tp-surface-soft mt-2 flex flex-wrap items-center gap-2 rounded-xl border p-2">
                    <Link
                      href={`/posts/${post.id}/edit`}
                      className={POST_DETAIL_ACTION_BUTTON_CLASS_NAME}
                    >
                      수정
                    </Link>
                    <PostDetailActions postId={post.id} />
                  </div>
                </details>
              </>
            ) : null}
            {!canInteract && isGuestPost ? <GuestPostDetailActions postId={post.id} /> : null}
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
