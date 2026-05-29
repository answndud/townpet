"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchPostCommentPage } from "@/lib/comment-client";
import { emitPostCommentCountSync } from "@/lib/post-comment-count-sync";
import { subscribeViewerShellSync } from "@/lib/viewer-shell-sync";
import {
  DEFAULT_POST_COMMENT_ROOT_PAGE_SIZE,
  type PostCommentItem,
  type PostCommentPageData,
  shouldAutoLoadPostComments,
  type PostCommentPrefetchState,
} from "@/components/posts/post-comment-load-state";
import { POST_COMMENT_SECTION_STATE_CLASS_NAME } from "@/components/posts/post-comment-layout-class";
import { PostCommentThread } from "@/components/posts/post-comment-thread";
import {
  getPostCommentViewerState,
  resolvePostCommentFetchGuestMode,
  syncPostCommentViewerState,
} from "@/components/posts/post-comment-viewer-state";

type PostCommentSectionClientProps = {
  postId: string;
  currentUserId?: string;
  canInteract: boolean;
  canInteractWithPostOwner: boolean;
  lostFoundSightingEnabled?: boolean;
  loginHref: string;
  onCommentCountChange?: (count: number) => void;
  initialLoadState?: PostCommentPrefetchState;
  forceGuestMode?: boolean;
};

