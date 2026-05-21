"use client";

import { PostScope, PostType } from "@prisma/client";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { PostBodyRichEditor } from "@/components/posts/post-body-rich-editor";
import type { PostBodyRichEditorHandle } from "@/components/posts/post-body-rich-editor";
import { areSameStringArray } from "@/lib/editor-image-markup";
import {
  GUEST_BLOCKED_POST_TYPES,
  GUEST_MAX_IMAGE_COUNT,
} from "@/lib/guest-post-policy";
import { PostCreateBasicFields } from "@/components/posts/post-create-basic-fields";
import {
  PostCreateEditorFooter,
  PostCreatePolicyAside,
  PostCreateSubmitFooter,
} from "@/components/posts/post-create-form-shell";
import {
  createInitialPostCreateFormState,
  type PostCreateFormState,
} from "@/components/posts/post-create-form-state";
import { usePostCreateDraft } from "@/components/posts/use-post-create-draft";
import { usePostCreateGuards } from "@/components/posts/use-post-create-guards";
import { usePostCreateSubmit } from "@/components/posts/use-post-create-submit";
import {
  postTypeOptions,
  reviewCategoryOptions,
} from "@/components/posts/post-create-form-options";
import {
  AdoptionListingFields,
  CareRequestFields,
  HospitalReviewFields,
  LostFoundFields,
  MarketListingFields,
  PlaceReviewFields,
  StructuredFieldDatalists,
  VolunteerRecruitmentFields,
  WalkRouteFields,
} from "@/components/posts/post-create-structured-fields";
import {
  isAnimalTagsRequiredCommonBoardPostType,
  isCommonBoardPostType,
} from "@/lib/community-board";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import { POST_CONTENT_MAX_LENGTH } from "@/lib/input-limits";
import { REVIEW_CATEGORY } from "@/lib/review-category";

type NeighborhoodOption = {
  id: string;
  name: string;
  city: string;
  district: string;
};

type CommunityOption = {
  id: string;
  slug: string;
  labelKo: string;
  category: {
    labelKo: string;
  };
};

type PostCreateFormProps = {
  neighborhoods: NeighborhoodOption[];
  communities: CommunityOption[];
  defaultNeighborhoodId?: string;
  isAuthenticated: boolean;
  canCreateAdoptionListing?: boolean;
  canMarkOperatorContent?: boolean;
  initialType?: PostType;
};

