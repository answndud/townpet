"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CareApplicationStatus,
  CareRequestStatus,
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  MarketStatus,
  PostStatus,
  PostType,
} from "@prisma/client";

import { BackToFeedButton } from "@/components/posts/back-to-feed-button";
import {
  DEFAULT_POST_COMMENT_ROOT_PAGE_SIZE,
  type PostCommentItem,
  type PostCommentPrefetchState,
} from "@/components/posts/post-comment-load-state";
import {
  PostDetailInfoItem,
  PostDetailInfoSection,
} from "@/components/posts/post-detail-info-section";
import { PostDetailPrimaryCard } from "@/components/posts/post-detail-primary-card";
import { PostPersonalizationDwellTracker } from "@/components/posts/post-personalization-dwell-tracker";
import { PostCommentSectionClient } from "@/components/posts/post-comment-section-client";
import { PostViewTracker } from "@/components/posts/post-view-tracker";
import { fetchPostCommentPage } from "@/lib/comment-client";
import { getGuestPostMeta } from "@/lib/post-guest-meta";
import { buildPostContentExcerpt } from "@/lib/post-content-text";
import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";
import { serializeJsonForScriptTag } from "@/lib/json-script";
import { isReportablePostType } from "@/lib/post-type-groups";
import { toAbsoluteUrl } from "@/lib/site-url";
import { resolveUserDisplayName } from "@/lib/user-display";
import {
  adoptionStatusLabel,
  animalSexLabel,
  authorMarketStatusOptions,
  careApplicationStatusLabel,
  careFeedbackAuthorRoleLabel,
  careFeedbackIssueLabel,
  careFeedbackOutcomeLabel,
  careStatusLabel,
  careTypeLabel,
  emptyValue,
  ensureDate,
  formatDetailDateTime,
  marketConditionLabel,
  marketStatusLabel,
  marketTypeLabel,
  renderBooleanValue,
  renderNumberValue,
  renderTextValue,
  resolveCareStatusOptions,
  volunteerStatusLabel,
} from "@/components/posts/post-detail-presenter";
import type { PostDetailResponse } from "@/components/posts/post-detail-types";
import {
  cancelCareApplicationAction,
  createCareApplicationAction,
  createCareCompletionFeedbackAction,
  decideCareApplicationAction,
  updateCareRequestStatusAction,
  updateMarketListingStatusAction,
} from "@/server/actions/post";

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
          const response = await fetch(`/api/posts/${postId}/detail`, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          });

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

          const contentType = response.headers.get("content-type") ?? "";
          if (!contentType.includes("application/json")) {
            throw new Error("서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.");
          }

          const payload = (await response.json()) as PostDetailResponse;
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
          <div className="tp-border-danger-soft tp-surface-danger-soft rounded-xl border p-6 text-center">
            <h2 className="tp-text-heading text-lg font-semibold">게시글을 불러오지 못했습니다.</h2>
            <p className="tp-text-subtle mt-2 text-sm">{error}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLoadVersion((current) => current + 1);
                }}
                className="tp-btn-primary tp-btn-sm"
              >
                다시 시도
              </button>
              <a
                href={`/posts/${postId}/guest`}
                className="tp-btn-soft px-4 py-2"
              >
                게스트 페이지 보기
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
  const displayAuthorName = guestPostMeta?.isGuestPost
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
        {post ? <BackToFeedButton className="tp-btn-soft tp-btn-sm inline-flex w-fit items-center" /> : null}
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

        {post.hospitalReview ? (
          <PostDetailInfoSection title="병원후기 상세">
            <PostDetailInfoItem label="병원" value={renderTextValue(post.hospitalReview.hospitalName)} />
            <PostDetailInfoItem label="치료" value={renderTextValue(post.hospitalReview.treatmentType)} />
            <PostDetailInfoItem label="평점" value={renderNumberValue(post.hospitalReview.rating, "점")} />
            <PostDetailInfoItem
              label="비용"
              value={
                post.hospitalReview.totalCost !== null && post.hospitalReview.totalCost !== undefined
                  ? `${post.hospitalReview.totalCost.toLocaleString()}원`
                  : emptyValue
              }
            />
            <PostDetailInfoItem label="대기" value={renderNumberValue(post.hospitalReview.waitTime, "분")} />
          </PostDetailInfoSection>
        ) : null}

        {post.placeReview ? (
          <PostDetailInfoSection title="후기/리뷰 상세">
            <PostDetailInfoItem label="장소명" value={renderTextValue(post.placeReview.placeName)} />
            <PostDetailInfoItem label="유형" value={renderTextValue(post.placeReview.placeType)} />
            <PostDetailInfoItem label="주소" value={renderTextValue(post.placeReview.address)} />
            <PostDetailInfoItem
              label="반려동물"
              value={renderBooleanValue(post.placeReview.isPetAllowed, "가능", "불가")}
            />
            <PostDetailInfoItem label="평점" value={renderNumberValue(post.placeReview.rating, "점")} />
          </PostDetailInfoSection>
        ) : null}

        {post.walkRoute ? (
          <PostDetailInfoSection title="동네 산책코스 상세">
            <PostDetailInfoItem label="코스명" value={renderTextValue(post.walkRoute.routeName)} />
            <PostDetailInfoItem label="거리" value={renderNumberValue(post.walkRoute.distance, "km")} />
            <PostDetailInfoItem label="시간" value={renderNumberValue(post.walkRoute.duration, "분")} />
            <PostDetailInfoItem label="난이도" value={renderTextValue(post.walkRoute.difficulty)} />
            <PostDetailInfoItem
              label="편의시설"
              span="wide"
              value={
                [
                  post.walkRoute.hasStreetLights ? "가로등" : null,
                  post.walkRoute.hasRestroom ? "화장실" : null,
                  post.walkRoute.hasParkingLot ? "주차장" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "정보 없음"
              }
            />
            <PostDetailInfoItem
              label="안전 태그"
              span="full"
              value={
                post.walkRoute.safetyTags && post.walkRoute.safetyTags.length > 0
                  ? post.walkRoute.safetyTags.join(", ")
                  : "없음"
              }
            />
          </PostDetailInfoSection>
        ) : null}

        {post.marketListing ? (
          <PostDetailInfoSection title="마켓 거래 정보">
            <PostDetailInfoItem
              label="거래 유형"
              value={renderTextValue(
                post.marketListing.listingType
                  ? (marketTypeLabel[post.marketListing.listingType] ?? post.marketListing.listingType)
                  : null,
              )}
            />
            <PostDetailInfoItem
              label="가격"
              value={
                post.marketListing.price !== null && post.marketListing.price !== undefined
                  ? `${post.marketListing.price.toLocaleString()}원`
                  : emptyValue
              }
            />
            <PostDetailInfoItem
              label="상품 상태"
              value={renderTextValue(
                post.marketListing.condition
                  ? (marketConditionLabel[post.marketListing.condition] ?? post.marketListing.condition)
                  : null,
              )}
            />
            <PostDetailInfoItem
              label="거래 상태"
              value={renderTextValue(
                post.marketListing.status
                  ? (marketStatusLabel[post.marketListing.status] ?? post.marketListing.status)
                  : null,
              )}
            />
            <PostDetailInfoItem
              label="보증금"
              value={
                post.marketListing.depositAmount !== null &&
                post.marketListing.depositAmount !== undefined
                  ? `${post.marketListing.depositAmount.toLocaleString()}원`
                  : emptyValue
              }
            />
            <PostDetailInfoItem
              label="기간"
              value={renderTextValue(post.marketListing.rentalPeriod)}
            />
            {canManageMarketStatus ? (
              <div className="col-span-full mt-1 rounded-lg border border-[#dce7f6] bg-[#f8fbff] p-3">
                <p className="text-xs font-semibold text-[#315b9a]">거래 상태 변경</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {authorMarketStatusOptions.map((status) => {
                    const isCurrent = post.marketListing?.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                          isCurrent
                            ? "border-[#3567b5] bg-[#3567b5] text-white"
                            : "border-[#c7d8ef] bg-white text-[#315b9a] hover:border-[#9dbbe6] hover:bg-[#eef5ff]"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={isMarketStatusPending || isCurrent}
                        onClick={() => handleMarketStatusChange(status)}
                      >
                        {marketStatusLabel[status] ?? status}
                      </button>
                    );
                  })}
                </div>
                {marketStatusMessage ? (
                  <p className="mt-2 text-xs text-[#5d779e]">{marketStatusMessage}</p>
                ) : null}
              </div>
            ) : null}
          </PostDetailInfoSection>
        ) : null}

        {post.careRequest ? (
          <PostDetailInfoSection title="돌봄 요청 정보">
            <PostDetailInfoItem
              label="요청 유형"
              value={renderTextValue(
                post.careRequest.careType
                  ? (careTypeLabel[post.careRequest.careType] ?? post.careRequest.careType)
                  : null,
              )}
            />
            <PostDetailInfoItem
              label="상태"
              value={renderTextValue(
                post.careRequest.status
                  ? (careStatusLabel[post.careRequest.status] ?? post.careRequest.status)
                  : null,
              )}
            />
            <PostDetailInfoItem
              label="시작"
              value={renderTextValue(formatDetailDateTime(post.careRequest.startsAt))}
            />
            <PostDetailInfoItem
              label="종료"
              value={renderTextValue(formatDetailDateTime(post.careRequest.endsAt))}
            />
            <PostDetailInfoItem
              label="보상"
              value={
                post.careRequest.rewardAmount !== null &&
                post.careRequest.rewardAmount !== undefined
                  ? `${post.careRequest.rewardAmount.toLocaleString()}원`
                  : emptyValue
              }
            />
            <PostDetailInfoItem
              label="긴급"
              value={renderBooleanValue(post.careRequest.isUrgent, "긴급 요청", "일반 요청")}
            />
            <PostDetailInfoItem
              label="위치 힌트"
              span="wide"
              value={renderTextValue(post.careRequest.locationNote)}
            />
            <PostDetailInfoItem
              label="반려동물"
              span="wide"
              value={renderTextValue(post.careRequest.petNote)}
            />
            <PostDetailInfoItem
              label="요청사항"
              span="full"
              value={renderTextValue(post.careRequest.requirements)}
            />
            {canManageCareStatus ? (
              <div className="col-span-full mt-1 rounded-lg border border-[#cfe9dc] bg-[#f3fbf7] p-3">
                <p className="text-xs font-semibold text-[#21543d]">돌봄 요청 상태 변경</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleCareStatusOptions.map((status) => {
                    const isCurrent = post.careRequest?.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                          isCurrent
                            ? "border-[#2f7b58] bg-[#2f7b58] text-white"
                            : "border-[#b5dcc9] bg-white text-[#21543d] hover:border-[#8cc7ad] hover:bg-[#e9f7ef]"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={isCareStatusPending || isCurrent}
                        onClick={() => handleCareStatusChange(status)}
                      >
                        {careStatusLabel[status] ?? status}
                      </button>
                    );
                  })}
                </div>
                {careStatusMessage ? (
                  <p className="mt-2 text-xs text-[#4b765f]">{careStatusMessage}</p>
                ) : null}
              </div>
            ) : null}
            {canApplyCareRequest ? (
              <div className="col-span-full mt-1 rounded-lg border border-[#cfe9dc] bg-white p-3">
                <p className="text-xs font-semibold text-[#21543d]">돌봄 지원</p>
                <textarea
                  value={careApplicationInput}
                  onChange={(event) => setCareApplicationInput(event.target.value)}
                  rows={3}
                  maxLength={500}
                  className="mt-2 w-full rounded-md border border-[#b5dcc9] bg-white px-3 py-2 text-sm text-[#20362b] outline-none transition focus:border-[#2f7b58] focus:ring-2 focus:ring-[#b5dcc9]"
                  placeholder="요청자에게 전달할 메시지를 입력하세요."
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#6a7f73]">
                    연락처 공유는 정책에 따라 제한될 수 있습니다.
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-[#2f7b58] bg-[#2f7b58] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#246145] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isCareApplicationPending}
                    onClick={handleCreateCareApplication}
                  >
                    지원하기
                  </button>
                </div>
              </div>
            ) : null}
            {ownCareApplication ? (
              <div className="col-span-full mt-1 rounded-lg border border-[#dce7f6] bg-[#f8fbff] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#315b9a]">
                    내 지원 상태: {careApplicationStatusLabel[ownCareApplication.status] ?? ownCareApplication.status}
                  </p>
                  {ownCareApplication.status === CareApplicationStatus.PENDING ? (
                    <button
                      type="button"
                      className="rounded-md border border-[#c7d8ef] bg-white px-3 py-1.5 text-xs font-semibold text-[#315b9a] transition hover:border-[#9dbbe6] hover:bg-[#eef5ff] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isCareApplicationPending}
                      onClick={() => handleCancelCareApplication(ownCareApplication.id)}
                    >
                      지원 취소
                    </button>
                  ) : null}
                </div>
                {ownCareApplication.message ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-[#5d779e]">
                    {ownCareApplication.message}
                  </p>
                ) : null}
              </div>
            ) : null}
            {canManageCareApplications ? (
              <div className="col-span-full mt-1 rounded-lg border border-[#e2e8f0] bg-white p-3">
                <p className="text-xs font-semibold text-[#2f3b4c]">지원자 관리</p>
                {careApplications.length > 0 ? (
                  <div className="mt-2 flex flex-col gap-2">
                    {careApplications.map((application) => (
                      <div
                        key={application.id}
                        className="rounded-md border border-[#e2e8f0] bg-[#fbfcfe] p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[#253449]">
                              {resolveUserDisplayName(application.applicant.nickname)}
                            </p>
                            <p className="mt-0.5 text-xs text-[#66758a]">
                              {careApplicationStatusLabel[application.status] ?? application.status}
                            </p>
                          </div>
                          {application.status === CareApplicationStatus.PENDING ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="rounded-md border border-[#2f7b58] bg-[#2f7b58] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#246145] disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isCareApplicationPending}
                                onClick={() =>
                                  handleDecideCareApplication(
                                    application.id,
                                    CareApplicationStatus.ACCEPTED,
                                  )
                                }
                              >
                                수락
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-[#d5dae3] bg-white px-3 py-1.5 text-xs font-semibold text-[#4f5f75] transition hover:bg-[#f1f4f8] disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isCareApplicationPending}
                                onClick={() =>
                                  handleDecideCareApplication(
                                    application.id,
                                    CareApplicationStatus.DECLINED,
                                  )
                                }
                              >
                                거절
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {application.message ? (
                          <p className="mt-2 whitespace-pre-wrap text-xs text-[#4f5f75]">
                            {application.message}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[#66758a]">아직 지원자가 없습니다.</p>
                )}
              </div>
            ) : null}
            {careApplicationMessage ? (
              <p className="col-span-full mt-1 text-xs text-[#4b765f]">
                {careApplicationMessage}
              </p>
            ) : null}
            {canCreateCareCompletionFeedback ? (
              <div className="col-span-full mt-1 rounded-lg border border-[#e2e8f0] bg-white p-3">
                <p className="text-xs font-semibold text-[#2f3b4c]">완료 피드백</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-[#4f5f75]">
                    결과
                    <select
                      value={careFeedbackInput.outcome}
                      onChange={(event) =>
                        setCareFeedbackInput((current) => ({
                          ...current,
                          outcome: event.target.value as CareFeedbackOutcome,
                          issueType:
                            event.target.value === CareFeedbackOutcome.ISSUE
                              ? current.issueType
                              : CareFeedbackIssueType.NONE,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-[#d5dae3] bg-white px-2 py-1.5 text-xs"
                    >
                      {Object.values(CareFeedbackOutcome).map((outcome) => (
                        <option key={outcome} value={outcome}>
                          {careFeedbackOutcomeLabel[outcome]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-[#4f5f75]">
                    이슈 유형
                    <select
                      value={careFeedbackInput.issueType}
                      onChange={(event) =>
                        setCareFeedbackInput((current) => ({
                          ...current,
                          issueType: event.target.value as CareFeedbackIssueType,
                        }))
                      }
                      disabled={careFeedbackInput.outcome !== CareFeedbackOutcome.ISSUE}
                      className="mt-1 w-full rounded-md border border-[#d5dae3] bg-white px-2 py-1.5 text-xs disabled:opacity-60"
                    >
                      {Object.values(CareFeedbackIssueType).map((issueType) => (
                        <option key={issueType} value={issueType}>
                          {careFeedbackIssueLabel[issueType]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-end gap-2 text-xs font-semibold text-[#4f5f75]">
                    <input
                      type="checkbox"
                      checked={careFeedbackInput.wouldRepeat}
                      onChange={(event) =>
                        setCareFeedbackInput((current) => ({
                          ...current,
                          wouldRepeat: event.target.checked,
                        }))
                      }
                      className="mb-1 h-4 w-4 rounded border-[#d5dae3]"
                    />
                    다시 매칭하고 싶어요
                  </label>
                </div>
                <textarea
                  value={careFeedbackInput.comment}
                  onChange={(event) =>
                    setCareFeedbackInput((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                  rows={3}
                  maxLength={500}
                  className="mt-2 w-full rounded-md border border-[#d5dae3] bg-white px-3 py-2 text-sm text-[#253449] outline-none transition focus:border-[#7a91b5] focus:ring-2 focus:ring-[#d8e2f1]"
                  placeholder="운영 확인이 필요한 내용이나 간단한 메모를 남겨주세요."
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#66758a]">피드백은 공개 프로필에 노출되지 않습니다.</span>
                  <button
                    type="button"
                    className="rounded-md border border-[#2f5da4] bg-[#2f5da4] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#244a83] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isCareFeedbackPending}
                    onClick={handleCreateCareCompletionFeedback}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : null}
            {careCompletionFeedbacks.length > 0 ? (
              <div className="col-span-full mt-1 rounded-lg border border-[#e2e8f0] bg-[#fbfcfe] p-3">
                <p className="text-xs font-semibold text-[#2f3b4c]">비공개 피드백</p>
                <div className="mt-2 flex flex-col gap-2">
                  {careCompletionFeedbacks.map((feedback) => (
                    <div key={feedback.id} className="rounded-md border border-[#e2e8f0] bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#253449]">
                          {careFeedbackAuthorRoleLabel[feedback.authorRole]} ·{" "}
                          {careFeedbackOutcomeLabel[feedback.outcome]}
                        </p>
                        <p className="text-xs text-[#66758a]">
                          {careFeedbackIssueLabel[feedback.issueType]}
                        </p>
                      </div>
                      {feedback.comment ? (
                        <p className="mt-2 whitespace-pre-wrap text-xs text-[#4f5f75]">
                          {feedback.comment}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {careFeedbackMessage ? (
              <p className="col-span-full mt-1 text-xs text-[#4b765f]">
                {careFeedbackMessage}
              </p>
            ) : null}
          </PostDetailInfoSection>
        ) : null}

        {post.adoptionListing ? (
          <PostDetailInfoSection title="유기동물 입양 정보">
            <PostDetailInfoItem label="보호소" value={renderTextValue(post.adoptionListing.shelterName)} />
            <PostDetailInfoItem label="지역" value={renderTextValue(post.adoptionListing.region)} />
            <PostDetailInfoItem
              label="상태"
              value={renderTextValue(
                post.adoptionListing.status
                  ? (adoptionStatusLabel[post.adoptionListing.status] ?? post.adoptionListing.status)
                  : null,
              )}
            />
            <PostDetailInfoItem label="동물 종류" value={renderTextValue(post.adoptionListing.animalType)} />
            <PostDetailInfoItem label="품종" value={renderTextValue(post.adoptionListing.breed)} />
            <PostDetailInfoItem label="나이" value={renderTextValue(post.adoptionListing.ageLabel)} />
            <PostDetailInfoItem
              label="성별"
              value={renderTextValue(
                post.adoptionListing.sex
                  ? (animalSexLabel[post.adoptionListing.sex] ?? post.adoptionListing.sex)
                  : null,
              )}
            />
            <PostDetailInfoItem
              label="중성화"
              value={renderBooleanValue(post.adoptionListing.isNeutered, "완료", "미완료")}
            />
            <PostDetailInfoItem
              label="예방접종"
              value={renderBooleanValue(post.adoptionListing.isVaccinated, "완료", "미완료")}
            />
            <PostDetailInfoItem
              label="체형/크기"
              span="full"
              value={renderTextValue(post.adoptionListing.sizeLabel)}
            />
          </PostDetailInfoSection>
        ) : null}

        {post.volunteerRecruitment ? (
          <PostDetailInfoSection title="보호소 봉사 모집 정보">
            <PostDetailInfoItem label="보호소" value={renderTextValue(post.volunteerRecruitment.shelterName)} />
            <PostDetailInfoItem label="지역" value={renderTextValue(post.volunteerRecruitment.region)} />
            <PostDetailInfoItem
              label="모집 상태"
              value={renderTextValue(
                post.volunteerRecruitment.status
                  ? (volunteerStatusLabel[post.volunteerRecruitment.status] ??
                    post.volunteerRecruitment.status)
                  : null,
              )}
            />
            <PostDetailInfoItem
              label="봉사 일정"
              value={
                post.volunteerRecruitment.volunteerDate
                  ? new Date(post.volunteerRecruitment.volunteerDate).toLocaleString("ko-KR")
                  : emptyValue
              }
            />
            <PostDetailInfoItem
              label="봉사 유형"
              value={renderTextValue(post.volunteerRecruitment.volunteerType)}
            />
            <PostDetailInfoItem
              label="모집 인원"
              value={renderNumberValue(post.volunteerRecruitment.capacity, "명")}
            />
          </PostDetailInfoSection>
        ) : null}

          </>
        ) : (
          <div className="tp-border-soft tp-text-subtle rounded-xl border bg-white p-6 text-center text-sm">
            게시글을 불러오는 중...
          </div>
        )}

        <PostCommentSectionClient
          postId={postId}
          currentUserId={viewerId ?? undefined}
          canInteract={hasLoadedPost ? canInteract : false}
          canInteractWithPostOwner={hasLoadedPost ? canInteractWithPostOwner : false}
          loginHref={loginHref}
          onCommentCountChange={hasLoadedPost ? handleCommentCountChange : undefined}
          initialLoadState={commentLoadState}
        />
      </main>
    </div>
  );
}
