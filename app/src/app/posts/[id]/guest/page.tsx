import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PostType } from "@prisma/client";

import { BackToFeedButton } from "@/components/posts/back-to-feed-button";
import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { PostBoardLinkChip } from "@/components/posts/post-board-link-chip";
import { GuestPostDetailActions } from "@/components/posts/guest-post-detail-actions";
import { PostBookmarkButton } from "@/components/posts/post-bookmark-button";
import { PostCommentCountStat } from "@/components/posts/post-comment-count-stat";
import { PostDetailMediaGallery } from "@/components/posts/post-detail-media-gallery";
import { PostReactionControls } from "@/components/posts/post-reaction-controls";
import { PostReportForm } from "@/components/posts/post-report-form";
import { PostShareControls } from "@/components/posts/post-share-controls";
import { PostCommentSectionClient } from "@/components/posts/post-comment-section-client";
import { PostViewTracker } from "@/components/posts/post-view-tracker";
import { getCspNonce } from "@/lib/csp-nonce";
import { extractImageUrlsFromMarkup } from "@/lib/editor-image-markup";
import { serializeJsonForScriptTag } from "@/lib/json-script";
import { renderLiteMarkdown } from "@/lib/markdown-lite";
import {
  buildExcerpt,
  buildPostDetailMetadata,
  ensureDate,
} from "@/lib/post-page-metadata";
import { getGuestPostMeta } from "@/lib/post-guest-meta";
import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";
import { formatRelativeDate } from "@/lib/post-presenter";
import { isReportablePostType } from "@/lib/post-type-groups";
import { toAbsoluteUrl } from "@/lib/site-url";
import { resolveUserDisplayName } from "@/lib/user-display";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { getPostById, getPostMetadataById } from "@/server/queries/post.queries";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { ServiceError } from "@/server/services/service-error";

export const dynamic = "force-dynamic";

type PostDetailPageProps = {
  params?: Promise<{ id?: string }>;
};

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const resolvedParams = (await params) ?? {};
  const [post, loginRequiredTypes] = await Promise.all([
    getPostMetadataById(resolvedParams.id).catch((error) => {
      if (isPrismaDatabaseUnavailableError(error)) {
        return null;
      }
      throw error;
    }),
    getGuestReadLoginRequiredPostTypes(),
  ]);

  return buildPostDetailMetadata(post, loginRequiredTypes);
}

