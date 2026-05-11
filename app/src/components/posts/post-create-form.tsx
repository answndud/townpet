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
import {
  createInitialPostCreateFormState,
  type PostCreateFormState,
} from "@/components/posts/post-create-form-state";
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
import { POST_CONTENT_MAX_LENGTH, POST_TITLE_MAX_LENGTH } from "@/lib/input-limits";
import { REVIEW_CATEGORY, type ReviewCategory } from "@/lib/review-category";
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

  const hasHospitalReview =
    showHospitalReview &&
    (formState.hospitalReview.hospitalName.trim().length > 0 ||
      formState.hospitalReview.treatmentType.trim().length > 0 ||
      formState.hospitalReview.totalCost.trim().length > 0 ||
      formState.hospitalReview.waitTime.trim().length > 0 ||
      formState.hospitalReview.rating.trim().length > 0);

  const hasPlaceReview =
    showPlaceReview &&
    (formState.placeReview.placeName.trim().length > 0 ||
      formState.placeReview.placeType.trim().length > 0 ||
      formState.placeReview.address.trim().length > 0 ||
      formState.placeReview.isPetAllowed.trim().length > 0 ||
      formState.placeReview.rating.trim().length > 0);

  const hasWalkRoute =
    showWalkRoute &&
    (formState.walkRoute.routeName.trim().length > 0 ||
      formState.walkRoute.distance.trim().length > 0 ||
      formState.walkRoute.duration.trim().length > 0 ||
      formState.walkRoute.difficulty.trim().length > 0 ||
      formState.walkRoute.safetyTags.trim().length > 0 ||
      formState.walkRoute.hasStreetLights === "true" ||
      formState.walkRoute.hasRestroom === "true" ||
      formState.walkRoute.hasParkingLot === "true");

  const hasAdoptionListing =
    showAdoptionListing &&
    (formState.adoptionListing.shelterName.trim().length > 0 ||
      formState.adoptionListing.region.trim().length > 0 ||
      formState.adoptionListing.animalType.trim().length > 0 ||
      formState.adoptionListing.breed.trim().length > 0 ||
      formState.adoptionListing.ageLabel.trim().length > 0 ||
      formState.adoptionListing.sex.trim().length > 0 ||
      formState.adoptionListing.isNeutered.trim().length > 0 ||
      formState.adoptionListing.isVaccinated.trim().length > 0 ||
      formState.adoptionListing.sizeLabel.trim().length > 0 ||
      formState.adoptionListing.status.trim().length > 0);

  const hasVolunteerRecruitment =
    showVolunteerRecruitment &&
    (formState.volunteerRecruitment.shelterName.trim().length > 0 ||
      formState.volunteerRecruitment.region.trim().length > 0 ||
      formState.volunteerRecruitment.volunteerDate.trim().length > 0 ||
      formState.volunteerRecruitment.volunteerType.trim().length > 0 ||
      formState.volunteerRecruitment.capacity.trim().length > 0 ||
      formState.volunteerRecruitment.status.trim().length > 0);
  const hasMarketListing = showMarketListing;
  const hasCareRequest = showCareRequest;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const editorSnapshot = editorHandleRef.current?.getSerializedState();
    const serializedContent = editorSnapshot?.content ?? latestEditorContentRef.current;
    const serializedImageUrls = editorSnapshot?.imageUrls ?? latestEditorImageUrlsRef.current;
    const normalizedTitle = latestTitleRef.current.trim();
    if (!normalizedTitle) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (!serializedContent.trim()) {
      setError("내용을 입력해 주세요.");
      return;
    }
    if (serializedContent.length > POST_CONTENT_MAX_LENGTH) {
      setError(`내용은 ${POST_CONTENT_MAX_LENGTH.toLocaleString("ko-KR")}자까지 입력할 수 있습니다.`);
      return;
    }

    const normalizedAnimalTags = formState.animalTagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 5);
    const resolvedType =
      formState.type === PostType.PRODUCT_REVIEW && formState.reviewCategory === REVIEW_CATEGORY.PLACE
        ? PostType.PLACE_REVIEW
        : formState.type;
    const shouldAttachReviewCategory =
      resolvedType === PostType.PLACE_REVIEW || resolvedType === PostType.PRODUCT_REVIEW;

    if (showCommunitySelector && !isFreeBoardType && !formState.petTypeId) {
      setError("커뮤니티를 선택해 주세요.");
      return;
    }

    if (resolvedScope === PostScope.LOCAL && !formState.neighborhoodId) {
      setError(
        canUseLocalScope
          ? "동네를 먼저 선택해 주세요."
          : "동네 기반 글을 작성하려면 먼저 대표 동네를 설정해 주세요.",
      );
      return;
    }

    if (showAnimalTagsInput && normalizedAnimalTags.length === 0) {
      setError("공용 보드 글은 동물 태그를 1개 이상 입력해 주세요.");
      return;
    }

    if (showMarketListing && formState.marketListing.price.trim().length === 0) {
      setError("마켓 글은 가격을 입력해 주세요. 나눔은 0원을 입력합니다.");
      return;
    }

    if (showCareRequest && !formState.careRequest.startsAt) {
      setError("돌봄 요청은 시작 시간을 입력해 주세요.");
      return;
    }

    setFormState((prev) => ({
      ...prev,
      content: serializedContent,
      imageUrls: serializedImageUrls,
    }));

    startTransition(async () => {
      const payload = {
        title: normalizedTitle,
        content: serializedContent,
        type: resolvedType,
        reviewCategory: shouldAttachReviewCategory ? formState.reviewCategory : undefined,
        scope: isAuthenticated ? resolvedScope : PostScope.GLOBAL,
        imageUrls: serializedImageUrls,
        neighborhoodId: showNeighborhood ? formState.neighborhoodId : undefined,
        petTypeId: showCommunitySelector ? formState.petTypeId || undefined : undefined,
        animalTags: showAnimalTagsInput ? normalizedAnimalTags : undefined,
        guestDisplayName: isAuthenticated ? undefined : formState.guestDisplayName,
        guestPassword: isAuthenticated ? undefined : formState.guestPassword,
        hospitalReview: hasHospitalReview
          ? {
              ...formState.hospitalReview,
              totalCost: formState.hospitalReview.totalCost || undefined,
              waitTime: formState.hospitalReview.waitTime || undefined,
            }
          : undefined,
        placeReview: hasPlaceReview
          ? {
              ...formState.placeReview,
              isPetAllowed: formState.placeReview.isPetAllowed || undefined,
            }
          : undefined,
        walkRoute: hasWalkRoute
          ? {
              ...formState.walkRoute,
              distance: formState.walkRoute.distance || undefined,
              duration: formState.walkRoute.duration || undefined,
              safetyTags: formState.walkRoute.safetyTags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            }
          : undefined,
        adoptionListing: hasAdoptionListing
          ? {
              ...formState.adoptionListing,
              sex: formState.adoptionListing.sex || undefined,
              isNeutered: formState.adoptionListing.isNeutered || undefined,
              isVaccinated: formState.adoptionListing.isVaccinated || undefined,
              status: formState.adoptionListing.status || undefined,
            }
          : undefined,
        volunteerRecruitment: hasVolunteerRecruitment
          ? {
              ...formState.volunteerRecruitment,
              volunteerDate: formState.volunteerRecruitment.volunteerDate || undefined,
              capacity: formState.volunteerRecruitment.capacity || undefined,
              status: formState.volunteerRecruitment.status || undefined,
            }
          : undefined,
        marketListing: hasMarketListing
          ? {
              ...formState.marketListing,
              depositAmount: formState.marketListing.depositAmount || undefined,
              rentalPeriod: formState.marketListing.rentalPeriod || undefined,
            }
          : undefined,
        careRequest: hasCareRequest
          ? {
              ...formState.careRequest,
              startsAt: formState.careRequest.startsAt || undefined,
              endsAt: formState.careRequest.endsAt || undefined,
              locationNote: formState.careRequest.locationNote || undefined,
              petNote: formState.careRequest.petNote || undefined,
              requirements: formState.careRequest.requirements || undefined,
              rewardAmount: formState.careRequest.rewardAmount || undefined,
              isUrgent: formState.careRequest.isUrgent === "true",
            }
          : undefined,
      };

      const result = isAuthenticated
        ? await createPostAction(payload, {
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
                body: JSON.stringify(payload),
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
      setFormState((prev) => ({
        ...prev,
        title: "",
        content: "",
        type: PostType.FREE_BOARD,
        petTypeId: "",
        reviewCategory: REVIEW_CATEGORY.SUPPLIES,
        animalTagsInput: "",
        hospitalReview: {
          ...prev.hospitalReview,
          hospitalName: "",
          treatmentType: "",
          totalCost: "",
          waitTime: "",
          rating: "",
        },
        placeReview: {
          ...prev.placeReview,
          placeName: "",
          placeType: "",
          address: "",
          isPetAllowed: "",
          rating: "",
        },
        walkRoute: {
          ...prev.walkRoute,
          routeName: "",
          distance: "",
          duration: "",
          difficulty: "",
          safetyTags: "",
        },
        adoptionListing: {
          ...prev.adoptionListing,
          shelterName: "",
          region: "",
          animalType: "",
          breed: "",
          ageLabel: "",
          sex: "",
          isNeutered: "",
          isVaccinated: "",
          sizeLabel: "",
          status: "OPEN",
        },
        volunteerRecruitment: {
          ...prev.volunteerRecruitment,
          shelterName: "",
          region: "",
          volunteerDate: "",
          volunteerType: "",
          capacity: "",
          status: "OPEN",
        },
        marketListing: {
          ...prev.marketListing,
          listingType: "SELL",
          price: "",
          condition: "GOOD",
          depositAmount: "",
          rentalPeriod: "",
        },
        imageUrls: [],
        guestDisplayName: "",
        guestPassword: "",
      }));
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
      <section className="tp-card overflow-hidden">
        <div className="tp-form-section-bar">
          <p className="tp-form-section-title">
            글 정보
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          <label className="tp-form-label">
            제목
            <input
              ref={titleInputRef}
              className="tp-input-soft min-h-11 px-3 py-2 text-sm"
              defaultValue={formState.title}
              onChange={(event) => {
                latestTitleRef.current = event.target.value;
              }}
              disabled={!isFormInteractive}
              maxLength={POST_TITLE_MAX_LENGTH}
              placeholder="제목을 입력해 주세요"
              required
            />
          </label>

          <label className="tp-form-label">
            분류
            <select
              className="tp-input-soft min-h-11 px-3 py-2 text-sm"
              value={formState.type}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  type: event.target.value as PostType,
                }))
              }
            >
              {availablePostTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {showReviewCategory ? (
            <label className="tp-form-label">
              리뷰 카테고리
              <select
                className="tp-input-soft min-h-11 px-3 py-2 text-sm"
                value={formState.reviewCategory}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    reviewCategory: event.target.value as ReviewCategory,
                  }))
                }
              >
                {reviewCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {showNeighborhood ? (
            <label className="tp-form-label">
              동네
              <select
                className={`tp-input-soft min-h-11 px-3 py-2 text-sm transition ${
                  showNeighborhood
                    ? ""
                    : "tp-btn-disabled cursor-not-allowed"
                }`}
                value={formState.neighborhoodId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    neighborhoodId: event.target.value,
                  }))
                }
                disabled={!showNeighborhood || !canUseLocalScope}
                required={showNeighborhood && canUseLocalScope}
              >
                <option value="">선택</option>
                {neighborhoodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {!canUseLocalScope ? (
                <span className="tp-form-note flex items-center gap-2">
                  <span>동네를 먼저 설정해 주세요.</span>
                  <Link href="/profile" className="tp-text-link font-semibold underline underline-offset-2">
                    설정 페이지로 이동
                  </Link>
                </span>
              ) : null}
            </label>
          ) : null}

          {showCommunitySelector ? (
            <label className="tp-form-label">
              관련 동물
              <select
                className="tp-input-soft min-h-11 px-3 py-2 text-sm"
                value={formState.petTypeId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    petTypeId: event.target.value,
                  }))
                }
                required={!isFreeBoardType}
              >
                <option value="">{isFreeBoardType ? "선택 안함" : "선택"}</option>
                {communityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {showAnimalTagsInput ? (
            <label className="tp-form-label md:col-span-2">
              동물 태그
              <input
                className="tp-input-soft min-h-11 px-3 py-2 text-sm"
                value={formState.animalTagsInput}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    animalTagsInput: event.target.value,
                  }))
                }
                placeholder="예: 강아지, 고양이"
                required
              />
              <span className="tp-form-note">
                공용 보드 글의 노출 향상을 위해 동물 태그를 쉼표로 구분해 입력해 주세요.
              </span>
            </label>
          ) : null}
        </div>
        {!isAuthenticated ? (
          <div className="tp-border-soft tp-surface-soft grid gap-3 border-t p-4 md:grid-cols-2">
            <label className="tp-form-label">
              비회원 닉네임
              <input
                className="tp-input-soft min-h-11 bg-white px-3 py-2 text-sm"
                value={formState.guestDisplayName}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, guestDisplayName: event.target.value }))
                }
                placeholder="닉네임"
                minLength={2}
                maxLength={24}
                required
              />
            </label>
            <label className="tp-form-label">
              글 비밀번호
              <input
                type="password"
                className="tp-input-soft min-h-11 bg-white px-3 py-2 text-sm"
                value={formState.guestPassword}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, guestPassword: event.target.value }))
                }
                placeholder="수정/삭제용 비밀번호"
                minLength={4}
                maxLength={32}
                required
              />
            </label>
          </div>
        ) : null}
      </section>

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