export function PostCreateForm({
  neighborhoods,
  communities,
  defaultNeighborhoodId = "",
  isAuthenticated,
  canCreateAdoptionListing = false,
  canMarkOperatorContent = false,
  initialType,
}: PostCreateFormProps) {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const latestTitleRef = useRef("");
  const editorHandleRef = useRef<PostBodyRichEditorHandle | null>(null);
  const latestEditorContentRef = useRef("");
  const latestEditorImageUrlsRef = useRef<string[]>([]);
  const [formState, setFormState] = useState<PostCreateFormState>(() => {
    const initialState = createInitialPostCreateFormState(defaultNeighborhoodId);
    return initialType ? { ...initialState, type: initialType } : initialState;
  });

  useEffect(() => {
    latestEditorContentRef.current = formState.content;
    latestEditorImageUrlsRef.current = formState.imageUrls;
  }, [formState.content, formState.imageUrls]);

  const {
    clearDraft,
    draftMessage,
    draftSavedAt,
    isFormInteractive,
    markDraftSubmitted,
  } = usePostCreateDraft({
    formState,
    latestTitleRef,
    setFormState,
    titleInputRef,
  });

  const neighborhoodOptions = useMemo(
    () =>
      neighborhoods.map((neighborhood) => ({
        value: neighborhood.id,
        label: `${neighborhood.city} ${neighborhood.name}`,
      })),
    [neighborhoods],
  );
  const canUseLocalScope = isAuthenticated && neighborhoodOptions.length > 0;

  const communityOptions = useMemo(
    () =>
      communities.map((community) => ({
        value: community.id,
        label:
          community.labelKo === community.category.labelKo
            ? community.labelKo
            : `${community.category.labelKo} · ${community.labelKo}`,
      })),
    [communities],
  );

  const availablePostTypeOptions = useMemo(() => {
    return postTypeOptions.filter((option) => {
      if (!isAuthenticated && GUEST_BLOCKED_POST_TYPES.includes(option.value)) {
        return false;
      }
      if (option.value === PostType.ADOPTION_LISTING && !canCreateAdoptionListing) {
        return false;
      }
      return true;
    });
  }, [canCreateAdoptionListing, isAuthenticated]);

  const { resolvedScope } = usePostCreateGuards({
    availablePostTypeOptions,
    canCreateAdoptionListing,
    communityOptions,
    formState,
    isAuthenticated,
    setFormState,
  });
  const showNeighborhood = resolvedScope === PostScope.LOCAL;
  const isCommonBoardType = isCommonBoardPostType(formState.type);
  const isFreeBoardType = isFreeBoardPostType(formState.type);
  const showReviewCategory = formState.type === PostType.PRODUCT_REVIEW;
  const showCommunitySelector = !isCommonBoardType;
  const showAnimalTagsInput = isAnimalTagsRequiredCommonBoardPostType(formState.type);
  const showHospitalReview = formState.type === PostType.HOSPITAL_REVIEW;
  const showPlaceReview =
    formState.type === PostType.PLACE_REVIEW ||
    (formState.type === PostType.PRODUCT_REVIEW && formState.reviewCategory === REVIEW_CATEGORY.PLACE);
  const showWalkRoute = formState.type === PostType.WALK_ROUTE;
  const showAdoptionListing = formState.type === PostType.ADOPTION_LISTING;
  const showVolunteerRecruitment = formState.type === PostType.SHELTER_VOLUNTEER;
  const showMarketListing = formState.type === PostType.MARKET_LISTING;
  const showCareRequest = formState.type === PostType.CARE_REQUEST;
  const showLostFound = formState.type === PostType.LOST_FOUND;

  const { error, handleSubmit, isPending } = usePostCreateSubmit({
    canUseLocalScope,
    editorHandleRef,
    formState,
    isAuthenticated,
    isFreeBoardType,
    latestEditorContentRef,
    latestEditorImageUrlsRef,
    latestTitleRef,
    markDraftSubmitted,
    resolvedScope,
    setFormState,
    showAnimalTagsInput,
    showCareRequest,
    showCommunitySelector,
    showLostFound,
    showMarketListing,
    showNeighborhood,
    titleInputRef,
  });

  const policySummary = isAuthenticated
    ? canUseLocalScope
      ? "병원 후기, 입양, 봉사 모집은 전체 범위로 고정됩니다. 동네 모임과 돌봄 요청은 대표 동네 범위로 등록됩니다."
      : "대표 동네를 설정해야 동네 기반 글을 작성할 수 있습니다."
    : "비회원 글은 전체로만 등록됩니다. 외부 링크, 연락처, 고위험 게시판은 제한됩니다.";
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PostCreateBasicFields
          formState={formState}
          setFormState={setFormState}
          titleInputRef={titleInputRef}
          isAuthenticated={isAuthenticated}
          isFormInteractive={isFormInteractive}
          canUseLocalScope={canUseLocalScope}
          showNeighborhood={showNeighborhood}
          showReviewCategory={showReviewCategory}
          showCommunitySelector={showCommunitySelector}
          showAnimalTagsInput={showAnimalTagsInput}
          isFreeBoardType={isFreeBoardType}
          postTypeOptions={availablePostTypeOptions}
          reviewCategoryOptions={reviewCategoryOptions}
          neighborhoodOptions={neighborhoodOptions}
          communityOptions={communityOptions}
          onTitleChange={(value) => {
            latestTitleRef.current = value;
          }}
        />

        <PostCreatePolicyAside
          draftMessage={draftMessage}
          draftSavedAt={draftSavedAt}
          policySummary={policySummary}
        />
      </div>

      {canMarkOperatorContent ? (
        <OperatorContentFields
          formState={formState}
          setFormState={setFormState}
          isFormInteractive={isFormInteractive}
        />
      ) : null}

      <PostBodyRichEditor
        ref={editorHandleRef}
        value={formState.content}
        imageUrls={formState.imageUrls}
        onChange={(nextContent, nextImageUrls) => {
          latestEditorContentRef.current = nextContent;
          latestEditorImageUrlsRef.current = nextImageUrls;
          setFormState((prev) =>
            prev.content === nextContent && areSameStringArray(prev.imageUrls, nextImageUrls)
              ? prev
              : {
                  ...prev,
                  content: nextContent,
                  imageUrls: nextImageUrls,
                },
          );
        }}
        maxFiles={isAuthenticated ? 10 : GUEST_MAX_IMAGE_COUNT}
        guestWriteScope={!isAuthenticated ? "upload" : undefined}
        contentMaxLength={POST_CONTENT_MAX_LENGTH}
        footerContent={(
          <PostCreateEditorFooter
            draftMessage={draftMessage}
            draftSavedAt={draftSavedAt}
            onClearDraft={clearDraft}
          />
        )}
      />
      {!isAuthenticated ? (
        <p className="tp-form-note -mt-2">비회원 이미지는 최대 1장, 파일당 2MB까지 업로드할 수 있습니다.</p>
      ) : null}

      {showHospitalReview ? (
        <HospitalReviewFields formState={formState} setFormState={setFormState} />
      ) : null}

      {showPlaceReview ? (
        <PlaceReviewFields formState={formState} setFormState={setFormState} />
      ) : null}

      {showWalkRoute ? (
        <WalkRouteFields formState={formState} setFormState={setFormState} />
      ) : null}

      {showMarketListing ? (
        <MarketListingFields formState={formState} setFormState={setFormState} />
      ) : null}

      {showCareRequest ? (
        <CareRequestFields formState={formState} setFormState={setFormState} />
      ) : null}

      {showLostFound ? (
        <LostFoundFields formState={formState} setFormState={setFormState} />
      ) : null}

      {showAdoptionListing ? (
        <AdoptionListingFields formState={formState} setFormState={setFormState} />
      ) : null}

      {showVolunteerRecruitment ? (
        <VolunteerRecruitmentFields formState={formState} setFormState={setFormState} />
      ) : null}

      <StructuredFieldDatalists />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <PostCreateSubmitFooter
        canUseLocalScope={canUseLocalScope}
        isAuthenticated={isAuthenticated}
        isFormInteractive={isFormInteractive}
        isPending={isPending}
        policySummary={policySummary}
      />
    </form>
  );
}

