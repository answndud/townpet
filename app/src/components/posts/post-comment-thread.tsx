"use client";

import { useRouter } from "next/navigation";
import { ReportTarget } from "@prisma/client";
import {
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  canUseCommentReaction,
  CommentReactionControls,
} from "@/components/posts/comment-reaction-controls";
import { LinkifiedContent } from "@/components/content/linkified-content";
import { PostCommentBestItem } from "@/components/posts/post-comment-best-item";
import { DismissibleDetails } from "@/components/ui/dismissible-details";
import {
  POST_COMMENT_INLINE_FORM_ACTION_ROW_CLASS_NAME,
  POST_COMMENT_INLINE_FORM_CANCEL_CLASS_NAME,
  POST_COMMENT_INLINE_FORM_DANGER_CLASS_NAME,
  POST_COMMENT_INLINE_FORM_INPUT_CLASS_NAME,
  POST_COMMENT_INLINE_FORM_PASSWORD_INPUT_CLASS_NAME,
  POST_COMMENT_INLINE_FORM_PASSWORD_ROW_CLASS_NAME,
  POST_COMMENT_INLINE_FORM_ROW_CLASS_NAME,
  POST_COMMENT_INLINE_FORM_SECTION_CLASS_NAME,
  POST_COMMENT_INLINE_FORM_TEXTAREA_CLASS_NAME,
  POST_COMMENT_BEST_SECTION_CLASS_NAME,
  POST_COMMENT_LATEST_HEADER_CLASS_NAME,
  POST_COMMENT_PENDING_PREVIEW_BODY_CLASS_NAME,
  POST_COMMENT_PENDING_PREVIEW_CLASS_NAME,
  POST_COMMENT_ROOT_LIST_CLASS_NAME,
  POST_COMMENT_ROOT_COMPOSER_WRAPPER_CLASS_NAME,
  POST_COMMENT_ROOT_FORM_SUBMIT_CLASS_NAME,
  POST_COMMENT_THREAD_AVATAR_CLASS_NAME,
  POST_COMMENT_THREAD_BODY_CLASS_NAME,
  POST_COMMENT_THREAD_CARD_CLASS_NAME,
  POST_COMMENT_THREAD_ACTIONS_CLASS_NAME,
  POST_COMMENT_THREAD_FOOTER_CLASS_NAME,
  POST_COMMENT_THREAD_MENU_BUTTON_CLASS_NAME,
  POST_COMMENT_THREAD_MENU_DANGER_ITEM_CLASS_NAME,
  POST_COMMENT_THREAD_MENU_ITEM_CLASS_NAME,
  POST_COMMENT_THREAD_MENU_PANEL_CLASS_NAME,
  POST_COMMENT_THREAD_META_ROW_CLASS_NAME,
  POST_COMMENT_THREAD_ROOT_CARD_CLASS_NAME,
  POST_COMMENT_THREAD_REPLY_CARD_CLASS_NAME,
  POST_COMMENT_THREAD_SIGHTING_META_CLASS_NAME,
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
import { formatKoreanIsoDateTime } from "@/lib/date-format";
import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";
import { resolveUserDisplayName } from "@/lib/user-display";
import {
  buildLostFoundSightingCreatedEvent,
  buildLostFoundSightingModeSelectedEvent,
  buildLostFoundSightingSubmitAttemptedEvent,
} from "@/lib/lost-found-acquisition-events";
import { sendAcquisitionEvent } from "@/lib/acquisition-tracking";
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
  lostFoundSightingEnabled?: boolean;
  currentUserId?: string;
  canInteract?: boolean;
  loginHref?: string;
  onCommentsChanged?: (page?: number) => Promise<void>;
  interactionDisabledMessage?: string;
};

export const shouldCloseCommentAuthorMenu = shouldCloseUserActionMenu;
export const canOpenCommentAuthorMenu = canOpenUserActionMenu;
export const canMuteCommentAuthor = canToggleMuteUser;
export const shouldRefreshCommentRoute = (onCommentsChanged?: PostCommentThreadProps["onCommentsChanged"]) =>
  !onCommentsChanged;
const COMMENT_INLINE_FORM_SECTION_CLASS_NAME = POST_COMMENT_INLINE_FORM_SECTION_CLASS_NAME;
const COMMENT_PANEL_REPLY_IGNORE_SELECTOR =
  "a, button, input, textarea, select, summary, details, form, [role='button'], [data-comment-panel-ignore]";

