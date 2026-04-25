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
import type { ReactNode } from "react";

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
  isAnimalTagsRequiredCommonBoardPostType,
  isCommonBoardPostType,
} from "@/lib/community-board";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import { POST_CONTENT_MAX_LENGTH, POST_TITLE_MAX_LENGTH } from "@/lib/input-limits";
import { REVIEW_CATEGORY, type ReviewCategory } from "@/lib/review-category";
import {
  ADOPTION_AGE_LABEL_SUGGESTIONS,
  ADOPTION_ANIMAL_TYPE_SUGGESTIONS,
  ADOPTION_BREED_SUGGESTIONS,
  HOSPITAL_TREATMENT_TYPE_SUGGESTIONS,
  STRUCTURED_REGION_SUGGESTIONS,
  VOLUNTEER_TYPE_SUGGESTIONS,
} from "@/lib/structured-field-normalization";
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

type PostCreateFormState = {
  title: string;
  content: string;
  type: PostType;
  scope: PostScope;
  neighborhoodId: string;
  petTypeId: string;
  reviewCategory: ReviewCategory;
  animalTagsInput: string;
  hospitalReview: {
    hospitalName: string;
    treatmentType: string;
    totalCost: string;
    waitTime: string;
    rating: string;
  };
  placeReview: {
    placeName: string;
    placeType: string;
    address: string;
    isPetAllowed: string;
    rating: string;
  };
  walkRoute: {
    routeName: string;
    distance: string;
    duration: string;
    difficulty: string;
    hasStreetLights: string;
    hasRestroom: string;
    hasParkingLot: string;
    safetyTags: string;
  };
  adoptionListing: {
    shelterName: string;
    region: string;
    animalType: string;
    breed: string;
    ageLabel: string;
    sex: string;
    isNeutered: string;
    isVaccinated: string;
    sizeLabel: string;
    status: string;
  };
  volunteerRecruitment: {
    shelterName: string;
    region: string;
    volunteerDate: string;
    volunteerType: string;
    capacity: string;
    status: string;
  };
  marketListing: {
    listingType: string;
    price: string;
    condition: string;
    depositAmount: string;
    rentalPeriod: string;
  };
  imageUrls: string[];
  guestDisplayName: string;
  guestPassword: string;
};

const postTypeOptions = [
  { value: PostType.FREE_BOARD, label: "자유게시판" },
  { value: PostType.QA_QUESTION, label: "질문/답변" },
  { value: PostType.HOSPITAL_REVIEW, label: "병원후기" },
  { value: PostType.LOST_FOUND, label: "실종/목격 제보" },
  { value: PostType.MEETUP, label: "동네모임" },
  { value: PostType.MARKET_LISTING, label: "중고/공동구매" },
  { value: PostType.ADOPTION_LISTING, label: "유기동물 입양" },
  { value: PostType.SHELTER_VOLUNTEER, label: "보호소 봉사 모집" },
  { value: PostType.PRODUCT_REVIEW, label: "리뷰" },
  { value: PostType.PET_SHOWCASE, label: "반려동물 자랑" },
];

function resolveScopeByPostType(type: PostType, scope: PostScope) {
  if (
    type === PostType.HOSPITAL_REVIEW ||
    type === PostType.ADOPTION_LISTING ||
    type === PostType.SHELTER_VOLUNTEER
  ) {
    return PostScope.GLOBAL;
  }
  if (type === PostType.MEETUP) {
    return PostScope.LOCAL;
  }
  return scope;
}

const reviewCategoryOptions: Array<{ value: ReviewCategory; label: string }> = [
  { value: REVIEW_CATEGORY.SUPPLIES, label: "용품" },
  { value: REVIEW_CATEGORY.FEED, label: "사료" },
  { value: REVIEW_CATEGORY.SNACK, label: "간식" },
  { value: REVIEW_CATEGORY.TOY, label: "장난감" },
  { value: REVIEW_CATEGORY.PLACE, label: "장소" },
  { value: REVIEW_CATEGORY.ETC, label: "기타" },
];

