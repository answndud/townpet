"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { POST_COMMENT_SECTION_STATE_CLASS_NAME } from "@/components/posts/post-comment-layout-class";
import type { PostCommentPrefetchState } from "@/components/posts/post-comment-load-state";

type DeferredPostCommentSectionProps = {
  postId: string;
  currentUserId?: string;
  canInteract: boolean;
  canInteractWithPostOwner: boolean;
  lostFoundSightingEnabled?: boolean;
  loginHref: string;
  onCommentCountChange?: (count: number) => void;
  initialLoadState?: PostCommentPrefetchState;
  forceGuestMode?: boolean;
};

const LazyPostCommentSectionClient = dynamic(
  () =>
    import("@/components/posts/post-comment-section-client").then((module) => ({
      default: module.PostCommentSectionClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className={`${POST_COMMENT_SECTION_STATE_CLASS_NAME} border-[#dbe6f6] bg-white text-[#6a84ac]`}>
        <span role="status" aria-live="polite">댓글을 준비하는 중...</span>
      </div>
    ),
  },
);

export function DeferredPostCommentSection(props: DeferredPostCommentSectionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const load = () => setShouldLoad(true);
    const hash = window.location.hash;
    if (hash.startsWith("#comment") || hash === "#comments") {
      load();
      return;
    }

    let observer: IntersectionObserver | null = null;
    let fallbackTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const observerTimer = globalThis.setTimeout(() => {
      if (!("IntersectionObserver" in window)) {
        fallbackTimer = globalThis.setTimeout(load, 1_200);
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            load();
          }
        },
        {
          root: null,
          rootMargin: "120px 0px",
          threshold: 0,
        },
      );

      const node = rootRef.current;
      if (node) {
        observer.observe(node);
      }
    }, 1_800);

    return () => {
      globalThis.clearTimeout(observerTimer);
      if (fallbackTimer) {
        globalThis.clearTimeout(fallbackTimer);
      }
      observer?.disconnect();
    };
  }, [shouldLoad]);

  return (
    <div ref={rootRef} id="comments">
      {shouldLoad ? (
        <LazyPostCommentSectionClient {...props} />
      ) : (
        <div className={`${POST_COMMENT_SECTION_STATE_CLASS_NAME} border-[#dbe6f6] bg-white text-[#6a84ac]`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>댓글 영역</span>
            <button
              type="button"
              onClick={() => setShouldLoad(true)}
              className="inline-flex min-h-10 items-center justify-center px-1.5 text-xs font-semibold text-[#3567b5] transition hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1"
            >
              댓글 열기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