export function shouldIgnoreCommentPanelReplyClick(
  target: EventTarget | null,
  currentTarget: EventTarget | null,
) {
  const closest =
    target && "closest" in target && typeof target.closest === "function"
      ? target.closest.bind(target)
      : null;

  if (!closest) {
    return true;
  }

  const ignoredAncestor = closest(COMMENT_PANEL_REPLY_IGNORE_SELECTOR) as EventTarget | null;

  return Boolean(ignoredAncestor && ignoredAncestor !== currentTarget);
}

export function PostCommentThread({
  postId,
  comments,
  bestComments,
  totalCommentCount,
  currentPage,
  totalPages,
  lostFoundSightingEnabled = false,
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
  const [rootCommentMode, setRootCommentMode] = useState<"GENERAL" | "LOST_FOUND_SIGHTING">(
    lostFoundSightingEnabled ? "LOST_FOUND_SIGHTING" : "GENERAL",
  );
  const [sightingLocation, setSightingLocation] = useState("");
  const [sightingSeenAt, setSightingSeenAt] = useState("");
  const [sightingImageUrl, setSightingImageUrl] = useState("");
  const [isPrivateSighting, setIsPrivateSighting] = useState(false);
  const [pendingBestCommentJump, setPendingBestCommentJump] = useState<{
    id: string;
    page: number;
  } | null>(null);
  const [pendingRelationFocusCommentId, setPendingRelationFocusCommentId] = useState<string | null>(null);
  const [pendingCommentPreview, setPendingCommentPreview] = useState<{
    content: string;
    displayName: string;
    parentId: string | null;
  } | null>(null);
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

  const refreshCommentsAfterMutation = async (page?: number) => {
    if (onCommentsChanged) {
      await onCommentsChanged(page);
      return;
    }

    if (shouldRefreshCommentRoute(onCommentsChanged)) {
      router.refresh();
    }
  };

  const trackLostFoundSightingEvent = (
    builder: (trackedPostId: string) => Parameters<typeof sendAcquisitionEvent>[0],
  ) => {
    if (!lostFoundSightingEnabled) {
      return;
    }

    void sendAcquisitionEvent(builder(postId));
  };

  const handleRootCommentModeChange = (mode: "GENERAL" | "LOST_FOUND_SIGHTING") => {
    setRootCommentMode(mode);
    if (mode === "LOST_FOUND_SIGHTING") {
      trackLostFoundSightingEvent(buildLostFoundSightingModeSelectedEvent);
    }
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
    const isSightingComment =
      !parentId && lostFoundSightingEnabled && rootCommentMode === "LOST_FOUND_SIGHTING";
    if (!content) return;
    if (isSightingComment) {
      trackLostFoundSightingEvent(buildLostFoundSightingSubmitAttemptedEvent);
    }
    if (isSightingComment && !sightingLocation.trim()) {
      const nextMessage = "목격 위치를 입력해 주세요.";
      setMessage(nextMessage);
      window.alert(nextMessage);
      return;
    }
    if (isSightingComment && !sightingSeenAt) {
      const nextMessage = "목격 시간을 입력해 주세요.";
      setMessage(nextMessage);
      window.alert(nextMessage);
      return;
    }
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
      setPendingCommentPreview({
        content,
        displayName: currentUserId ? "나" : guestDisplayName.trim(),
        parentId: parentId ?? null,
      });
      try {
        const result = currentUserId
          ? await createCommentAction(
              postId,
              {
                content,
                kind: isSightingComment ? "LOST_FOUND_SIGHTING" : "GENERAL",
                sightingLocation: isSightingComment ? sightingLocation : undefined,
                sightingSeenAt: isSightingComment ? sightingSeenAt : undefined,
                sightingImageUrl: isSightingComment ? sightingImageUrl || undefined : undefined,
                isPrivateSighting: isSightingComment ? isPrivateSighting : undefined,
              },
              parentId,
              {
                clientFingerprint: getClientFingerprint(),
              },
            )
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
                    kind: isSightingComment ? "LOST_FOUND_SIGHTING" : "GENERAL",
                    sightingLocation: isSightingComment ? sightingLocation : undefined,
                    sightingSeenAt: isSightingComment ? sightingSeenAt : undefined,
                    sightingImageUrl: isSightingComment ? sightingImageUrl || undefined : undefined,
                    isPrivateSighting: isSightingComment ? isPrivateSighting : undefined,
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
          setPendingCommentPreview(null);
          setMessage(result.message);
          if (!currentUserId) {
            window.alert(result.message);
          }
          return;
        }

        setReplyContent((prev) => ({ ...prev, [parentId ?? "root"]: "" }));
        if (isSightingComment) {
          trackLostFoundSightingEvent(buildLostFoundSightingCreatedEvent);
          setSightingLocation("");
          setSightingSeenAt("");
          setSightingImageUrl("");
          setIsPrivateSighting(false);
        }
        if (parentId) {
          setReplyOpen((prev) => ({ ...prev, [parentId]: false }));
          setCollapsedReplies((prev) => ({ ...prev, [parentId]: false }));
        }
        await refreshCommentsAfterMutation(parentId ? currentPage : 1);
        setMessage(
          isSightingComment
            ? isPrivateSighting
              ? "목격 제보가 등록되었습니다. 위치와 사진은 보호자에게만 공개됩니다."
              : "목격 제보가 등록되었습니다. 공개 댓글에서 위치와 시간을 확인할 수 있습니다."
            : parentId
              ? "답글이 등록되었습니다."
              : "댓글이 등록되었습니다.",
        );
      } catch (error) {
        const nextMessage =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "댓글 등록에 실패했습니다.";
        setMessage(nextMessage);
        if (!currentUserId) {
          window.alert(nextMessage);
        }
      } finally {
        setPendingCommentPreview(null);
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
        await refreshCommentsAfterMutation(currentPage);
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
        await refreshCommentsAfterMutation(currentPage);
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
    const canReply = !isMutedPlaceholder && canComment && comment.status === "ACTIVE";
    const canReport = Boolean(currentUserId) && !isMutedPlaceholder && comment.status === "ACTIVE" && !isAuthor;
    const canOpenMenu = !isDeleted && !isMutedPlaceholder && (canEdit || canReport);
    const guestActionType = guestActionPrompt[comment.id];
    const isGuestDeletePrompt = guestActionType === "DELETE";
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
    const collapseLinkClass =
      "tp-text-muted inline-flex min-h-8 items-center px-1 text-[11px] font-semibold transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";
    const commentCardClassName =
      depth > 0
        ? `flex gap-2 ${POST_COMMENT_THREAD_REPLY_CARD_CLASS_NAME}`
        : POST_COMMENT_THREAD_ROOT_CARD_CLASS_NAME;
    const canOpenReplyFromPanel = canReply;
    const selectableCommentCardClassName = canOpenReplyFromPanel
      ? `${commentCardClassName} cursor-pointer rounded-md transition hover:bg-[#f8fbff] active:bg-[#f3f8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1 data-[reply-open=true]:bg-[#f8fbff] data-[reply-open=true]:ring-1 data-[reply-open=true]:ring-[#dbe6f5]`
      : commentCardClassName;
    const openReplyFromPanel = () => {
      setReplyOpen((prev) => ({ ...prev, [comment.id]: true }));
    };
    const handleCommentPanelClick = (event: MouseEvent<HTMLElement>) => {
      if (!canOpenReplyFromPanel) {
        return;
      }
      if (shouldIgnoreCommentPanelReplyClick(event.target, event.currentTarget)) {
        return;
      }
      openReplyFromPanel();
    };
    const commentBodyText = isDeleted
      ? "삭제된 댓글입니다."
      : isMutedPlaceholder
        ? MUTED_COMMENT_PLACEHOLDER_TEXT
        : comment.content;
    const isSighting = comment.kind === "LOST_FOUND_SIGHTING";
    const sightingSeenAtText = comment.sightingSeenAt
      ? formatKoreanIsoDateTime(comment.sightingSeenAt)
      : null;

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={depth > 0 ? "mt-1.5" : undefined}
      >
        <article
          data-testid={`post-comment-item-${comment.id}`}
          className={selectableCommentCardClassName}
          data-reply-open={canOpenReplyFromPanel ? Boolean(replyOpen[comment.id]) : undefined}
          onClick={handleCommentPanelClick}
        >
          <div className={POST_COMMENT_THREAD_AVATAR_CLASS_NAME}>
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
                  {isSighting ? (
                    <span className="rounded-full border border-[#cbdcf5] bg-[#eef5ff] px-2 py-0.5 text-[10px] font-semibold text-[#2f5da4]">
                      목격 제보
                    </span>
                  ) : null}
                  {isSighting && comment.isPrivateSighting ? (
                    <span className="rounded-full border border-[#ead5a5] bg-[#fff9e8] px-2 py-0.5 text-[10px] font-semibold text-[#7a5a18]">
                      보호자 공개
                    </span>
                  ) : null}
                  {canOpenReplyFromPanel ? (
                    <button
                      type="button"
                      className="sr-only focus:not-sr-only focus:inline-flex focus:min-h-8 focus:items-center focus:rounded focus:px-2 focus:text-[12px] focus:font-semibold focus:text-[#2f5da4] focus:outline-none focus:ring-2 focus:ring-[#bfd3f0] focus:ring-offset-1"
                      onClick={openReplyFromPanel}
                      aria-expanded={Boolean(replyOpen[comment.id])}
                      data-comment-panel-ignore
                    >
                      댓글에 답글 작성
                    </button>
                  ) : null}
                </div>
              </div>

              {!isDeleted && !isMutedPlaceholder ? (
                <div className="ml-auto shrink-0" data-comment-panel-ignore>
                  {canOpenMenu ? (
                    <DismissibleDetails className="relative">
                      <summary
                        aria-label={`${displayName} 댓글 작업 메뉴`}
                        className={POST_COMMENT_THREAD_MENU_BUTTON_CLASS_NAME}
                        title="댓글 작업"
                      >
                        <span aria-hidden="true">···</span>
                      </summary>
                      <div className={POST_COMMENT_THREAD_MENU_PANEL_CLASS_NAME}>
                        {canReport ? (
                          <button
                            type="button"
                            className={POST_COMMENT_THREAD_MENU_DANGER_ITEM_CLASS_NAME}
                            onClick={() =>
                              setReportOpen((prev) => ({
                                ...prev,
                                [comment.id]: !prev[comment.id],
                              }))
                            }
                            data-dismissible-details-close
                          >
                            {reportOpen[comment.id] ? "신고 닫기" : "신고"}
                          </button>
                        ) : null}
                        {canEdit ? (
                          <>
                            <button
                              type="button"
                              className={POST_COMMENT_THREAD_MENU_ITEM_CLASS_NAME}
                              onClick={() => {
                                if (isGuestComment) {
                                  setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: "EDIT" }));
                                  return;
                                }
                                setEditOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }));
                              }}
                              disabled={isPending}
                              data-dismissible-details-close
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className={POST_COMMENT_THREAD_MENU_DANGER_ITEM_CLASS_NAME}
                              onClick={() => {
                                if (isGuestComment) {
                                  setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: "DELETE" }));
                                  return;
                                }
                                void handleDelete(comment.id, false);
                              }}
                              disabled={isPending}
                              data-dismissible-details-close
                            >
                              삭제
                            </button>
                          </>
                        ) : null}
                      </div>
                    </DismissibleDetails>
                  ) : null}
                </div>
              ) : null}
              {!isDeleted && isMutedPlaceholder && canMuteCommentAuthor(currentUserId, comment.author.id) ? (
                <button
                  type="button"
                  className="tp-text-muted inline-flex min-h-10 shrink-0 items-center rounded-md px-3 text-[12px] font-medium transition hover:bg-white hover:text-[#2f5da4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
                  onClick={() => handleUnmute(comment.id, comment.author.id)}
                  disabled={isPending}
                  data-comment-panel-ignore
                >
                  뮤트 해제
                </button>
              ) : null}
            </header>

            <div
              className={`${POST_COMMENT_THREAD_BODY_CLASS_NAME} ${
                isDeleted || isMutedPlaceholder ? "tp-text-placeholder" : "tp-text-primary"
              }`}
            >
              <LinkifiedContent
                text={commentBodyText}
                showYoutubeEmbeds={!isDeleted && !isMutedPlaceholder}
              />
            </div>

            {isSighting && !isDeleted && !isMutedPlaceholder ? (
              <dl className={POST_COMMENT_THREAD_SIGHTING_META_CLASS_NAME}>
                {comment.sightingLocation ? (
                  <div>
                    <dt className="tp-text-subtle font-semibold">목격 위치</dt>
                    <dd className="tp-text-heading mt-0.5">{comment.sightingLocation}</dd>
                  </div>
                ) : null}
                {sightingSeenAtText ? (
                  <div>
                    <dt className="tp-text-subtle font-semibold">목격 시간</dt>
                    <dd className="tp-text-heading mt-0.5">{sightingSeenAtText}</dd>
                  </div>
                ) : null}
                {comment.sightingImageUrl ? (
                  <div className="sm:col-span-2">
                    <dt className="tp-text-subtle font-semibold">사진</dt>
                    <dd className="mt-0.5">
                      <a
                        href={comment.sightingImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="tp-text-link font-semibold underline underline-offset-2"
                      >
                        사진 열기
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {!isDeleted && ((depth === 0 && replies.length > 0) || !isMutedPlaceholder) ? (
              <div className={POST_COMMENT_THREAD_FOOTER_CLASS_NAME} data-comment-panel-ignore>
                {depth === 0 && replies.length > 0 ? (
                  <div className={POST_COMMENT_THREAD_ACTIONS_CLASS_NAME}>
                    <button
                      type="button"
                      className={collapseLinkClass}
                      aria-expanded={!collapsedReplies[comment.id]}
                      onClick={() =>
                        setCollapsedReplies((prev) => ({
                          ...prev,
                          [comment.id]: !prev[comment.id],
                        }))
                      }
                    >
                      {collapsedReplies[comment.id] ? `답글 ${replies.length}개` : "답글 숨기기"}
                    </button>
                  </div>
                ) : null}

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
                    className="ml-auto justify-end"
                    loginHintAlign="end"
                  />
                ) : null}
              </div>
            ) : null}

            {reportOpen[comment.id] ? (
              <div className={COMMENT_INLINE_FORM_SECTION_CLASS_NAME} data-comment-panel-ignore>
                <PostReportForm
                  targetId={comment.id}
                  targetType={ReportTarget.COMMENT}
                  canReport={Boolean(currentUserId)}
                  loginHref={loginHref}
                />
              </div>
            ) : null}

            {canReply && replyOpen[comment.id] ? (
              <div className={COMMENT_INLINE_FORM_SECTION_CLASS_NAME} data-comment-panel-ignore>
                {!currentUserId ? (
                  <div className={POST_COMMENT_INLINE_FORM_ROW_CLASS_NAME}>
                    <input
                      className={POST_COMMENT_INLINE_FORM_INPUT_CLASS_NAME}
                      value={guestDisplayName}
                      onChange={(event) => setGuestDisplayName(event.target.value)}
                      placeholder="비회원 닉네임"
                      maxLength={24}
                    />
                    <input
                      className={POST_COMMENT_INLINE_FORM_INPUT_CLASS_NAME}
                      type="password"
                      value={guestPassword}
                      onChange={(event) => setGuestPassword(event.target.value)}
                      placeholder="댓글 비밀번호"
                      maxLength={32}
                    />
                  </div>
                ) : null}
                <textarea
                  className={POST_COMMENT_INLINE_FORM_TEXTAREA_CLASS_NAME}
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
                <div className={POST_COMMENT_INLINE_FORM_ACTION_ROW_CLASS_NAME}>
                  <button
                    type="button"
                    className={POST_COMMENT_INLINE_FORM_CANCEL_CLASS_NAME}
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
                    className={POST_COMMENT_ROOT_FORM_SUBMIT_CLASS_NAME}
                    onClick={() => handleCreate(comment.id)}
                    disabled={isPending}
                  >
                    {isPending ? "등록 중..." : "답글 등록"}
                  </button>
                </div>
              </div>
            ) : null}

            {isGuestComment && guestActionType ? (
              <div className={COMMENT_INLINE_FORM_SECTION_CLASS_NAME} data-comment-panel-ignore>
                <div className={POST_COMMENT_INLINE_FORM_PASSWORD_ROW_CLASS_NAME}>
                  <input
                    type="password"
                    className={POST_COMMENT_INLINE_FORM_PASSWORD_INPUT_CLASS_NAME}
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
                    className={
                      isGuestDeletePrompt
                        ? POST_COMMENT_INLINE_FORM_DANGER_CLASS_NAME
                        : POST_COMMENT_ROOT_FORM_SUBMIT_CLASS_NAME
                    }
                    onClick={() =>
                      confirmGuestAction(
                        comment.id,
                        guestActionType === "EDIT" ? "EDIT" : "DELETE",
                      )
                    }
                    disabled={isPending}
                  >
                    {isGuestDeletePrompt ? "삭제 확인" : "수정 확인"}
                  </button>
                  <button
                    type="button"
                    className={POST_COMMENT_INLINE_FORM_CANCEL_CLASS_NAME}
                    onClick={() => setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: null }))}
                    disabled={isPending}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : null}

            {(canInteract || isGuestComment) && editOpen[comment.id] && canEdit ? (
              <div className={COMMENT_INLINE_FORM_SECTION_CLASS_NAME}>
                <textarea
                  className={POST_COMMENT_INLINE_FORM_TEXTAREA_CLASS_NAME}
                  value={editContent[comment.id] ?? comment.content}
                  onChange={(event) =>
                    setEditContent((prev) => ({
                      ...prev,
                      [comment.id]: event.target.value,
                    }))
                  }
                  maxLength={COMMENT_CONTENT_MAX_LENGTH}
                />
                <div className={POST_COMMENT_INLINE_FORM_ACTION_ROW_CLASS_NAME}>
                  <button
                    type="button"
                    className={POST_COMMENT_ROOT_FORM_SUBMIT_CLASS_NAME}
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

      {pendingCommentPreview ? (
        <div
          data-testid="post-comment-pending"
          className={POST_COMMENT_PENDING_PREVIEW_CLASS_NAME}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="tp-text-heading text-[13px] font-semibold">
              {pendingCommentPreview.displayName}
            </p>
            <span className="tp-text-label text-[10px]">
              {pendingCommentPreview.parentId ? "답글 등록 중" : "댓글 등록 중"}
            </span>
          </div>
          <div className={POST_COMMENT_PENDING_PREVIEW_BODY_CLASS_NAME}>
            <LinkifiedContent text={pendingCommentPreview.content} showYoutubeEmbeds={false} />
          </div>
        </div>
      ) : null}

      {hasBestComments ? (
        <section className={POST_COMMENT_BEST_SECTION_CLASS_NAME}>
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <h3 className="tp-text-heading text-[13px] font-semibold">베스트 댓글</h3>
            <span className="tp-text-label text-[10px]">좋아요 기준</span>
          </div>
          <div className={`${COMMENT_BORDER_CLASS_NAME} overflow-hidden border-y bg-[#fbfdff]`}>
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
        <div className={POST_COMMENT_LATEST_HEADER_CLASS_NAME}>
          <h3 className="tp-text-heading text-[12px] font-semibold">최신 댓글</h3>
          {totalPages > 1 ? (
            <span className="tp-text-label text-[11px]">{currentPage} / {totalPages}</span>
          ) : null}
        </div>
      ) : null}

      {roots.length > 0 ? (
        <div className={`${POST_COMMENT_ROOT_LIST_CLASS_NAME} ${COMMENT_BORDER_CLASS_NAME} ${COMMENT_DIVIDER_CLASS_NAME}`}>
          {roots.map((comment) => renderComment(comment))}
        </div>
      ) : null}

      <PostCommentPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onCommentsChanged}
      />

      <div className={POST_COMMENT_ROOT_COMPOSER_WRAPPER_CLASS_NAME}>
        <PostCommentRootForm
          canComment={canComment}
          lostFoundSightingEnabled={lostFoundSightingEnabled}
          commentMode={rootCommentMode}
          currentUserId={currentUserId}
          guestDisplayName={guestDisplayName}
          guestPassword={guestPassword}
          rootContent={replyContent.root ?? ""}
          sightingLocation={sightingLocation}
          sightingSeenAt={sightingSeenAt}
          sightingImageUrl={sightingImageUrl}
          isPrivateSighting={isPrivateSighting}
          isPending={isPending}
          loginHref={loginHref}
          interactionDisabledMessage={interactionDisabledMessage}
          onCommentModeChange={handleRootCommentModeChange}
          onGuestDisplayNameChange={setGuestDisplayName}
          onGuestPasswordChange={setGuestPassword}
          onRootContentChange={(value) =>
            setReplyContent((prev) => ({ ...prev, root: value }))
          }
          onSightingLocationChange={setSightingLocation}
          onSightingSeenAtChange={setSightingSeenAt}
          onSightingImageUrlChange={setSightingImageUrl}
          onPrivateSightingChange={setIsPrivateSighting}
          onSubmit={() => handleCreate()}
        />
      </div>
    </div>
  );
}
