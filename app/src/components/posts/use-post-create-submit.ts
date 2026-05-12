"use client";

import {
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
  useState,
  useTransition,
} from "react";
import { PostScope } from "@prisma/client";
import { useRouter } from "next/navigation";

import type { PostBodyRichEditorHandle } from "@/components/posts/post-body-rich-editor";
import type { PostCreateFormState } from "@/components/posts/post-create-form-state";
import {
  buildPostCreateSubmitPayload,
  createPostCreateSuccessState,
  type PostCreateSubmitPayload,
} from "@/components/posts/post-create-submit";
import { getClientFingerprint } from "@/lib/guest-client";
import { getGuestWriteHeaders } from "@/lib/guest-step-up.client";
import { createPostAction } from "@/server/actions/post";

type PostCreateActionResult =
  | { ok: true }
  | { ok: false; message?: string };

type GuestPostCreateResponsePayload = {
  ok: boolean;
  error?: { message?: string };
};

type UsePostCreateSubmitParams = {
  canUseLocalScope: boolean;
  editorHandleRef: RefObject<PostBodyRichEditorHandle | null>;
  formState: PostCreateFormState;
  isAuthenticated: boolean;
  isFreeBoardType: boolean;
  latestEditorContentRef: RefObject<string>;
  latestEditorImageUrlsRef: RefObject<string[]>;
  latestTitleRef: RefObject<string>;
  markDraftSubmitted: () => void;
  resolvedScope: PostScope;
  setFormState: Dispatch<SetStateAction<PostCreateFormState>>;
  showAnimalTagsInput: boolean;
  showCareRequest: boolean;
  showCommunitySelector: boolean;
  showMarketListing: boolean;
  showNeighborhood: boolean;
  titleInputRef: RefObject<HTMLInputElement | null>;
};

export function toGuestPostCreateActionResult(
  responseOk: boolean,
  payload: GuestPostCreateResponsePayload,
): PostCreateActionResult {
  if (responseOk && payload.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    message: payload.error?.message ?? "비회원 글 등록에 실패했습니다.",
  };
}

export function toPostCreateNetworkErrorResult(error: unknown): PostCreateActionResult {
  return {
    ok: false,
    message:
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "네트워크 오류가 발생했습니다.",
  };
}

async function submitPostCreatePayload({
  isAuthenticated,
  payload,
}: {
  isAuthenticated: boolean;
  payload: PostCreateSubmitPayload;
}): Promise<PostCreateActionResult> {
  if (isAuthenticated) {
    return createPostAction(payload, {
      clientFingerprint: getClientFingerprint(),
    });
  }

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
    const responsePayload = (await response.json()) as GuestPostCreateResponsePayload;

    return toGuestPostCreateActionResult(response.ok, responsePayload);
  } catch (error) {
    return toPostCreateNetworkErrorResult(error);
  }
}

export function usePostCreateSubmit({
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
  showMarketListing,
  showNeighborhood,
  titleInputRef,
}: UsePostCreateSubmitParams) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      const result = await submitPostCreatePayload({
        isAuthenticated,
        payload: payloadResult.payload,
      });

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

  return {
    error,
    handleSubmit,
    isPending,
  };
}
