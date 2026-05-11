"use client";

import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  buildPostDraftPayload,
  parsePostDraftPayload,
} from "@/lib/post-draft-storage";
import {
  isDraftFormState,
  POST_CREATE_DRAFT_STORAGE_KEY,
  type PostCreateFormState,
} from "@/components/posts/post-create-form-state";

type UsePostCreateDraftParams = {
  formState: PostCreateFormState;
  setFormState: Dispatch<SetStateAction<PostCreateFormState>>;
  titleInputRef: RefObject<HTMLInputElement | null>;
  latestTitleRef: RefObject<string>;
};

export function usePostCreateDraft({
  formState,
  setFormState,
  titleInputRef,
  latestTitleRef,
}: UsePostCreateDraftParams) {
  const [isClientReady, setIsClientReady] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep SSR-controlled fields inert until hydration can preserve user input.
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(POST_CREATE_DRAFT_STORAGE_KEY);
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- The form becomes interactive only after local draft restore has been checked.
      setIsDraftHydrated(true);
      return;
    }

    const parsed = parsePostDraftPayload<Partial<PostCreateFormState>>(
      stored,
      isDraftFormState,
    );
    if (parsed.status === "ready") {
      const draftForm = parsed.draft.form;
      const draftTitle = draftForm.title ?? "";
      latestTitleRef.current = draftTitle;
      if (titleInputRef.current) {
        titleInputRef.current.value = draftTitle;
      }
      setFormState((prev) => ({
        ...prev,
        ...draftForm,
        petTypeId: draftForm.petTypeId ?? prev.petTypeId,
        reviewCategory: draftForm.reviewCategory ?? prev.reviewCategory,
        animalTagsInput: draftForm.animalTagsInput ?? "",
        marketListing: draftForm.marketListing ?? prev.marketListing,
        careRequest: draftForm.careRequest ?? prev.careRequest,
        guestDisplayName: draftForm.guestDisplayName ?? "",
        guestPassword: "",
      }));
      setDraftSavedAt(parsed.draft.savedAt);
      setDraftMessage("임시저장을 불러왔습니다.");
    } else if (parsed.status === "expired") {
      window.localStorage.removeItem(POST_CREATE_DRAFT_STORAGE_KEY);
      setDraftMessage("만료된 임시저장을 삭제했습니다.");
    } else if (parsed.status === "invalid") {
      window.localStorage.removeItem(POST_CREATE_DRAFT_STORAGE_KEY);
      setDraftMessage("임시저장을 읽을 수 없어 초기화했습니다.");
    }
    setIsDraftHydrated(true);
  }, [latestTitleRef, setFormState, titleInputRef]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasDraftContent =
      latestTitleRef.current.trim().length > 0 ||
      formState.content.trim().length > 0 ||
      formState.imageUrls.length > 0 ||
      formState.guestDisplayName?.trim().length > 0;
    if (!hasDraftContent) {
      return;
    }

    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(
        POST_CREATE_DRAFT_STORAGE_KEY,
        JSON.stringify(
          buildPostDraftPayload({
            ...formState,
            title: latestTitleRef.current,
            guestPassword: "",
          }),
        ),
      );
      setDraftSavedAt(savedAt);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [formState, latestTitleRef]);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(POST_CREATE_DRAFT_STORAGE_KEY);
    setDraftSavedAt(null);
    setDraftMessage("임시저장을 삭제했습니다.");
  }, []);

  const markDraftSubmitted = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(POST_CREATE_DRAFT_STORAGE_KEY);
    }
    setDraftSavedAt(null);
    setDraftMessage("게시글을 등록해 임시저장을 비웠습니다.");
  }, []);

  return {
    clearDraft,
    draftMessage,
    draftSavedAt,
    isFormInteractive: isClientReady && isDraftHydrated,
    markDraftSubmitted,
  };
}
