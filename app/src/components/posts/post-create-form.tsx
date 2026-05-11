"use client";

import { PostScope, PostType } from "@prisma/client";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { PostBodyRichEditor } from "@/components/posts/post-body-rich-editor";
import type { PostBodyRichEditorHandle } from "@/components/posts/post-body-rich-editor";
import { areSameStringArray } from "@/lib/editor-image-markup";
import {
  GUEST_BLOCKED_POST_TYPES,
  GUEST_MAX_IMAGE_COUNT,
} from "@/lib/guest-post-policy";
import { getClientFingerprint } from "@/lib/guest-client";
import { getGuestWriteHeaders } from "@/lib/guest-step-up.client";
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
import {
  buildPostCreateSubmitPayload,
  createPostCreateSuccessState,
} from "@/components/posts/post-create-submit";
import { usePostCreateDraft } from "@/components/posts/use-post-create-draft";
import { usePostCreateGuards } from "@/components/posts/use-post-create-guards";
import {
  postTypeOptions,
  reviewCategoryOptions,
} from "@/components/posts/post-create-form-options";
import {
  AdoptionListingFields,
  CareRequestFields,
  HospitalReviewFields,
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
import { createPostAction } from "@/server/actions/post";

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
};

export function PostCreateForm({
  neighborhoods,
  communities,
  defaultNeighborhoodId = "",
  isAuthenticated,
  canCreateAdoptionListing = false,
}: PostCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const latestTitleRef = useRef("");
  const editorHandleRef = useRef<PostBodyRichEditorHandle | null>(null);
  const latestEditorContentRef = useRef("");
  const latestEditorImageUrlsRef = useRef<string[]>([]);
  const [formState, setFormState] = useState<PostCreateFormState>(() =>
    createInitialPostCreateFormState(defaultNeighborhoodId),
  );

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const editorSnapshot = editorHandleRef.current?.getSerializedState();
    const serializedContent = editorSnapshot?.content ?? latestEditorContentRef.current;
    const serializedImageUrls = editorSnapshot?.imageUrls ?? latestEditorImageUrlsRef.current;
    const normalizedTitle = latestTitleRef.current.trim();
    const payloadResult = buildPostCreateSubmitPayload({
      formState,
      normalizedTitle,
      serializedContent,
      serializedImageUrls,
      resolvedScope,
      isAuthenticated,
      canUseLocalScope,
      showNeighborhood,
      showCommunitySelector,
      showAnimalTagsInput,
      showMarketListing,
      showCareRequest,
      isFreeBoardType,
    });
    if (!payloadResult.ok) {
      setError(payloadResult.message);
      return;
    }

    setFormState((prev) => ({
      ...prev,
      content: serializedContent,
      imageUrls: serializedImageUrls,
    }));

    startTransition(async () => {
      const result = isAuthenticated
        ? await createPostAction(payloadResult.payload, {
            clientFingerprint: getClientFingerprint(),
          })
        : await (async () => {
            try {
              const guestHeaders = await getGuestWriteHeaders("post:create");
              const response = await fetch("/api/posts", {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  ...guestHeaders,
                },
                body: JSON.stringify(payloadResult.payload),
              });
              const responsePayload = (await response.json()) as {
                ok: boolean;
                error?: { message?: string };
              };

              if (response.ok && responsePayload.ok) {
                return { ok: true } as const;
              }

              return {
                ok: false,
                message:
                  responsePayload.error?.message ?? "비회원 글 등록에 실패했습니다.",
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
        setError(result.message ?? "게시글 등록에 실패했습니다.");
        return;
      }

      markDraftSubmitted();
      router.push("/feed");
      router.refresh();
      setFormState(createPostCreateSuccessState);
      latestTitleRef.current = "";
      if (titleInputRef.current) {
        titleInputRef.current.value = "";
      }
    });
  };

  const policySummary = isAuthenticated
    ? canUseLocalScope
      ? "병원후기, 입양, 봉사 모집은 온동네로 고정됩니다. 동네모임과 돌봄 요청은 대표 동네 범위로 등록됩니다."
      : "대표 동네를 설정해야 동네 기반 글을 작성할 수 있습니다."
    : "비회원 글은 전체로만 등록됩니다. 외부 링크, 연락처, 고위험 카테고리는 제한됩니다.";
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
