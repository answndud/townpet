"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CareApplicationStatus,
  CareRequestStatus,
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  LostFoundStatus,
  MarketStatus,
  PostStatus,
  PostType,
} from "@prisma/client";

import { BackToFeedButton } from "@/components/posts/back-to-feed-button";
import { LostFoundSharePanel } from "@/components/posts/lost-found-share-panel";
import {
  DEFAULT_POST_COMMENT_ROOT_PAGE_SIZE,
  type PostCommentItem,
  type PostCommentPrefetchState,
} from "@/components/posts/post-comment-load-state";
import { PostDetailInfoPanels } from "@/components/posts/post-detail-info-panels";
import { PostDetailPrimaryCard } from "@/components/posts/post-detail-primary-card";
import { PostPersonalizationDwellTracker } from "@/components/posts/post-personalization-dwell-tracker";
import { PostCommentSectionClient } from "@/components/posts/post-comment-section-client";
import { PostViewTracker } from "@/components/posts/post-view-tracker";
import { fetchJson } from "@/lib/client-json";
import { fetchPostCommentPage } from "@/lib/comment-client";
import { getGuestPostMeta } from "@/lib/post-guest-meta";
import { buildPostContentExcerpt } from "@/lib/post-content-text";
import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";
import { serializeJsonForScriptTag } from "@/lib/json-script";
import { isReportablePostType } from "@/lib/post-type-groups";
import { toAbsoluteUrl } from "@/lib/site-url";
import { resolveUserDisplayName } from "@/lib/user-display";
import { ensureDate, resolveCareStatusOptions } from "@/components/posts/post-detail-presenter";
import type { PostDetailResponse } from "@/components/posts/post-detail-types";
import {
  cancelCareApplicationAction,
  createCareApplicationAction,
  createCareCompletionFeedbackAction,
  decideCareApplicationAction,
  updateCareRequestStatusAction,
  updateLostFoundStatusAction,
  updateMarketListingStatusAction,
} from "@/server/actions/post";

