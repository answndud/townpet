"use client";

import { useRouter } from "next/navigation";
import { ReportTarget } from "@prisma/client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  canUseCommentReaction,
  CommentReactionControls,
} from "@/components/posts/comment-reaction-controls";
import { LinkifiedContent } from "@/components/content/linkified-content";
import { PostCommentBestItem } from "@/components/posts/post-comment-best-item";
import {
  POST_COMMENT_FORM_FIELD_CLASS_NAME,
  POST_COMMENT_FORM_PANEL_CLASS_NAME,
  POST_COMMENT_THREAD_CARD_CLASS_NAME,
  POST_COMMENT_THREAD_ACTIONS_CLASS_NAME,
  POST_COMMENT_THREAD_FOOTER_CLASS_NAME,
  POST_COMMENT_THREAD_META_ROW_CLASS_NAME,
  POST_COMMENT_THREAD_REPLY_CARD_CLASS_NAME,
  POST_COMMENT_REPLY_GUIDE_CLASS_NAME,
} from "@/components/posts/post-comment-layout-class";
import { PostCommentPagination } from "@/components/posts/post-comment-pagination";
import { PostCommentRootForm } from "@/components/posts/post-comment-root-form";
import { PostReportForm } from "@/components/posts/post-report-form";
import {
  COMMENT_BORDER_CLASS_NAME,
  COMMENT_DIVIDER_CLASS_NAME,
  COMMENT_REPLY_BADGE_CLASS_NAME,
  MUTED_COMMENT_AUTHOR_NAME,
  MUTED_COMMENT_PLACEHOLDER_TEXT,
  formatCommentDate,
  handleCommentSubmitShortcut,
} from "@/components/posts/post-comment-thread-presenter";
import type {
  CommentFormState,
  CommentItem,
} from "@/components/posts/post-comment-thread-types";
import {
  canOpenUserActionMenu,
  canToggleMuteUser,
  shouldCloseUserActionMenu,
  UserActionMenu,
} from "@/components/user/user-action-menu";
import { getClientFingerprint, getGuestFingerprint } from "@/lib/guest-client";
import { getGuestWriteHeaders } from "@/lib/guest-step-up.client";
import { COMMENT_CONTENT_MAX_LENGTH } from "@/lib/input-limits";
import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";
import { resolveUserDisplayName } from "@/lib/user-display";
import {
  createCommentAction,
  deleteCommentAction,
  updateCommentAction,
} from "@/server/actions/comment";
import { unmuteUserAction } from "@/server/actions/user-relation";

type PostCommentThreadProps = {
  postId: string;
  comments: CommentItem[];
  bestComments: CommentItem[];
  totalCommentCount: number;
  currentPage: number;
  totalPages: number;
  currentUserId?: string;
  canInteract?: boolean;
  loginHref?: string;
  onCommentsChanged?: (page?: number) => Promise<void>;
  interactionDisabledMessage?: string;
};

export const shouldCloseCommentAuthorMenu = shouldCloseUserActionMenu;
export const canOpenCommentAuthorMenu = canOpenUserActionMenu;
export const canMuteCommentAuthor = canToggleMuteUser;

