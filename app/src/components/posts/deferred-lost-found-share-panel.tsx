"use client";

import { type ComponentType, useState } from "react";

import type { PostDetailItem } from "@/components/posts/post-detail-types";
import { buildLostFoundSharePanelOpenedEvent } from "@/lib/lost-found-acquisition-events";
import { sendAcquisitionEvent } from "@/lib/acquisition-tracking";

type DeferredLostFoundSharePanelProps = {
  post: PostDetailItem;
  postUrl: string;
};

type LostFoundSharePanelComponent = ComponentType<DeferredLostFoundSharePanelProps>;

export function DeferredLostFoundSharePanel({
  post,
  postUrl,
}: DeferredLostFoundSharePanelProps) {
  const [SharePanel, setSharePanel] = useState<LostFoundSharePanelComponent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSharePanel = () => {
    if (SharePanel || isLoading) {
      return;
    }
    void sendAcquisitionEvent(buildLostFoundSharePanelOpenedEvent(post.id));
    setIsLoading(true);
    void import("@/components/posts/lost-found-share-panel").then((module) => {
      setSharePanel(() => module.LostFoundSharePanel);
      setIsLoading(false);
    });
  };

  if (SharePanel) {
    return <SharePanel post={post} postUrl={postUrl} />;
  }

  return (
    <section className="tp-card border-[#d8e4f6] p-4 sm:p-5" aria-labelledby="lost-found-share-title">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4e6f9f]">
        공유 도구
      </p>
      <h2 id="lost-found-share-title" className="mt-1 text-base font-bold text-[#10284a]">
        분실/목격 제보 공유
      </h2>
      <p className="mt-1 max-w-[68ch] text-xs leading-5 text-[#526d95]">
        카카오톡 문구와 인스타/전단 이미지는 필요할 때 불러옵니다. 공개 문구에는 개인 연락처를 넣지 않습니다.
      </p>
      <button
        type="button"
        onClick={loadSharePanel}
        className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-[#3567b5] px-3 text-xs font-semibold text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1"
      >
        {isLoading ? "공유 도구 준비 중..." : "공유 도구 열기"}
      </button>
    </section>
  );
}