function OperatorContentFields({
  formState,
  setFormState,
  isFormInteractive,
}: {
  formState: PostCreateFormState;
  setFormState: Dispatch<SetStateAction<PostCreateFormState>>;
  isFormInteractive: boolean;
}) {
  const inputClassName =
    "min-h-10 w-full rounded-lg border border-[#d8e4f6] bg-white px-3 text-sm text-[#17345f] shadow-sm outline-none transition placeholder:text-[#8ca1bf] focus:border-[#8fb4e8] focus:ring-2 focus:ring-[#c9ddf7]";

  return (
    <section className="rounded-xl border border-[#dbe6f5] bg-[#f8fbff] px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <label className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#17345f]">
          <input
            type="checkbox"
            checked={formState.isOperatorContent === "true"}
            disabled={!isFormInteractive}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                isOperatorContent: event.target.checked ? "true" : "false",
              }))
            }
            className="h-4 w-4 rounded border-[#b8cbe6] text-[#2f5da4] focus:ring-[#bfd3f0]"
          />
          운영자 정리 콘텐츠
        </label>
        <p className="max-w-2xl text-xs leading-5 text-[#5c769f]">
          공개 자료나 운영팀 확인 내용을 정리한 글에만 사용합니다. 사용자 경험담과 구분되도록
          출처와 최종 확인일을 함께 남겨 주세요.
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_160px]">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#355988]">
          출처 이름
          <input
            type="text"
            value={formState.operatorSourceName}
            disabled={!isFormInteractive}
            maxLength={80}
            placeholder="서울시 동물보호센터"
            className={inputClassName}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                operatorSourceName: event.target.value,
              }))
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#355988]">
          출처 URL
          <input
            type="url"
            value={formState.operatorSourceUrl}
            disabled={!isFormInteractive}
            maxLength={300}
            placeholder="https://..."
            className={inputClassName}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                operatorSourceUrl: event.target.value,
              }))
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#355988]">
          최종 확인일
          <input
            type="date"
            value={formState.operatorLastVerifiedAt}
            disabled={!isFormInteractive}
            className={inputClassName}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                operatorLastVerifiedAt: event.target.value,
              }))
            }
          />
        </label>
      </div>
    </section>
  );
}