const POST_DETAIL_ERROR_RETRY_CLASS_NAME =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-[#3567b5] px-3 text-xs font-semibold text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

const POST_DETAIL_ERROR_TEXT_LINK_CLASS_NAME =
  "tp-text-muted inline-flex min-h-10 items-center justify-center px-1.5 text-xs font-semibold transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

type PostDetailClientProps = {
  postId: string;
  cspNonce?: string;
};

export function PostDetailClient({ postId, cspNonce }: PostDetailClientProps) {
  const [data, setData] = useState<PostDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPostReportOpen, setIsPostReportOpen] = useState(false);
  const [relationMessage, setRelationMessage] = useState<string | null>(null);
  const [marketStatusMessage, setMarketStatusMessage] = useState<string | null>(null);
  const [careStatusMessage, setCareStatusMessage] = useState<string | null>(null);
  const [lostFoundStatusMessage, setLostFoundStatusMessage] = useState<string | null>(null);
  const [careApplicationMessage, setCareApplicationMessage] = useState<string | null>(null);
  const [careApplicationInput, setCareApplicationInput] = useState("");
  const [careFeedbackMessage, setCareFeedbackMessage] = useState<string | null>(null);
  const [careFeedbackInput, setCareFeedbackInput] = useState<{
    outcome: CareFeedbackOutcome;
    issueType: CareFeedbackIssueType;
    wouldRepeat: boolean;
    comment: string;
  }>({
    outcome: CareFeedbackOutcome.POSITIVE,
    issueType: CareFeedbackIssueType.NONE,
    wouldRepeat: true,
    comment: "",
  });
  const [isMarketStatusPending, startMarketStatusTransition] = useTransition();
  const [isCareStatusPending, startCareStatusTransition] = useTransition();
  const [isLostFoundStatusPending, startLostFoundStatusTransition] = useTransition();
  const [isCareApplicationPending, startCareApplicationTransition] = useTransition();
  const [isCareFeedbackPending, startCareFeedbackTransition] = useTransition();
  const [loadVersion, setLoadVersion] = useState(0);
  const [commentLoadState, setCommentLoadState] = useState<PostCommentPrefetchState>({
    status: "idle",
    pageData: null,
    error: null,
  });

  const handleCommentCountChange = (nextCommentCount: number) => {
    setData((current) => {
      if (!current?.ok || !current.data) {
        return current;
      }

      if (current.data.post.commentCount === nextCommentCount) {
        return current;
      }

      return {
        ...current,
        data: {
          ...current.data,
          post: {
            ...current.data.post,
            commentCount: nextCommentCount,
          },
        },
      };
    });
  };

  const handleReactionStateChange = ({
    likeCount,
    dislikeCount,
  }: {
    likeCount: number;
    dislikeCount: number;
  }) => {
    setData((current) => {
      if (!current?.ok || !current.data) {
        return current;
      }

      if (
        current.data.post.likeCount === likeCount &&
        current.data.post.dislikeCount === dislikeCount
      ) {
        return current;
      }

      return {
        ...current,
        data: {
          ...current.data,
          post: {
            ...current.data.post,
            likeCount,
            dislikeCount,
          },
        },
      };
    });
  };

  const handlePostStatusChange = (nextStatus: PostStatus) => {
    setData((current) => {
      if (!current?.ok || !current.data) {
        return current;
      }

      if (current.data.post.status === nextStatus) {
        return current;
      }

      return {
        ...current,
        data: {
          ...current.data,
          post: {
            ...current.data.post,
            status: nextStatus,
          },
        },
      };
    });
  };

  const handleAuthorMuteStateChange = (nextMuted: boolean) => {
    setData((current) => {
      if (!current?.ok || !current.data) {
        return current;
      }

      return {
        ...current,
        data: {
          ...current.data,
          relationState: {
            ...(current.data.relationState ?? {
              isBlockedByMe: false,
              hasBlockedMe: false,
              isMutedByMe: false,
            }),
            isMutedByMe: nextMuted,
          },
        },
      };
    });
  };

  const handleMarketStatusChange = (nextStatus: MarketStatus) => {
    if (!postId) {
      return;
    }

    setMarketStatusMessage(null);
    startMarketStatusTransition(async () => {
      const result = await updateMarketListingStatusAction(postId, nextStatus);
      if (!result.ok) {
        setMarketStatusMessage(result.message);
        return;
      }

      setData((current) => {
        if (!current?.ok || !current.data?.post.marketListing) {
          return current;
        }

        return {
          ...current,
          data: {
            ...current.data,
            post: {
              ...current.data.post,
              marketListing: {
                ...current.data.post.marketListing,
                status: result.status,
              },
            },
          },
        };
      });
      setMarketStatusMessage(
        result.changed ? "거래 상태가 변경되었습니다." : "이미 선택한 거래 상태입니다.",
      );
    });
  };

  const handleCareStatusChange = (nextStatus: CareRequestStatus) => {
    if (!postId) {
      return;
    }

    setCareStatusMessage(null);
    startCareStatusTransition(async () => {
      const result = await updateCareRequestStatusAction(postId, nextStatus);
      if (!result.ok) {
        setCareStatusMessage(result.message);
        return;
      }

      setData((current) => {
        if (!current?.ok || !current.data?.post.careRequest) {
          return current;
        }

        return {
          ...current,
          data: {
            ...current.data,
            post: {
              ...current.data.post,
              careRequest: {
                ...current.data.post.careRequest,
                status: result.status,
              },
            },
          },
        };
      });
      setCareStatusMessage(
        result.changed ? "돌봄 요청 상태가 변경되었습니다." : "이미 선택한 요청 상태입니다.",
      );
    });
  };

  const handleLostFoundStatusChange = (nextStatus: LostFoundStatus) => {
    if (!postId) {
      return;
    }

    setLostFoundStatusMessage(null);
    startLostFoundStatusTransition(async () => {
      const result = await updateLostFoundStatusAction(postId, nextStatus);
      if (!result.ok) {
        setLostFoundStatusMessage(result.message);
        return;
      }

      setData((current) => {
        if (!current?.ok || !current.data?.post.lostFoundAlert) {
          return current;
        }

        return {
          ...current,
          data: {
            ...current.data,
            post: {
              ...current.data.post,
              lostFoundAlert: {
                ...current.data.post.lostFoundAlert,
                status: result.status,
              },
            },
          },
        };
      });
      setLostFoundStatusMessage(
        result.changed ? "분실동물 상태가 변경되었습니다." : "이미 선택한 상태입니다.",
      );
    });
  };

  const handleCreateCareApplication = () => {
    if (!postId) {
      return;
    }

    setCareApplicationMessage(null);
    startCareApplicationTransition(async () => {
      const result = await createCareApplicationAction(postId, {
        message: careApplicationInput,
      });
      if (!result.ok) {
        setCareApplicationMessage(result.message);
        return;
      }

      setCareApplicationInput("");
      setCareApplicationMessage("돌봄 지원이 등록되었습니다.");
      setLoadVersion((current) => current + 1);
    });
  };

  const handleCancelCareApplication = (applicationId: string) => {
    if (!postId) {
      return;
    }

    setCareApplicationMessage(null);
    startCareApplicationTransition(async () => {
      const result = await cancelCareApplicationAction(postId, applicationId);
      if (!result.ok) {
        setCareApplicationMessage(result.message);
        return;
      }

      setCareApplicationMessage("돌봄 지원이 취소되었습니다.");
      setLoadVersion((current) => current + 1);
    });
  };

  const handleDecideCareApplication = (
    applicationId: string,
    status: "ACCEPTED" | "DECLINED",
  ) => {
    if (!postId) {
      return;
    }

    setCareApplicationMessage(null);
    startCareApplicationTransition(async () => {
      const result = await decideCareApplicationAction(postId, applicationId, status);
      if (!result.ok) {
        setCareApplicationMessage(result.message);
        return;
      }

      setCareApplicationMessage(
        status === CareApplicationStatus.ACCEPTED
          ? "돌봄 지원을 수락했습니다."
          : "돌봄 지원을 거절했습니다.",
      );
      setLoadVersion((current) => current + 1);
    });
  };

  const handleCreateCareCompletionFeedback = () => {
    if (!postId) {
      return;
    }

    setCareFeedbackMessage(null);
    startCareFeedbackTransition(async () => {
      const result = await createCareCompletionFeedbackAction(postId, careFeedbackInput);
      if (!result.ok) {
        setCareFeedbackMessage(result.message);
        return;
      }

      setCareFeedbackMessage("완료 피드백이 저장되었습니다.");
      setCareFeedbackInput({
        outcome: CareFeedbackOutcome.POSITIVE,
        issueType: CareFeedbackIssueType.NONE,
        wouldRepeat: true,
        comment: "",
      });
      setLoadVersion((current) => current + 1);
    });
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!postId) {
        setError("게시글을 찾을 수 없습니다.");
        return;
      }

      setError(null);
      setData(null);
      setRelationMessage(null);
      setCareApplicationMessage(null);
      setCareFeedbackMessage(null);
      setCommentLoadState({
        status: "loading",
        pageData: null,
        error: null,
      });

      void (async () => {
        try {
          const nextCommentPage = await fetchPostCommentPage<PostCommentItem>(postId, {
            page: 1,
            limit: DEFAULT_POST_COMMENT_ROOT_PAGE_SIZE,
          });
          if (!cancelled) {
            setCommentLoadState({
              status: "ready",
              pageData: nextCommentPage,
              error: null,
            });
          }
        } catch {
          if (!cancelled) {
            setCommentLoadState({
              status: "error",
              pageData: null,
              error: "댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
            });
          }
        }
      })();

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const { response, payload } = await fetchJson<PostDetailResponse>(
            `/api/posts/${postId}/detail`,
            {
              method: "GET",
              credentials: "same-origin",
              cache: "no-store",
            },
          );

          if (response.status === 403) {
            if (typeof window !== "undefined") {
              window.location.href = `/posts/${postId}/guest`;
              return;
            }
            throw new Error("보안 확인이 필요합니다. 새로고침 후 다시 시도해 주세요.");
          }

          if (response.status === 401) {
            if (typeof window !== "undefined") {
              window.location.href = `/posts/${postId}/guest`;
              return;
            }
            throw new Error("로그인이 필요한 게시글입니다.");
          }

          if (!response.ok || !payload.ok) {
            if (response.status === 404 && typeof window !== "undefined") {
              window.location.href = `/posts/${postId}/guest`;
              return;
            }
            throw new Error(payload.error?.message ?? "게시글 로딩 실패");
          }
          if (!cancelled) {
            setData(payload);
          }
          return;
        } catch (err) {
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
            continue;
          }
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "게시글을 불러올 수 없습니다.");
          }
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [loadVersion, postId]);

  const loginHref = `/login?next=${encodeURIComponent(`/posts/${postId}`)}`;

  if (error) {
    return (
      <div className="tp-page-bg min-h-screen pb-16">
        <main className="mx-auto flex max-w-[1000px] flex-col gap-4 px-4 pb-10 pt-8 sm:px-6 lg:px-8">
          <div className="tp-border-danger-soft tp-surface-danger-soft rounded-lg border p-4 text-center sm:p-5">
            <h2 className="tp-text-heading text-lg font-semibold">게시글을 불러오지 못했습니다.</h2>
            <p className="tp-text-subtle mt-2 text-sm">{error}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLoadVersion((current) => current + 1);
                }}
                className={POST_DETAIL_ERROR_RETRY_CLASS_NAME}
              >
                다시 시도
              </button>
              <a
                href={`/posts/${postId}/guest`}
                className={POST_DETAIL_ERROR_TEXT_LINK_CLASS_NAME}
              >
                게스트 페이지
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const post = data?.data?.post;
  const viewerId = data?.data?.viewerId ?? null;
  const canModerate = data?.data?.canModerate ?? false;
  const hasLoadedPost = Boolean(post);
  const isPostActive = post?.status === PostStatus.ACTIVE;
  const resolvedRelationState = data?.data?.relationState ?? {
    isBlockedByMe: false,
    hasBlockedMe: false,
    isMutedByMe: false,
  };
  const canInteract = hasLoadedPost && Boolean(viewerId) && isPostActive;
  const isAuthor = Boolean(post && viewerId === post.authorId);
  const canReportPost = post ? isReportablePostType(post.type) : false;
  const canInteractWithPostOwner = !(
    resolvedRelationState.hasBlockedMe || resolvedRelationState.isBlockedByMe
  );
  const canModeratePost = hasLoadedPost && canModerate && !isAuthor;
  const canManageMarketStatus =
    hasLoadedPost &&
    Boolean(post?.marketListing) &&
    Boolean(viewerId) &&
    (isAuthor || canModerate) &&
    post?.status !== PostStatus.DELETED;
  const careApplications = post?.careApplications ?? [];
  const ownCareApplication = viewerId
    ? careApplications.find((application) => application.applicantId === viewerId) ?? null
    : null;
  const isAcceptedCareApplicant =
    ownCareApplication?.status === CareApplicationStatus.ACCEPTED;
  const visibleCareStatusOptions = resolveCareStatusOptions({
    currentStatus: post?.careRequest?.status,
    isAuthor,
    isAcceptedApplicant: isAcceptedCareApplicant,
    canModerate,
  });
  const canManageCareStatus =
    hasLoadedPost &&
    Boolean(post?.careRequest) &&
    Boolean(viewerId) &&
    visibleCareStatusOptions.length > 0 &&
    post?.status !== PostStatus.DELETED;
  const canManageLostFoundStatus =
    hasLoadedPost &&
    post?.type === PostType.LOST_FOUND &&
    Boolean(post?.lostFoundAlert) &&
    Boolean(viewerId) &&
    (isAuthor || canModerate) &&
    post?.status !== PostStatus.DELETED;
  const canApplyCareRequest =
    hasLoadedPost &&
    post?.type === PostType.CARE_REQUEST &&
    Boolean(post?.careRequest) &&
    post?.careRequest?.status === CareRequestStatus.OPEN &&
    canInteract &&
    !isAuthor &&
    canInteractWithPostOwner &&
    !ownCareApplication;
  const canManageCareApplications =
    hasLoadedPost &&
    post?.type === PostType.CARE_REQUEST &&
    Boolean(post?.careRequest) &&
    Boolean(viewerId) &&
    (isAuthor || canModerate) &&
    post?.status !== PostStatus.DELETED;
  const careCompletionFeedbacks = post?.careCompletionFeedbacks ?? [];
  const ownCareCompletionFeedback = viewerId
    ? careCompletionFeedbacks.find((feedback) => feedback.authorId === viewerId) ?? null
    : null;
  const canCreateCareCompletionFeedback =
    hasLoadedPost &&
    post?.type === PostType.CARE_REQUEST &&
    post?.careRequest?.status === CareRequestStatus.COMPLETED &&
    Boolean(viewerId) &&
    (isAuthor || isAcceptedCareApplicant) &&
    !ownCareCompletionFeedback &&
    post?.status !== PostStatus.DELETED;
  const showPostReportControls =
    canReportPost && canInteract && !isAuthor && canInteractWithPostOwner;
  const createdAt = post ? ensureDate(post.createdAt) : null;
  const updatedAt = post ? ensureDate(post.updatedAt) : null;
  const resolvedViewCount = post && Number.isFinite(post.viewCount) ? Number(post.viewCount) : 0;
  const resolvedLikeCount = post && Number.isFinite(post.likeCount) ? Number(post.likeCount) : 0;
  const resolvedDislikeCount = post && Number.isFinite(post.dislikeCount) ? Number(post.dislikeCount) : 0;
  const resolvedCommentCount = post && Number.isFinite(post.commentCount) ? Number(post.commentCount) : 0;
  const postUrl = post ? toAbsoluteUrl(`/posts/${post.id}`) : null;
  const guestPostMeta = post ? getGuestPostMeta(post) : null;
  const displayAuthorName = post?.isOperatorContent && !guestPostMeta?.isGuestPost
    ? "TownPet 운영팀"
    : guestPostMeta?.isGuestPost
    ? guestPostMeta.guestPublicName ?? resolvePublicGuestDisplayName(post?.guestDisplayName)
    : post
      ? resolveUserDisplayName(post.author.nickname)
      : null;
  const structuredData = post && createdAt && updatedAt && postUrl && displayAuthorName
    ? {
        "@context": "https://schema.org",
        "@type": "SocialMediaPosting",
        headline: post.title,
        articleBody: buildPostContentExcerpt(post.content, 320),
        datePublished: createdAt.toISOString(),
        dateModified: updatedAt.toISOString(),
        mainEntityOfPage: postUrl,
        author: {
          "@type": "Person",
          name: displayAuthorName,
        },
        image: post.images.map((image) => toAbsoluteUrl(image.url)),
        interactionStatistic: [
          {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/LikeAction",
            userInteractionCount: resolvedLikeCount,
          },
          {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/CommentAction",
            userInteractionCount: resolvedCommentCount,
          },
        ],
      }
    : null;

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      {post && post.status === PostStatus.ACTIVE ? <PostViewTracker postId={post.id} /> : null}
      {post ? (
        <PostPersonalizationDwellTracker
          postId={post.id}
          enabled={Boolean(viewerId) && post.status === PostStatus.ACTIVE}
        />
      ) : null}
      {structuredData ? (
        <script
          nonce={cspNonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonForScriptTag(structuredData) }}
        />
      ) : null}
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        {post ? <BackToFeedButton className="tp-text-link inline-flex min-h-10 w-fit items-center text-xs font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2" /> : null}
        {post ? (
          <>
            <PostDetailPrimaryCard
              post={post}
              viewerId={viewerId}
              createdAt={createdAt!}
              relationState={resolvedRelationState}
              relationMessage={relationMessage}
              displayAuthorName={displayAuthorName}
              isGuestPost={Boolean(guestPostMeta?.isGuestPost)}
              isAuthor={isAuthor}
              isPostActive={isPostActive}
              canInteract={canInteract}
              canInteractWithPostOwner={canInteractWithPostOwner}
              canModeratePost={canModeratePost}
              canReportPost={canReportPost}
              showPostReportControls={showPostReportControls}
              isPostReportOpen={isPostReportOpen}
              loginHref={loginHref}
              postUrl={postUrl!}
              resolvedViewCount={resolvedViewCount}
              resolvedLikeCount={resolvedLikeCount}
              resolvedDislikeCount={resolvedDislikeCount}
              resolvedCommentCount={resolvedCommentCount}
              onTogglePostReportOpen={() => setIsPostReportOpen((current) => !current)}
              onReactionStateChange={handleReactionStateChange}
              onAuthorActionMessage={setRelationMessage}
              onAuthorMuteStateChange={handleAuthorMuteStateChange}
              onPostStatusChange={handlePostStatusChange}
            />
            <PostDetailInfoPanels
              post={post}
              canManageMarketStatus={canManageMarketStatus}
              isMarketStatusPending={isMarketStatusPending}
              marketStatusMessage={marketStatusMessage}
              onMarketStatusChange={handleMarketStatusChange}
              canManageCareStatus={canManageCareStatus}
              visibleCareStatusOptions={visibleCareStatusOptions}
              isCareStatusPending={isCareStatusPending}
              careStatusMessage={careStatusMessage}
              onCareStatusChange={handleCareStatusChange}
              canManageLostFoundStatus={canManageLostFoundStatus}
              isLostFoundStatusPending={isLostFoundStatusPending}
              lostFoundStatusMessage={lostFoundStatusMessage}
              onLostFoundStatusChange={handleLostFoundStatusChange}
              canApplyCareRequest={canApplyCareRequest}
              careApplicationInput={careApplicationInput}
              onCareApplicationInputChange={setCareApplicationInput}
              isCareApplicationPending={isCareApplicationPending}
              onCreateCareApplication={handleCreateCareApplication}
              ownCareApplication={ownCareApplication}
              onCancelCareApplication={handleCancelCareApplication}
              canManageCareApplications={canManageCareApplications}
              careApplications={careApplications}
              onDecideCareApplication={handleDecideCareApplication}
              careApplicationMessage={careApplicationMessage}
              canCreateCareCompletionFeedback={canCreateCareCompletionFeedback}
              careFeedbackInput={careFeedbackInput}
              onCareFeedbackInputChange={setCareFeedbackInput}
              isCareFeedbackPending={isCareFeedbackPending}
              onCreateCareCompletionFeedback={handleCreateCareCompletionFeedback}
              careCompletionFeedbacks={careCompletionFeedbacks}
              careFeedbackMessage={careFeedbackMessage}
            />
            {post.type === PostType.LOST_FOUND && post.lostFoundAlert ? (
              <LostFoundSharePanel post={post} postUrl={postUrl!} />
            ) : null}

          </>
        ) : (
          <div className="tp-border-soft tp-text-subtle rounded-lg border bg-white p-4 text-center text-sm sm:p-5">
            게시글을 불러오는 중...
          </div>
        )}

        <PostCommentSectionClient
          postId={postId}
          currentUserId={viewerId ?? undefined}
          canInteract={hasLoadedPost ? canInteract : false}
          canInteractWithPostOwner={hasLoadedPost ? canInteractWithPostOwner : false}
          lostFoundSightingEnabled={
            hasLoadedPost &&
            post?.type === PostType.LOST_FOUND &&
            post?.lostFoundAlert?.status === "ACTIVE"
          }
          loginHref={loginHref}
          onCommentCountChange={hasLoadedPost ? handleCommentCountChange : undefined}
          initialLoadState={commentLoadState}
        />
      </main>
    </div>
  );
}
