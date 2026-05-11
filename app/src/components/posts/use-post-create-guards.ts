"use client";

import { PostScope, PostType } from "@prisma/client";
import { type Dispatch, type SetStateAction, useEffect } from "react";

import type { PostCreateFormState } from "@/components/posts/post-create-form-state";
import { resolveScopeByPostType } from "@/components/posts/post-create-form-options";
import { GUEST_BLOCKED_POST_TYPES } from "@/lib/guest-post-policy";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import { REVIEW_CATEGORY } from "@/lib/review-category";

type SelectOption<T extends string> = {
  value: T;
};

type PostCreateGuardParams = {
  availablePostTypeOptions: ReadonlyArray<SelectOption<PostType>>;
  canCreateAdoptionListing: boolean;
  communityOptions: ReadonlyArray<SelectOption<string>>;
  formState: PostCreateFormState;
  isAuthenticated: boolean;
  setFormState: Dispatch<SetStateAction<PostCreateFormState>>;
};

type PostCreateStatePatch = Partial<PostCreateFormState>;

function scheduleFormPatch(
  setFormState: Dispatch<SetStateAction<PostCreateFormState>>,
  patch: PostCreateStatePatch,
) {
  const timer = window.setTimeout(() => {
    setFormState((prev) => ({
      ...prev,
      ...patch,
    }));
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}

export function getPostTypeAvailabilityPatch({
  availablePostTypeOptions,
  canCreateAdoptionListing,
  formState,
  isAuthenticated,
}: Pick<
  PostCreateGuardParams,
  "availablePostTypeOptions" | "canCreateAdoptionListing" | "formState" | "isAuthenticated"
>): PostCreateStatePatch | null {
  if (!isAuthenticated && formState.scope !== PostScope.GLOBAL) {
    return { scope: PostScope.GLOBAL };
  }

  const isGuestBlockedType =
    !isAuthenticated && GUEST_BLOCKED_POST_TYPES.includes(formState.type);
  const isRoleBlockedType =
    formState.type === PostType.ADOPTION_LISTING && !canCreateAdoptionListing;
  const isUnavailableType = !availablePostTypeOptions.some(
    (option) => option.value === formState.type,
  );

  if (isGuestBlockedType || isRoleBlockedType || isUnavailableType) {
    return { type: PostType.FREE_BOARD };
  }

  return null;
}

export function getLegacyPlaceReviewPatch(
  formState: PostCreateFormState,
): PostCreateStatePatch | null {
  if (formState.type !== PostType.PLACE_REVIEW) {
    return null;
  }

  return {
    type: PostType.PRODUCT_REVIEW,
    reviewCategory: REVIEW_CATEGORY.PLACE,
  };
}

export function getDefaultCommunityPatch({
  communityOptions,
  formState,
}: Pick<PostCreateGuardParams, "communityOptions" | "formState">): PostCreateStatePatch | null {
  if (formState.petTypeId || isFreeBoardPostType(formState.type)) {
    return null;
  }

  if (communityOptions.length === 0) {
    return null;
  }

  return { petTypeId: communityOptions[0].value };
}

export function getScopeSyncPatch(
  formState: PostCreateFormState,
  resolvedScope: PostScope,
): PostCreateStatePatch | null {
  if (formState.scope !== resolvedScope) {
    return { scope: resolvedScope };
  }

  if (resolvedScope !== PostScope.LOCAL && formState.neighborhoodId) {
    return { neighborhoodId: "" };
  }

  return null;
}

export function usePostCreateGuards({
  availablePostTypeOptions,
  canCreateAdoptionListing,
  communityOptions,
  formState,
  isAuthenticated,
  setFormState,
}: PostCreateGuardParams) {
  const resolvedScope = resolveScopeByPostType(formState.type, formState.scope);

  useEffect(() => {
    const patch = getPostTypeAvailabilityPatch({
      availablePostTypeOptions,
      canCreateAdoptionListing,
      formState,
      isAuthenticated,
    });

    return patch ? scheduleFormPatch(setFormState, patch) : undefined;
  }, [
    availablePostTypeOptions,
    canCreateAdoptionListing,
    formState,
    isAuthenticated,
    setFormState,
  ]);

  useEffect(() => {
    const patch = getLegacyPlaceReviewPatch(formState);
    return patch ? scheduleFormPatch(setFormState, patch) : undefined;
  }, [formState, setFormState]);

  useEffect(() => {
    const patch = getDefaultCommunityPatch({ communityOptions, formState });
    return patch ? scheduleFormPatch(setFormState, patch) : undefined;
  }, [communityOptions, formState, setFormState]);

  useEffect(() => {
    const patch = getScopeSyncPatch(formState, resolvedScope);
    return patch ? scheduleFormPatch(setFormState, patch) : undefined;
  }, [formState, resolvedScope, setFormState]);

  return { resolvedScope };
}