export function PostCommentSectionClient({
  postId,
  currentUserId,
  canInteract,
  canInteractWithPostOwner,
  lostFoundSightingEnabled = false,
  loginHref,
  onCommentCountChange,
  initialLoadState,
  forceGuestMode = false,
}: PostCommentSectionClientProps) {
  const [commentPage, setCommentPage] = useState<PostCommentPageData | null>(
    initialLoadState?.pageData ?? null,
  );
  const [error, setError] = useState<string | null>(initialLoadState?.error ?? null);
  const [isLoading, setIsLoading] = useState(initialLoadState?.status === "loading");
  const [page, setPage] = useState(() => initialLoadState?.pageData?.page ?? 1);
  const [forcedGuestMode, setForcedGuestMode] = useState(false);
  const forcedGuestModeRef = useRef(false);
  const mountedRef = useRef(true);
  const lastViewerSyncTimestampRef = useRef(0);
  const forcedGuestStorageKey = useMemo(
    () => `townpet:post-comment-forced-guest:${postId}`,
    [postId],
  );
  const authLoginReloadStorageKey = useMemo(
    () => `townpet:post-comment-auth-login-reload:${postId}`,
    [postId],
  );
  const baseViewerState = useMemo(
    () => getPostCommentViewerState({ currentUserId, canInteract, canInteractWithPostOwner }),
    [currentUserId, canInteract, canInteractWithPostOwner],
  );
  const viewerState = forcedGuestMode
    ? syncPostCommentViewerState(baseViewerState, { reason: "auth-logout" })
    : baseViewerState;
  const effectiveForceGuestMode = resolvePostCommentFetchGuestMode({
    initialForceGuestMode: forceGuestMode,
    forcedGuestMode,
  });

  const comments = commentPage?.comments ?? null;

  useEffect(() => {
    mountedRef.current = true;
    try {
      const payload = JSON.parse(
        window.localStorage.getItem("townpet:viewer-shell-sync") ?? "null",
      ) as { timestamp?: unknown } | null;
      lastViewerSyncTimestampRef.current =
        typeof payload?.timestamp === "number" ? payload.timestamp : 0;
    } catch {
      lastViewerSyncTimestampRef.current = 0;
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (currentUserId && !forcedGuestMode) {
      return;
    }

    const timer = window.setInterval(() => {
      try {
        const payload = JSON.parse(
          window.localStorage.getItem("townpet:viewer-shell-sync") ?? "null",
        ) as { reason?: unknown; timestamp?: unknown } | null;
        const timestamp = typeof payload?.timestamp === "number" ? payload.timestamp : 0;
        if (
          payload?.reason === "auth-login" &&
          timestamp > lastViewerSyncTimestampRef.current
        ) {
          lastViewerSyncTimestampRef.current = timestamp;
          window.location.reload();
        }
      } catch {
        // Ignore malformed client sync state and keep event-based sync.
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [currentUserId, forcedGuestMode]);

  const reloadComments = useCallback(async (
    nextPage = page,
    options?: { forceGuestMode?: boolean },
  ) => {
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const nextCommentPage = await fetchPostCommentPage<PostCommentItem>(postId, {
        page: nextPage,
        limit: DEFAULT_POST_COMMENT_ROOT_PAGE_SIZE,
        forceGuestMode: options?.forceGuestMode ?? effectiveForceGuestMode,
      });
      if (mountedRef.current) {
        setCommentPage(nextCommentPage);
        setPage(nextCommentPage.page);
        setError(null);
        setIsLoading(false);
        onCommentCountChange?.(nextCommentPage.totalCount);
        emitPostCommentCountSync({ postId, count: nextCommentPage.totalCount });
      }
    } catch {
      if (mountedRef.current) {
        setError("댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setIsLoading(false);
      }
    }
  }, [effectiveForceGuestMode, onCommentCountChange, page, postId]);

  useEffect(() => {
    if (!initialLoadState) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (initialLoadState.status === "loading") {
        setCommentPage(null);
        setError(null);
        setIsLoading(true);
        return;
      }
      if (initialLoadState.status === "ready") {
        const nextCommentPage = initialLoadState.pageData ?? {
          comments: [],
          bestComments: [],
          totalCount: 0,
          totalRootCount: 0,
          page: 1,
          totalPages: 1,
          limit: DEFAULT_POST_COMMENT_ROOT_PAGE_SIZE,
        };
        setCommentPage(nextCommentPage);
        setPage(nextCommentPage.page);
        setError(null);
        setIsLoading(false);
        onCommentCountChange?.(nextCommentPage.totalCount);
        emitPostCommentCountSync({ postId, count: nextCommentPage.totalCount });
        return;
      }
      if (initialLoadState.status === "error") {
        setCommentPage(null);
        setError(initialLoadState.error ?? "댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setIsLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialLoadState, onCommentCountChange, postId]);

  useEffect(() => {
    if (
      !shouldAutoLoadPostComments({
        pageData: commentPage,
        error,
        isLoading,
        prefetchStatus: initialLoadState?.status,
      })
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void reloadComments(page);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [commentPage, error, initialLoadState?.status, isLoading, page, reloadComments]);

  useEffect(() => {
    return subscribeViewerShellSync((payload) => {
      if (payload.reason === "auth-logout") {
        forcedGuestModeRef.current = true;
        try {
          window.sessionStorage.setItem(forcedGuestStorageKey, "1");
        } catch {
          // Keep in-memory sync when session storage is unavailable.
        }
        setForcedGuestMode(true);
        void reloadComments(page, { forceGuestMode: true });
        return;
      }

      if (payload.reason === "auth-login") {
        let shouldReload = forcedGuestModeRef.current;
        try {
          shouldReload = shouldReload || window.sessionStorage.getItem(forcedGuestStorageKey) === "1";
          window.sessionStorage.removeItem(forcedGuestStorageKey);
          const alreadyReloadedForLogin =
            window.sessionStorage.getItem(authLoginReloadStorageKey) === "1";
          shouldReload =
            shouldReload || (!baseViewerState.currentUserId && !alreadyReloadedForLogin);
          if (shouldReload) {
            window.sessionStorage.setItem(authLoginReloadStorageKey, "1");
          } else if (baseViewerState.currentUserId) {
            window.sessionStorage.removeItem(authLoginReloadStorageKey);
          }
        } catch {
          // Keep in-memory sync when session storage is unavailable.
          shouldReload = shouldReload || !baseViewerState.currentUserId;
        }
        forcedGuestModeRef.current = false;
        setForcedGuestMode(false);
        if (shouldReload) {
          window.location.reload();
          return;
        }
        void reloadComments(page, { forceGuestMode: false });
      }
    });
  }, [
    authLoginReloadStorageKey,
    baseViewerState.currentUserId,
    forcedGuestStorageKey,
    page,
    reloadComments,
  ]);

  if (error && !comments) {
    return (
      <div className={`${POST_COMMENT_SECTION_STATE_CLASS_NAME} border-[#f0d3d3] bg-[#fff7f7] text-[#8b4b4b]`}>
        <div className="flex flex-wrap items-center justify-between gap-2" role="alert" aria-live="polite">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void reloadComments()}
            className="inline-flex min-h-10 items-center justify-center px-1.5 text-xs font-semibold text-[#8b4b4b] transition hover:text-[#723c3c] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efbcbc] focus-visible:ring-offset-1"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!comments) {
    return (
      <div className={`${POST_COMMENT_SECTION_STATE_CLASS_NAME} border-[#dbe6f6] bg-white text-[#6a84ac]`}>
        <span role="status" aria-live="polite">댓글을 불러오는 중...</span>
      </div>
    );
  }

  const resolvedCommentPage = commentPage ?? {
    comments,
    bestComments: [],
    totalCount: comments.length,
    totalRootCount: comments.filter((comment) => comment.parentId === null).length,
    page,
    totalPages: 1,
    limit: DEFAULT_POST_COMMENT_ROOT_PAGE_SIZE,
  };

  return (
    <PostCommentThread
      postId={postId}
      comments={comments as unknown as Parameters<typeof PostCommentThread>[0]["comments"]}
      bestComments={
        resolvedCommentPage.bestComments as unknown as Parameters<typeof PostCommentThread>[0]["bestComments"]
      }
      totalCommentCount={resolvedCommentPage.totalCount}
      currentPage={resolvedCommentPage.page}
      totalPages={resolvedCommentPage.totalPages}
      lostFoundSightingEnabled={lostFoundSightingEnabled}
      currentUserId={viewerState.currentUserId}
      canInteract={viewerState.canInteract}
      loginHref={loginHref}
      onCommentsChanged={reloadComments}
      interactionDisabledMessage={
        viewerState.currentUserId && canInteract && !canInteractWithPostOwner
          ? "차단 관계에서는 댓글 작성/답글/신고를 사용할 수 없습니다."
          : undefined
      }
    />
  );
}