export function PostCommentThread({
  postId,
  comments,
  bestComments,
  totalCommentCount,
  currentPage,
  totalPages,
  currentUserId,
  canInteract = true,
  loginHref = "/login",
  onCommentsChanged,
  interactionDisabledMessage,
}: PostCommentThreadProps) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState<Record<string, boolean>>({});
  const [reportOpen, setReportOpen] = useState<Record<string, boolean>>({});
  const [replyContent, setReplyContent] = useState<CommentFormState>({});
  const [editContent, setEditContent] = useState<CommentFormState>({});
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
  const [guestActionPassword, setGuestActionPassword] = useState<Record<string, string>>({});
  const [guestActionPrompt, setGuestActionPrompt] = useState<Record<string, "EDIT" | "DELETE" | null>>({});
  const [guestDisplayName, setGuestDisplayName] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [pendingBestCommentJump, setPendingBestCommentJump] = useState<{
    id: string;
    page: number;
  } | null>(null);
  const [pendingRelationFocusCommentId, setPendingRelationFocusCommentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const actionLockRef = useRef(false);
  const canComment = canInteract || !currentUserId;

  const repliesMap = useMemo(() => {
    const map = new Map<string, CommentItem[]>();
    for (const comment of comments) {
      if (!comment.parentId) continue;
      const list = map.get(comment.parentId) ?? [];
      list.push(comment);
      map.set(comment.parentId, list);
    }
    return map;
  }, [comments]);

  const roots = useMemo(() => comments.filter((comment) => comment.parentId === null), [comments]);

  const hasBestComments = bestComments.length > 0;

  useEffect(() => {
    if (!pendingBestCommentJump || typeof document === "undefined") {
      return;
    }

    if (currentPage !== pendingBestCommentJump.page) {
      return;
    }

    const targetElement = document.getElementById(`comment-${pendingBestCommentJump.id}`);
    if (!targetElement) {
      setMessage("원댓글을 찾을 수 없습니다.");
      setPendingBestCommentJump(null);
      return;
    }

    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#comment-${pendingBestCommentJump.id}`);
    }
    setPendingBestCommentJump(null);
  }, [comments, currentPage, pendingBestCommentJump]);

  useEffect(() => {
    if (!pendingRelationFocusCommentId || typeof document === "undefined") {
      return;
    }

    const targetElement =
      document.getElementById(`comment-${pendingRelationFocusCommentId}`) ??
      document.getElementById(`best-comment-${pendingRelationFocusCommentId}`);

    if (!targetElement) {
      return;
    }

    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    setPendingRelationFocusCommentId(null);
  }, [bestComments, comments, pendingRelationFocusCommentId]);

  const handleBestCommentJump = async (comment: CommentItem) => {
    const targetPage = comment.threadPage ?? currentPage;
    setPendingBestCommentJump({
      id: comment.id,
      page: targetPage,
    });

    if (targetPage !== currentPage && onCommentsChanged) {
      await onCommentsChanged(targetPage);
    }
  };

  const refreshCommentsForRelationChange = async (commentId: string) => {
    setPendingRelationFocusCommentId(commentId);

    if (onCommentsChanged) {
      await onCommentsChanged(currentPage);
      return;
    }

    router.refresh();
  };

  const handleUnmute = (commentId: string, userId: string) => {
    startTransition(async () => {
      const result = await unmuteUserAction(
        { targetUserId: userId },
        { revalidate: false },
      );
      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("사용자 뮤트를 해제했습니다.");
      await refreshCommentsForRelationChange(commentId);
    });
  };

  const handleCreate = (parentId?: string) => {
    if (actionLockRef.current) {
      return;
    }

    if (!canComment) {
      setMessage("현재 상태에서는 댓글을 작성할 수 없습니다.");
      return;
    }

    const content = parentId ? replyContent[parentId] : replyContent.root;
    if (!content) return;
    if (!currentUserId) {
      if (!guestDisplayName.trim()) {
        const nextMessage = "비회원 닉네임을 입력해 주세요.";
        setMessage(nextMessage);
        window.alert(nextMessage);
        return;
      }
      if (!guestPassword.trim()) {
        const nextMessage = "댓글 비밀번호를 입력해 주세요.";
        setMessage(nextMessage);
        window.alert(nextMessage);
        return;
      }
    }

    actionLockRef.current = true;
    startTransition(async () => {
      setMessage(null);
      try {
        const result = currentUserId
          ? await createCommentAction(postId, { content }, parentId, {
              clientFingerprint: getClientFingerprint(),
            })
          : await (async () => {
              try {
                const guestHeaders = await getGuestWriteHeaders("comment:create");
                const response = await fetch(`/api/posts/${postId}/comments`, {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                    ...guestHeaders,
                  },
                  body: JSON.stringify({
                    content,
                    parentId,
                    guestDisplayName,
                    guestPassword,
                  }),
                });
                const payload = (await response.json()) as {
                  ok: boolean;
                  error?: { message?: string };
                };

                if (response.ok && payload.ok) {
                  return { ok: true } as const;
                }

                return {
                  ok: false,
                  message: payload.error?.message ?? "댓글 등록에 실패했습니다.",
                } as const;
              } catch (guestError) {
                return {
                  ok: false,
                  message:
                    guestError instanceof Error && guestError.message.trim().length > 0
                      ? guestError.message
                      : "네트워크 오류가 발생했습니다.",
                } as const;
              }
            })();

        if (!result.ok) {
          setMessage(result.message);
          if (!currentUserId) {
            window.alert(result.message);
          }
          return;
        }

        setReplyContent((prev) => ({ ...prev, [parentId ?? "root"]: "" }));
        if (parentId) {
          setReplyOpen((prev) => ({ ...prev, [parentId]: false }));
          setCollapsedReplies((prev) => ({ ...prev, [parentId]: false }));
        }
        if (onCommentsChanged) {
          const nextPage = parentId ? currentPage : 1;
          await onCommentsChanged(nextPage);
        }
        router.refresh();
      } finally {
        actionLockRef.current = false;
      }
    });
  };

  const handleUpdate = (commentId: string, isGuestComment: boolean) => {
    if (actionLockRef.current) {
      return;
    }

    if (!canInteract && !isGuestComment) {
      setMessage("로그인 후 댓글을 수정할 수 있습니다.");
      return;
    }

    const content = editContent[commentId];
    if (!content) return;

    actionLockRef.current = true;
    startTransition(async () => {
      setMessage(null);
      try {
        const result = !isGuestComment
          ? await updateCommentAction(postId, commentId, { content })
          : await (async () => {
              const password = (guestActionPassword[commentId] ?? "").trim();
              if (!password) {
                return { ok: false, message: "비밀번호가 필요합니다." } as const;
              }

              const response = await fetch(`/api/comments/${commentId}`, {
                method: "PATCH",
                headers: {
                  "content-type": "application/json",
                  "x-guest-fingerprint": getGuestFingerprint(),
                },
                body: JSON.stringify({ content, guestPassword: password }),
              });
              const payload = (await response.json()) as {
                ok: boolean;
                error?: { message?: string };
              };

              if (response.ok && payload.ok) {
                return { ok: true } as const;
              }

              return {
                ok: false,
                message: payload.error?.message ?? "댓글 수정에 실패했습니다.",
              } as const;
            })();

        if (!result.ok) {
          setMessage(result.message);
          if (isGuestComment) {
            window.alert(result.message);
          }
          return;
        }

        setEditOpen((prev) => ({ ...prev, [commentId]: false }));
        if (onCommentsChanged) {
          await onCommentsChanged(currentPage);
        }
        router.refresh();
      } finally {
        actionLockRef.current = false;
      }
    });
  };

  const handleDelete = (
    commentId: string,
    isGuestComment: boolean,
    overridePassword?: string,
  ) => {
    if (actionLockRef.current) {
      return;
    }

    if (!canInteract && !isGuestComment) {
      setMessage("로그인 후 댓글을 삭제할 수 있습니다.");
      return;
    }

    actionLockRef.current = true;
    startTransition(async () => {
      setMessage(null);
      try {
        const result = !isGuestComment
          ? await deleteCommentAction(postId, commentId)
          : await (async () => {
              const password = (overridePassword ?? guestActionPassword[commentId] ?? "").trim();
              if (!password) {
                return { ok: false, message: "비밀번호가 필요합니다." } as const;
              }

              const response = await fetch(`/api/comments/${commentId}`, {
                method: "DELETE",
                headers: {
                  "content-type": "application/json",
                  "x-guest-fingerprint": getGuestFingerprint(),
                },
                body: JSON.stringify({ guestPassword: password }),
              });
              const payload = (await response.json()) as {
                ok: boolean;
                error?: { message?: string };
              };
              if (response.ok && payload.ok) {
                return { ok: true } as const;
              }
              return {
                ok: false,
                message: payload.error?.message ?? "댓글 삭제에 실패했습니다.",
              } as const;
            })();

        if (!result.ok) {
          setMessage(result.message);
          if (isGuestComment) {
            window.alert(result.message);
          }
          return;
        }

        setGuestActionPrompt((prev) => ({ ...prev, [commentId]: null }));
        if (onCommentsChanged) {
          await onCommentsChanged(currentPage);
        }
        router.refresh();
      } finally {
        actionLockRef.current = false;
      }
    });
  };

  const confirmGuestAction = (commentId: string, action: "EDIT" | "DELETE") => {
    const password = (guestActionPassword[commentId] ?? "").trim();
    if (!password) {
      setMessage("댓글 비밀번호를 입력해 주세요.");
      return;
    }

    if (action === "EDIT") {
      setGuestActionPrompt((prev) => ({ ...prev, [commentId]: null }));
      setEditOpen((prev) => ({ ...prev, [commentId]: true }));
      return;
    }

    void handleDelete(commentId, true, password);
  };

  const renderComment = (comment: CommentItem, depth = 0) => {
    const replies = repliesMap.get(comment.id) ?? [];
    const isDeleted = comment.status === "DELETED";
    const isMutedPlaceholder = Boolean(comment.isMutedByViewer) && !isDeleted;
    const isGuestComment = Boolean(
      comment.isGuestAuthor || comment.guestAuthorId || comment.guestDisplayName?.trim(),
    );
    const guestAuthorName = resolvePublicGuestDisplayName(comment.guestDisplayName);
    const isAuthor = currentUserId && comment.author.id === currentUserId;
    const hasActiveReply = replies.some((reply) => reply.status === "ACTIVE");
    const canEdit =
      !isMutedPlaceholder && (isAuthor || isGuestComment) && !hasActiveReply && comment.status === "ACTIVE";
    const canOpenMenu = !isDeleted && !isMutedPlaceholder && canEdit;
    const canReply = !isMutedPlaceholder && canComment && comment.status === "ACTIVE";
    const canReport = Boolean(currentUserId) && !isMutedPlaceholder && comment.status === "ACTIVE" && !isAuthor;
    const canReactToComment = canUseCommentReaction({
      currentUserId,
      canInteract,
      isCommentActive: comment.status === "ACTIVE" && !isMutedPlaceholder,
    });
    const displayName = isMutedPlaceholder
      ? MUTED_COMMENT_AUTHOR_NAME
      : isGuestComment
        ? guestAuthorName
        : resolveUserDisplayName(comment.author.nickname);
    const avatarText = (isMutedPlaceholder ? "뮤" : displayName.slice(0, 1)).toUpperCase();
    const actionLinkClass =
      "tp-text-muted inline-flex min-h-10 items-center rounded-md px-3 text-[12px] font-medium transition hover:bg-[#f4f8ff] hover:text-[#2f5da4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
    const commentCardClassName =
      depth > 0
        ? `flex gap-2.5 ${POST_COMMENT_THREAD_REPLY_CARD_CLASS_NAME}`
        : "flex gap-3 px-1 py-3.5";
    const commentBodyText = isDeleted
      ? "삭제된 댓글입니다."
      : isMutedPlaceholder
        ? MUTED_COMMENT_PLACEHOLDER_TEXT
        : comment.content;

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={depth > 0 ? "mt-2" : undefined}
      >
        <article
          data-testid={`post-comment-item-${comment.id}`}
          className={commentCardClassName}
        >
          <div className="tp-surface-alt tp-text-accent mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
            {avatarText}
          </div>

          <div className="min-w-0 flex-1">
            <header className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className={POST_COMMENT_THREAD_META_ROW_CLASS_NAME}>
                  {isMutedPlaceholder || isGuestComment || !canOpenCommentAuthorMenu(currentUserId) ? (
                    <p className="tp-text-heading truncate text-[14px] font-semibold leading-5">
                      {displayName}
                    </p>
                  ) : (
                    <UserActionMenu
                      userId={comment.author.id}
                      displayName={displayName}
                      currentUserId={currentUserId}
                      onActionMessage={setMessage}
                      onMuteStateChange={async () => {
                        await refreshCommentsForRelationChange(comment.id);
                      }}
                      plainTextClassName="tp-text-heading truncate text-[14px] font-semibold leading-5"
                    />
                  )}
                    <p suppressHydrationWarning className="tp-text-subtle text-[11px]">
                      {formatCommentDate(comment.createdAt)}
                    </p>
                  {comment.parentId ? (
                    <span className={COMMENT_REPLY_BADGE_CLASS_NAME}>답글</span>
                  ) : null}
                </div>
              </div>

              {!isDeleted && !isMutedPlaceholder ? (
                <div className="ml-auto shrink-0">
                  {canOpenMenu ? (
                    <details className="relative">
                      <summary className="tp-text-muted inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-[15px] leading-none hover:bg-[#f1f5fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2">
                        ···
                      </summary>
                      <div className="tp-border-muted absolute right-0 z-20 mt-1.5 min-w-24 rounded-md border bg-white p-1 shadow-[0_8px_18px_rgba(16,40,74,0.08)]">
                        {canEdit ? (
                          <>
                            <button
                              type="button"
                              className="tp-text-heading flex min-h-10 w-full items-center rounded px-3 text-left text-[12px] font-medium hover:bg-[#f5f9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1"
                              onClick={() => {
                                if (isGuestComment) {
                                  setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: "EDIT" }));
                                  return;
                                }
                                setEditOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }));
                              }}
                              disabled={isPending}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className="flex min-h-10 w-full items-center rounded px-3 text-left text-[12px] font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-1"
                              onClick={() => {
                                if (isGuestComment) {
                                  setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: "DELETE" }));
                                  return;
                                }
                                void handleDelete(comment.id, false);
                              }}
                              disabled={isPending}
                            >
                              삭제
                            </button>
                          </>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}
              {!isDeleted && isMutedPlaceholder && canMuteCommentAuthor(currentUserId, comment.author.id) ? (
                <button
                  type="button"
                  className="tp-text-muted inline-flex min-h-10 shrink-0 items-center rounded-md px-3 text-[12px] font-medium transition hover:bg-white hover:text-[#2f5da4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
                  onClick={() => handleUnmute(comment.id, comment.author.id)}
                  disabled={isPending}
                >
                  뮤트 해제
                </button>
              ) : null}
            </header>

            <div
              className={`mt-1.5 text-[14px] leading-6 ${
                isDeleted || isMutedPlaceholder ? "tp-text-placeholder" : "tp-text-primary"
              }`}
            >
              <LinkifiedContent
                text={commentBodyText}
                showYoutubeEmbeds={!isDeleted && !isMutedPlaceholder}
              />
            </div>

            {!isDeleted && (canReply || canReport || (depth === 0 && replies.length > 0) || !isMutedPlaceholder) ? (
              <div className={POST_COMMENT_THREAD_FOOTER_CLASS_NAME}>
                <div className={POST_COMMENT_THREAD_ACTIONS_CLASS_NAME}>
                  {canReply ? (
                    <button
                      type="button"
                      className={actionLinkClass}
                      onClick={() =>
                        setReplyOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
                      }
                    >
                      {replyOpen[comment.id] ? "답글 취소" : "답글"}
                    </button>
                  ) : null}
                  {canReport ? (
                    <button
                      type="button"
                      className={actionLinkClass}
                      onClick={() =>
                        setReportOpen((prev) => ({
                          ...prev,
                          [comment.id]: !prev[comment.id],
                        }))
                      }
                    >
                      {reportOpen[comment.id] ? "신고 닫기" : "신고"}
                    </button>
                  ) : null}
                  {depth === 0 && replies.length > 0 ? (
                    <button
                      type="button"
                      className={actionLinkClass}
                      onClick={() =>
                        setCollapsedReplies((prev) => ({
                          ...prev,
                          [comment.id]: !prev[comment.id],
                        }))
                      }
                    >
                      {collapsedReplies[comment.id] ? `답글 ${replies.length}` : "접기"}
                    </button>
                  ) : null}
                </div>

                {!isMutedPlaceholder ? (
                  <CommentReactionControls
                    key={`${comment.id}:${comment.likeCount}:${comment.dislikeCount}:${comment.reactions?.[0]?.type ?? "NONE"}`}
                    postId={postId}
                    commentId={comment.id}
                    likeCount={comment.likeCount}
                    dislikeCount={comment.dislikeCount}
                    currentReaction={comment.reactions?.[0]?.type ?? null}
                    canReact={canReactToComment}
                    loginHref={loginHref}
                    compact
                    className="w-full justify-start sm:w-auto sm:justify-end"
                    loginHintAlign="end"
                  />
                ) : null}
              </div>
            ) : null}

            {reportOpen[comment.id] ? (
              <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} mt-2 p-2.5`}>
                <PostReportForm
                  targetId={comment.id}
                  targetType={ReportTarget.COMMENT}
                  canReport={Boolean(currentUserId)}
                  loginHref={loginHref}
                />
              </div>
            ) : null}

            {canReply && replyOpen[comment.id] ? (
              <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} mt-2 p-2`}>
                {!currentUserId ? (
                  <div className="mb-1.5 grid gap-1.5 sm:grid-cols-2">
                    <input
                      className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-11 w-full px-3 py-2 text-[14px] sm:min-h-10 sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
                      value={guestDisplayName}
                      onChange={(event) => setGuestDisplayName(event.target.value)}
                      placeholder="비회원 닉네임"
                      maxLength={24}
                    />
                    <input
                      className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-11 w-full px-3 py-2 text-[14px] sm:min-h-10 sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
                      type="password"
                      value={guestPassword}
                      onChange={(event) => setGuestPassword(event.target.value)}
                      placeholder="댓글 비밀번호"
                      maxLength={32}
                    />
                  </div>
                ) : null}
                <textarea
                  className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-20 w-full px-3 py-2 text-[14px] sm:min-h-[56px] sm:px-2.5 sm:py-1.5 sm:text-[13px]`}
                  value={replyContent[comment.id] ?? ""}
                  onChange={(event) =>
                    setReplyContent((prev) => ({
                      ...prev,
                      [comment.id]: event.target.value,
                    }))
                  }
                  maxLength={COMMENT_CONTENT_MAX_LENGTH}
                  onKeyDown={(event) =>
                    handleCommentSubmitShortcut(event, () => handleCreate(comment.id))
                  }
                  placeholder="답글을 입력하세요"
                />
                <div className="mt-1.5 flex justify-end gap-1.5">
                  <button
                    type="button"
                    className="tp-btn-soft inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold"
                    onClick={() =>
                      setReplyOpen((prev) => ({
                        ...prev,
                        [comment.id]: false,
                      }))
                    }
                    disabled={isPending}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="tp-btn-primary inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold"
                    onClick={() => handleCreate(comment.id)}
                    disabled={isPending}
                  >
                    답글 등록
                  </button>
                </div>
              </div>
            ) : null}

            {isGuestComment && guestActionPrompt[comment.id] ? (
              <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} mt-2 p-2`}>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="password"
                    className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-11 px-3 text-[14px] sm:min-h-10 sm:px-2.5 sm:text-[12px]`}
                    placeholder="댓글 비밀번호"
                    value={guestActionPassword[comment.id] ?? ""}
                    onChange={(event) =>
                      setGuestActionPassword((prev) => ({
                        ...prev,
                        [comment.id]: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="tp-btn-primary inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold"
                    onClick={() =>
                      confirmGuestAction(
                        comment.id,
                        guestActionPrompt[comment.id] === "EDIT" ? "EDIT" : "DELETE",
                      )
                    }
                    disabled={isPending}
                  >
                    확인
                  </button>
                  <button
                    type="button"
                    className="tp-btn-soft inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold"
                    onClick={() => setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: null }))}
                    disabled={isPending}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : null}

            {(canInteract || isGuestComment) && editOpen[comment.id] && canEdit ? (
              <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} mt-2 p-2`}>
                <textarea
                  className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-20 w-full px-3 py-2 text-[14px] sm:min-h-[64px] sm:text-[13px]`}
                  value={editContent[comment.id] ?? comment.content}
                  onChange={(event) =>
                    setEditContent((prev) => ({
                      ...prev,
                      [comment.id]: event.target.value,
                    }))
                  }
                  maxLength={COMMENT_CONTENT_MAX_LENGTH}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="tp-btn-primary inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold"
                    onClick={() => handleUpdate(comment.id, isGuestComment)}
                    disabled={isPending}
                  >
                    수정 저장
                  </button>
                </div>
              </div>
            ) : null}

            {replies.length > 0 && !collapsedReplies[comment.id] ? (
              <div className={POST_COMMENT_REPLY_GUIDE_CLASS_NAME}>
                {replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    );
  };

  return (
    <div className={POST_COMMENT_THREAD_CARD_CLASS_NAME}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="tp-text-section-title tp-text-heading">댓글 {totalCommentCount}</h2>
        {!hasBestComments && totalPages > 1 ? (
          <span className="tp-text-label text-[11px]">{currentPage} / {totalPages}</span>
        ) : null}
      </div>
      {message ? (
        <p className="tp-text-subtle mt-2 text-[11px] font-medium" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      {hasBestComments ? (
        <section className="mt-3 sm:mt-4">
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <h3 className="tp-text-heading text-[13px] font-semibold">베스트 댓글</h3>
            <span className="tp-text-label text-[10px]">좋아요 기준</span>
          </div>
          <div className={`${COMMENT_BORDER_CLASS_NAME} overflow-hidden rounded-lg border bg-[#f7fbff]`}>
            <div className={`divide-y ${COMMENT_DIVIDER_CLASS_NAME}`}>
              {bestComments.map((comment) => (
                <PostCommentBestItem
                  key={`best-${comment.id}`}
                  comment={comment}
                  currentUserId={currentUserId}
                  currentPage={currentPage}
                  canLoadPage={Boolean(onCommentsChanged)}
                  isPending={isPending}
                  onBestCommentJump={(targetComment) => {
                    void handleBestCommentJump(targetComment);
                  }}
                  onUnmute={handleUnmute}
                  onActionMessage={setMessage}
                  onAuthorMuteStateChange={refreshCommentsForRelationChange}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {hasBestComments ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 sm:mt-5">
          <h3 className="tp-text-heading text-[12px] font-semibold">최신 댓글</h3>
          {totalPages > 1 ? (
            <span className="tp-text-label text-[11px]">{currentPage} / {totalPages}</span>
          ) : null}
        </div>
      ) : null}

      {roots.length === 0 ? (
        <p className="tp-text-subtle mt-4 text-[13px]">댓글이 없습니다.</p>
      ) : (
        <div className={`mt-3 divide-y border-y bg-white sm:mt-4 ${COMMENT_BORDER_CLASS_NAME} ${COMMENT_DIVIDER_CLASS_NAME}`}>
          {roots.map((comment) => renderComment(comment))}
        </div>
      )}

      <PostCommentPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onCommentsChanged}
      />

      <div className={`${COMMENT_BORDER_CLASS_NAME} mt-3 border-t pt-2.5 sm:mt-4 sm:pt-3`}>
        <PostCommentRootForm
          canComment={canComment}
          currentUserId={currentUserId}
          guestDisplayName={guestDisplayName}
          guestPassword={guestPassword}
          rootContent={replyContent.root ?? ""}
          isPending={isPending}
          loginHref={loginHref}
          interactionDisabledMessage={interactionDisabledMessage}
          onGuestDisplayNameChange={setGuestDisplayName}
          onGuestPasswordChange={setGuestPassword}
          onRootContentChange={(value) =>
            setReplyContent((prev) => ({ ...prev, root: value }))
          }
          onSubmit={() => handleCreate()}
        />
      </div>
    </div>
  );
}
