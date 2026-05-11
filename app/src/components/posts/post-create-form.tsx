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
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PostBodyRichEditor } from "@/components/posts/post-body-rich-editor";
import type { PostBodyRichEditorHandle } from "@/components/posts/post-body-rich-editor";
import { areSameStringArray } from "@/lib/editor-image-markup";
import {
  PostEditorToolbarButton,
} from "@/components/posts/post-rich-text-editor-shell";
import {
  GUEST_BLOCKED_POST_TYPES,
  GUEST_MAX_IMAGE_COUNT,
} from "@/lib/guest-post-policy";
import { getClientFingerprint } from "@/lib/guest-client";
import { getGuestWriteHeaders } from "@/lib/guest-step-up.client";
import { PostCreateBasicFields } from "@/components/posts/post-create-basic-fields";
import {
  createInitialPostCreateFormState,
  type PostCreateFormState,
} from "@/components/posts/post-create-form-state";
import {
  buildPostCreateSubmitPayload,
  createPostCreateSuccessState,
} from "@/components/posts/post-create-submit";
import { usePostCreateDraft } from "@/components/posts/use-post-create-draft";
import {
  postTypeOptions,
  resolveScopeByPostType,
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

  useEffect(() => {
    let timer: number | null = null;
    if (!isAuthenticated && formState.scope !== PostScope.GLOBAL) {
      timer = window.setTimeout(() => {
        setFormState((prev) => ({ ...prev, scope: PostScope.GLOBAL }));
      }, 0);
      return () => {
        if (timer !== null) {
          window.clearTimeout(timer);
        }
      };
    }

    const isGuestBlockedType =
      !isAuthenticated && GUEST_BLOCKED_POST_TYPES.includes(formState.type);
    const isRoleBlockedType =
      formState.type === PostType.ADOPTION_LISTING && !canCreateAdoptionListing;

    if (
      isGuestBlockedType ||
      isRoleBlockedType ||
      !availablePostTypeOptions.some((option) => option.value === formState.type)
    ) {
      timer = window.setTimeout(() => {
        setFormState((prev) => ({ ...prev, type: PostType.FREE_BOARD }));
      }, 0);
    }

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [
    availablePostTypeOptions,
    canCreateAdoptionListing,
    formState.scope,
    formState.type,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (formState.type !== PostType.PLACE_REVIEW) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFormState((prev) => ({
        ...prev,
        type: PostType.PRODUCT_REVIEW,
        reviewCategory: REVIEW_CATEGORY.PLACE,
      }));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [formState.type]);

  useEffect(() => {
    if (formState.petTypeId || isFreeBoardPostType(formState.type)) {
      return;
    }

    if (communityOptions.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFormState((prev) => ({
        ...prev,
        petTypeId: communityOptions[0].value,
      }));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [communityOptions, formState.petTypeId, formState.type]);

  const resolvedScope = resolveScopeByPostType(formState.type, formState.scope);
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

  useEffect(() => {
    let timer: number | null = null;
    if (formState.scope !== resolvedScope) {
      timer = window.setTimeout(() => {
        setFormState((prev) => ({
          ...prev,
          scope: resolvedScope,
        }));
      }, 0);
      return () => {
        if (timer !== null) {
          window.clearTimeout(timer);
        }
      };
    }

    if (resolvedScope !== PostScope.LOCAL && formState.neighborhoodId) {
      timer = window.setTimeout(() => {
        setFormState((prev) => ({
          ...prev,
          neighborhoodId: "",
        }));
      }, 0);
    }

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [formState.neighborhoodId, formState.scope, resolvedScope]);

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

      <aside className="tp-card h-fit p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">작성 기준</p>
        <div className="mt-3 space-y-3 text-xs leading-6 text-[#4f678d]">
          <p>{policySummary}</p>
          <div className="rounded-lg border border-[#d8e4f6] bg-[#f8fbff] p-3">
            <p className="font-semibold text-[#163462]">등록 전 확인</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>제목과 본문에 동물, 지역, 상황을 구체적으로 적어 주세요.</li>
              <li>연락처나 외부 거래 유도는 정책에 따라 제한될 수 있습니다.</li>
              <li>임시저장은 이 브라우저에만 24시간 보관되며 공용 기기에서는 삭제해 주세요.</li>
              <li>분류를 바꾸면 필요한 추가 정보가 아래에 표시됩니다.</li>
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-[#cbdcf5] bg-white px-2.5 py-1 text-[#355988]">
              {draftSavedAt
                ? `임시저장 ${new Date(draftSavedAt).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "임시저장 대기"}
            </span>
            {draftMessage ? (
              <span className="rounded-lg border border-[#cbdcf5] bg-white px-2.5 py-1 text-[#315b9a]">
                {draftMessage}
              </span>
            ) : null}
          </div>
        </div>
      </aside>
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
          <>
            <PostEditorToolbarButton onClick={clearDraft}>임시저장 삭제</PostEditorToolbarButton>
            <span className="tp-text-subtle">
              {draftSavedAt
                ? `임시저장: ${new Date(draftSavedAt).toLocaleString("ko-KR")}`
                : "임시저장 없음"}
            </span>
            {draftMessage ? <span className="tp-text-accent">{draftMessage}</span> : null}
          </>
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

      <div className="tp-border-soft flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <p className="tp-form-note">{policySummary}</p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {isAuthenticated && !canUseLocalScope ? (
            <Link
              href="/profile"
              className="tp-btn-soft tp-btn-md inline-flex w-full items-center justify-center px-4 text-xs sm:w-auto"
            >
              프로필에서 동네 설정
            </Link>
          ) : null}
          <Link
            href="/feed"
            className="tp-btn-soft tp-btn-md inline-flex w-full items-center justify-center px-5 text-sm sm:w-auto"
          >
            취소
          </Link>
          <button
            type="submit"
            className="tp-btn-primary tp-btn-md inline-flex w-full items-center justify-center px-6 text-sm disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0] sm:w-auto"
            disabled={isPending || !isFormInteractive}
          >
            {isPending ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </form>
  );
}