const typeMeta: Record<PostType, { label: string; chipClass: string }> = {
  HOSPITAL_REVIEW: {
    label: "병원후기",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
  PLACE_REVIEW: {
    label: "후기/리뷰",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  WALK_ROUTE: {
    label: "동네 산책코스",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  MEETUP: {
    label: "동네모임",
    chipClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  MARKET_LISTING: {
    label: "중고/공동구매",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
  },
  CARE_REQUEST: {
    label: "돌봄 요청",
    chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  ADOPTION_LISTING: {
    label: "유기동물 입양",
    chipClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  SHELTER_VOLUNTEER: {
    label: "보호소 봉사 모집",
    chipClass: "border-lime-200 bg-lime-50 text-lime-700",
  },
  LOST_FOUND: {
    label: "실종/목격 제보",
    chipClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  QA_QUESTION: {
    label: "질문/답변",
    chipClass: "border-teal-200 bg-teal-50 text-teal-700",
  },
  QA_ANSWER: {
    label: "질문/답변",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  FREE_POST: {
    label: "자유게시판",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
  },
  FREE_BOARD: {
    label: "자유게시판",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
  },
  DAILY_SHARE: {
    label: "자유게시판",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
  },
  PRODUCT_REVIEW: {
    label: "용품리뷰",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  PET_SHOWCASE: {
    label: "반려동물 자랑",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

const emptyValue = <span className="text-[#95a8c5]">비어 있음</span>;

const renderTextValue = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value : emptyValue;

const renderNumberValue = (value: number | null | undefined, suffix = "") =>
  value !== null && value !== undefined ? `${value}${suffix}` : emptyValue;

const formatDetailDateTime = (value: string | Date | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const renderBooleanValue = (
  value: boolean | null | undefined,
  trueLabel: string,
  falseLabel: string,
) => (value === null || value === undefined ? emptyValue : value ? trueLabel : falseLabel);

const adoptionStatusLabel: Record<string, string> = {
  OPEN: "입양 가능",
  RESERVED: "상담 중",
  ADOPTED: "입양 완료",
  CLOSED: "마감",
};

const animalSexLabel: Record<string, string> = {
  MALE: "수컷",
  FEMALE: "암컷",
  UNKNOWN: "미상",
};

const volunteerStatusLabel: Record<string, string> = {
  OPEN: "모집 중",
  FULL: "정원 마감",
  CLOSED: "모집 종료",
  CANCELLED: "취소",
};

const marketTypeLabel: Record<string, string> = {
  SELL: "판매",
  RENT: "대여",
  SHARE: "나눔",
};

const marketConditionLabel: Record<string, string> = {
  NEW: "새상품",
  LIKE_NEW: "거의 새것",
  GOOD: "사용감 적음",
  FAIR: "사용감 있음",
};

const marketStatusLabel: Record<string, string> = {
  AVAILABLE: "거래 가능",
  RESERVED: "예약 중",
  SOLD: "거래 완료",
  CANCELLED: "취소",
};

const careTypeLabel: Record<string, string> = {
  WALK: "산책",
  FEEDING: "급식",
  VISIT_CARE: "방문 돌봄",
  HOSPITAL_COMPANION: "병원 동행",
  EMERGENCY_CHECK: "긴급 체크",
  ERRAND: "심부름",
};

const careStatusLabel: Record<string, string> = {
  OPEN: "요청 중",
  MATCHED: "매칭됨",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
};

export default async function GuestPostDetailPage({ params }: PostDetailPageProps) {
  await connection();
  const cspNonce = await getCspNonce();
  const resolvedParams = (await params) ?? {};
  const post = await getPostById(resolvedParams.id);
  if (!post) {
    notFound();
  }

  try {
    await assertPostReadable(post);
  } catch (error) {
    if (!(error instanceof ServiceError)) {
      throw error;
    }
    if (error.code === "AUTH_REQUIRED") {
      return (
        <NeighborhoodGateNotice
          title="로그인이 필요한 게시글입니다."
          description="이 게시글은 로그인 사용자에게만 공개됩니다."
          primaryLink={`/login?next=${encodeURIComponent(`/posts/${post.id}`)}`}
          primaryLabel="로그인하기"
        />
      );
    }
    if (error.code === "POST_NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const loginHref = `/login?next=${encodeURIComponent(`/posts/${post.id}`)}`;
  const guestPostMeta = getGuestPostMeta(post);
  const canReportPost = isReportablePostType(post.type);
  const displayAuthorName = guestPostMeta.isGuestPost
    ? guestPostMeta.guestPublicName ??
      resolvePublicGuestDisplayName((post as { guestDisplayName?: string | null }).guestDisplayName)
    : resolveUserDisplayName(post.author.nickname);
  const postUrl = toAbsoluteUrl(`/posts/${post.id}`);
  const meta = typeMeta[post.type];
  const createdAt = ensureDate(post.createdAt) ?? new Date();
  const updatedAt = ensureDate(post.updatedAt) ?? createdAt;
  const safeViewCount = Number.isFinite(post.viewCount) ? Number(post.viewCount) : 0;
  const safeLikeCount = Number.isFinite(post.likeCount) ? Number(post.likeCount) : 0;
  const safeDislikeCount = Number.isFinite(post.dislikeCount) ? Number(post.dislikeCount) : 0;
  const safeCommentCount = Number.isFinite(post.commentCount) ? Number(post.commentCount) : 0;
  const renderedContentHtml = renderLiteMarkdown(post.content);
  const renderedContentText = renderedContentHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const shouldUsePlainFallback =
    renderedContentText.length === 0 || renderedContentText.includes("미리보기 내용이 없습니다");
  const orderedImages = [...post.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hasInlineImages = extractImageUrlsFromMarkup(post.content).length > 0;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: post.title,
    articleBody: buildExcerpt(post.content, 320),
    datePublished: createdAt.toISOString(),
    dateModified: updatedAt.toISOString(),
    mainEntityOfPage: postUrl,
    author: {
      "@type": "Person",
      name: displayAuthorName,
    },
    image: orderedImages.map((image) => toAbsoluteUrl(image.url)),
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: safeLikeCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: safeCommentCount,
      },
    ],
  };

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <PostViewTracker postId={post.id} />
      <script
        nonce={cspNonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonForScriptTag(structuredData),
        }}
      />
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        <BackToFeedButton className="tp-btn-soft tp-btn-sm inline-flex w-fit items-center" />
        <div>
          <section className="tp-card p-4 sm:p-7">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <PostBoardLinkChip type={post.type} label={meta.label} chipClass={meta.chipClass} />
              {post.neighborhood ? (
                <span className="tp-chip-base tp-chip-muted">
                  {post.neighborhood.city} {post.neighborhood.name}
                </span>
              ) : null}
            </div>

            <div className="tp-border-soft mt-4 border-b pb-4 sm:pb-5">
              <h1 className="tp-text-post-title text-[#10284a]">
                {post.title}
              </h1>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#4f678d]">
                  <p className="font-semibold text-[#1f3f71]">
                    {guestPostMeta.isGuestPost ? (
                      <span>{displayAuthorName}</span>
                    ) : (
                      <Link
                        href={`/users/${post.author.id}`}
                        className="rounded-sm transition hover:text-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
                      >
                        {displayAuthorName}
                      </Link>
                    )}
                  </p>
                  <span className="text-[#90a4c2]">·</span>
                  <p className="text-[12px] text-[#516d96]">{formatRelativeDate(createdAt)}</p>
                </div>
                <p className="tp-text-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-[#56739c]">
                  <span>조회 {safeViewCount.toLocaleString()}</span>
                  <span>좋아요 {safeLikeCount.toLocaleString()}</span>
                  <PostCommentCountStat
                    key={`${post.id}:${safeCommentCount}`}
                    postId={post.id}
                    initialCount={safeCommentCount}
                  />
                </p>
              </div>
            </div>

            <div className="mt-5 sm:mt-6">
              <article className="tp-text-body text-[#17345f]">
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
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <PostReactionControls
                  key={`${post.id}:guest`}
                  postId={post.id}
                  likeCount={safeLikeCount}
                  dislikeCount={safeDislikeCount}
                  currentReaction={null}
                  canReact={false}
                  loginHref={loginHref}
                  align="start"
                />
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  <PostBookmarkButton
                    key={`${post.id}:guest-bookmark`}
                    postId={post.id}
                    currentBookmarked={false}
                    canBookmark={false}
                    loginHref={loginHref}
                    compact
                  />
                  <PostShareControls url={postUrl} compact />
                </div>
              </div>
              {guestPostMeta.isGuestPost ? <GuestPostDetailActions postId={post.id} /> : null}
            </div>

            {canReportPost ? (
              <details className="group mt-3 text-left">
                <summary className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-[#8d5a68] transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className="h-3 w-3 text-current transition group-open:rotate-90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M4 2.5 8 6 4 9.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  게시글 신고
                </summary>
                <div className="mt-2 rounded-[14px] border border-[#e8eff9] bg-[#fbfdff] p-3">
                  <PostReportForm targetId={post.id} canReport={false} loginHref={loginHref} />
                </div>
              </details>
            ) : null}
          </section>
        </div>

        {post.hospitalReview ? (
          <section className="tp-card p-5 sm:p-6">
            <h2 className="tp-text-section-title text-[#163462]">병원후기 상세</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#355988] md:grid-cols-3">
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">병원</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.hospitalReview.hospitalName)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">치료</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.hospitalReview.treatmentType)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">평점</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderNumberValue(post.hospitalReview.rating, "점")}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">비용</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {post.hospitalReview.totalCost !== null && post.hospitalReview.totalCost !== undefined
                    ? `${post.hospitalReview.totalCost.toLocaleString()}원`
                    : emptyValue}
                </p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">대기</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderNumberValue(post.hospitalReview.waitTime, "분")}</p>
              </div>
            </div>
          </section>
        ) : null}

        {post.placeReview ? (
          <section className="tp-card p-5 sm:p-6">
            <h2 className="tp-text-section-title text-[#163462]">후기/리뷰 상세</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#355988] md:grid-cols-3">
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">장소명</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.placeReview.placeName)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">유형</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.placeReview.placeType)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">주소</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.placeReview.address)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">반려동물</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderBooleanValue(post.placeReview.isPetAllowed, "가능", "불가")}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">평점</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderNumberValue(post.placeReview.rating, "점")}</p>
              </div>
            </div>
          </section>
        ) : null}

        {post.walkRoute ? (
          <section className="tp-card p-5 sm:p-6">
            <h2 className="tp-text-section-title text-[#163462]">동네 산책코스 상세</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#355988] md:grid-cols-3">
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">코스명</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.walkRoute.routeName)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">거리</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderNumberValue(post.walkRoute.distance, "km")}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">시간</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderNumberValue(post.walkRoute.duration, "분")}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">난이도</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.walkRoute.difficulty)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3 md:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">편의시설</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {[
                    post.walkRoute.hasStreetLights ? "가로등" : null,
                    post.walkRoute.hasRestroom ? "화장실" : null,
                    post.walkRoute.hasParkingLot ? "주차장" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "정보 없음"}
                </p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3 md:col-span-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">안전 태그</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {post.walkRoute.safetyTags && post.walkRoute.safetyTags.length > 0
                    ? post.walkRoute.safetyTags.join(", ")
                    : "없음"}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {post.marketListing ? (
          <section className="tp-card p-5 sm:p-6">
            <h2 className="tp-text-section-title text-[#163462]">마켓 거래 정보</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#355988] md:grid-cols-3">
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">거래 유형</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {renderTextValue(
                    post.marketListing.listingType
                      ? (marketTypeLabel[post.marketListing.listingType] ?? post.marketListing.listingType)
                      : null,
                  )}
                </p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">가격</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {post.marketListing.price !== null && post.marketListing.price !== undefined
                    ? `${post.marketListing.price.toLocaleString()}원`
                    : emptyValue}
                </p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">상품 상태</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {renderTextValue(
                    post.marketListing.condition
                      ? (marketConditionLabel[post.marketListing.condition] ?? post.marketListing.condition)
                      : null,
                  )}
                </p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">거래 상태</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {renderTextValue(
                    post.marketListing.status
                      ? (marketStatusLabel[post.marketListing.status] ?? post.marketListing.status)
                      : null,
                  )}
                </p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">보증금</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {post.marketListing.depositAmount !== null &&
                  post.marketListing.depositAmount !== undefined
                    ? `${post.marketListing.depositAmount.toLocaleString()}원`
                    : emptyValue}
                </p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">기간</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {renderTextValue(post.marketListing.rentalPeriod)}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {post.careRequest ? (
          <section className="tp-card p-5 sm:p-6">
            <h2 className="tp-text-section-title text-[#163462]">돌봄 요청 정보</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#355988] md:grid-cols-3">
              <div className="border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#4d8468]">요청 유형</p>
                <p className="mt-1 font-medium text-[#21543d]">
                  {renderTextValue(
                    post.careRequest.careType
                      ? (careTypeLabel[post.careRequest.careType] ?? post.careRequest.careType)
                      : null,
                  )}
                </p>
              </div>
              <div className="border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#4d8468]">상태</p>
                <p className="mt-1 font-medium text-[#21543d]">
                  {renderTextValue(
                    post.careRequest.status
                      ? (careStatusLabel[post.careRequest.status] ?? post.careRequest.status)
                      : null,
                  )}
                </p>
              </div>
              <div className="border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#4d8468]">긴급</p>
                <p className="mt-1 font-medium text-[#21543d]">
                  {renderBooleanValue(post.careRequest.isUrgent, "긴급 요청", "일반 요청")}
                </p>
              </div>
              <div className="border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#4d8468]">시작</p>
                <p className="mt-1 font-medium text-[#21543d]">
                  {renderTextValue(formatDetailDateTime(post.careRequest.startsAt))}
                </p>
              </div>
              <div className="border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#4d8468]">종료</p>
                <p className="mt-1 font-medium text-[#21543d]">
                  {renderTextValue(formatDetailDateTime(post.careRequest.endsAt))}
                </p>
              </div>
              <div className="border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#4d8468]">보상</p>
                <p className="mt-1 font-medium text-[#21543d]">
                  {post.careRequest.rewardAmount !== null &&
                  post.careRequest.rewardAmount !== undefined
                    ? `${post.careRequest.rewardAmount.toLocaleString()}원`
                    : emptyValue}
                </p>
              </div>
              <div className="border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3 md:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#4d8468]">위치 힌트</p>
                <p className="mt-1 font-medium text-[#21543d]">{renderTextValue(post.careRequest.locationNote)}</p>
              </div>
              <div className="border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#4d8468]">반려동물</p>
                <p className="mt-1 font-medium text-[#21543d]">{renderTextValue(post.careRequest.petNote)}</p>
              </div>
              <div className="border border-[#cfe9dc] bg-[#f3fbf7] px-3 py-3 md:col-span-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#4d8468]">요청사항</p>
                <p className="mt-1 font-medium text-[#21543d]">{renderTextValue(post.careRequest.requirements)}</p>
              </div>
            </div>
          </section>
        ) : null}

        {post.adoptionListing ? (
          <section className="tp-card p-5 sm:p-6">
            <h2 className="tp-text-section-title text-[#163462]">유기동물 입양 정보</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#355988] md:grid-cols-3">
              <div className="border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b7a34]">보호소</p>
                <p className="mt-1 font-medium text-[#5f4712]">{renderTextValue(post.adoptionListing.shelterName)}</p>
              </div>
              <div className="border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b7a34]">지역</p>
                <p className="mt-1 font-medium text-[#5f4712]">{renderTextValue(post.adoptionListing.region)}</p>
              </div>
              <div className="border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b7a34]">상태</p>
                <p className="mt-1 font-medium text-[#5f4712]">
                  {renderTextValue(
                    post.adoptionListing.status
                      ? (adoptionStatusLabel[post.adoptionListing.status] ?? post.adoptionListing.status)
                      : null,
                  )}
                </p>
              </div>
              <div className="border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b7a34]">동물 종류</p>
                <p className="mt-1 font-medium text-[#5f4712]">{renderTextValue(post.adoptionListing.animalType)}</p>
              </div>
              <div className="border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b7a34]">품종</p>
                <p className="mt-1 font-medium text-[#5f4712]">{renderTextValue(post.adoptionListing.breed)}</p>
              </div>
              <div className="border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b7a34]">나이</p>
                <p className="mt-1 font-medium text-[#5f4712]">{renderTextValue(post.adoptionListing.ageLabel)}</p>
              </div>
              <div className="border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b7a34]">성별</p>
                <p className="mt-1 font-medium text-[#5f4712]">
                  {renderTextValue(
                    post.adoptionListing.sex
                      ? (animalSexLabel[post.adoptionListing.sex] ?? post.adoptionListing.sex)
                      : null,
                  )}
                </p>
              </div>
              <div className="border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b7a34]">중성화</p>
                <p className="mt-1 font-medium text-[#5f4712]">
                  {renderBooleanValue(post.adoptionListing.isNeutered, "완료", "미완료")}
                </p>
              </div>
              <div className="border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b7a34]">예방접종</p>
                <p className="mt-1 font-medium text-[#5f4712]">
                  {renderBooleanValue(post.adoptionListing.isVaccinated, "완료", "미완료")}
                </p>
              </div>
              <div className="border border-[#f0dfb8] bg-[#fffaf0] px-3 py-3 md:col-span-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b7a34]">체형/크기</p>
                <p className="mt-1 font-medium text-[#5f4712]">{renderTextValue(post.adoptionListing.sizeLabel)}</p>
              </div>
            </div>
          </section>
        ) : null}

        {post.volunteerRecruitment ? (
          <section className="tp-card p-5 sm:p-6">
            <h2 className="tp-text-section-title text-[#163462]">보호소 봉사 모집 정보</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#355988] md:grid-cols-3">
              <div className="border border-[#d6e7b3] bg-[#f8fff0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6d8d2d]">보호소</p>
                <p className="mt-1 font-medium text-[#365412]">{renderTextValue(post.volunteerRecruitment.shelterName)}</p>
              </div>
              <div className="border border-[#d6e7b3] bg-[#f8fff0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6d8d2d]">지역</p>
                <p className="mt-1 font-medium text-[#365412]">{renderTextValue(post.volunteerRecruitment.region)}</p>
              </div>
              <div className="border border-[#d6e7b3] bg-[#f8fff0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6d8d2d]">모집 상태</p>
                <p className="mt-1 font-medium text-[#365412]">
                  {renderTextValue(
                    post.volunteerRecruitment.status
                      ? (volunteerStatusLabel[post.volunteerRecruitment.status] ??
                        post.volunteerRecruitment.status)
                      : null,
                  )}
                </p>
              </div>
              <div className="border border-[#d6e7b3] bg-[#f8fff0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6d8d2d]">봉사 일정</p>
                <p className="mt-1 font-medium text-[#365412]">
                  {post.volunteerRecruitment.volunteerDate
                    ? new Date(post.volunteerRecruitment.volunteerDate).toLocaleString("ko-KR")
                    : emptyValue}
                </p>
              </div>
              <div className="border border-[#d6e7b3] bg-[#f8fff0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6d8d2d]">봉사 유형</p>
                <p className="mt-1 font-medium text-[#365412]">{renderTextValue(post.volunteerRecruitment.volunteerType)}</p>
              </div>
              <div className="border border-[#d6e7b3] bg-[#f8fff0] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6d8d2d]">모집 인원</p>
                <p className="mt-1 font-medium text-[#365412]">{renderNumberValue(post.volunteerRecruitment.capacity, "명")}</p>
              </div>
            </div>
          </section>
        ) : null}

        <PostCommentSectionClient
          postId={post.id}
          currentUserId={undefined}
          canInteract={false}
          canInteractWithPostOwner={false}
          loginHref={loginHref}
          forceGuestMode
        />
      </main>
    </div>
  );
}
