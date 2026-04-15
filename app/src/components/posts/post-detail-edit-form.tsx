"use client";

import { PostScope } from "@prisma/client";
import {
  type FormEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  PostBodyRichEditor,
  type PostBodyRichEditorHandle,
} from "@/components/posts/post-body-rich-editor";
import {
  areSameStringArray,
  extractImageUrlsFromMarkup,
} from "@/lib/editor-image-markup";
import { GUEST_MAX_IMAGE_COUNT } from "@/lib/guest-post-policy";
import { POST_CONTENT_MAX_LENGTH, POST_TITLE_MAX_LENGTH } from "@/lib/input-limits";
import { updatePostAction } from "@/server/actions/post";

type NeighborhoodOption = {
  id: string;
  name: string;
  city: string;
  district: string;
};

type PostDetailEditFormProps = {
  postId: string;
  title: string;
  content: string;
  scope: PostScope;
  neighborhoodId: string | null;
  imageUrls: string[];
  neighborhoods: NeighborhoodOption[];
  isAuthenticated: boolean;
  guestPassword?: string;
};

const GUEST_FP_STORAGE_KEY = "townpet:guest-fingerprint:v1";
type EditorTab = "write" | "preview";

function getGuestFingerprint() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(GUEST_FP_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(GUEST_FP_STORAGE_KEY, created);
  return created;
}

export function PostDetailEditForm({
  postId,
  title,
  content,
  scope,
  neighborhoodId,
  imageUrls,
  neighborhoods,
  isAuthenticated,
  guestPassword = "",
}: PostDetailEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("write");
  const editorHandleRef = useRef<PostBodyRichEditorHandle | null>(null);
  const latestEditorContentRef = useRef(content);
  const latestEditorImageUrlsRef = useRef(imageUrls);
  const [formState, setFormState] = useState(() => {
    const contentImageUrls = extractImageUrlsFromMarkup(content);
    return {
      title,
      content,
      scope: isAuthenticated ? scope : PostScope.GLOBAL,
      neighborhoodId: neighborhoodId ?? "",
      imageUrls: contentImageUrls.length > 0 ? contentImageUrls : imageUrls,
      guestPassword,
    };
  });

  const neighborhoodOptions = useMemo(
    () =>
      neighborhoods.map((neighborhood) => ({
        value: neighborhood.id,
        label: `${neighborhood.city} ${neighborhood.name}`,
      })),
    [neighborhoods],
  );

  const showNeighborhood = formState.scope === PostScope.LOCAL;

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

    setFormState((prev) => ({
      ...prev,
      content: serializedContent,
      imageUrls: serializedImageUrls,
    }));

    startTransition(async () => {
      const payload = {
        title: formState.title,
        content: serializedContent,
        scope: isAuthenticated ? formState.scope : PostScope.GLOBAL,
        imageUrls: serializedImageUrls,
        neighborhoodId: showNeighborhood ? formState.neighborhoodId : null,
        guestPassword: isAuthenticated ? undefined : formState.guestPassword,
      };

      const result = isAuthenticated
        ? await updatePostAction(postId, payload)
        : await fetch(`/api/posts/${postId}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              "x-guest-fingerprint": getGuestFingerprint(),
            },
            body: JSON.stringify(payload),
          })
            .then(async (response) => {
              const payload = (await response.json()) as {
                ok: boolean;
                error?: { message?: string };
              };

              if (response.ok && payload.ok) {
                return { ok: true } as const;
              }
              return {
                ok: false,
                message: payload.error?.message ?? "비회원 수정에 실패했습니다.",
              } as const;
            })
            .catch(() => ({ ok: false, message: "네트워크 오류가 발생했습니다." } as const));

      if (!result.ok) {
        setError(result.message ?? "수정에 실패했습니다.");
        return;
      }

      router.push(`/posts/${postId}`);
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="tp-card w-full p-5 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="tp-text-page-title-sm tp-text-heading">게시물 수정</h2>
        <button
          type="submit"
          className="tp-btn-primary tp-btn-sm disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
          disabled={isPending}
        >
          {isPending ? "저장 중..." : "수정 저장"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="tp-form-label">
          제목
          <input
            className="tp-input-soft px-3 py-2 text-sm"
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            maxLength={POST_TITLE_MAX_LENGTH}
            required
          />
        </label>

        <label className="tp-form-label">
          범위
          <select
            className="tp-input-soft px-3 py-2 text-sm"
            value={formState.scope}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                scope: event.target.value as PostScope,
                neighborhoodId: event.target.value === PostScope.LOCAL
                  ? prev.neighborhoodId
                  : "",
              }))
            }
            disabled={!isAuthenticated}
          >
            <option value={PostScope.LOCAL}>동네</option>
            <option value={PostScope.GLOBAL}>전체</option>
          </select>
        </label>

        <label className="tp-form-label">
          동네
          <select
            className="tp-input-soft px-3 py-2 text-sm"
            value={formState.neighborhoodId}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                neighborhoodId: event.target.value,
              }))
            }
            disabled={!showNeighborhood}
            required={showNeighborhood}
          >
            <option value="">선택</option>
            {neighborhoodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!isAuthenticated ? (
        <label className="tp-form-label mt-4">
          글 비밀번호
          <input
            type="password"
            className="tp-input-soft max-w-[260px] px-3 py-2 text-sm"
            value={formState.guestPassword}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, guestPassword: event.target.value }))
            }
            minLength={4}
            maxLength={32}
            required
          />
        </label>
      ) : null}

      <div className="mt-6">
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
          mode={editorTab}
          onModeChange={setEditorTab}
          contentMaxLength={POST_CONTENT_MAX_LENGTH}
        />
      </div>
      {!isAuthenticated ? (
        <p className="mt-2 text-xs text-[#5d789f]">비회원 이미지는 최대 1장, 파일당 2MB까지 업로드할 수 있습니다.</p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