const marketListingTypeOptions = [
  { value: "SELL", label: "판매" },
  { value: "RENT", label: "대여" },
  { value: "SHARE", label: "나눔" },
] as const;

const marketConditionOptions = [
  { value: "NEW", label: "새상품" },
  { value: "LIKE_NEW", label: "거의 새것" },
  { value: "GOOD", label: "사용감 적음" },
  { value: "FAIR", label: "사용감 있음" },
] as const;

const DRAFT_STORAGE_KEY = "townpet:post-create-draft:v1";

function StructuredFieldSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="tp-card overflow-hidden">
      <div className="tp-form-section-bar">
        <p className="tp-form-section-title">{title}</p>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function isDraftFormState(value: unknown): value is PostCreateFormState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PostCreateFormState>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.scope === "string" &&
    typeof candidate.neighborhoodId === "string" &&
    (typeof candidate.petTypeId === "string" || candidate.petTypeId === undefined) &&
    (typeof candidate.reviewCategory === "string" || candidate.reviewCategory === undefined) &&
    (typeof candidate.animalTagsInput === "string" || candidate.animalTagsInput === undefined) &&
    Array.isArray(candidate.imageUrls) &&
    (typeof candidate.guestDisplayName === "string" || candidate.guestDisplayName === undefined) &&
    (typeof candidate.guestPassword === "string" || candidate.guestPassword === undefined) &&
    !!candidate.hospitalReview &&
    !!candidate.placeReview &&
    !!candidate.walkRoute &&
    !!candidate.adoptionListing &&
    !!candidate.volunteerRecruitment
  );
}

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
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const editorHandleRef = useRef<PostBodyRichEditorHandle | null>(null);
  const latestEditorContentRef = useRef("");
  const latestEditorImageUrlsRef = useRef<string[]>([]);
  const [formState, setFormState] = useState<PostCreateFormState>({
    title: "",
    content: "",
    type: PostType.FREE_BOARD,
    scope: PostScope.GLOBAL,
    neighborhoodId: defaultNeighborhoodId,
    petTypeId: "",
    reviewCategory: REVIEW_CATEGORY.SUPPLIES,
    animalTagsInput: "",
    hospitalReview: {
      hospitalName: "",
      treatmentType: "",
      totalCost: "",
      waitTime: "",
      rating: "",
    },
    placeReview: {
      placeName: "",
      placeType: "",
      address: "",
      isPetAllowed: "",
      rating: "",
    },
    walkRoute: {
      routeName: "",
      distance: "",
      duration: "",
      difficulty: "",
      hasStreetLights: "false",
      hasRestroom: "false",
      hasParkingLot: "false",
      safetyTags: "",
    },
    adoptionListing: {
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
      shelterName: "",
      region: "",
      volunteerDate: "",
      volunteerType: "",
      capacity: "",
      status: "OPEN",
    },
    marketListing: {
      listingType: "SELL",
      price: "",
      condition: "GOOD",
      depositAmount: "",
      rentalPeriod: "",
    },
    imageUrls: [],
    guestDisplayName: "",
    guestPassword: "",
  });

  useEffect(() => {
    latestEditorContentRef.current = formState.content;
    latestEditorImageUrlsRef.current = formState.imageUrls;
  }, [formState.content, formState.imageUrls]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) {
      setDraftLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as {
        savedAt?: string;
        form?: unknown;
      };
      if (isDraftFormState(parsed.form)) {
        const draftForm = parsed.form as Partial<PostCreateFormState>;
        setFormState((prev) => ({
          ...prev,
          ...draftForm,
          petTypeId: draftForm.petTypeId ?? prev.petTypeId,
          reviewCategory: draftForm.reviewCategory ?? prev.reviewCategory,
          animalTagsInput: draftForm.animalTagsInput ?? "",
          marketListing: draftForm.marketListing ?? prev.marketListing,
          guestDisplayName: draftForm.guestDisplayName ?? "",
          guestPassword: "",
        }));
      }
      if (parsed.savedAt) {
        setDraftSavedAt(parsed.savedAt);
      }
      setDraftMessage("임시저장을 불러왔습니다.");
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      setDraftMessage("임시저장을 읽을 수 없어 초기화했습니다.");
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded || typeof window === "undefined") {
      return;
    }

    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          savedAt,
          form: {
            ...formState,
            guestPassword: "",
          },
        }),
      );
      setDraftSavedAt(savedAt);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftLoaded, formState]);

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
    if (!isAuthenticated && formState.scope !== PostScope.GLOBAL) {
      setFormState((prev) => ({ ...prev, scope: PostScope.GLOBAL }));
      return;
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
      setFormState((prev) => ({ ...prev, type: PostType.FREE_BOARD }));
    }
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

    setFormState((prev) => ({
      ...prev,
      type: PostType.PRODUCT_REVIEW,
      reviewCategory: REVIEW_CATEGORY.PLACE,
    }));
  }, [formState.type]);

  useEffect(() => {
    if (formState.petTypeId || isFreeBoardPostType(formState.type)) {
      return;
    }

    if (communityOptions.length === 0) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      petTypeId: communityOptions[0].value,
    }));
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

  useEffect(() => {
    if (formState.scope !== resolvedScope) {
      setFormState((prev) => ({
        ...prev,
        scope: resolvedScope,
      }));
      return;
    }

    if (resolvedScope !== PostScope.LOCAL && formState.neighborhoodId) {
      setFormState((prev) => ({
        ...prev,
        neighborhoodId: "",
      }));
    }
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

  const clearDraft = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftSavedAt(null);
    setDraftMessage("임시저장을 삭제했습니다.");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const editorSnapshot = editorHandleRef.current?.getSerializedState();
    const serializedContent = editorSnapshot?.content ?? latestEditorContentRef.current;
    const serializedImageUrls = editorSnapshot?.imageUrls ?? latestEditorImageUrlsRef.current;
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
          : "동네모임 글을 작성하려면 먼저 대표 동네를 설정해 주세요.",
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

    setFormState((prev) => ({
      ...prev,
      content: serializedContent,
      imageUrls: serializedImageUrls,
    }));

    startTransition(async () => {
      const payload = {
        title: formState.title,
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

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      setDraftSavedAt(null);
      setDraftMessage("게시글을 등록해 임시저장을 비웠습니다.");
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
    });
  };

  const policySummary = isAuthenticated
    ? canUseLocalScope
      ? "병원후기, 입양, 봉사 모집은 온동네로 고정됩니다. 동네모임은 대표 동네 범위로만 등록됩니다."
      : "대표 동네를 설정해야 동네모임을 작성할 수 있습니다."
    : "비회원 글은 전체로만 등록됩니다. 외부 링크, 연락처, 고위험 카테고리는 제한됩니다.";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
              className="tp-input-soft min-h-11 px-3 py-2 text-sm"
              value={formState.title}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, title: event.target.value }))
              }
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

          {formState.type === PostType.MEETUP ? (
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
        <StructuredFieldSection title="병원후기 정보">
          <label className="tp-form-label">
            병원명
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.hospitalReview.hospitalName}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    hospitalName: event.target.value,
                  },
                }))
              }
              placeholder="예: 서초동 24시 동물병원"
            />
          </label>

          <label className="tp-form-label">
            진료 항목
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.hospitalReview.treatmentType}
              list="hospital-treatment-type-options"
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    treatmentType: event.target.value,
                  },
                }))
              }
              placeholder="예: 피부염 검사"
            />
          </label>

          <label className="tp-form-label">
            비용(원)
            <input
              type="number"
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.hospitalReview.totalCost}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    totalCost: event.target.value,
                  },
                }))
              }
              placeholder="예: 35000"
              min={0}
            />
          </label>

          <label className="tp-form-label">
            대기시간(분)
            <input
              type="number"
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.hospitalReview.waitTime}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    waitTime: event.target.value,
                  },
                }))
              }
              placeholder="예: 20"
              min={0}
            />
          </label>

          <label className="tp-form-label">
            만족도
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.hospitalReview.rating}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  hospitalReview: {
                    ...prev.hospitalReview,
                    rating: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}점
                </option>
              ))}
            </select>
          </label>
        </StructuredFieldSection>
      ) : null}

      {showPlaceReview ? (
        <StructuredFieldSection title="장소 후기 정보">
          <label className="tp-form-label">
            장소명
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.placeReview.placeName}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  placeReview: {
                    ...prev.placeReview,
                    placeName: event.target.value,
                  },
                }))
              }
              placeholder="예: 연남동 펫카페"
            />
          </label>

          <label className="tp-form-label">
            장소 유형
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.placeReview.placeType}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  placeReview: {
                    ...prev.placeReview,
                    placeType: event.target.value,
                  },
                }))
              }
              placeholder="예: 카페"
            />
          </label>

          <label className="tp-form-label">
            주소
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.placeReview.address}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  placeReview: {
                    ...prev.placeReview,
                    address: event.target.value,
                  },
                }))
              }
              placeholder="예: 마포구 연남동"
            />
          </label>

          <label className="tp-form-label">
            동반 가능 여부
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.placeReview.isPetAllowed}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  placeReview: {
                    ...prev.placeReview,
                    isPetAllowed: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              <option value="true">가능</option>
              <option value="false">불가</option>
            </select>
          </label>

          <label className="tp-form-label">
            만족도
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.placeReview.rating}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  placeReview: {
                    ...prev.placeReview,
                    rating: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}점
                </option>
              ))}
            </select>
          </label>
        </StructuredFieldSection>
      ) : null}

      {showWalkRoute ? (
        <StructuredFieldSection title="산책 코스 정보">
          <label className="tp-form-label">
            코스 이름
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.walkRoute.routeName}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    routeName: event.target.value,
                  },
                }))
              }
              placeholder="예: 양재천 산책 코스"
            />
          </label>

          <label className="tp-form-label">
            거리(km)
            <input
              type="number"
              step="0.1"
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.walkRoute.distance}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    distance: event.target.value,
                  },
                }))
              }
              placeholder="예: 2.5"
              min={0}
            />
          </label>

          <label className="tp-form-label">
            소요시간(분)
            <input
              type="number"
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.walkRoute.duration}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    duration: event.target.value,
                  },
                }))
              }
              placeholder="예: 40"
              min={0}
            />
          </label>

          <label className="tp-form-label">
            난이도
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.walkRoute.difficulty}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    difficulty: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              <option value="EASY">쉬움</option>
              <option value="MODERATE">보통</option>
              <option value="HARD">어려움</option>
            </select>
          </label>

          <label className="tp-form-label">
            안전 태그(콤마)
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.walkRoute.safetyTags}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  walkRoute: {
                    ...prev.walkRoute,
                    safetyTags: event.target.value,
                  },
                }))
              }
              placeholder="예: 차량주의, 야간조명"
            />
          </label>

          <div className="tp-form-label">
            편의 시설
            <div className="tp-text-muted flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-[#3567b5]"
                  checked={formState.walkRoute.hasStreetLights === "true"}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      walkRoute: {
                        ...prev.walkRoute,
                        hasStreetLights: event.target.checked ? "true" : "false",
                      },
                    }))
                  }
                />
                가로등
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-[#3567b5]"
                  checked={formState.walkRoute.hasRestroom === "true"}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      walkRoute: {
                        ...prev.walkRoute,
                        hasRestroom: event.target.checked ? "true" : "false",
                      },
                    }))
                  }
                />
                화장실
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-[#3567b5]"
                  checked={formState.walkRoute.hasParkingLot === "true"}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      walkRoute: {
                        ...prev.walkRoute,
                        hasParkingLot: event.target.checked ? "true" : "false",
                      },
                    }))
                  }
                />
                주차장
              </label>
            </div>
          </div>
        </StructuredFieldSection>
      ) : null}

      {showMarketListing ? (
        <StructuredFieldSection title="마켓 거래 정보">
          <label className="tp-form-label">
            거래 유형
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.marketListing.listingType}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  marketListing: {
                    ...prev.marketListing,
                    listingType: event.target.value,
                  },
                }))
              }
            >
              {marketListingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="tp-form-label">
            가격(원)
            <input
              type="number"
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.marketListing.price}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  marketListing: {
                    ...prev.marketListing,
                    price: event.target.value,
                  },
                }))
              }
              placeholder="나눔은 0"
              min={0}
              required
            />
          </label>

          <label className="tp-form-label">
            상품 상태
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.marketListing.condition}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  marketListing: {
                    ...prev.marketListing,
                    condition: event.target.value,
                  },
                }))
              }
            >
              {marketConditionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="tp-form-label">
            보증금(원)
            <input
              type="number"
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.marketListing.depositAmount}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  marketListing: {
                    ...prev.marketListing,
                    depositAmount: event.target.value,
                  },
                }))
              }
              placeholder="대여 글일 때 선택"
              min={0}
            />
          </label>

          <label className="tp-form-label md:col-span-2">
            대여/거래 기간
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.marketListing.rentalPeriod}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  marketListing: {
                    ...prev.marketListing,
                    rentalPeriod: event.target.value,
                  },
                }))
              }
              placeholder="예: 2주 대여, 이번 주말 직거래"
            />
          </label>
        </StructuredFieldSection>
      ) : null}

      {showAdoptionListing ? (
        <StructuredFieldSection title="입양 정보">
          <label className="tp-form-label">
            보호소명
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.adoptionListing.shelterName}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  adoptionListing: {
                    ...prev.adoptionListing,
                    shelterName: event.target.value,
                  },
                }))
              }
              placeholder="예: 서울시 동물보호센터"
            />
          </label>

          <label className="tp-form-label">
            지역
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.adoptionListing.region}
              list="structured-region-options"
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  adoptionListing: {
                    ...prev.adoptionListing,
                    region: event.target.value,
                  },
                }))
              }
              placeholder="예: 서울 마포구"
            />
          </label>

          <label className="tp-form-label">
            동물 종류
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.adoptionListing.animalType}
              list="adoption-animal-type-options"
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  adoptionListing: {
                    ...prev.adoptionListing,
                    animalType: event.target.value,
                  },
                }))
              }
              placeholder="예: 강아지"
            />
          </label>

          <label className="tp-form-label">
            품종
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.adoptionListing.breed}
              list="adoption-breed-options"
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  adoptionListing: {
                    ...prev.adoptionListing,
                    breed: event.target.value,
                  },
                }))
              }
              placeholder="예: 믹스견"
            />
          </label>

          <label className="tp-form-label">
            나이/추정 개월수
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.adoptionListing.ageLabel}
              list="adoption-age-label-options"
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  adoptionListing: {
                    ...prev.adoptionListing,
                    ageLabel: event.target.value,
                  },
                }))
              }
              placeholder="예: 2살 추정"
            />
          </label>

          <label className="tp-form-label">
            성별
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.adoptionListing.sex}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  adoptionListing: {
                    ...prev.adoptionListing,
                    sex: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              <option value="MALE">수컷</option>
              <option value="FEMALE">암컷</option>
              <option value="UNKNOWN">미상</option>
            </select>
          </label>

          <label className="tp-form-label">
            중성화
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.adoptionListing.isNeutered}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  adoptionListing: {
                    ...prev.adoptionListing,
                    isNeutered: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              <option value="true">완료</option>
              <option value="false">미완료</option>
            </select>
          </label>

          <label className="tp-form-label">
            예방접종
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.adoptionListing.isVaccinated}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  adoptionListing: {
                    ...prev.adoptionListing,
                    isVaccinated: event.target.value,
                  },
                }))
              }
            >
              <option value="">선택 안함</option>
              <option value="true">완료</option>
              <option value="false">미완료</option>
            </select>
          </label>

          <label className="tp-form-label">
            체형/크기
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.adoptionListing.sizeLabel}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  adoptionListing: {
                    ...prev.adoptionListing,
                    sizeLabel: event.target.value,
                  },
                }))
              }
              placeholder="예: 중형견"
            />
          </label>

          <label className="tp-form-label">
            진행 상태
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.adoptionListing.status}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  adoptionListing: {
                    ...prev.adoptionListing,
                    status: event.target.value,
                  },
                }))
              }
            >
              <option value="OPEN">입양 가능</option>
              <option value="RESERVED">상담 중</option>
              <option value="ADOPTED">입양 완료</option>
              <option value="CLOSED">마감</option>
            </select>
          </label>
        </StructuredFieldSection>
      ) : null}

      {showVolunteerRecruitment ? (
        <StructuredFieldSection title="봉사 모집 정보">
          <label className="tp-form-label">
            보호소명
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.volunteerRecruitment.shelterName}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  volunteerRecruitment: {
                    ...prev.volunteerRecruitment,
                    shelterName: event.target.value,
                  },
                }))
              }
              placeholder="예: 마포 유기동물 보호소"
            />
          </label>

          <label className="tp-form-label">
            지역
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.volunteerRecruitment.region}
              list="structured-region-options"
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  volunteerRecruitment: {
                    ...prev.volunteerRecruitment,
                    region: event.target.value,
                  },
                }))
              }
              placeholder="예: 서울 마포구"
            />
          </label>

          <label className="tp-form-label">
            봉사 일정
            <input
              type="datetime-local"
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.volunteerRecruitment.volunteerDate}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  volunteerRecruitment: {
                    ...prev.volunteerRecruitment,
                    volunteerDate: event.target.value,
                  },
                }))
              }
            />
          </label>

          <label className="tp-form-label">
            봉사 유형
            <input
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.volunteerRecruitment.volunteerType}
              list="volunteer-type-options"
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  volunteerRecruitment: {
                    ...prev.volunteerRecruitment,
                    volunteerType: event.target.value,
                  },
                }))
              }
              placeholder="예: 산책, 청소, 사진 촬영"
            />
          </label>

          <label className="tp-form-label">
            모집 인원
            <input
              type="number"
              min={1}
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.volunteerRecruitment.capacity}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  volunteerRecruitment: {
                    ...prev.volunteerRecruitment,
                    capacity: event.target.value,
                  },
                }))
              }
              placeholder="예: 10"
            />
          </label>

          <label className="tp-form-label">
            모집 상태
            <select
              className="tp-input-soft px-3 py-2 text-sm"
              value={formState.volunteerRecruitment.status}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  volunteerRecruitment: {
                    ...prev.volunteerRecruitment,
                    status: event.target.value,
                  },
                }))
              }
            >
              <option value="OPEN">모집 중</option>
              <option value="FULL">정원 마감</option>
              <option value="CLOSED">모집 종료</option>
              <option value="CANCELLED">취소</option>
            </select>
          </label>
        </StructuredFieldSection>
      ) : null}

      <datalist id="hospital-treatment-type-options">
        {HOSPITAL_TREATMENT_TYPE_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="structured-region-options">
        {STRUCTURED_REGION_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="adoption-animal-type-options">
        {ADOPTION_ANIMAL_TYPE_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="adoption-breed-options">
        {ADOPTION_BREED_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="adoption-age-label-options">
        {ADOPTION_AGE_LABEL_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <datalist id="volunteer-type-options">
        {VOLUNTEER_TYPE_SUGGESTIONS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

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
            disabled={isPending}
          >
            {isPending ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </form>
  );
}
